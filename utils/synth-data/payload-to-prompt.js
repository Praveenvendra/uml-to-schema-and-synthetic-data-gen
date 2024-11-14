import axios from "axios";
import CONSTANT from "../../constants/synth-data/constants.js";

const {CONSTANTS} = CONSTANT;

export default async function payLoadToPrompt(fileId = "") {
  const url = `${CONSTANTS.BASE_URL}/${CONSTANTS.SERVICE}/downloadFile?file_id=${fileId}`;

  try {
    const response = await axios.get(url);
    return {...response.data,
      prompt : "Build a comprehensive schema for managing aircraft information including various tables for aircraft types, capacities, maintenance schedules, registrations, models, variants and more. Each table should reflect real-life data attributes and maintain relationships in accordance with the aviation domain."
    };
  } catch (error) {
    console.error("payload to prompt error: ", error);
    return;
  }
}
