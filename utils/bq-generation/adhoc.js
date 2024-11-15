import axios from 'axios';
import { CONSTANTS } from '../../constants/bq-generation/constants.js';

export default async function adhoc(query = '', token = CONSTANTS.Token) {
	const adhocUrl = `${CONSTANTS.BaseUrl}/${CONSTANTS.EndpointAdhoc}`;
	const requestBody = {
		type: 'TIDB',
		definition: query,
	};

	try {
		let adhocResponse = await axios.post(adhocUrl, requestBody, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
		let adhocData = adhocResponse.data?.model?.data;
		return {
			statusCode: adhocResponse.status,
			data: adhocData,
		};
	} catch (error) {
		const errorMessage = error.response?.data?.subErrors
		return {
			statusCode: error.status || 500,
			data: errorMessage,
		};
	}
}
