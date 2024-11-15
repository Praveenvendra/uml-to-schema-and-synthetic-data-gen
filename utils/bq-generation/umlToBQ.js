import axios from 'axios';
import { CONSTANTS } from '../../constants/bq-generation/constants.js';

export default async function umlToBQ(umlText = '') {
	try {
		// step 1: send uml to file id
		const umlToFildIdUrl = `${CONSTANTS.BaseUrl}/${CONSTANTS.EndPointAgentFileId}`;
		const requestBodyUmlToFildId = {
			user_id: 'Gaian@123',
			assistant_id: CONSTANTS.AssistantIdUmlToQueries,
			thread_id: '',
			file_id: '',
			input: `${umlText}.Give the output queries in a file. give me the atleast 20 queries`,
			model: '',
		};
		let umlFildId;

		// retry until a fild id is received
		while (!umlFildId) {
			let umlToFileIdRes = await axios.post(
				umlToFildIdUrl,
				requestBodyUmlToFildId,
				{
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);
			umlFildId = umlToFileIdRes.data?.messages[0]?.file_id;
		}
		console.log('Step 1: Uml sent to agent and file id received');

		// step 2: send fild id to get possible queries
		const umlFileIdToQueriesUrl = `${CONSTANTS.BaseUrl}/${CONSTANTS.EndPointAgentResponse}?file_id=${umlFildId}`;
		let umlFileIdToQueriesResponse = await axios.get(umlFileIdToQueriesUrl);
		let possibleQueriesJson = umlFileIdToQueriesResponse.data;
		console.log('Step 2: Possible SQL queries from UML generated');

		return {
			statusCode: umlFileIdToQueriesResponse.status,
			data: possibleQueriesJson,
		};
		// // step 3: send possible queries to agent for conversion to bq
		// const queryToBqAgentUrl = umlToFildIdUrl; // since they will use same urls
		// const requestBodyForBqDefinitions = {
		// 	user_id: 'Gaian@123',
		// 	assistant_id: CONSTANTS.AssistantIdSqlToBq,
		// 	thread_id: '',
		// 	file_id: '',
		// 	input: possibleQueriesJson + "Give response only in json, no helper text is needed since your output will be directly used in javascript code",
		// 	model: '',
		// };
		// const possibleQueriesToBqResponse = await axios.post(
		// 	queryToBqAgentUrl,
		// 	requestBodyForBqDefinitions
		// );
		// const bqDefinitions = possibleQueriesToBqResponse.data;
		// console.log('Step 3: BQs generated from possible SQL queries in step 2');
		// return bqDefinitions;
	} catch (error) {
		console.log('bq generation error: ', error.response.data);

	}
}
