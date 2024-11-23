import axios from "axios";
import CONSTANT from "../../constants/synth-data/constants.js";

const {CONSTANTS} = CONSTANT;

export default async function umlToPayload(
  umlCode = "",
  prompt = "",
  entities = 21
) {
  const url = `${CONSTANTS.BASE_URL}/${CONSTANTS.SERVICE}/response`;
  const user_prompt = `Mention all the ${entities} entities without skipping. ${prompt}`;
  const requestHeaders = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  const requestBody = {
    user_id: CONSTANTS.USER_ID,
    assistant_id: CONSTANTS.ASSISTANT_ID_UML_TO_PAYLOAD,
    thread_id: "",
    file_id: "",
    input: `${umlCode}.-${user_prompt}`,
    model: "",
  };
  try {
    const response = await axios.post(url, requestBody, requestHeaders);
    return response.data?.messages[0]?.file_id;
  } catch (error) {
    console.error("Uml to payload error: ", error);
    return;
  }
}



export async function convertUml(req, res) {
  const { umlText } = req.body;
  const token = req.headers['token'];
  const universeId = req.query;

  if (!umlText) {
      return res.status(400).json({ error: 'UML text is required.' });
  }

  try {
      // Generate schema payload from the UML text
      const schemaPayloads = umlToSchema(umlText, universeId);
      const classesCount = schemaPayloads.length;

      // Function to add a timestamp prefix to schema name
      const addTimestampPrefix = (name) => {
          const timestamp = Date.now();
          return `${timestamp}_${name}`;
      };

      // Function to create a schema with conflict handling
      async function createSchemaWithRetry(schemaObject) {
          let schemaName = schemaObject.entityName;

          try {
              // Attempt to create schema
              let response = await createSchema(schemaObject, token);
              
              if (response.status === 'conflict') {
                  // Schema conflict, retry with a timestamp-prefixed name
                  schemaObject.entityName = addTimestampPrefix(schemaName);
                  response = await createSchema(schemaObject, token);
              }

              return { 
                  status: 'success', 
                  name: response.name, 
                  schemaId: response.schemaId 
              };
          } catch (error) {
              return { 
                  status: 'failed', 
                  name: schemaName, 
                  errorMessage: error.message || 'Unknown error' 
              };
          }
      }

      // Process schemas in parallel
      const results = await Promise.all(
          schemaPayloads.map((schemaObject) => createSchemaWithRetry(schemaObject))
      );

      // Organize results into the required structure
      const schemasAndTheirIds = {};
      const schemasCreationStatus = results.map((result) => {
          if (result.status === 'success') {
              schemasAndTheirIds[result.name] = result.schemaId;
          }

          return result;
      });

      // Send response
      res.json({
          classesCount,
          schemasAndTheirIds,
      });
  } catch (error) {
      res.status(500).json({
          error: 'An error occurred while processing the UML.',
          details: error.message || error.response?.data || 'Unknown error'
      });
  }
}

