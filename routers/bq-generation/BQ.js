import { Router } from 'express';
import adhoc from '../../utils/bq-generation/adhoc.js';
import createBQ from '../../utils/bq-generation/createBQ.js';
import umlToBQ from '../../utils/bq-generation/umlToBQ.js';

const bqRouter = Router();

bqRouter.post('/adhoc', async (req, res) => {
	let { query } = req.body;
	// extract bearer token
	let token = req.headers.authorization?.split('Bearer ')[1];
	let { statusCode, data } = await adhoc(query, token);
	res.status(statusCode).json(data);
});

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
