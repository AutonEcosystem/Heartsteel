import express from "express";

const app = express();

export function startServer() {
  app.listen(process.env.PORT || 3000);
}
