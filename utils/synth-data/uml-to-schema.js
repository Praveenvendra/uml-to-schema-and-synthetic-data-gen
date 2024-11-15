import axios from 'axios';
import constants from '../../constants/synth-data/constants.js';

const { UMLTOSCHEMACONSTANTS, memoryStore } = constants;

// Utility function to parse individual attributes from entity block with support for parent-child relationships
function parseAttributes(entityBlock) {
    const attributes = [];
    const lines = entityBlock.match(/[\+\-\s]*\w+\s*:\s*\w+(\s*<<PK>>|\s*{PK})?(\s*<<FK>>|\s*{FK})?/g);
    
    let currentParent = null;

    if (lines) {
        lines.forEach(line => {
            const attributeMatch = line.match(/([\+\-]?)\s*(\w+)\s*:\s*(\w+)(\s*<<PK>>|\s*{PK})?(\s*<<FK>>|\s*{FK})?/);
            if (attributeMatch) {
                const [_, prefix, name, type, pk, fk] = attributeMatch;
                
                // Determine if it's a parent attribute (either prefixed with '+' or no prefix)
                if (prefix === '+' || prefix === '') {
                    currentParent = {
                        name,
                        nestedName: name,
                        type: { type },
                        required: !!pk,
                        reference: !!fk,
                        videos: [],
                        childAttributes: []
                    };
                    attributes.push(currentParent);
                }

                // If it's a child attribute (prefixed with '-') and there's a current parent
                if (prefix === '-' && currentParent && currentParent.type.type === 'object') {
                    currentParent.childAttributes.push({
                        name,
                        nestedName: name,
                        type: { type },
                        required: !!pk,
                        reference: !!fk,
                        videos: []
                    });
                }
            }
        });
    }
    return attributes;
}

// Function to parse entity block and handle variations in UML syntax
function parseEntityBlock(entityBlock) {
    const entityNameMatch = entityBlock.match(/class\s+(\w+)/);
    const entityName = entityNameMatch ? entityNameMatch[1] : '';
    const attributes = parseAttributes(entityBlock);
    const primaryKey = attributes.find(attr => attr.required)?.name || '';

    // Only return an entity if it has a name and attributes
    if (!entityName || attributes.length === 0) {
        return null;
    }

    return {
        entityName,
        description: entityName,
        primaryKey: [primaryKey],
        attributes
    };
}

// Main function to convert UML text to schema payload with robust error handling
export function umlToSchema(umlText, universeId) {
    const entityBlocks = umlText
        .split(/(?=class\s+|\bentity\s+)/)
        .map(block => block.trim())
        .filter(Boolean);

    const schemas = entityBlocks
        .map(parseEntityBlock)
        .filter(schema => schema !== null);

    return schemas.map((schema) => ({
      entityName: schema.entityName,
      description: `This schema contains details for ${schema.description}`,
      schemaReadAccess: "PUBLIC",
      dataReadAccess: "PUBLIC",
      dataWriteAccess: "PUBLIC",
      metadataReadAccess: "PUBLIC",
      metadataWriteAccess: "PUBLIC",
      universes: universeId.universeId ? [universeId.universeId] : [null],
      tags: { BLUE: [] },
      primaryKey: schema.primaryKey,
      attributes: schema.attributes,
      execute: "PUBLIC",
      visibility: "PUBLIC",
    }));
}



// Function to create schema on the server, with error handling for existing schema conflicts
async function createSchema(schemaObject, token) {
    if (memoryStore.schemas[schemaObject.entityName]) {
        const existingSchemaId = memoryStore.schemas[schemaObject.entityName];
        return { status: 'conflict', name: schemaObject.entityName, schemaId: existingSchemaId };
    }

    try {
        const response = await axios.post(
            `${UMLTOSCHEMACONSTANTS.BASE_URL}/${UMLTOSCHEMACONSTANTS.SERVICE}/v1.0/schemas`,
            schemaObject,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const { entitySchema: { name }, schemaId } = response.data;
        memoryStore.schemas[name] = schemaId;

        return { status: 'success', name, schemaId };
    } catch (error) {
        if (error.response?.status === 409) {
            return { status: 'conflict', name: schemaObject.entityName };
        }
        throw error;
    }
}

// Controller to convert UML to schema and handle schema creation
// export async function convertUml(req, res) {
//     const { umlText } = req.body;
//     const token = req.headers['token'];
//     const universeId = req.query;

//     if (!umlText) {
//         return res.status(400).json({ error: 'UML text is required.' });
//     }

//     try {
//         const schema = umlToSchema(umlText, universeId);

//         const results = await Promise.allSettled(
//             schema.map(async (schemaObject) => {
//                 const result = await createSchema(schemaObject, token);
//                 return result;
//             })
//         );

//         memoryStore.results = results.map((result, index) => ({
//             status: result.status === 'fulfilled' ? 'success' : 'failed',
//             name: schema[index].entityName,
//             schemaId: result.value?.schemaId,
//             reason: result.reason
//         }));

//         res.json({ status: 'completed', results: memoryStore.results });
//     } catch (error) {
//         res.status(500).json({
//             error: 'An error occurred while processing the UML.',
//             details: error.message || error.response?.data || 'Unknown error'
//         });
//     }
// }

// Controller to convert UML to schema, create schemas, and handle conflicts
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

        const schemasCreationStatus = [];
        const schemasAndTheirIds = {};

        // Function to add timestamp prefix to schema name
        const addTimestampPrefix = (name) => {
            const timestamp = Date.now();
            return `${timestamp}_${name}`;
        };

        // Function to create a schema with conflict handling
        async function createSchemaWithRetry(schemaObject, token) {
            let response;
            let schemaName = schemaObject.entityName;
            
            // Attempt to create schema
            try {
                response = await createSchema(schemaObject, token);
                
                if (response.status === 'conflict') {
                    // Schema conflict, retry with timestamp-prefixed name
                    schemaObject.entityName = addTimestampPrefix(schemaName);
                    response = await createSchema(schemaObject, token);
                }
                
                return response;
            } catch (error) {
                return { status: 'failed', name: schemaName, error: error.message };
            }
        }

        // Process each schema payload and create schemas
        for (const schemaObject of schemaPayloads) {
            const result = await createSchemaWithRetry(schemaObject, token);

            // Store creation status
            if (result.status === 'success') {
                schemasCreationStatus.push({
                    schemaName: result.name,
                    status: 'success',
                    schemaId: result.schemaId,
                });
                schemasAndTheirIds[result.name] = result.schemaId;
            } else {
                schemasCreationStatus.push({
                    schemaName: result.name,
                    status: 'failed',
                    errorMessage: result.error || 'Unknown error',
                });
            }
        }

        // Prepare the response with the required structure
        res.json({
            classesCount,
            schemasCreationStatus,
            schemasAndTheirIds
        });

    } catch (error) {
        res.status(500).json({
            error: 'An error occurred while processing the UML.',
            details: error.message || error.response?.data || 'Unknown error'
        });
    }
}

// Controller to retrieve in-memory results
export function getResults(req, res) {
    res.json({ results: memoryStore.results });
}
