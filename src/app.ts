import express from "express";

const app = express();

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

export default app;