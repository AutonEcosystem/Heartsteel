import express from "express";

const app = express();

export function startServer() {
  app.listen(process.env.PORT || 3000);
}

app.get("/tokens/:contractAddress/:tokenID", (req, res) => {
  console.log(req.params);
});
