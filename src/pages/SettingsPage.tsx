import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useRobots } from "@/hooks/useRobots";
import { useExecutions } from "@/hooks/useExecutions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { UsersTab } from "@/components/UsersTab";
import { PushNotificationsCard } from "@/components/PushNotificationsCard";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Bot, Users, Sliders, Server, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Robot } from "@/lib/types";

// ── Robot Form ──
function RobotForm({ robot, onDone }: { robot?: Robot; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(robot?.name || "");
  const [description, setDescription] = useState(robot?.description || "");
  const [category, setCategory] = useState(robot?.category || "Pessoal");
  const [icon, setIcon] = useState(robot?.icon || "🤖");
  const [scriptPath, setScriptPath] = useState((robot as any)?.script_path || "");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const payload = { name, description, category, icon, script_path: scriptPath || null };
    if (robot) {
      await supabase.from("robots").update(payload).eq("id", robot.id);
      toast.success("Robô atualizado");
    } else {
      await supabase.from("robots").insert(payload);
      toast.success("Robô criado");
    }
    queryClient.invalidateQueries({ queryKey: ["robots"] });
    onDone();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input value={icon} onChange={e => setIcon(e.target.value)} className="w-16 text-center text-xl" placeholder="🤖" />
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do robô" className="flex-1" />
      </div>
      <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição" />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Clínica">Clínica</SelectItem>
          <SelectItem value="Cases">Cases</SelectItem>
          <SelectItem value="BRAVEA">BRAVEA</SelectItem>
          <SelectItem value="Pessoal">Pessoal</SelectItem>
        </SelectContent>
      </Select>

      {/* Script path */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <FolderOpen className="h-3.5 w-3.5 text-primary" />
          Caminho do script na VPS
        </label>
        <Input
          value={scriptPath}
          onChange={e => setScriptPath(e.target.value)}
          placeholder="Ex: /root/robos/meu_robo.py ou C:\robos\robo.bat"
          className="font-mono text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          Caminho completo do arquivo <code>.py</code> ou <code>.bat</code> na máquina onde o agent_bridge roda.
        </p>
      </div>

      <Button onClick={handleSubmit} className="w-full">{robot ? 'Salvar' : 'Criar Robô'}</Button>
    </div>
  );
}

// ── General Settings ──
function GeneralSettings() {
  const queryClient = useQueryClient();
  const { data: hourlyRate, isLoading } = useQuery({
    queryKey: ["app_settings", "hourly_rate"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", "hourly_rate")
        .single();
      return data ? String((data as any).value) : "50";
    },
  });

  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hourlyRate !== undefined) setRate(hourlyRate);
  }, [hourlyRate]);

  const handleSave = async () => {
    setSaving(true);
    await (supabase.from("app_settings" as any) as any)
      .update({ value: rate, updated_at: new Date().toISOString() })
      .eq("key", "hourly_rate");
    queryClient.invalidateQueries({ queryKey: ["app_settings"] });
    toast.success("Valor/hora atualizado");
    setSaving(false);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <Card className="border-border/50">
      <CardHeader><CardTitle className="text-base">Configurações Gerais</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Valor hora (R$) — usado no cálculo de custo evitado em Analytics</label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-32"
              min={0}
            />
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Source Host Badge ──
function SourceHostBadge({ host }: { host: string | null }) {
  if (!host || host === "unknown") {
    return <Badge variant="secondary" className="bg-muted text-muted-foreground border-border">unknown</Badge>;
  }
  if (host === "local-pc") {
    return <Badge className="bg-primary/20 text-primary border-primary/30">local-pc</Badge>;
  }
  if (host === "vm-cloud") {
    return <Badge className="bg-secondary/20 text-secondary border-secondary/30">vm-cloud</Badge>;
  }
  return <Badge variant="secondary">{host}</Badge>;
}

// ── Infrastructure Tab ──
function InfrastructureTab({ executions }: { executions: any[] }) {
  const recentExecs = executions.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* 1. Origem das execuções */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Origem das Execuções</CardTitle>
        </CardHeader>
        <CardContent>
          {recentExecs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma execução recente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Robô</TableHead>
                  <TableHead>Triggered By</TableHead>
                  <TableHead>Source Host</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentExecs.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {e.robots?.icon ?? "🤖"} {e.robots?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {e.triggered_by}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <SourceHostBadge host={e.source_host ?? null} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={e.status === "success" ? "default" : e.status === "error" ? "destructive" : "secondary"}
                      >
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(e.started_at), "dd/MM HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 2. Status da VM */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-xl">🖥️</span> Status da VM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Server className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Não configurado</p>
              <p className="text-xs text-muted-foreground">
                Quando você migrar para VM, o agent_bridge reportará automaticamente o host de origem.
              </p>
            </div>
          </div>
          <Button disabled variant="outline" className="gap-2">
            <Server className="h-4 w-4" /> Configurar VM
          </Button>
        </CardContent>
      </Card>

      {/* 3. Agent Bridge atualizado */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Agent Bridge — com detecção de host</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Script Python atualizado que detecta automaticamente se está rodando em máquina local ou VM cloud e envia o campo <code className="text-primary">source_host</code>.
          </p>
          <pre className="rounded-lg bg-muted p-4 font-mono text-xs text-muted-foreground overflow-x-auto whitespace-pre">{`import requests, platform, socket, os
from datetime import datetime

SUPABASE_URL = "sua-url-supabase"
SUPABASE_KEY = "sua-anon-key"

def detect_source_host():
    """Detecta se está rodando local ou em VM cloud."""
    hostname = socket.gethostname().lower()
    system = platform.system()
    
    # Windows ou hostname local → local-pc
    if system == "Windows":
        return "local-pc"
    if "localhost" in hostname or "desktop" in hostname:
        return "local-pc"
    
    # Linux sem display (tipicamente VM/servidor)
    if system == "Linux":
        display = os.environ.get("DISPLAY", "")
        if not display:
            return "vm-cloud"
        return "local-pc"
    
    return "unknown"

def report_execution(robot_id, status, log_output="", error_message=None, duration=None):
    source_host = detect_source_host()
    requests.post(
        f"{SUPABASE_URL}/rest/v1/executions",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        },
        json={
            "robot_id": robot_id,
            "status": status,
            "log_output": log_output,
            "error_message": error_message,
            "duration_seconds": duration,
            "triggered_by": "scheduled",
            "source_host": source_host,
            "finished_at": datetime.utcnow().isoformat() if status != "running" else None
        }
    )

# Exemplo de uso:
# report_execution("uuid-do-robo", "success", "Log completo aqui", duration=42)`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Settings Page ──
const SettingsPage = () => {
  const { data: robots = [] } = useRobots();
  const { data: executions = [] } = useExecutions();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [editingRobot, setEditingRobot] = useState<Robot | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const runningCount = executions.filter(e => e.status === "running").length;

  const handleDelete = async (id: string) => {
    await supabase.from("robots").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["robots"] });
    toast.success("Robô excluído");
  };

  const handleDeleteAll = async () => {
    await supabase.from("executions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("robots").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    queryClient.invalidateQueries({ queryKey: ["robots"] });
    queryClient.invalidateQueries({ queryKey: ["executions"] });
    toast.success("Todos os robôs foram excluídos");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
      <Header runningCount={runningCount} isConnected={true} />
      <BottomTabBar />
      <div className="mx-auto w-full max-w-4xl p-4 md:p-6 space-y-4 md:space-y-6">
        <h1 className="text-xl font-bold">Configurações</h1>

        <Tabs defaultValue="robots" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="robots" className="gap-2">
              <Bot className="h-4 w-4" /> Robôs
            </TabsTrigger>
            {role === "admin" && (
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" /> Usuários
              </TabsTrigger>
            )}
            {role === "admin" && (
              <TabsTrigger value="infra" className="gap-2">
                <Server className="h-4 w-4" /> Infraestrutura
              </TabsTrigger>
            )}
            {role === "admin" && (
              <TabsTrigger value="general" className="gap-2">
                <Sliders className="h-4 w-4" /> Geral
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="robots" className="space-y-6">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2" disabled={robots.length === 0}>
                    <Trash2 className="h-4 w-4" /> Remover Todos
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso excluirá todos os robôs e suas execuções. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll}>Excluir Todos</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditingRobot(undefined); }}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={() => setEditingRobot(undefined)}><Plus className="h-4 w-4" /> Novo Robô</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle>{editingRobot ? 'Editar Robô' : 'Novo Robô'}</DialogTitle></DialogHeader>
                  <RobotForm robot={editingRobot} onDone={() => setDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>

            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Robôs Cadastrados</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {robots.map(robot => (
                    <div key={robot.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <span className="text-xl">{robot.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{robot.name}</p>
                        <p className="text-xs text-muted-foreground">{robot.description}</p>
                        {(robot as any).script_path && (
                          <p className="text-[10px] font-mono text-primary/70 truncate mt-0.5">
                            {(robot as any).script_path}
                          </p>
                        )}
                        {!(robot as any).script_path && (
                          <p className="text-[10px] text-yellow-500/80 mt-0.5">⚠ sem script configurado</p>
                        )}
                      </div>
                      <CategoryBadge category={robot.category} />
                      <Button variant="ghost" size="icon" onClick={() => { setEditingRobot(robot); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(robot.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {role === "admin" && (
            <TabsContent value="users">
              <UsersTab />
            </TabsContent>
          )}

          {role === "admin" && (
            <TabsContent value="infra">
              <InfrastructureTab executions={executions} />
            </TabsContent>
          )}

          {role === "admin" && (
            <TabsContent value="general" className="space-y-6">
              <GeneralSettings />
              <PushNotificationsCard />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
