import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { logFinanceAudit } from '@/hooks/useFinanceAudit';

type Company = {
  id: string;
  name: string;
  entity_type: string;
  document: string | null;
  active: boolean;
};

const emptyForm = { name: '', entity_type: 'pj', document: '', active: true };

export function CompaniesSettings() {
  const [items, setItems] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('finance_companies')
      .select('*')
      .order('name');
    if (error) toast.error('Erro ao carregar empresas');
    setItems((data as Company[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({
      name: c.name,
      entity_type: c.entity_type,
      document: c.document ?? '',
      active: c.active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome da entidade');
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from('finance_companies')
        .update({
          name: form.name.trim(),
          entity_type: form.entity_type,
          document: form.document.trim() || null,
          active: form.active,
        })
        .eq('id', editing.id);
      if (error) {
        toast.error('Erro ao atualizar');
      } else {
        toast.success('Entidade atualizada');
        await logFinanceAudit({
          table_name: 'finance_companies',
          action: 'update',
          record_id: editing.id,
          payload: form,
        });
        setOpen(false);
        load();
      }
    } else {
      const { data, error } = await supabase
        .from('finance_companies')
        .insert({
          name: form.name.trim(),
          entity_type: form.entity_type,
          document: form.document.trim() || null,
          active: form.active,
        })
        .select('id')
        .single();
      if (error) {
        toast.error('Erro ao criar');
      } else {
        toast.success('Entidade criada');
        await logFinanceAudit({
          table_name: 'finance_companies',
          action: 'create',
          record_id: data?.id ?? null,
          payload: form,
        });
        setOpen(false);
        load();
      }
    }
    setSaving(false);
  };

  const remove = async (c: Company) => {
    if (!confirm(`Excluir a entidade "${c.name}"?`)) return;
    const { error } = await supabase.from('finance_companies').delete().eq('id', c.id);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Entidade excluída');
      await logFinanceAudit({ table_name: 'finance_companies', action: 'delete', record_id: c.id });
      load();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" /> Empresas / Entidades
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cadastro das entidades (PJ e PF do sócio) usadas nos lançamentos.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova entidade
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma entidade cadastrada.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{c.name}</span>
                    <Badge variant={c.entity_type === 'pj' ? 'default' : 'secondary'}>
                      {c.entity_type.toUpperCase()}
                    </Badge>
                    {!c.active && <Badge variant="outline">inativa</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.document || '—'}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(c)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar entidade' : 'Nova entidade'}</DialogTitle>
            <DialogDescription>
              Cadastre Pessoa Jurídica ou Pessoa Física do sócio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: LSA Representações"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.entity_type}
                  onValueChange={(v) => setForm({ ...form, entity_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                    <SelectItem value="pf">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ / CPF</Label>
                <Input
                  value={form.document}
                  onChange={(e) => setForm({ ...form, document: e.target.value })}
                  placeholder="Somente números"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label>Entidade ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
