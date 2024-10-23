import axios from "axios";
import CONSTANTS from "../../constants/synth-data/constants.js";

export default async function payLoadToPrompt(fileId = "") {
  const url = `${CONSTANTS.BASE_URL}/${CONSTANTS.SERVICE}/downloadFile?file_id=${fileId}`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("payload to prompt error: ", error);
    return;
  }
}
