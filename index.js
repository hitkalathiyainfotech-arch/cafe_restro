import express from 'express';
import { config } from 'dotenv';
import cors from 'cors';
import log from './utils/logger.js';
import connectDB from './db/connectDB.js';
import indexRouter from './routes/index.route.js';
import morgan from 'morgan';

//.env 
config();
const PORT = process.env.PORT || 8000;
const DB_URL = process.env.DB_URL

const app = express();
connectDB(DB_URL);
//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"))

//home route
app.get("/", async (req, res) => {
  return res.send("<h2>congratulations Cafe & Restro Api's Is Woring </h2>")
});

app.use("/api", indexRouter);

app.listen(PORT, (err) => {
  if (err) {
    console.error("Error During Port Listen!!");
  }
  log.success(`Application Running Successfull On PORT : ${PORT}`);
})