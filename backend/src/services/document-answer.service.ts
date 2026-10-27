import { openai } from "../openai.js";
import type { Chunk, ChatResponse, IntentClassification } from "../types/chat.types.js";
import { documentAnswerPrompt } from "../prompts/document-answer.prompt.js";
import { buildDocumentSearchPlan } from "./document-search-plan.service.js";
import { searchDocumentChunksWithPlan } from "./vector.service.js";

export const NOT_FOUND = "Nao encontrei essa informacao nos documentos fornecidos.";
const MIN_SIMILARITY = Number(process.env.MIN_SIMILARITY ?? 0.55);
if (!Number.isFinite(MIN_SIMILARITY) || MIN_SIMILARITY < 0 || MIN_SIMILARITY > 1) {
  throw new Error("MIN_SIMILARITY deve estar entre 0 e 1.");
}

export function selectRelevantChunks(chunks: Chunk[], minimum: number): Chunk[] {
  return chunks.filter((chunk) => Number.isFinite(chunk.similarity) && chunk.similarity >= minimum);
}

export function groundedResponse(
  content: string | null | undefined,
  chunks: Chunk[],
  classification: IntentClassification,
): ChatResponse {
  const fallback: ChatResponse = {
    answer: NOT_FOUND, sources: [],
    intent: classification.intent, confidence: classification.confidence,
  };
  let result: unknown;
  try { result = JSON.parse(content ?? ""); } catch { return fallback; }
  if (!result || typeof result !== "object") return fallback;
  const { found, answer, sourceIds } = result as Record<string, unknown>;
  if (found !== true || typeof answer !== "string" || !answer.trim() ||
      answer.trim() === NOT_FOUND || !Array.isArray(sourceIds) || sourceIds.length === 0) return fallback;

  const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  // Qualquer referencia desconhecida invalida a resposta inteira.
  if (sourceIds.some((id) => typeof id !== "string" || !byId.has(id))) return fallback;
  const used = [...new Set(sourceIds as string[])].map((id) => byId.get(id)!);
  const sources = [...new Map(used.map((chunk) => [
    JSON.stringify([chunk.document_name, chunk.page_number]),
    { documentName: chunk.document_name, pageNumber: chunk.page_number, similarity: chunk.similarity },
  ])).values()];
  return { ...fallback, answer: answer.trim(), sources };
}

export async function answerWithDocuments(
  question: string,
  classification: IntentClassification,
): Promise<ChatResponse> {
  const plan = await buildDocumentSearchPlan(question);
  const chunks = selectRelevantChunks(await searchDocumentChunksWithPlan(plan), MIN_SIMILARITY);
  if (!chunks.length) return groundedResponse(null, [], classification);

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4",
    temperature: 0,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "grounded_document_answer", strict: true,
        schema: {
          type: "object", additionalProperties: false,
          properties: {
            found: { type: "boolean" }, answer: { type: "string" },
            sourceIds: { type: "array", items: { type: "string" } },
          },
          required: ["found", "answer", "sourceIds"],
        },
      },
    },
    messages: [
      { role: "developer", content: documentAnswerPrompt },
      { role: "user", content: JSON.stringify({
        question,
        context: chunks.map((chunk) => ({
          id: chunk.id, documentName: chunk.document_name,
          pageNumber: chunk.page_number, content: chunk.content,
        })),
      }) },
    ],
  });
  return groundedResponse(completion.choices[0]?.message?.content, chunks, classification);
}
