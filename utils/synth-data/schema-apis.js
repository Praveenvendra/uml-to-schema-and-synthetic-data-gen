import axios from 'axios';
import constants from '../../constants/synth-data/constants.js';

const CONSTANTS = constants.CONSTANTS;

export async function insertData(
	schemaId = '',
	schemaData = [],
	token = CONSTANTS.token
) {
	const url = `${CONSTANTS.baseUrl}/${CONSTANTS.dataInsertionUrl}/${schemaId}/instances?upsert=true`;
	try {
		const response = await axios.post(url, schemaData, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
		const responseData = response.data;
		console.log('Data Insertion Successful: ', schemaId);
		return {
			id: schemaId,
			statusCode: response.status,
			data: `Data Insertion Successful: ${response.data?.succeededCount} instances`,
		};
	} catch (error) {
		if (error.response) {
			// The request was made and the server responded with a status code
			// that falls out of the range of 2xx
			console.log('Insert Error for Schema ID: ', schemaId);
			console.log('Insert Error response data:', error.response.data);
			console.log('Insert Error response status:', error.response.status);
			console.log('Insert Error response headers:', error.response.headers);
		} else if (error.request) {
			// The request was made but no response was received
			console.log('Insert Error request:', error.request);
		} else {
			// Something happened in setting up the request that triggered an Error
			console.log('Insert Error message:', error.message);
		}
		return {
			id: schemaId,
			statusCode: error.status,
			data: error.response.data,
		};
	}
}

export async function fetchData(schemaId = '', token = CONSTANTS.token) {
	const url = `${CONSTANTS.baseUrl}/${CONSTANTS.fetchInstancesUrl}/${schemaId}/instances/list?size=100000000`;
	try {
		const response = await axios.get(url, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
		});
		console.log(`${schemaId}: ${response.data?.msg}`);
		return {
			id: schemaId,
			statusCode: response.status,
			data: `${response.data?.entities?.length} instances found`,
		};
	} catch (error) {
		if (error.response) {
			// The request was made and the server responded with a status code
			// that falls out of the range of 2xx
			console.log('Fetch Error response data:', error.response.data);
			console.log('Fetch Error response status:', error.response.status);
			console.log('Fetch Error response headers:', error.response.headers);
		} else if (error.request) {
			// The request was made but no response was received
			console.log('Fetch Error request:', error.request);
		} else {
			// Something happened in setting up the request that triggered an Error
			console.log('Fetch Error message:', error.message);
		}
		return {
			id: schemaId,
			statusCode: error.status,
			data: error.response.data,
		};
	}
}
