import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { uploadDocument } from "../services/upload";

type UploadStatus = "pending" | "uploading" | "success" | "error";

type UploadItem = {
  file: File;
  status: UploadStatus;
  message?: string;
};

export function UploadDocument() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  function handleSelectFiles(files: FileList | null) {
    if (!files) return;

    const selectedFiles = Array.from(files);

    // Mantem na fila apenas arquivos compativeis com o fluxo de ingestao
    const pdfFiles = selectedFiles.filter(
      (file) => file.type === "application/pdf",
    );

    const newItems: UploadItem[] = pdfFiles.map((file) => ({
      file,
      status: "pending",
    }));

    setItems((current) => [...current, ...newItems]);
  }

  function removeFile(indexToRemove: number) {
    setItems((current) =>
      current.filter((_item, index) => index !== indexToRemove),
    );
  }

  async function handleUploadAll() {
    if (items.length === 0 || uploading) return;

    setUploading(true);

    // Envia os arquivos em sequencia para manter o status individual de cada item
    for (let index = 0; index < items.length; index += 1) {
      const currentItem = items[index];

      // Evita reenviar arquivos que ja foram processados com sucesso
      if (currentItem.status === "success") {
        continue;
      }

      setItems((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index
            ? { ...item, status: "uploading", message: "Enviando..." }
            : item,
        ),
      );

      try {
        await uploadDocument(currentItem.file);

        setItems((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  status: "success",
                  message: "Documento enviado e processado.",
                }
              : item,
          ),
        );
      } catch (error) {
        console.error(error);

        setItems((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  status: "error",
                  message: "Erro ao enviar este documento.",
                }
              : item,
          ),
        );
      }
    }

    setUploading(false);
  }

  function clearCompleted() {
    setItems((current) => current.filter((item) => item.status !== "success"));
  }

  return (
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
      {" "}
      <Typography variant="h6" sx={{ fontWeight: 800 }} gutterBottom>
        Upload de documentos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Selecione um ou mais PDFs para indexacao no banco vetorial.
      </Typography>{" "}
      <Box
        sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}
      >
        <Button
          variant="outlined"
          component="label"
          startIcon={<UploadFileIcon />}
          disabled={uploading}
        >
          Selecionar PDFs
          <input
            hidden
            multiple
            type="file"
            accept="application/pdf"
            onChange={(event) => {
              handleSelectFiles(event.target.files);

              // Permite selecionar o mesmo arquivo novamente depois
              event.target.value = "";
            }}
          />
        </Button>

        <Button
          variant="contained"
          onClick={handleUploadAll}
          disabled={items.length === 0 || uploading}
        >
          Enviar todos
        </Button>

        <Button
          variant="text"
          onClick={clearCompleted}
          disabled={
            uploading || items.every((item) => item.status !== "success")
          }
        >
          Limpar concluidos
        </Button>
      </Box>
      {uploading && <LinearProgress sx={{ mt: 2 }} />}
      {items.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {items.map((item, index) => (
            <Paper
              key={`${item.file.name}-${index}`}
              variant="outlined"
              sx={{ p: 1.5, mb: 1 }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 1,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{item.file.name}</Typography>

                  <Typography variant="caption" color="text.secondary">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Typography variant="body2">
                    {item.status === "pending" && "Pendente"}
                    {item.status === "uploading" && "Enviando"}
                    {item.status === "success" && "Concluido"}
                    {item.status === "error" && "Erro"}
                  </Typography>

                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    Remover
                  </Button>
                </Box>
              </Box>

              {item.message && (
                <Alert
                  severity={item.status === "error" ? "error" : "success"}
                  sx={{ mt: 1 }}
                >
                  {item.message}
                </Alert>
              )}
            </Paper>
          ))}
        </Box>
      )}
    </Paper>
  );
}
