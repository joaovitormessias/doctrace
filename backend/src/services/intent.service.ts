import { openai } from "../openai.js";
import type { IntentClassification } from "../types/chat.types.js";
import { intentClassifierPrompt } from "../prompts/intent.prompt.js";

export async function classifyIntent(
  question: string,
): Promise<IntentClassification> {
  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    temperature: 0,
    // Garante que a classificacao siga um formato previsivel para o backend
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "intent_classification",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            intent: {
              type: "string",
              enum: ["document_question", "general_accounting", "out_of_scope"],
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            reason: {
              type: "string",
            },
          },
          required: ["intent", "confidence", "reason"],
        },
      },
    },
    messages: [
      {
        role: "developer",
        content: intentClassifierPrompt,
      },
      {
        role: "user",
        content: question,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    return {
      intent: "out_of_scope",
      confidence: 0,
      reason: "O classificador nao retornou conteudo.",
    };
  }

  try {
    return JSON.parse(content) as IntentClassification;
  } catch {
    // Em caso de resposta invalida, bloqueia por seguranca em vez de assumir uma intencao
    return {
      intent: "out_of_scope",
      confidence: 0,
      reason: "Nao foi possivel interpretar a classificacao.",
    };
  }
}
