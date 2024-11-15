import axios from 'axios';
import { CONSTANTS } from '../../constants/bq-generation/constants.js';

export default async function createBQ(
	query = '',
	queryName = '',
	universeId = '',
	token = CONSTANTS.Token
) {
	const url = `${CONSTANTS.BaseUrl}/${CONSTANTS.EndPointCreateBQ}`;
	const schemaIds = query
		.match(/\bt_[a-zA-Z0-9]*_t\b/g)
		.map((item) => item.split('_')[1]);
	const requestBody = {
		name: queryName,
		desc: queryName,
		definition: query,
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
	try {
		let response = await axios.post(url, requestBody, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
		let responseData = response.data;
		return {
			statusCode: response.status,
			data: {
				bqId: responseData?.id,
			},
		};
	} catch (error) {
		const errorMessage = error.response.data?.subErrors
		return {
			statusCode: error.status,
			data: errorMessage,
		};
	}
}
