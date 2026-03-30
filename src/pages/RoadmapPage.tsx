import { useState } from "react";
import { Header } from "@/components/Header";
import { useRoadmap, useRoadmapSteps, useAllRoadmapSteps, type RoadmapItem } from "@/hooks/useRoadmap";
import { useExecutions } from "@/hooks/useExecutions";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

const STATUSES = [
  { key: "ideia", label: "Ideia", icon: "💡" },
  { key: "desenvolvimento", label: "Em Desenvolvimento", icon: "🔧" },
  { key: "teste", label: "Em Teste", icon: "🧪" },
  { key: "producao", label: "Produção", icon: "✅" },
] as const;

const PRIORITY_MAP: Record<string, { emoji: string; label: string }> = {
  alta: { emoji: "🔴", label: "Alta" },
  media: { emoji: "🟡", label: "Média" },
  baixa: { emoji: "🟢", label: "Baixa" },
};

function PriorityBadge({ priority }: { priority: string }) {
  const p = PRIORITY_MAP[priority] ?? PRIORITY_MAP.media;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {p.emoji} {p.label}
    </span>
  );
}

function StepProgress({ total, done }: { total: number; done: number }) {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="mt-2 space-y-1">
      <Progress value={pct} className="h-1.5" />
      <p className="text-[10px] text-muted-foreground">{done}/{total} etapas</p>
    </div>
  );
}

function RoadmapCard({
  item,
  onDragStart,
  onDelete,
  onClick,
  isAdmin,
  stepCount,
  stepDone,
}: {
  item: RoadmapItem;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDelete: (id: string) => void;
  onClick: (item: RoadmapItem) => void;
  isAdmin: boolean;
  stepCount: number;
  stepDone: number;
}) {
  return (
    <div
      draggable={isAdmin}
      onDragStart={(e) => onDragStart(e, item.id)}
      onClick={() => isAdmin && onClick(item)}
      className="group rounded-lg border bg-card p-3 transition-colors hover:bg-accent/30 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-tight">{item.name}</h4>
        {isAdmin && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {item.description && (
        <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
          {item.description}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <CategoryBadge category={item.category} />
        <PriorityBadge priority={item.priority} />
      </div>
      <StepProgress total={stepCount} done={stepDone} />
    </div>
  );
}

function KanbanColumn({
  status,
  items,
  onDragStart,
  onDrop,
  onDelete,
  onClick,
  isAdmin,
  stepsMap,
}: {
  status: (typeof STATUSES)[number];
  items: RoadmapItem[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onDelete: (id: string) => void;
  onClick: (item: RoadmapItem) => void;
  isAdmin: boolean;
  stepsMap: Record<string, { total: number; done: number }>;
}) {
  return (
    <div
      className="flex flex-col min-h-0 h-full overflow-hidden rounded-lg border bg-background/50"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, status.key)}
    >
      <div className="flex items-center gap-2 border-b p-3">
        <span>{status.icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {status.label}
        </h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
          {items.length}
        </span>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 p-2">
          {items.map((item) => (
            <RoadmapCard
              key={item.id}
              item={item}
              onDragStart={onDragStart}
              onDelete={onDelete}
              onClick={onClick}
              isAdmin={isAdmin}
              stepCount={stepsMap[item.id]?.total ?? 0}
              stepDone={stepsMap[item.id]?.done ?? 0}
            />
          ))}
          {items.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">Nenhum item</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function EditDialog({
  item,
  onClose,
}: {
  item: RoadmapItem;
  onClose: () => void;
}) {
  const { updateMutation } = useRoadmap();
  const { data: steps = [], insertStep, toggleStep, deleteStep } = useRoadmapSteps(item.id);

  const [form, setForm] = useState({
    name: item.name,
    description: item.description ?? "",
    category: item.category,
    priority: item.priority,
  });
  const [newStepTitle, setNewStepTitle] = useState("");

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    updateMutation.mutate(
      { id: item.id, name: form.name.trim(), description: form.description.trim(), category: form.category, priority: form.priority },
      { onSuccess: () => { toast.success("Item atualizado!"); onClose(); }, onError: () => toast.error("Erro ao salvar") }
    );
  };

  const handleAddStep = () => {
    if (!newStepTitle.trim()) return;
    insertStep.mutate(
      { roadmap_id: item.id, title: newStepTitle.trim(), position: steps.length },
      { onSuccess: () => setNewStepTitle("") }
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 pr-2">
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clínica">Clínica</SelectItem>
                  <SelectItem value="Cases">Cases</SelectItem>
                  <SelectItem value="BRAVEA">BRAVEA</SelectItem>
                  <SelectItem value="Pessoal">Pessoal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Steps / Etapas */}
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold">Etapas</Label>
              <div className="mt-2 space-y-2">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 group">
                    <Checkbox
                      checked={step.done}
                      onCheckedChange={(checked) => toggleStep.mutate({ id: step.id, done: !!checked })}
                    />
                    <span className={`flex-1 text-sm ${step.done ? "line-through text-muted-foreground" : ""}`}>
                      {step.title}
                    </span>
                    <button
                      onClick={() => deleteStep.mutate(step.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Nova etapa..."
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddStep()}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" onClick={handleAddStep} disabled={!newStepTitle.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {steps.length > 0 && (
                <div className="mt-2">
                  <Progress value={Math.round((steps.filter(s => s.done).length / steps.length) * 100)} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {steps.filter(s => s.done).length}/{steps.length} concluídas
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RoadmapPage() {
  const { data: items = [], isLoading, insertMutation, updateStatusMutation, deleteMutation } = useRoadmap();
  const { data: allSteps = [] } = useAllRoadmapSteps();
  const { data: executions } = useExecutions();
  const { role } = useAuth();
  const isMobile = useIsMobile();
  const isAdmin = role === "admin";

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<RoadmapItem | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "Pessoal", priority: "media" });

  const runningCount = executions?.filter((e) => e.status === "running").length ?? 0;

  // Build steps map for card progress
  const stepsMap: Record<string, { total: number; done: number }> = {};
  allSteps.forEach((s) => {
    if (!stepsMap[s.roadmap_id]) stepsMap[s.roadmap_id] = { total: 0, done: 0 };
    stepsMap[s.roadmap_id].total++;
    if (s.done) stepsMap[s.roadmap_id].done++;
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("roadmap-item-id", id);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("roadmap-item-id");
    if (!id) return;
    const item = items.find((i) => i.id === id);
    if (item && item.status !== newStatus) {
      updateStatusMutation.mutate({ id, status: newStatus });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, { onSuccess: () => toast.success("Item removido") });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    insertMutation.mutate(
      { name: form.name.trim(), description: form.description.trim(), category: form.category, priority: form.priority },
      {
        onSuccess: () => {
          toast.success("Ideia adicionada ao roadmap!");
          setForm({ name: "", description: "", category: "Pessoal", priority: "media" });
          setModalOpen(false);
        },
        onError: () => toast.error("Erro ao salvar"),
      }
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header runningCount={runningCount} isConnected={true} />

      <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 border-b">
        <h2 className="text-sm md:text-base font-bold uppercase tracking-wider">🗺️ Robot Roadmap</h2>
        {isAdmin && (
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nova Ideia
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-muted-foreground text-sm">Carregando...</span>
          </div>
        ) : isMobile ? (
          <ScrollArea className="h-full">
            <div className="space-y-4 p-3">
              {STATUSES.map((s) => {
                const statusItems = items.filter((i) => i.status === s.key);
                return (
                  <div key={s.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <span>{s.icon}</span>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">{statusItems.length}</span>
                    </div>
                    <div className="space-y-2">
                      {statusItems.map((item) => (
                        <RoadmapCard
                          key={item.id}
                          item={item}
                          onDragStart={handleDragStart}
                          onDelete={handleDelete}
                          onClick={setEditItem}
                          isAdmin={isAdmin}
                          stepCount={stepsMap[item.id]?.total ?? 0}
                          stepDone={stepsMap[item.id]?.done ?? 0}
                        />
                      ))}
                      {statusItems.length === 0 && (
                        <p className="py-4 text-center text-xs text-muted-foreground border rounded-lg">Nenhum item</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="grid h-full grid-cols-4 gap-3 p-4 overflow-hidden">
            {STATUSES.map((s) => (
              <KanbanColumn
                key={s.key}
                status={s}
                items={items.filter((i) => i.status === s.key)}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDelete={handleDelete}
                onClick={setEditItem}
                isAdmin={isAdmin}
                stepsMap={stepsMap}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Item Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Ideia de Robô</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="roadmap-name">Nome</Label>
              <Input id="roadmap-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nome do robô" />
            </div>
            <div>
              <Label htmlFor="roadmap-category">Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clínica">Clínica</SelectItem>
                  <SelectItem value="Cases">Cases</SelectItem>
                  <SelectItem value="BRAVEA">BRAVEA</SelectItem>
                  <SelectItem value="Pessoal">Pessoal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="roadmap-desc">Descrição</Label>
              <Textarea id="roadmap-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Breve descrição do robô" rows={3} />
            </div>
            <div>
              <Label htmlFor="roadmap-priority">Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={insertMutation.isPending}>
              {insertMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      {editItem && <EditDialog item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  );
}
