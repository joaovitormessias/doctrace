CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  page_number INTEGER,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
ON document_chunks
USING hnsw (embedding vector_cosine_ops);

-- Um nome identifica um documento no catalogo da demonstracao.
-- Reenvio identico nao duplica trechos; novo nome cria documento separado.
CREATE UNIQUE INDEX IF NOT EXISTS documents_name_unique_idx ON documents (name);
CREATE UNIQUE INDEX IF NOT EXISTS document_chunks_content_unique_idx
ON document_chunks (document_id, md5(content));
