import type { Request, Response } from "express";
import { classifyIntent } from "../services/intent.service.js";
import { answerWithDocuments } from "../services/document-answer.service.js";

export async function handleChat(req: Request, res: Response) {
  try {
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";

    if (!question || question.length > 4000) {
      return res.status(400).json({
        error: "Informe uma pergunta de texto com 1 a 4000 caracteres.",
      });
    }

    // Classifica a pergunta para deicidir qual fluxo de resposta deve ser usado
    const classification = await classifyIntent(question);

    // Perguntas conceituais tambem precisam de evidencia documental.
    if (classification.intent !== "out_of_scope") {
      return res.json(await answerWithDocuments(question, classification));
    }

    // Bloqueia perguntas fora do dominio contabil ou dos documentos carregados
    return res.json({
      answer:
        "Eu so posso responder perguntas relacionadas a contabilidade ou aos documentos contabeis carregados.",
      sources: [],
      intent: classification.intent,
      confidence: classification.confidence,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro interno ao processar a pergunta.",
    });
  }
}
