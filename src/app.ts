import express from "express";
import authRoutes from "./core/modules/auth/auth.routes";

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

export default app;