import e from 'express';
import bodyParser from 'body-parser';
import router from './routers/synth-data/router.js';
import bqRouter from './routers/bq-generation/BQ.js';
import routerSynthDataInsertion from './routers/synth-data/synthDataInsertion.js';

const app = e();
const PORT = 3001;

// to handle large payloads for synth data insertion
app.use(bodyParser.json({ limit: '50mb' }));

app.use(router);
app.use(bqRouter);
app.use(routerSynthDataInsertion);

app.get('/test', (req, res) => {
	res.end('Node JS service working fine!');
});

app.listen(PORT, () => {
	console.log(`Node JS service started on ${PORT}`);
});
