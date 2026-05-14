import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomTabBar } from "@/components/BottomTabBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useExecutions } from "@/hooks/useExecutions";
import { toast } from "sonner";

type DownloadFile = {
  filename: string;
  mime_type: string;
  content_base64: string;
  size_bytes: number;
  row_count: number;
  updated_at: string;
};

type DownloadExecution = {
  id: string;
  log_output: string | null;
  error_message: string | null;
  started_at: string;
};

function base64ToBlob(content: string, mimeType: string) {
  const byteCharacters = atob(content);
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
    const slice = byteCharacters.slice(offset, offset + 1024);
    const bytes = new Uint8Array(slice.length);
    for (let index = 0; index < slice.length; index += 1) {
      bytes[index] = slice.charCodeAt(index);
    }
    chunks.push(bytes);
  }
  return new Blob(chunks, { type: mimeType });
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const DownloadsPage = () => {
  const { data: executions = [] } = useExecutions();
  const runningCount = executions.filter((execution) => execution.status === "running").length;

  const { data: file, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["downloads", "cadastros_centralizados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executions" as any)
        .select("id,log_output,error_message,started_at")
        .eq("triggered_by", "download|cadastros_centralizados")
        .eq("status", "success")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const execution = data as DownloadExecution;
      const metadata = execution.error_message ? JSON.parse(execution.error_message) : {};
      return {
        filename: metadata.filename ?? "Cadastros_Centralizados.xlsx",
        mime_type: metadata.mime_type ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        content_base64: execution.log_output ?? "",
        size_bytes: Number(metadata.size_bytes ?? 0),
        row_count: Number(metadata.row_count ?? 0),
        updated_at: execution.started_at,
      } as DownloadFile;
    },
  });

  const handleDownload = () => {
    if (!file?.content_base64) {
      toast.error("Planilha ainda nao disponivel");
      return;
    }

    const blob = base64ToBlob(file.content_base64, file.mime_type);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.filename || "Cadastros_Centralizados.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
      <Header runningCount={runningCount} isConnected={true} />
      <BottomTabBar />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">Downloads</h1>
          <p className="text-sm text-muted-foreground">
            Arquivos atualizados pelos robos e prontos para baixar.
          </p>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg">Cadastros_Centralizados.xlsx</CardTitle>
                <CardDescription>Cadastros das avaliacoes de Clinico geral</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} title="Atualizar">
              <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {isLoading ? (
              <div className="grid gap-3 md:grid-cols-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : file ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Ultima atualizacao</p>
                    <p className="mt-1 font-mono text-sm">{format(new Date(file.updated_at), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Cadastros unicos</p>
                    <p className="mt-1 font-mono text-sm">{file.row_count}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Tamanho</p>
                    <p className="mt-1 font-mono text-sm">{formatBytes(file.size_bytes)}</p>
                  </div>
                </div>

                <Button onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Baixar planilha atualizada
                </Button>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                A planilha central ainda nao foi publicada. Rode a coleta de cadastros uma vez para gerar o arquivo.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DownloadsPage;
