import axios from 'axios';
import constants from '../../constants/synth-data/constants.js';

const {UMLTOSCHEMACONSTANTS,memoryStore} = constants;

function umlToSchema(umlText,universeId) {

    const entityBlocks = umlText.split(/entity\s+|class\s+/).map(block => block.trim()).filter(Boolean);
    function parseAttributes(entityBlock) {
        const attributes = [];
        const attributeSection = entityBlock.match(/{(.+)}$/s);
        if (attributeSection) {
            const lines = attributeSection[1].match(/[\+\s]*(\w+)\s*:\s*(\w+)(\s*<<PK>>|\s*{PK})?(\s*<<FK>>|\s*{FK})?/g);
            if (lines) {
                lines.forEach(line => {
                    const attributeMatch = line.match(/(\w+)\s*:\s*(\w+)(\s*<<PK>>|\s*{PK})?(\s*<<FK>>|\s*{FK})?/);
                    if (attributeMatch) {
                        const name = attributeMatch[1];
                        const type = attributeMatch[2];
                        const isPrimaryKey = !!attributeMatch[3];
                        const isForeignKey = !!attributeMatch[4];

                        const attribute = {
                            "name": name,
                            "nestedName": name,
                            "type": {
                                "type": type
                            },
                            "required": isPrimaryKey,
                            "reference": isForeignKey,
                            "videos": [],
                            "childAttributes": []
                        };

                        attributes.push(attribute);
                    }
                });
            }
        }

    
        return attributes;
    }

    const schema = entityBlocks.map(entityBlock => {
        const entityNameMatch = entityBlock.match(/(\w+)\s*{/);
        const entityName = entityNameMatch ? entityNameMatch[1] : '';
        const attributes = parseAttributes(entityBlock);
        const primaryKey = attributes.find(attr => attr.required)?.name || '';

        return {
            "entityName": entityName,
            "description": entityName,
            "schemaReadAccess": "PUBLIC",
            "dataReadAccess": "PUBLIC", 
            "dataWriteAccess": "PUBLIC",
            "metadataReadAccess": "PUBLIC",
            "metadataWriteAccess": "PUBLIC",
            "universes": [universeId.universeId],
            "tags": { "BLUE": [] },
            "primaryKey": [primaryKey],
            "attributes": attributes,
            "execute": "PUBLIC",
            "visibility": "PUBLIC"
        };
    });

    // console.log("schema",JSON.stringify(schema));
    return schema;
}


async function createSchema(schemaObject,token) {
    try {
       
        if (memoryStore.schemas[schemaObject.entityName]) {
            const existingSchemaId = memoryStore.schemas[schemaObject.entityName];
            return { status: 'conflict', name: schemaObject.entityName, schemaId: existingSchemaId };
        }


       console.log(UMLTOSCHEMACONSTANTS.BASE_URL+""+UMLTOSCHEMACONSTANTS.SERVICE);
        const response = await axios.post(`${UMLTOSCHEMACONSTANTS.BASE_URL}/${UMLTOSCHEMACONSTANTS.SERVICE}/v1.0/schemas`, schemaObject, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
      
        console.log(response)

        const { entitySchema: { name } } = response.data;
        const  schemaId = response.data.schemaId;


       
        memoryStore.schemas[name] = schemaId;

      
        return { status: 'success', name, schemaId };
    } catch (error) {
        if (error.response?.status === 409) {
            return { status: 'conflict', name: schemaObject.entityName };
        }
        throw error; // Handle other errors
    }
}


export async function convertUml(req, res) {
    const { umlText } = req.body;   
    const token = req.headers['token'];
    const universeId = req.query;

    if (!umlText) return res.status(400).json({ error: 'UML text is required.' });

    try {
        const schema = umlToSchema(umlText, universeId);
        memoryStore.results = [];

        const results = await Promise.allSettled(schema.map(async (schemaObject) => {
            const result = await createSchema(schemaObject, token);
            return result;
        }));

        memoryStore.results = results.map((result, index) => ({
            status: result.status === 'fulfilled' ? 'success' : 'failed',
            name: schema[index].entityName,
            schemaId: result.value?.schemaId,
            reason: result.reason
        }));

        res.json({ status: 'completed', results: memoryStore.results });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while processing the UML.', details: error.message });
    }
}



export function getResults(req, res) {
    res.json({ results: memoryStore.results });
}

