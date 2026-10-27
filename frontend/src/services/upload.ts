import axios from "axios";

const ingestUrl = import.meta.env.VITE_N8N_INGEST_URL;

/*
 * Aqui eh aonde eh feito o envio de arquivos para o n8n por meio da variavel de ambiente configurada
 *
 * O FormData monta uma requisicao `multpart/form-data`
 * O metodo append permite adicionar um campo ao formulario, file e nome
 * O axios consegue enviar formData em multpart/formData que eh justamente o formato
 * comum para upload de arquivos
 *
 */
export async function uploadDocument(file: File) {
  if (!ingestUrl) {
    throw new Error("VITE_N8N_INGEST_URL não configurada.");
  }

  const formData = new FormData();

  formData.append("file", file, file.name);

  const response = await axios.post(ingestUrl, formData);

  return response.data;
}
