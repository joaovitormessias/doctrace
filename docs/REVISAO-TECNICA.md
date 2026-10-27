# Arquitetura, validações e limites do DocTrace

Descrição técnica da versão de portfólio. A configuração inclui backend, interface, workflow de ingestão, Docker e documentação. Um repositório público não implica uma instância pública da aplicação.

## Conclusão

Os bloqueios identificados de build e de caminho contábil sem documentos foram corrigidos. Há controles adicionais de relevância e referências. **A conformidade comportamental completa ainda depende da avaliação com OpenAI, PostgreSQL, n8n e PDFs reais.** Testes com mocks não provam ausência de alucinações.

## Componentes e comportamentos

| Requisito/critério | Estado/evidência |
| --- | --- |
| React + MUI | Implementados; build e lint passam |
| Histórico visível | Estado messages na sessão; não persistente |
| Backend Node.js | Express/TypeScript; build passa |
| Integração IA | SDK OpenAI e nó HTTP no n8n; integração real pendente |
| Ingestão via n8n | Extração PDF → chunks → embeddings → catálogo/chunks; execução real pendente |
| Admissão de ausência | Sem trechos relevantes ou resposta válida com fontes, recusa e sources=[] |
| Fontes | Apenas IDs de trechos existentes e selecionados pela resposta; não comprova semanticamente cada afirmação |
| Recuperação | Similaridade real inclusive nos matches lexicais; ordenação determinística e filtro em cada trecho |
| Local | Dockerfiles, ambiente de exemplo e guia; Docker não executado nesta revisão |
| Workflow JSON | Export revisado, sem referências a credenciais pessoais |
| README | Instalação, credenciais, ingestão, matriz de testes e diagnósticos |
| Docker | Presente; frontend compilado na demonstração |
| Respostas estruturadas | Schemas de intenção, plano e resposta fundamentada; envelope JSON de API |
| Streaming | Não implementado |

## O que foi corrigido

1. **Build frontend:** propriedades de estilo de Stack/Typography passaram para `sx`, conforme os tipos do MUI instalado.
2. **Confiabilidade por fluxo:** perguntas contábeis gerais e documentais usam a mesma recuperação. O serviço e o prompt sem fontes foram removidos.
3. **Resposta estruturada:** geração retorna found, answer e sourceIds. JSON inválido, ausência, falta de fontes ou ID desconhecido produzem recusa sem fontes. Fontes não usadas deixam de ser exibidas automaticamente.
4. **Busca:** matches textuais não recebem similarity=1 artificial. Termos são parâmetros SQL e `%`/`_` são literais. A busca mede distância do embedding, ordena matches e aplica limite mínimo a cada trecho enviado ao modelo.
5. **Ingestão:** expressão JSON de embeddings envia o texto real como objeto; PDF sem texto causa erro; trechos curtos deixam de ser descartados; export não mantém IDs pessoais de credenciais.
6. **Catálogo/deduplicação:** o SQL cria/reutiliza documento por nome, associa document_id e usa índice de conteúdo para não duplicar chunks idênticos no mesmo documento. O novo schema requer banco novo ou migração revisada.
7. **Demonstração:** gateway de mesma origem encaminha página, chat e webhook; frontend compilado e servido por Nginx; banco/API sem portas publicadas; editor n8n somente em loopback.
8. **Builds Docker:** npm ci utiliza lockfiles, Node usa linha 24 e .dockerignore exclui dependências locais/ambiente dos contextos.
9. **Entrada HTTP:** exige pergunta textual com até 4.000 caracteres antes de chamar a IA.

## Limites que permanecem

- A validade do ID da fonte não prova que cada afirmação é verdadeira. Revisar qualidade com a matriz do README, incluindo entidade errada, período ausente e conteúdo adversarial.
- Similaridade mínima precisa de calibração; aumentar o limite pode reduzir respostas erradas e também perder respostas relevantes. Similaridade não é probabilidade de veracidade.
- Não há OCR; PDFs precisam de texto extraível. Número de página é null, sem páginas inventadas.
- Não há persistência de conversa nem contexto de turnos anteriores no backend. O histórico visível existe apenas na sessão.
- Um nome identifica um registro do catálogo. Arquivo diferente com o mesmo nome adiciona trechos; não substitui versão anterior. Não existe versionamento ou download do original.
- Não há autenticação/quota próprias do app. O guia usa Quick Tunnel protegido por e-mail. Usuários permitidos compartilham a base. Há limite de upload de 10 MB no gateway, mas isso não é um limite de custo OpenAI.
- /health é liveness do Express, não readiness de banco/OpenAI.
- n8n da demonstração fixa release 2.43.1, mas imagem e workflow precisam de validação real. As demais imagens ainda não usam digests imutáveis.
- O Compose original é um fluxo de desenvolvimento separado. Para o link, usar especificamente docker-compose.demo.yml.

## Validação automatizada e escopo

Verificações repetidas na cópia de portfólio em 27/10/2026: build backend/frontend, lint frontend e 16 testes de regressão aprovados. As verificações usam mocks e não executam chamadas reais à OpenAI.

| Check | Resultado |
| --- | --- |
| npm ci backend/frontend | PASS |
| Backend build | PASS |
| Frontend build | PASS; aviso de bundle maior que 500 kB |
| Frontend lint | PASS |
| Regressões automatizadas | 16 PASS: recusas, referências inválidas, fontes usadas, relevância por trecho, fluxo geral documental, entradas HTTP, expressão/chunks n8n |
| YAML Compose e diff | Inspeção/validação estática |
| Docker/gateway/n8n | Não executados: Docker indisponível |
| OpenAI real, ingestão PDF e acesso remoto | Não executados: sem Docker e sem chave |

Para reproduzir regressões, execute `npm ci` e `npm test` dentro de backend. As APIs e banco são simulados; nenhum crédito OpenAI é consumido nesses testes. Para avaliar integração, siga os passos 1 a 6 do README e o guia de acesso por link.
