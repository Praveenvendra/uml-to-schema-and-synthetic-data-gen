import axios from "axios";
import CONSTANTS from "../../constants/synth-data/constants.js";

export default async function umlToPayload(umlCode = "") {
  const url = `${CONSTANTS.BASE_URL}/${CONSTANTS.SERVICE}/response`;
  const user_prompt = "Mention all the 21 entities without skipping";
  const requestHeaders = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  const requestBody = {
    user_id: CONSTANTS.USER_ID,
    assistant_id: CONSTANTS.ASSISTANT_ID_UML_TO_PAYLOAD,
    thread_id: "",
    file_id: "",
    input: `${umlCode}.-${user_prompt}`,
    model: "",
  };
  try {
    const response = await axios.post(url, requestBody, requestHeaders);
    console.log("Response received: UML to payload")
    console.log(response.data)
    return response.data?.messages[0]?.file_id;
  } catch (error) {
    console.error("Uml to payload error: ", error);
    return;
  }
}
