import express from "express";
import { getMetadata } from "./metadata";

const app = express();

export function startServer() {
  app.listen(process.env.PORT || 3000);
}

app.get("/tokens/:contractAddress/:tokenID", async (req, res) => {
  const { contractAddress, tokenID } = req.params;
  const metadata = await getMetadata(contractAddress, tokenID);
  metadata ? res.send(metadata) : res.send({});
});
