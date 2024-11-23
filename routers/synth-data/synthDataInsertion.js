import e from 'express';
import { insertData, fetchData } from '../../utils/synth-data/schema-apis.js';
import { removeDuplicatePurgeId } from '../../helpers/synth-data/dataManipulations.js';

const routerSynthDataInsertion = e.Router();

routerSynthDataInsertion.post('/synth-data-insertion', async (req, res) => {
	let { schemas, synthData } = req.body;
	let token = req.headers.authorization?.split('Bearer ')[1];
	let responseBody = [];
	for (const schemaName in synthData?.data) {
		let schemaId = '';
		let schemaData = [];

		// find appropriate schema names from synth data
		Object.keys(schemas).forEach((value, key) => {
			//process schema names from schemas and synth data for matching
			let schemaNameInSynthDataProcessed = schemaName
				.toLowerCase()
				.replace(/^[0-9_]+/, '')
				.replace('_', '');
			let schemaNameInSchemasProcessed = value.toLowerCase().replace('_', '').replace(/^[0-9_]+/, '');
			if (schemaNameInSchemasProcessed === schemaNameInSynthDataProcessed) {
				// extract schema ids
				schemaId = schemas[value];
				schemaData = synthData?.data?.[schemaName];
			}
		});
		// remove duplicate purge ids if present
		let dataForInsertion = removeDuplicatePurgeId(schemaData);

		if (schemaId) {
			const { id, statusCode, data } = await insertData(
				schemaId,
				dataForInsertion,
				token
			);
			responseBody.push({
				schemaName: schemaName,
				schemaId: schemaId,
				statusCode: statusCode,
				details: data,
			});
		} else {
			responseBody.push({
				schemaName: schemaName,
				schemaId: schemaId,
				statusCode: 500,
				details: "Schema id or data extraction failed!",
			});
		}
	}
	res.json(responseBody)
});

routerSynthDataInsertion.post('/synth-data-status', async (req, res) => {
	let { schemas } = req.body;
	let token = req.headers.authorization?.split('Bearer ')[1];
	let responseBody = [];

	for (const schemaName in schemas) {
		// extract schema ids
		let schemaId = schemas[schemaName];

		const fetchResponse = await fetchData(schemaId,token);
		responseBody.push({
			schema: schemaName,
			...fetchResponse
		})
	}
	res.json(responseBody)
});

export default routerSynthDataInsertion;
