import express from "express";
import authRoutes from "./core/modules/auth/auth.routes";
import chatRoutes from "./core/modules/chat/chat.routes";
import menuRoutes from "./core/modules/menu/menu.routes";
import profileRoutes from "./core/modules/profile/profile.routes";

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);
app.use("/menu", menuRoutes);
app.use("/profile", profileRoutes);

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

export default app;
