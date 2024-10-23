import e from "express";
import { Router } from "express";
import umlToPayload from "../../utils/synth-data/uml-to-payload.js";
import synthDataGen from "../../utils/synth-data/synth-data-gen.js";
import payLoadToPrompt from "../../utils/synth-data/payload-to-prompt.js";
import CONSTANTS from "../../constants/synth-data/constants.js";

const router = Router();
router.use(e.json());

router.post("/synth-data/send-uml", async (req, res) => {
  const umlCode = req.body?.umlCode;
  const entities =
    parseInt(req.body?.entities) || umlCode?.split("class").length - 1;
  // find out number of entities/classes in uml
  const prompt = req.body?.prompt;
  let processFailed = false;
  console.log("Request received: UML to Payload");
  const fileId = await umlToPayload(umlCode, prompt, entities);
  console.log("Response received: UML to Payload");
  let relationshipsData, synthData;

  if (fileId) {
    console.log("Request received: Payload to Prompt");
    relationshipsData = await payLoadToPrompt(fileId);
    console.log("Response received: Payload to Prompt");
    let apiRetry = 1;
    while (
      (relationshipsData?.schema?.tables?.length !== entities ||
        !relationshipsData) &&
      apiRetry < CONSTANTS.RETRIES
    ) {
      console.log("Request received: Payload to Prompt");
      relationshipsData = await payLoadToPrompt(fileId);
      console.log("Response received: Payload to Prompt");
      apiRetry++;
    }
  }

  if (!fileId) {
    res
      .status(500)
      .end("Fild ID not generated for UML to Payload, Please Try again");
      processFailed = true
  }

  if (relationshipsData) {
    console.log("Request received: Synth Data");
    synthData = await synthDataGen(relationshipsData);
    console.log("Response received: Synth Data");
  }

  if (!relationshipsData && !processFailed) {
    res
      .status(500)
      .end(
        "Generation of relationship among entities failed, Please Try again"
      );
      processFailed = true
  }

  if (synthData?.errorMessage) {
    res.status(500).json(synthData);
  }
  !processFailed && res.json(synthData);
});

export default router;
