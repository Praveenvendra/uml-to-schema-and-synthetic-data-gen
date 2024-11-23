import axios from 'axios';
import { CONSTANTS } from '../../constants/bq-generation/constants.js';
// queryDefinition
export default async function createBQ(
	queryDefinition = '',
	queryName = '',
	universeId = CONSTANTS.UniverseId,
	token = CONSTANTS.Token2
) {
	const url = `${CONSTANTS.BaseUrl}/${CONSTANTS.EndPointCreateBQ}`;

	try {
		const schemaIds = queryDefinition
			.match(/\bt_[a-zA-Z0-9]*_t\b/g)
			.map((item) => item.split('_')[1]);
		const requestBody = {
			name: queryName,
			desc: queryName,
			definition: queryDefinition,
			universes: [universeId],
			aqDefinitionRequest: {
				tables: [...schemaIds],
			},
			startTime: '2023-04-12T16:42:00.000Z',
			endTime: '2027-09-27T11:04:48.188Z',
			timeZone: 'Asia/Kolkata',
			frequency: '0 * * * * ?',
			type: 'ONE_TIME',
			dataStoreType: 'APPEND',
			dataReadAccess: 'PRIVATE',
			dataWriteAccess: 'PRIVATE',
			metadataReadAccess: 'PRIVATE',
			metadataWriteAccess: 'PRIVATE',
			execute: 'ORGANIZATION',
			tags: {
				BLUE: ['BQ'],
			},
			additionalMetadata: {
				thumbnail3d: 'thumbnail3d',
			},
			visibility: 'PUBLIC',
		};
		let response = await axios.post(url, requestBody, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
		let responseData = response.data;
		return {
			statusCode: response.status,
			data: {
				bqName: queryName,
				bqId: responseData?.id,
			},
		};
	} catch (error) {
		const errorMessage = error.response?.data;
		return {
			statusCode: error.status,
			data: errorMessage || error,
		};
	}
}
