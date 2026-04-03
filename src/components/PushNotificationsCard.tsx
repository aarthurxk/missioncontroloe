import { Bell, BellOff, BellRing, Smartphone, AlertTriangle, XCircle, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

export function PushNotificationsCard() {
  const { state, loading, error, subscribe, unsubscribe, sendTestPush } = usePushNotifications();

  const handleTest = async () => {
    const result = await sendTestPush();
    if (result?.sent > 0) {
      toast.success(`Push enviado para ${result.sent} dispositivo(s)!`);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Notificações Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {state === "unsupported" && (
          <div className="flex items-start gap-3 text-muted-foreground">
            <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Navegador não suportado</p>
              <p className="text-xs">Push notifications requerem um navegador moderno (Safari 16.4+ no iPhone, Chrome, Firefox).</p>
            </div>
          </div>
        )}

        {state === "not-pwa" && (
          <div className="flex items-start gap-3">
            <Smartphone className="h-5 w-5 mt-0.5 shrink-0 text-warning" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Instale o app primeiro</p>
              <p className="text-xs text-muted-foreground">
                No iPhone, push notifications só funcionam quando o app está instalado na Tela de Início.
              </p>
              <div className="rounded-md bg-muted p-3 space-y-1">
                <p className="text-xs font-medium">Como instalar no iPhone:</p>
                <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-0.5">
                  <li>Abra este site no <strong>Safari</strong></li>
                  <li>Toque no ícone de <strong>Compartilhar</strong> (↑)</li>
                  <li>Selecione <strong>"Adicionar à Tela de Início"</strong></li>
                  <li>Abra o app pela Tela de Início</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {state === "no-vapid" && (
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-warning" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Backend não configurado</p>
              <p className="text-xs text-muted-foreground">
                As chaves VAPID não estão configuradas no backend. Consulte a documentação de deploy.
              </p>
            </div>
          </div>
        )}

        {state === "denied" && (
          <div className="flex items-start gap-3">
            <BellOff className="h-5 w-5 mt-0.5 shrink-0 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Permissão negada</p>
              <p className="text-xs text-muted-foreground">
                Você bloqueou notificações neste dispositivo. Para reativar, altere nas configurações do navegador/sistema.
              </p>
            </div>
          </div>
        )}

        {state === "ready" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Notificações desativadas</p>
                <p className="text-xs text-muted-foreground">
                  Ative para receber alertas quando robôs terminarem de executar.
                </p>
              </div>
            </div>
            <Button onClick={subscribe} disabled={loading} size="sm" className="shrink-0 self-end sm:self-auto">
              {loading ? "Ativando…" : "Ativar"}
            </Button>
          </div>
        )}

        {state === "subscribed" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <BellRing className="h-5 w-5 mt-0.5 shrink-0 text-success" />
              <div className="space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  Notificações ativas
                  <Badge variant="secondary" className="bg-success/20 text-success text-[10px]">ON</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  Você será notificado sobre execuções e status do bridge neste dispositivo.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={handleTest} disabled={loading} size="sm" variant="secondary">
                <Send className="h-3 w-3 mr-1" />
                {loading ? "Enviando…" : "Testar"}
              </Button>
              <Button onClick={unsubscribe} disabled={loading} size="sm" variant="outline">
                {loading ? "Desativando…" : "Desativar"}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-xs text-destructive break-words">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
