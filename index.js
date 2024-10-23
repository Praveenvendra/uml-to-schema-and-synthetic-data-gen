import e from "express";
import router from "./routers/synth-data/router.js";

const app = e();
const PORT = 3000;

app.use(router);

app.listen(PORT, () => {
  "Node JS service started";
});
