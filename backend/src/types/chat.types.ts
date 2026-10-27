// Representa um trecho recuperado do banco vetorial
export type Chunk = {
  id: string;
  content: string;
  document_name: string;
  page_number: number | null;
  similarity: number;
};

// Representa a intencao da pergunta do usuario
export type Intent =
  | "document_question"
  | "general_accounting"
  | "out_of_scope";

// Representa o resultado do classificador de intecao
export type IntentClassification = {
  intent: Intent;
  confidence: number;
  reason: string;
};

// Representa uma fonte que sera devolvida para o frontend
export type Source = {
  documentName: string;
  pageNumber: number | null;
  similarity: number;
};

// Representa o formato da resposta final da rota /chat
export type ChatResponse = {
  answer: string;
  sources: Source[];
  intent?: Intent;
  confidence?: number;
};

// Representa estrategia de busca que sera usada para recuperar informacoes
export type DocumentSearchPlan = {
  searchType: "semantic" | "lexical" | "hybrid";
  semanticQuery: string;
  keywordQueries: string[];
  expectedAnswerType:
    | "company_name"
    | "tax_id"
    | "date"
    | "money"
    | "accounting_concept"
    | "summary"
    | "unknown";
  reason: string;
};
