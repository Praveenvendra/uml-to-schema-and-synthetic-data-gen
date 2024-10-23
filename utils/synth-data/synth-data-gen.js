import axios from "axios";
import CONSTANTS from "../../constants/synth-data/constants.js";

export default async function synthDataGen(relationships = {}) {
  const url = `${CONSTANTS.BASE_URL}/${CONSTANTS.SERVICE_SYNTH_DATA}/api/v1/generate/multi-table`;

  const requestHeaders = {
    headers: {
      "Content-Type": "application/json",
      "api-key": `${CONSTANTS.TOKEN_OPEN_AI}`,
    },
  };
  const requestBody = { ...relationships };

  try {
    const response = await axios.post(url, requestBody, requestHeaders);
    return response.data;
  } catch (error) {
    console.error("synth data gen error: ", error);
    return {
      errorMessage: error?.response?.data?.message,
      errorStack: {
        validationError: error?.response?.data?.validationErrors,
        stackDetails: error?.response?.data?.stack,
      },
    };
  }
}
