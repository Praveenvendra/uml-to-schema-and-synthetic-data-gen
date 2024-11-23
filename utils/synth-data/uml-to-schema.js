import axios from 'axios';
import constants from '../../constants/synth-data/constants.js';
const { UMLTOSCHEMACONSTANTS, memoryStore } = constants;

// Function to fetch file data using the file_id
async function fetchFileData(fileId) {
    try {
        const downloadEndpoint = `https://ig.gov-cloud.ai/mobius-gpt-service/downloadFile?file_id=${fileId}`;
        const response = await axios.get(downloadEndpoint, {
            headers: { 'Content-Type': 'application/json' },
        });

        // Ensure the response is in JSON format
        return response.data;
    } catch (error) {
        console.error('Error fetching file data:', error.message);
        throw error;
    }
}

function mapEntitiesWithSchemaIds(fileData, schemasAndTheirIds) {
    const hierarchicalMapping = {
        primary: {},
        secondary: {},
        tertiary: {},
        quaternary: {},
    };

    const keyMapping = {
        primary_entity: 'primary',
        secondary_entities: 'secondary',
        tertiary_entities: 'tertiary',
        quaternary_entities: 'quaternary',
    };

    // Iterate through fileData and map keys to hierarchicalMapping
    Object.entries(fileData).forEach(([level, entities]) => {
        // console.log(`Processing level: ${level}`);
        const mappedLevel = keyMapping[level]; // Map to hierarchical level
        // console.log(`Mapped level: ${mappedLevel}`);

        if (mappedLevel && Array.isArray(entities)) {
            entities.forEach((entityName) => {
                let schemaKey = null;

                // Search schemasAndTheirIds for a match
                for (const key in schemasAndTheirIds) {
                    // Match either exact name or name preceded by a numeric prefix
                    const regex = new RegExp(`(^\\d+_)?${entityName}$`); // Match with or without prefix
                    if (regex.test(key)) {
                        schemaKey = key;
                        break;
                    }
                }

                if (schemaKey) {
                    const schemaId = schemasAndTheirIds[schemaKey];
                    hierarchicalMapping[mappedLevel][entityName] = schemaId;
                } else {
                    console.warn(`Schema ID not found for entity "${entityName}".`);
                }
            });
        } else {
            console.warn(`Invalid or unexpected hierarchical level: ${level}`);
        }
    });

    return hierarchicalMapping;
}

async function getHierarchicalSegregation(umlText, schemasAndTheirIds) {
    try {
        const payload = {
            input: umlText + " Give me the hierarchical segregation of entities as output in a file.",
            user_id: "Gaian@123",
            assistant_id: "asst_P3T5tJjC1QZCxzJfxIZeTGCw",
            model: "",
            uml_text: umlText,
        };

        const apiEndpoint = 'https://ig.gov-cloud.ai/mobius-gpt-service/response';
        const response = await axios.post(apiEndpoint, payload, {
            headers: { 'Content-Type': 'application/json' },
        });

        const { messages } = response.data;

        if (messages && messages.length > 0) {
            const fileId = messages[0]?.file_id;
            if (fileId) {
                // console.log('file_id found:', fileId);

                // Fetch data using the file_id
                // const fileData = await fetchFileData(fileId);
                console.log('File data:', fileData);

                // Map schema IDs to hierarchical entities
                const hierarchicalMapping = mapEntitiesWithSchemaIds(fileData, schemasAndTheirIds);
                // console.log('Hierarchical Mapping:', hierarchicalMapping);

                return {
                    file_id: fileId,
                    hierarchicalMapping,
                    downloadLink: messages[0]?.content.match(/\[(.*?)\]\((.*?)\)/)?.[2] || '',
                };
            }
        }

        // console.log('No file_id found in the response.');
        return null;
    } catch (error) {
        // console.error('Error fetching hierarchical segregation:', error.message);
        throw error;
    }
}
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
    // console.log(`umlText_umlToSchema ${umlText}`)
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

export async function convertUml(req, res) {
    const { umlText } = req.body;
    // console.log(`umlText_convertUml ${umlText}`);
    const token = req.headers['token'];
    const universeId = req.query;

    if (!umlText) {
        return res.status(400).json({ error: 'UML text is required.' });
    }

    try {
        const schemaPayloads = umlToSchema(umlText, universeId);
        const classesCount = schemaPayloads.length;

        const schemasCreationStatus = [];
        const schemasAndTheirIds = {};

        const addTimestampPrefix = (name) => `${Date.now()}_${name}`;

        async function createSchemaWithRetry(schemaObject, token) {
            let response;
            let schemaName = schemaObject.entityName;

            try {
                response = await createSchema(schemaObject, token);

                if (response.status === 'conflict') {
                    schemaObject.entityName = addTimestampPrefix(schemaName);

                    response = await createSchema(schemaObject, token);
                }

                return response;
            } catch (error) {
                return { status: 'failed', name: schemaName, error: error.message };
            }
        }

        const results = await Promise.all(
            schemaPayloads.map((schemaObject) => createSchemaWithRetry(schemaObject))
        );

        for (const schemaObject of schemaPayloads) {
            const result = await createSchemaWithRetry(schemaObject, token);

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

        const hierarchicalSegregation = await getHierarchicalSegregation(umlText, schemasAndTheirIds);

        res.json({
            classesCount,
            schemasCreationStatus,
            schemasAndTheirIds,
            hierarchicalSegregation: hierarchicalSegregation?.hierarchicalMapping || {},
        });
    } catch (error) {
        res.status(500).json({
            error: 'An error occurred while processing the UML.',
            details: error.message || error.response?.data || 'Unknown error',
        });
    }
}
// Controller to retrieve in-memory results
export function getResults(req, res) {
    res.json({ results: memoryStore.results });
}
