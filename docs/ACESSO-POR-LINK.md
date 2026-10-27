# Acesso por link: demonstração temporária

## Escolha do ambiente

| Opção | Onde o sistema executa | Avaliador instala algo? | Limitação |
| --- | --- | --- | --- |
| Computador pessoal + túnel | Seu computador | Não | Computador, Docker e túnel precisam continuar ligados |
| Servidor existente + túnel | Seu servidor próprio | Não | Consome recursos do servidor; exige isolamento e disponibilidade |
| Hospedagem externa | Infraestrutura de um provedor | Não | Precisa acomodar Node.js, n8n e PostgreSQL/pgvector; preços e limites devem ser avaliados |

Não é necessário comprar domínio para um Quick Tunnel. Para avaliação agendada, a primeira opção evita depender do servidor próprio. Para acesso a qualquer hora, é preciso um ambiente que permaneça disponível. Um site estático isolado não executa o backend/n8n deste projeto.

## 1. Validar localmente

Complete os passos 1 a 6 do README. Confirme chat, upload e dados no banco em http://localhost:8088. Não compartilhe antes disso. O arquivo `docker-compose.demo.yml` publica somente o gateway e o editor em loopback, com rede e volumes próprios do projeto `doctrace-demo`.

## 2. Instalar cloudflared

Siga o instalador oficial adequado ao seu sistema: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

No macOS com Homebrew:

```bash
brew install cloudflared
cloudflared --version
```

No Windows com winget, em PowerShell:

```powershell
winget install --id Cloudflare.cloudflared
```

Abra um novo terminal e execute `cloudflared --version`. No Linux, use o pacote oficial para a arquitetura/distribuição indicada na página de downloads; não instale um binário amd64 em uma máquina arm64.

## 3. Abrir o túnel

A documentação atual permite restringir o Quick Tunnel por e-mail. Use um cloudflared atualizado. Confira a disponibilidade da opção antes de executar:

```bash
cloudflared tunnel --help
```

Substitua o endereço abaixo pelo e-mail real do avaliador (inclua também o seu para testar):

```bash
cloudflared tunnel --url http://localhost:8088 --allowed-mail avaliador@exemplo.com --allowed-mail seuemail@exemplo.com
```

Copie o endereço `https://...trycloudflare.com` impresso no terminal. Mantenha o processo rodando. O acesso exige autenticação por e-mail com PIN; o avaliador não precisa de conta Cloudflare. Se a opção não existir no binário, atualize conforme a documentação oficial; não remova a restrição automaticamente.

O domínio pode mudar em cada inicialização. O Quick Tunnel não oferece garantia de disponibilidade e não suporta SSE; a aplicação atual responde JSON sem streaming, portanto não depende de SSE. São características do serviço, não garantias de que o projeto já foi validado.

## 4. Testar antes de enviar

1. Abra a URL em outro dispositivo ou navegador privado e autentique com seu e-mail permitido.
2. Faça a pergunta sobre o lucro do PDF de demonstração. Confira resposta e nome da fonte.
3. Envie o mesmo PDF fictício com outro nome e confira o upload; depois verifique o n8n/banco localmente.
4. Abra as ferramentas de rede: as requisições devem ir para `https://...trycloudflare.com/api/chat` e `/ingest-document`, nunca para `localhost:3001` ou `localhost:5678` no computador remoto.
5. Verifique que uma tentativa de acesso sem e-mail permitido é bloqueada.
6. Compartilhe apenas a URL do gateway. O editor do n8n e o banco não são expostos pelo gateway.

O link protegido reduz acesso indevido, mas o projeto não tem quotas/rate limit próprios. Use documentos fictícios nesta demonstração; todos os usuários permitidos compartilham a mesma base documental. A chave continua no backend e no n8n, e as chamadas à OpenAI continuam sujeitas à cobrança da sua conta.

## 5. Manter o computador e o Docker ligados

O Docker não controla a suspensão do computador. É necessário manter três componentes ativos: sistema operacional acordado, Docker Engine/desktop ativo e processo cloudflared aberto.

### Docker

No Windows/macOS, abra Docker Desktop, aguarde o engine iniciar e mantenha-o aberto (pode ficar minimizado). Em Settings → General, habilite o início ao entrar na sessão se desejar. Não use Quit Docker Desktop nem o botão Stop nos containers durante a avaliação. No Linux, mantenha o serviço Docker ativo; iniciar automaticamente depende da configuração do seu sistema.

`docker compose ... up -d` inicia containers em segundo plano. Depois do comando terminar, o terminal do Compose pode ser fechado. A política `restart: unless-stopped` reinicia um container que cai e volta a iniciá-lo com o engine, desde que ele não tenha sido parado manualmente. Não mantém a máquina acordada nem o túnel ativo.

Verifique quando necessário:

```bash
docker compose -p doctrace-demo -f docker-compose.demo.yml ps
```

### Windows

Com o notebook na tomada, abra Configurações → Sistema → Energia e bateria (ou Energia) → tempos de tela/suspensão. Durante a demonstração, selecione Nunca para a suspensão quando conectado. A tela pode desligar. Mantenha a tampa aberta, pois fechá-la pode suspender mesmo com esses tempos alterados. Os rótulos variam conforme a versão do Windows.

### macOS

Com o computador na tomada e tampa aberta, execute em outro terminal:

```bash
caffeinate -i
```

Mantenha esse terminal aberto durante a avaliação; Ctrl+C encerra a prevenção de suspensão por inatividade. Esse comando não evita desligamento, falta de energia ou todos os comportamentos de fechamento da tampa.

### Linux desktop

Nas configurações de Energia, desative temporariamente Suspensão automática, especialmente quando conectado à tomada. Mantenha a tampa aberta. O caminho exato depende do ambiente gráfico.

Mantenha internet estável. Bloquear a sessão/tela normalmente permite continuar executando processos; suspender, hibernar ou desligar interrompe o acesso. Depois da avaliação, restaure suas preferências de economia de energia.

### Túnel

O terminal que executa `cloudflared` deve permanecer aberto. Fechar esse processo encerra o link; reiniciá-lo gera outro endereço. Uma reinicialização do computador exige iniciar/verificar Docker e criar um novo túnel.

## 6. Encerrar

Use Ctrl+C no terminal do cloudflared ao terminar. Depois:

```bash
docker compose -p doctrace-demo -f docker-compose.demo.yml down
```

Não use `-v` se quiser preservar os documentos. Os containers serão recriados e os volumes reutilizados na próxima execução.

## Alternativa: usar o servidor próprio

Os passos abaixo assumem Linux com Git, Docker e Compose v2 já instalados. O servidor não foi acessado nesta revisão. Não há evidência atual de portas livres, memória disponível ou permissão de acesso; confirme antes de executar.

### 1. Inspecionar sem alterar os serviços existentes

Conecte-se por SSH com seu usuário autorizado e execute:

```bash
docker version
docker compose version
docker info --format '{{.Swarm.LocalNodeState}}'
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
free -h
df -h
ss -ltn
```

Confirme que 8088 e 5679 estão livres e que há recursos para mais quatro processos de aplicação/banco e o gateway. Não faça `swarm leave`, `docker system prune`, reinício do daemon ou alterações na stack de outros projetos. Compose pode criar containers separados num host que já participa de Swarm; estes containers não serão serviços gerenciados pelo Swarm.

### 2. Criar uma pasta própria

Na pasta pessoal do usuário do servidor:

```bash
mkdir -p "$HOME/doctrace-demo"
git clone --branch main https://github.com/joaovitormessias/doctrace.git "$HOME/doctrace-demo/app"
cd "$HOME/doctrace-demo/app"
cp .env.example .env
chmod 600 .env
```

A branch main contém os arquivos da demonstração. Use credenciais e volumes próprios desta cópia.

Edite `.env` com senha e chave próprias da demonstração. Complete os passos de subida do README, usando sempre `-p doctrace-demo -f docker-compose.demo.yml`. Não reutilize credenciais/banco de outros projetos.

### 3. Configurar o editor sem publicá-lo

No seu computador, em outro terminal, abra um encaminhamento SSH (substitua usuário e IP):

```bash
ssh -N -L 15679:127.0.0.1:5679 USUARIO@IP_DO_SERVIDOR
```

Acesse http://localhost:15679 para criar o proprietário e configurar o workflow. O SSH deve permanecer aberto enquanto você usa o editor. O host PostgreSQL na credencial continua sendo `postgres`, pois o n8n executa dentro da rede Docker.

### 4. Criar o link

Instale cloudflared no servidor e execute o mesmo comando da seção 3, apontando para http://localhost:8088. Você não precisa abrir 8088, 5679, 3001 ou 5432 na internet. O túnel depende de conexões de saída permitidas pelo servidor.

Para uma demonstração agendada, mantenha a sessão SSH executando cloudflared aberta. Encerrar a sessão pode encerrar o processo e invalidar o link. Um serviço permanente deve ser configurado e monitorado separadamente; não há garantia de persistência aqui.

Faça os mesmos testes por outro dispositivo. Para encerrar, pare o cloudflared e execute o `down` apenas do projeto DocTrace. Preserve os serviços dos outros projetos.

## Diagnóstico

| Sintoma | Verificação |
| --- | --- |
| Página abre, chat não responde | Rede deve usar `/api/chat`; conferir logs backend e acesso/créditos dos modelos OpenAI |
| HTTP 404 no upload | Workflow não publicado/ativo ou path diferente de `ingest-document` |
| Upload parece correto, respostas não encontram dados | Conferir chunks no SQL e valor efetivo de `input` no request OpenAI do workflow |
| HTTP 502 | Serviço interno ainda não iniciou, caiu, ou timeout; consultar logs e `docker compose ps` |
| Link deixou de funcionar | cloudflared parou, host suspendeu ou URL mudou após reiniciar |
| PDF escaneado sem resultados | Não há OCR implementado; usar PDF com texto selecionável |
| Editor não abre pelo servidor | Conferir sessão SSH e encaminhamento 15679 → 5679; não expor editor para resolver |

Referência oficial: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
