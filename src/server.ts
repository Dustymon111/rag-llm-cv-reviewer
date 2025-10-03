import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import { uploadRouter } from './routes/upload.ts';
import { evaluateRouter } from './routes/evaluates.ts';
import { resultRouter } from './routes/result.ts';


const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use(uploadRouter);
app.use(evaluateRouter);
app.use(resultRouter);

app.get('/', (req: any, res: any) => {
    res.send("Hello World!");
    console.log("Response sent");
})


const port = Number(process.env.PORT || 8000);
app.listen(port, () => console.log(`API on :${port}`));