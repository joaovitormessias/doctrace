import { openai } from "../openai.js";
import type { DocumentSearchPlan } from "../types/chat.types.js";
import { documentSearchPlanPrompt } from "../prompts/document-search-plan.prompt.js";

/**
 * Gera um plano de busca para decidir como recuperar informacoes nos documentos
 *
 * O plano define se a busca deve ser semantica, textual ou hibrida, alem de
 * indicar quais termos devem ser usados e qual tipo de resposta e esperado
 */
export async function buildDocumentSearchPlan(
  question: string,
): Promise<DocumentSearchPlan> {
  const completion = await openai.chat.completions.create({
    // Garante que o modelo retorne um plano de busca em formato previsivel
    model: "gpt-5.4-mini",
    temperature: 0,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "document_search_plan",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            searchType: {
              type: "string",
              enum: ["semantic", "lexical", "hybrid"],
            },
            semanticQuery: {
              type: "string",
            },
            keywordQueries: {
              type: "array",
              items: {
                type: "string",
              },
            },
            expectedAnswerType: {
              type: "string",
              enum: [
                "company_name",
                "tax_id",
                "date",
                "money",
                "accounting_concept",
                "summary",
                "unknown",
              ],
            },
            reason: {
              type: "string",
            },
          },
          required: [
            "searchType",
            "semanticQuery",
            "keywordQueries",
            "expectedAnswerType",
            "reason",
          ],
        },
      },
    },
    messages: [
      {
        role: "developer",
        content: documentSearchPlanPrompt,
      },
      {
        role: "user",
        content: question,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    // Usa busca semantica com a pergunta original como fallback seguro
    return {
      searchType: "semantic",
      semanticQuery: question,
      keywordQueries: [],
      expectedAnswerType: "unknown",
      reason: "Nao foi possivel gerar plano de busca.",
    };
  }

  return JSON.parse(content) as DocumentSearchPlan;
}
