import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface UserEntry {
  id: string;
  email: string;
  name: string;
  avatar_emoji: string;
  role: string;
  created_at: string;
}

export function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // invite form
  const [invEmail, setInvEmail] = useState("");
  const [invPassword, setInvPassword] = useState("");
  const [invName, setInvName] = useState("");
  const [invRole, setInvRole] = useState<string>("viewer");
  const [inviting, setInviting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "list" },
    });
    if (!error && data?.users) {
      setUsers(data.users);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async () => {
    if (!invEmail || !invPassword || !invName) return;
    if (invPassword.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    setInviting(true);

    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "invite", email: invEmail, password: invPassword, name: invName, role: invRole },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao convidar");
    } else {
      toast.success(`Usuário ${invEmail} convidado com sucesso`);
      setDialogOpen(false);
      setInvEmail("");
      setInvPassword("");
      setInvName("");
      setInvRole("viewer");
      fetchUsers();
    }
    setInviting(false);
  };

  const handleDelete = async (userId: string) => {
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "delete", user_id: userId },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao remover");
    } else {
      toast.success("Usuário removido");
      fetchUsers();
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Usuários</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" /> Convidar usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Convidar Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Nome do usuário" className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="email@empresa.com" className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha inicial</label>
                <Input type="password" value={invPassword} onChange={(e) => setInvPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Perfil de acesso</label>
                <Select value={invRole} onValueChange={setInvRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin — acesso total</SelectItem>
                    <SelectItem value="viewer">Viewer — apenas leitura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleInvite} className="w-full" disabled={inviting}>
                {inviting ? "Convidando…" : "Convidar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg border p-3">
                <span className="text-xl">{u.avatar_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <Badge variant={u.role === "admin" ? "default" : "secondary"} className="shrink-0">
                  {u.role}
                </Badge>
                {u.id !== currentUser?.id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover acesso?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O usuário {u.email} perderá acesso ao Mission Control.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(u.id)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
