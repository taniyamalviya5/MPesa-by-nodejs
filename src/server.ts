const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
import router from "./app";
import cors from "cors";

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "200mb",
    parameterLimit: 100000,
  })
);
app.use(bodyParser.json({ limit: "200mb" }));

// global error handle
app.use((err: any, req: any, res: any, next: any) => {
  res.statu(err.status || 500);
  res.json({
    success: false,
    message: err.message,
    error: err,
  });
});

// for API
app.use("/", router);

// listen to port 8000rs
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
