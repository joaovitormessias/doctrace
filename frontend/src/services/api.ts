import axios from "axios";


// Conexao com backend usando variavel de ambiente configuravel, caso nao tenha o padrao eh a porta:3001
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3001",
});
