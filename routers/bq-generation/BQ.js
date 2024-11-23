import { Router } from 'express';
import adhoc from '../../utils/bq-generation/adhoc.js';
import createBQ from '../../utils/bq-generation/createBQ.js';
import umlToBQ from '../../utils/bq-generation/umlToBQ.js';

const bqRouter = Router();

/**
 * Endpoint to execute an ad-hoc query.
 * @route POST /adhoc
 * @param {Object} req - Express request object
 * @param {string} req.body.query - SQL query to execute.
 * @param {Object} req.headers.authorization - Bearer token for authentication.
 * @param {Object} res - Express response object
 * @returns {Object} - Response containing the status and query result.
 */
bqRouter.post('/adhoc', async (req, res) => {
	let { query } = req.body;
	// extract bearer token
	let token = req.headers.authorization?.split('Bearer ')[1];
	let { statusCode, data } = await adhoc(query, token);
	res.status(statusCode).json(data);
});

/**
 * Endpoint to create a new BigQuery (BQ).
 * @route POST /create-bq
 * @param {Object} req - Express request object
 * @param {string} req.body.query - SQL query to save.
 * @param {string} req.body.queryName - Name for the query.
 * @param {string} req.body.universeId - Identifier for the data universe.
 * @param {Object} req.headers.authorization - Bearer token for authentication.
 * @param {Object} res - Express response object
 * @returns {Object} - Response containing the status and creation result.
 */
bqRouter.post('/create-bq', async (req, res) => {
	let { query = '', queryName = '', universeId = '' } = req.body;
	// extract bearer token
	let token = req.headers.authorization?.split('Bearer ')[1];
	let { statusCode, data } = await createBQ(
		query,
		queryName,
		universeId,
		token
	);
	res.status(statusCode).json(data);
});

/**
 * Endpoint to generate multiple BigQueries (BQs) based on UML text and schema IDs.
 * @route POST /generate-bqs
 * @param {Object} req - Express request object
 * @param {string} req.body.umlText - UML text defining the queries.
 * @param {Array<string>} req.body.schemaIds - List of schema identifiers.
 * @param {string} req.body.universeId - Identifier for the data universe.
 * @param {Object} req.headers.authorization - Bearer token for authentication.
 * @param {Object} res - Express response object
 * @returns {Object} - Response containing the status and details of created queries.
 */
bqRouter.post('/generate-bqs', async (req, res) => {
	let { umlText, schemaIds, universeId } = req.body;
	let token = req.headers.authorization?.split('Bearer ')[1];

	// get bq definitions
	let umlToBQs = await umlToBQ(umlText, schemaIds);
	// create BQ for each bq definition present
	console.log('Bq Creation stage: making api calls to create BQs in PI.');
	let bqCreationResponse = [];
	try {
		for (let i = 0; i < umlToBQs.bqs.length; i++) {
			let queryDefinition = umlToBQs.bqs[i][Object.keys(umlToBQs.bqs[i])[1]];
			let queryName = umlToBQs.bqs[i][Object.keys(umlToBQs.bqs[i])[0]];
			let singleBqRes = await createBQ(
				queryDefinition,
				queryName,
				universeId,
				token
			);
			bqCreationResponse.push(singleBqRes);
		}
		res.status(200).json(bqCreationResponse);
	} catch (error) {
		res.status(500).json({
			error: error,
		});
	}
});

export default bqRouter;
