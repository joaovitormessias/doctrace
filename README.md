# DocTrace — IA para Contabilidade

Chat React/MUI com backend Node.js, OpenAI, ingestão de PDFs pelo n8n e recuperação híbrida (texto + vetores) em PostgreSQL/pgvector.

## Funcionalidades e limites

Projeto de portfólio para consultar documentos contábeis com respostas baseadas em trechos recuperados. Consulte [a arquitetura, os controles e os limites](docs/REVISAO-TECNICA.md).

- Todas as perguntas contábeis agora usam recuperação documental. Sem evidência, a resposta é uma recusa sem fontes.
- O backend valida o formato estruturado da resposta e rejeita IDs de fontes que não existem no contexto.
- A suíte de regressão cobre fontes, recusas, busca, entrada HTTP e ingestão com dependências simuladas.
- O histórico aparece na tela, mas desaparece ao recarregar; somente a pergunta atual vai ao backend.
- Ingestão, OpenAI real e demonstração por link ainda precisam de validação de ponta a ponta: o ambiente de revisão não dispõe de Docker nem chave API.

## Arquitetura

1. O navegador envia um PDF ao webhook do n8n.
2. O n8n extrai texto, cria blocos de 1.200 caracteres com sobreposição de 200, gera embeddings `text-embedding-3-small` e insere em `document_chunks`.
3. O navegador envia `POST /chat` com `question` ao backend.
4. A IA classifica a intenção. No modo documental, gera um plano de busca lexical, semântica ou híbrida, recupera até oito trechos e gera uma resposta.
5. O backend devolve `answer`, `sources`, `intent` e `confidence`. Confidence é a confiança da classificação, não uma medida de veracidade da resposta.

O workflow grava `page_number = null`, cria/reutiliza um registro em `documents` e preenche `document_id`. A interface exibe os nomes das fontes, mas não oferece download do PDF original.

## Pré-requisitos

- Git: https://git-scm.com/downloads
- Docker Engine + Compose v2 no Linux, ou Docker Desktop iniciado no Windows/macOS: https://docs.docker.com/get-started/get-docker/
- Internet para imagens Docker, dependências npm e API OpenAI.
- Chave OpenAI com créditos e acesso aos modelos usados: `gpt-5.4`, `gpt-5.4-mini` e `text-embedding-3-small`. A chave é configurada no backend **e** na credencial do n8n.
- Portas locais 8088 e 5679 disponíveis para a configuração de demonstração.

Não é necessário instalar Node.js na máquina para o fluxo Docker. Os comandos abaixo usam Bash (Linux/macOS/WSL ou Git Bash no Windows); execute na raiz do repositório.

## 1. Obter o projeto e configurar o ambiente

```bash
git clone --branch main https://github.com/joaovitormessias/doctrace.git doctrace-demo
cd doctrace-demo
cp .env.example .env
```

Edite `.env` em um editor. Substitua `POSTGRES_PASSWORD`, a mesma senha em `DATABASE_URL` e `OPENAI_API_KEY`. Use uma senha alfanumérica longa para evitar caracteres que precisam de codificação na URL. Exemplo da estrutura, sem chave real:

```dotenv
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SUA_SENHA_ALFANUMERICA
POSTGRES_DB=doctrace_ai
DATABASE_URL=postgresql://postgres:SUA_SENHA_ALFANUMERICA@postgres:5432/doctrace_ai
OPENAI_API_KEY=SUA_CHAVE
MIN_SIMILARITY=0.55
N8N_IMAGE=n8nio/n8n:2.43.1
```

Nunca envie `.env` nem credenciais exportadas ao GitHub. Crie o proprietário do n8n na interface; não dependa de variáveis legadas `N8N_BASIC_AUTH_*`.

## 2. Iniciar a configuração de demonstração local

Foi acrescentado um Compose separado, adequado para **demonstração temporária**, com acesso pelo mesmo endereço, evitando que o navegador remoto tente acessar `localhost` do avaliador.

```bash
docker version
docker compose version
docker compose -p doctrace-demo -f docker-compose.demo.yml config --quiet
docker compose -p doctrace-demo -f docker-compose.demo.yml up -d --build
docker compose -p doctrace-demo -f docker-compose.demo.yml ps
```

Espere o banco ficar healthy e os outros serviços ficarem running. Se não ocorrer:

```bash
docker compose -p doctrace-demo -f docker-compose.demo.yml logs --tail=100 backend n8n frontend gateway
```

A aplicação fica em http://localhost:8088 e o editor do n8n em http://localhost:5679. Banco e API não publicam portas no host. O frontend é compilado em um build separado e servido pelo Nginx, sem Vite dev exposto. A configuração é para demonstração, não oferece os controles de um serviço de produção completo. Os arquivos dessa configuração foram revisados estaticamente, mas ainda não foram executados em Docker.

## 3. Configurar e publicar o workflow n8n

1. Abra http://localhost:5679 e crie a conta de proprietário. Guarde o acesso; não entregue o editor ao avaliador.
2. Crie um workflow e use a opção de importar de arquivo (menu de ações do workflow).
3. Importe `n8n/doctrace-ingestao.json`.
4. Abra `HTTP Request - openai`. Selecione autenticação por credencial genérica, tipo **Bearer Auth**. Crie uma credencial com sua chave OpenAI no campo de token. O export revisado não carrega referências a credenciais pessoais; selecione as credenciais criadas na sua instância.
5. Confira: método POST, URL `https://api.openai.com/v1/embeddings`, envio de body JSON. Configure o campo JSON inteiro em modo Expression com:

   ```javascript
   {{ { model: "text-embedding-3-small", input: $json.content } }}
   ```

   Na representação JSON exportada do n8n, a expressão começa com `=`. O export revisado já contém essa expressão; confira no teste de execução o valor enviado e retornado.
6. Abra `Execute a SQL query` e crie/selecione a credencial PostgreSQL:

   | Campo | Valor |
   | --- | --- |
   | Host | `postgres` |
   | Port | `5432` |
   | Database | `doctrace_ai` (ou seu POSTGRES_DB) |
   | User | `postgres` (ou seu POSTGRES_USER) |
   | Password | a mesma senha de `.env` |
   | SSL | desativado para esta rede Docker local |

7. Confira o Webhook: POST, path `ingest-document`, resposta após o último nó. `Extract from File` deve usar operação PDF e campo binário `file`.
8. Salve e publique/ative o workflow, conforme a versão do n8n. A aplicação usa a URL de produção `/webhook/ingest-document`, não `/webhook-test/ingest-document`.
9. Após configurar, exporte o workflow novamente sem segredos, caso queira versionar a configuração corrigida. Nunca inclua credenciais com chave real.

## 4. Preparar um PDF conhecido

Abra `docs/samples/relatorio-demo.html` no navegador. Use Imprimir → Salvar como PDF e salve como `relatorio-demo.pdf`. É uma empresa fictícia, com fatos conhecidos, para comparar respostas. Utilize uma base nova de demonstração, sem documentos particulares misturados.

## 5. Ingerir e conferir o banco

1. Abra http://localhost:8088.
2. Clique em Selecionar PDFs, escolha `relatorio-demo.pdf` e clique em Enviar todos.
3. Confira a execução no n8n: todos os nós devem terminar com sucesso e a resposta de embeddings deve conter um vetor de 1.536 posições.
4. Confira que houve inserção no banco, além da mensagem de sucesso da interface:

```bash
docker compose -p doctrace-demo -f docker-compose.demo.yml exec postgres psql -U postgres -d doctrace_ai -c "SELECT document_name, count(*) AS chunks, min(length(content)) AS menor_trecho FROM document_chunks GROUP BY document_name;"
docker compose -p doctrace-demo -f docker-compose.demo.yml exec postgres psql -U postgres -d doctrace_ai -c "SELECT document_name, page_number, content FROM document_chunks WHERE document_name = 'relatorio-demo.pdf' LIMIT 3;"
```

Se você alterou usuário ou banco, substitua os dois valores nos comandos. As extensões `vector`, `pgcrypto` e `unaccent` estão em `init.sql`, executado somente na primeira inicialização de um volume novo. Para um volume antigo que não tem `unaccent`:

```bash
docker compose -p doctrace-demo -f docker-compose.demo.yml exec postgres psql -U postgres -d doctrace_ai -c "CREATE EXTENSION IF NOT EXISTS unaccent;"
```

## 6. Reproduzir os testes

Execute no chat, em uma base que contenha apenas o PDF de demonstração:

| Teste | Entrada | Critério de aprovação |
| --- | --- | --- |
| Fato presente | `Segundo relatorio-demo.pdf, qual é a razão social?` | Aurora Demonstração Ltda.; fonte com o nome do PDF |
| Valor presente | `Segundo relatorio-demo.pdf, qual foi o lucro líquido de janeiro de 2026?` | R$ 1.234,00; fonte correta |
| Fato ausente | `Segundo relatorio-demo.pdf, qual é o CNPJ da empresa?` | Admite ausência; não inventa número |
| Empresa ausente | `Qual foi o lucro da Empresa Inexistente XYZ em março de 2030?` | Não transfere o lucro da empresa de demonstração para outra empresa |
| Fora do domínio | `Qual placa de vídeo comprar para jogar?` | Recusa por escopo |
| Contexto insuficiente geral | `O que é lucro presumido?` | Deve usar documento que sustente a resposta ou admitir ausência; com a fixture fornecida, deve admitir ausência |
| Histórico visível | Enviar duas perguntas completas | As duas perguntas e respostas permanecem na tela durante a sessão |
| PDF inválido | Arquivo renomeado para .pdf sem conteúdo PDF válido | Não declara indexação bem-sucedida sem dados; conferir execução e banco |

Registre entrada, saída, fonte, horário e resultado. Similaridade alta não prova que a resposta está correta. Como a IA classifica e gera respostas, compare critérios sem exigir uma redação idêntica.

A rota `/health` só prova que Express responde, não que banco, embeddings e geração estão funcionando:

```bash
curl http://localhost:8088/api/health
curl -i -X POST http://localhost:8088/api/chat -H 'Content-Type: application/json' -d '{"question":""}'
curl -X POST http://localhost:8088/api/chat -H 'Content-Type: application/json' -d '{"question":"Segundo relatorio-demo.pdf, qual foi o lucro líquido?"}'
```

Esperado: primeiro `{"status":"ok"}`; segundo HTTP 400; terceiro resposta JSON com valor e fontes após ingestão. O terceiro consome API OpenAI.

## 7. Compartilhar sem instalação no computador do avaliador

Consulte [o guia de acesso por link](docs/ACESSO-POR-LINK.md). Quem acessa recebe uma URL HTTPS e acessa pelo navegador. Docker, n8n e a chave permanecem no computador que executa o projeto.

## 8. Encerrar sem apagar os documentos

```bash
docker compose -p doctrace-demo -f docker-compose.demo.yml down
```

Os volumes permanecem. Não use `down -v` para um banco que deseja preservar. Reinicie com `up -d`. Reenviar o mesmo PDF com o mesmo nome não deve duplicar trechos idênticos. PDFs com nomes distintos são documentos distintos. Um nome identifica um registro do catálogo; conteúdo diferente com o mesmo nome acrescenta trechos, não substitui a versão antiga. Não há versionamento de arquivos.

## Verificação de build fora do Docker

Com Node.js 24 e npm, execute separadamente:

```bash
cd backend
npm ci
npm test
cd ../frontend
npm ci
npm run build
npm run lint
```

Para validar a cópia atual, execute os comandos acima. A suíte contém 16 testes de regressão. Os testes usam mocks de OpenAI/banco e executam os trechos de JavaScript do workflow: não comprovam a integração real. O build frontend emite um aviso de tamanho do bundle, sem impedir a compilação.

## Volume antigo e mudança de schema

A demonstração usa um projeto/volumes próprios. O `init.sql` revisado inclui índices únicos usados no workflow. Ele roda automaticamente apenas num banco novo. **Não reutilize um banco antigo sem revisar o schema**: o novo workflow usa `ON CONFLICT (name)` e precisa desse índice.

Se já iniciou esta mesma demonstração com o schema antigo, preserve os dados. Para uma avaliação com base nova, use um novo nome de projeto em todos os comandos (por exemplo `doctrace-demo-v2`), após parar os containers anteriores para liberar as portas. Isso cria outros volumes e não remove os antigos. Se houver dados que precisem ser migrados, faça backup e prepare migração separada; este guia não apaga nem deduplica linhas antigas automaticamente.

## Reprodutibilidade das versões

Os lockfiles npm estão versionados e os Dockerfiles usam `npm ci`. O n8n da demonstração está fixado em `2.43.1` (release existente no repositório oficial); sua imagem/execução não foram testadas neste ambiente. Node, PostgreSQL e Nginx ainda usam tags de linha de versão. Depois de validar a instância real, registre os digests e fixe as imagens se precisar repetir exatamente o ambiente. Não atualize n8n existente sem backup e avaliação de compatibilidade.

Referências: [n8n user management](https://docs.n8n.io/hosting/configuration/user-management-self-hosted/), [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
