import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import { api } from "./services/api";
import { UploadDocument } from "./components/UploadDocument";

type Source = {
  documentName: string;
  pageNumber?: number | null;
  similarity?: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

export default function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const totalSources = useMemo(() => {
    return messages.reduce((total, message) => {
      return total + (message.sources?.length ?? 0);
    }, 0);
  }, [messages]);

  async function handleSend() {
    const trimmed = question.trim();

    if (!trimmed || loading) return;

    const userMessage: Message = {
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await api.post("/chat", {
        question: trimmed,
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: response.data.answer,
        sources: response.data.sources ?? [],
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Erro ao consultar a IA. Verifique se o backend esta rodando.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(49, 87, 255, 0.16), transparent 32rem), linear-gradient(180deg, #f8fbff 0%, #eef3f9 100%)",
        py: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="xl">
        <Paper
          elevation={0}
          sx={{
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 24px 80px rgba(15, 23, 42, 0.10)",
          }}
        >
          <Box
            sx={{
              p: { xs: 3, md: 5 },
              background:
                "linear-gradient(135deg, #0f172a 0%, #1e3a8a 52%, #3157ff 100%)",
              color: "white",
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              sx={{ justifyContent: "space-between", gap: 3 }}
            >
              <Box>
                <Chip
                  icon={<ShieldRoundedIcon />}
                  label="IA contabil com RAG"
                  sx={{
                    mb: 2,
                    color: "white",
                    backgroundColor: "rgba(255,255,255,0.16)",
                    "& .MuiChip-icon": { color: "white" },
                  }}
                />

                <Typography variant="h3" sx={{ maxWidth: 760 }}>
                  DocTrace Assistant
                </Typography>

                <Typography
                  sx={{
                    mt: 1.5,
                    maxWidth: 720,
                    color: "rgba(255,255,255,0.78)",
                    fontSize: 18,
                  }}
                >
                  Consulte seus documentos contabeis com respostas baseadas
                  no contexto recuperado e fontes visiveis.
                </Typography>
              </Box>
              <Stack
                direction="row"
                spacing={4}
                useFlexGap
                sx={{
                  flexWrap: "wrap",
                  alignItems: "stretch",
                  justifyContent: { xs: "flex-start", md: "flex-end" },
                }}
              >
                <MetricCard
                  icon={<DescriptionRoundedIcon />}
                  label="Mensagens"
                  value={String(messages.length)}
                />

                <MetricCard
                  icon={<QueryStatsRoundedIcon />}
                  label="Fontes citadas"
                  value={String(totalSources)}
                />
              </Stack>{" "}
            </Stack>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "380px 1fr" },
              gap: 0,
              minHeight: 680,
            }}
          >
            <Box
              sx={{
                p: { xs: 2, md: 3 },
                borderRight: { lg: "1px solid" },
                borderColor: "divider",
                backgroundColor: "#f8fafc",
              }}
            >
              <UploadDocument />

              <Alert severity="info" sx={{ mt: 2 }}>
                Todas as respostas contabeis dependem dos documentos carregados.
                Sem informacao suficiente, a IA deve admitir que nao encontrou a resposta.
              </Alert>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                minHeight: 680,
                backgroundColor: "background.paper",
              }}
            >
              <Box
                sx={{
                  p: { xs: 2, md: 3 },
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="h5">Chat contabil</Typography>
                <Typography color="text.secondary">
                  Faça uma pergunta e acompanhe as fontes usadas na resposta.
                </Typography>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  p: { xs: 2, md: 3 },
                  overflowY: "auto",
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                }}
              >
                {messages.length === 0 ? (
                  <EmptyState />
                ) : (
                  <Stack spacing={4}>
                    {messages.map((message, index) => (
                      <MessageBubble key={index} message={message} />
                    ))}
                    {loading && (
                      <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
                        <Avatar
                          sx={{
                            bgcolor: "primary.light",
                            color: "primary.main",
                          }}
                        >
                          <SmartToyRoundedIcon />
                        </Avatar>

                        <Paper
                          variant="outlined"
                          sx={{
                            width: "100%",
                            maxWidth: 340,
                            mx: "auto",
                            p: 2.5,
                            mb: 2,
                            borderRadius: "18px",
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
                            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
                          }}
                        >
                          <Stack direction="row" sx={{ gap: 1.5, alignItems: "center" }}>
                            <CircularProgress size={18} />
                            <Typography color="text.secondary">
                              Analisando a pergunta...
                            </Typography>
                          </Stack>
                        </Paper>
                      </Stack>
                    )}
                  </Stack>
                )}
              </Box>

              <Divider />

              <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: "#ffffff" }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  useFlexGap
                  sx={{ alignItems: "stretch" }}
                >
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    label="Digite sua pergunta"
                    placeholder="Ex: qual a razao social da Aurora Demonstração?"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "16px",
                      },
                    }}
                  />

                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleSend}
                    disabled={loading || !question.trim()}
                    endIcon={<SendRoundedIcon />}
                    sx={{
                      minWidth: { xs: "100%", sm: 140 },
                      borderRadius: "16px",
                      px: 3,
                    }}
                  >
                    Enviar
                  </Button>
                </Stack>{" "}
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        width: 176,
        minHeight: 112,
        p: 2,
        color: "white",
        backgroundColor: "rgba(255,255,255,0.12)",
        borderColor: "rgba(255,255,255,0.22)",
        backdropFilter: "blur(12px)",
        borderRadius: 3,
      }}
    >
      <Stack direction="row" sx={{ gap: 1.5, alignItems: "center" }}>
        <Avatar sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "white" }}>
          {icon}
        </Avatar>

        <Box>
          <Typography variant="h5">{value}</Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.72)" }}>
            {label}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}

function EmptyState() {
  return (
    <Box
      sx={{
        minHeight: 420,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
      }}
    >
      <Box sx={{ maxWidth: 520 }}>
        <Avatar
          sx={{
            mx: "auto",
            mb: 2,
            width: 64,
            height: 64,
            bgcolor: "primary.light",
            color: "primary.main",
          }}
        >
          <SmartToyRoundedIcon fontSize="large" />
        </Avatar>

        <Typography variant="h5">Nenhuma conversa ainda</Typography>

        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Envie documentos, faça uma pergunta e veja as fontes usadas pela IA.
          Um fluxo minimamente civilizado, olha que luxo.
        </Typography>
      </Box>
    </Box>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <Stack
      direction="row"
      sx={{
        gap: 1.5,
        justifyContent: isUser ? "flex-end" : "flex-start",
        alignItems: "flex-start",
        width: "100%",
      }}
    >
      {!isUser && (
        <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
          <SmartToyRoundedIcon />
        </Avatar>
      )}

      <Box
        sx={{
          maxWidth: {
            xs: "calc(100% - 56px)",
            md: isUser ? "58%" : "74%",
          },
          minWidth: 0,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            px: 2.25,
            py: 1.75,
            borderRadius: "18px",
            borderTopRightRadius: isUser ? "8px" : "18px",
            borderTopLeftRadius: isUser ? "18px" : "8px",
            color: isUser ? "white" : "text.primary",
            backgroundColor: isUser ? "primary.main" : "white",
            border: "1px solid",
            borderColor: isUser ? "primary.main" : "divider",
            boxShadow: isUser
              ? "0 14px 30px rgba(49, 87, 255, 0.20)"
              : "0 12px 28px rgba(15, 23, 42, 0.08)",
            overflow: "visible",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mb: 0.75,
              fontWeight: 800,
              color: isUser ? "rgba(255,255,255,0.74)" : "text.secondary",
            }}
          >
            {isUser ? "Voce" : "IA"}
          </Typography>

          <Box
            sx={{
              overflowWrap: "break-word",
              wordBreak: "break-word",
              "& p": { m: 0, mb: 1 },
              "& p:last-child": { mb: 0 },
              "& ul": { pl: 2.5, my: 1 },
              "& strong": { fontWeight: 800 },
            }}
          >
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </Box>
        </Paper>

        {message.sources && message.sources.length > 0 && (
          <Stack
            direction="row"
            useFlexGap
            sx={{
              gap: 1,
              flexWrap: "wrap",
              mt: 1.25,
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {message.sources.map((source, sourceIndex) => (
              <Chip
                key={sourceIndex}
                size="small"
                icon={<DescriptionRoundedIcon />}
                label={[
                  source.documentName,
                  source.pageNumber ? `pagina ${source.pageNumber}` : null,
                  source.similarity
                    ? `score ${source.similarity.toFixed(3)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                sx={{
                  maxWidth: "100%",
                  bgcolor: "#eef2ff",
                  color: "#1e35b7",
                  "& .MuiChip-label": {
                    display: "block",
                    maxWidth: {
                      xs: 180,
                      sm: 240,
                      md: 280,
                    },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                }}
              />
            ))}
          </Stack>
        )}
      </Box>

      {isUser && (
        <Avatar sx={{ bgcolor: "#111827", color: "white" }}>
          <PersonRoundedIcon />
        </Avatar>
      )}
    </Stack>
  );
}
