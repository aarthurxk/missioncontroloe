import { format } from "date-fns";

interface ErrorFormatParams {
  robotName: string;
  robotIcon?: string;
  startedAt: string;
  errorMessage: string | null;
  logOutput: string | null;
  triggeredBy?: string;
}

export function formatErrorBlock(params: ErrorFormatParams): string {
  const { robotName, startedAt, errorMessage, logOutput, triggeredBy } = params;
  const timestamp = format(new Date(startedAt), "dd/MM/yyyy HH:mm:ss");

  const lines = [
    "─────────────────────────────────",
    `❌ ERRO — ${robotName}`,
    `Horário: ${timestamp}`,
    `Tipo: ${triggeredBy ?? "desconhecido"}`,
    `Mensagem: ${errorMessage ?? "Sem mensagem de erro"}`,
    "",
    "Log até o momento:",
    logOutput || "(sem log)",
    "─────────────────────────────────",
  ];

  return lines.join("\n");
}

export async function copyErrorToClipboard(params: ErrorFormatParams) {
  const text = formatErrorBlock(params);
  await navigator.clipboard.writeText(text);
}
