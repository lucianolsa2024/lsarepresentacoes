import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { UserPlus, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export function UserManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user form
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // Reset password
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await supabase.functions.invoke('admin-users', {
      body: { action: 'list' },
    });
    if (res.error) {
      toast.error('Erro ao listar usuários');
      console.error(res.error);
    } else {
      setUsers(res.data?.users || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async () => {
    if (!newEmail || !newPassword) { toast.error('Preencha email e senha'); return; }
    setCreating(true);
    const res = await supabase.functions.invoke('admin-users', {
      body: { action: 'create', email: newEmail, password: newPassword, name: newName },
    });
    setCreating(false);
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao criar usuário');
      return;
    }
    toast.success('Usuário criado com sucesso');
    setShowCreate(false);
    setNewEmail(''); setNewPassword(''); setNewName('');
    fetchUsers();
  };

  const handleReset = async () => {
    if (!resetUser || !resetPassword) { toast.error('Preencha a nova senha'); return; }
    if (resetPassword.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres'); return; }
    setResetting(true);
    const res = await supabase.functions.invoke('admin-users', {
      body: { action: 'reset-password', userId: resetUser.id, newPassword: resetPassword },
    });
    setResetting(false);
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao resetar senha');
      return;
    }
    toast.success('Senha resetada com sucesso');
    setResetUser(null);
    setResetPassword('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Gerenciamento de Usuários</h2>
        <Button onClick={() => setShowCreate(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum usuário encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.name || '-'}</TableCell>
                    <TableCell><Badge variant="outline">{u.email}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setResetUser(u)}>
                        <KeyRound className="h-4 w-4 mr-1" />
                        Resetar Senha
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome completo" /></div>
            <div><Label>Email</Label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" /></div>
            <div><Label>Senha</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetUser} onOpenChange={(open) => { if (!open) setResetUser(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resetar Senha</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Usuário: <strong>{resetUser?.email}</strong></p>
          <div><Label>Nova Senha</Label><Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUser(null)}>Cancelar</Button>
            <Button onClick={handleReset} disabled={resetting}>
              {resetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resetar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
