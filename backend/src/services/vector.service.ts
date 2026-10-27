import { pool } from "../db.js";
import { openai } from "../openai.js";
import type { Chunk, DocumentSearchPlan } from "../types/chat.types.js";

export async function searchDocumentChunksWithPlan(
  plan: DocumentSearchPlan,
): Promise<Chunk[]> {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: plan.semanticQuery,
  });
  const vector = `[${embedding.data[0].embedding.join(",")}]`;
  const terms = plan.searchType === "semantic" ? [] : plan.keywordQueries
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .slice(0, 8);

  // strpos trata %, _ e demais caracteres como texto literal, sem curingas.
  const conditions = terms.map((_, i) =>
    `strpos(lower(unaccent(content)), lower(unaccent($${i + 2}::text))) > 0`,
  );
  const lexicalScore = conditions.length
    ? conditions.map((condition) => `(CASE WHEN ${condition} THEN 1 ELSE 0 END)`).join(" + ")
    : "0";
  const where = plan.searchType === "lexical"
    ? `WHERE ${conditions.length ? conditions.join(" OR ") : "FALSE"}`
    : "";
  const order = plan.searchType === "semantic"
    ? "embedding <=> $1::vector, id"
    : `(${lexicalScore}) DESC, embedding <=> $1::vector, id`;

  const result = await pool.query<Chunk>(`
    SELECT id, content, document_name, page_number,
      1 - (embedding <=> $1::vector) AS similarity
    FROM document_chunks
    ${where}
    ORDER BY ${order}
    LIMIT 8;
  `, [vector, ...terms]);

  // Match lexical nunca e convertido em uma similaridade artificial de 100%.
  return result.rows;
}
