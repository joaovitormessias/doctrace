import pg from "pg";

const { Pool } = pg;

// Janela de conexao com o db
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
