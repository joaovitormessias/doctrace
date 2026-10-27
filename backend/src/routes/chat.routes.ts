import { Router } from "express";
import { handleChat } from "../controllers/chat.controller.js";

export const chatRoutes = Router();

// Responsavel por processar as perguntas enviadas ao chat
chatRoutes.post("/", handleChat);
