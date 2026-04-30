import { useMemo, useState } from "react";
import { usePortalUsers, type PortalUser } from "@/hooks/usePortalUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Mail, KeyRound, Ban, CheckCircle2, Eye, EyeOff } from "lucide-react";

function formatBR(dateStr: string | null): string {
  if (!dateStr) return "Nunca";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function isBanned(user: PortalUser): boolean {
  if (!user.banned_until) return false;
  const until = new Date(user.banned_until).getTime();
  return until > Date.now();
}

export default function PortalUsersTab() {
  const { users, loading, createUser, updateEmail, updatePassword, toggleBan } = usePortalUsers();
  const [search, setSearch] = useState("");

  // Modais
  const [createOpen, setCreateOpen] = useState(false);
  const [emailUser, setEmailUser] = useState<PortalUser | null>(null);
  const [passUser, setPassUser] = useState<PortalUser | null>(null);
  const [banUser, setBanUser] = useState<PortalUser | null>(null);

  // Form criar
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  // Form editar email
  const [editEmail, setEditEmail] = useState("");

  // Form editar senha
  const [editPass, setEditPass] = useState("");
  const [editPass2, setEditPass2] = useState("");
  const [showEditPass, setShowEditPass] = useState(false);

  const filtered = useMemo(
    () => users.filter((u) => (u.email ?? "").toLowerCase().includes(search.toLowerCase())),
    [users, search]
  );

  async function handleCreate() {
    if (!newEmail || !newPass) return;
    if (newPass !== newPass2) return;
    setBusy(true);
    const ok = await createUser(newEmail.trim(), newPass);
    setBusy(false);
    if (ok) {
      setCreateOpen(false);
      setNewEmail(""); setNewPass(""); setNewPass2(""); setShowPass(false);
    }
  }

  async function handleEditEmail() {
    if (!emailUser || !editEmail) return;
    setBusy(true);
    const ok = await updateEmail(emailUser.id, editEmail.trim());
    setBusy(false);
    if (ok) setEmailUser(null);
  }

  async function handleEditPass() {
    if (!passUser || !editPass || editPass !== editPass2) return;
    setBusy(true);
    const ok = await updatePassword(passUser.id, editPass);
    setBusy(false);
    if (ok) {
      setPassUser(null);
      setEditPass(""); setEditPass2(""); setShowEditPass(false);
    }
  }

  async function handleToggleBan() {
    if (!banUser) return;
    setBusy(true);
    await toggleBan(banUser.id, isBanned(banUser));
    setBusy(false);
    setBanUser(null);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Usuários do Portal</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie acessos, e-mails e senhas dos usuários.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_auto_auto] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
            <span>E-mail</span>
            <span>Criado em</span>
            <span>Último acesso</span>
            <span>Status</span>
            <span>Ações</span>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum usuário encontrado
            </div>
          )}

          {filtered.map((u, i) => {
            const banned = isBanned(u);
            return (
              <div
                key={u.id}
                className={`grid md:grid-cols-[2fr_1fr_1fr_auto_auto] gap-4 px-5 py-4 items-center ${
                  i !== filtered.length - 1 ? "border-b" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{u.email ?? "—"}</p>
                  <p className="text-xs text-muted-foreground md:hidden">
                    {formatBR(u.created_at)} · {formatBR(u.last_sign_in_at)}
                  </p>
                </div>
                <span className="hidden md:inline text-sm text-muted-foreground">
                  {formatBR(u.created_at)}
                </span>
                <span className="hidden md:inline text-sm text-muted-foreground">
                  {formatBR(u.last_sign_in_at)}
                </span>
                <Badge
                  variant={banned ? "destructive" : "default"}
                  className="text-xs justify-self-start md:justify-self-center"
                >
                  {banned ? "Suspenso" : "Ativo"}
                </Badge>
                <div className="flex flex-wrap gap-1.5 justify-self-start md:justify-self-end">
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs"
                    onClick={() => { setEmailUser(u); setEditEmail(u.email ?? ""); }}>
                    <Mail className="w-3.5 h-3.5" /> E-mail
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs"
                    onClick={() => { setPassUser(u); setEditPass(""); setEditPass2(""); }}>
                    <KeyRound className="w-3.5 h-3.5" /> Senha
                  </Button>
                  <Button
                    size="sm"
                    variant={banned ? "default" : "outline"}
                    className="h-8 gap-1 text-xs"
                    onClick={() => setBanUser(u)}
                  >
                    {banned ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Reativar</>
                    ) : (
                      <><Ban className="w-3.5 h-3.5" /> Suspender</>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Modal: Novo usuário */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Cria um usuário com e-mail confirmado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-email">E-mail</Label>
              <Input id="new-email" type="email" value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)} placeholder="cliente@empresa.com" />
            </div>
            <div>
              <Label htmlFor="new-pass">Senha</Label>
              <div className="relative">
                <Input id="new-pass" type={showPass ? "text" : "password"} value={newPass}
                  onChange={(e) => setNewPass(e.target.value)} />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="new-pass2">Confirmar senha</Label>
              <Input id="new-pass2" type={showPass ? "text" : "password"} value={newPass2}
                onChange={(e) => setNewPass2(e.target.value)} />
              {newPass2 && newPass !== newPass2 && (
                <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}
              disabled={busy || !newEmail || !newPass || newPass !== newPass2}>
              {busy ? "Criando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar e-mail */}
      <Dialog open={!!emailUser} onOpenChange={(o) => !o && setEmailUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar E-mail</DialogTitle>
            <DialogDescription>{emailUser?.email}</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="edit-email">Novo e-mail</Label>
            <Input id="edit-email" type="email" value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailUser(null)}>Cancelar</Button>
            <Button onClick={handleEditEmail} disabled={busy || !editEmail}>
              {busy ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar senha */}
      <Dialog open={!!passUser} onOpenChange={(o) => !o && setPassUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>{passUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-pass">Nova senha</Label>
              <div className="relative">
                <Input id="edit-pass" type={showEditPass ? "text" : "password"} value={editPass}
                  onChange={(e) => setEditPass(e.target.value)} />
                <button type="button" onClick={() => setShowEditPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showEditPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-pass2">Confirmar nova senha</Label>
              <Input id="edit-pass2" type={showEditPass ? "text" : "password"} value={editPass2}
                onChange={(e) => setEditPass2(e.target.value)} />
              {editPass2 && editPass !== editPass2 && (
                <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassUser(null)}>Cancelar</Button>
            <Button onClick={handleEditPass}
              disabled={busy || !editPass || editPass !== editPass2}>
              {busy ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Suspender / Reativar */}
      <AlertDialog open={!!banUser} onOpenChange={(o) => !o && setBanUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {banUser && isBanned(banUser) ? "Reativar acesso" : "Suspender acesso"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {banUser && isBanned(banUser)
                ? `Tem certeza que deseja reativar o acesso de ${banUser?.email}?`
                : `Tem certeza que deseja suspender o acesso de ${banUser?.email}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleBan} disabled={busy}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
