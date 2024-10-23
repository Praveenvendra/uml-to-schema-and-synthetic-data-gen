import e from "express";
import { Router } from "express";
import umlToPayload from "../../utils/synth-data/uml-to-payload.js";
import synthDataGen from "../../utils/synth-data/synth-data-gen.js";
import payLoadToPrompt from "../../utils/synth-data/payload-to-prompt.js";

const router = Router();
router.use(e.json());

router.post("/synth-data/send-uml", async (req, res) => {
  const data = req.body?.umlCode;
  console.log("Request received: UML to Payload");
  const fileId = await umlToPayload(data);
  console.log("Response received: UML to Payload");
  let relationshipsData, synthData;

  if (fileId) {
    console.log("Request received: Payload to Prompt");
    relationshipsData = await payLoadToPrompt(fileId);
    console.log("Response received: Payload to Prompt");
  }

  if (!fileId) {
    res
      .end("Fild ID not generated for UML to Payload, Please Try again")
      .status(500);
  }

  if (relationshipsData) {
    console.log("Request received: Synth Data");
    synthData = await synthDataGen(relationshipsData);
    console.log("Response received: Synth Data");
  }

  if (!relationshipsData) {
    res
      .end("Generation of relationship among entities failed, Please Try again")
      .status(500);
  }

  if (synthData?.errorMessage) {
    res.status(500).json(synthData);
  }
  res.json(synthData);
});

export default router;
