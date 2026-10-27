import "dotenv/config";
import express from "express";
import cors from "cors";
import { chatRoutes } from "./routes/chat.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/chat", chatRoutes);

const PORT = Number(process.env.PORT ?? 3001);

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});
