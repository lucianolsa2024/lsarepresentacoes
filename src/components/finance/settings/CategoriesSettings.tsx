import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, Tags } from 'lucide-react';
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

type Category = {
  id: string;
  name: string;
  category_type: string; // receita | despesa
  color: string | null;
  active: boolean;
};

const PRESET_COLORS = [
  '#1e40af', '#0ea5e9', '#059669', '#16a34a', '#ca8a04',
  '#dc2626', '#9333ea', '#db2777', '#475569', '#f97316',
];

const emptyForm = { name: '', category_type: 'despesa', color: '#1e40af', active: true };

export function CategoriesSettings() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'todos' | 'receita' | 'despesa'>('todos');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('finance_categories').select('*').order('name');
    if (error) toast.error('Erro ao carregar categorias');
    setItems((data as Category[]) ?? []);
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

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      category_type: c.category_type,
      color: c.color ?? '#1e40af',
      active: c.active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome da categoria');
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from('finance_categories')
        .update({
          name: form.name.trim(),
          category_type: form.category_type,
          color: form.color,
          active: form.active,
        })
        .eq('id', editing.id);
      if (error) toast.error('Erro ao atualizar');
      else {
        toast.success('Categoria atualizada');
        await logFinanceAudit({
          table_name: 'finance_categories',
          action: 'update',
          record_id: editing.id,
          payload: form,
        });
        setOpen(false);
        load();
      }
    } else {
      const { data, error } = await supabase
        .from('finance_categories')
        .insert({
          name: form.name.trim(),
          category_type: form.category_type,
          color: form.color,
          active: form.active,
        })
        .select('id')
        .single();
      if (error) toast.error('Erro ao criar');
      else {
        toast.success('Categoria criada');
        await logFinanceAudit({
          table_name: 'finance_categories',
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

  const remove = async (c: Category) => {
    if (!confirm(`Excluir a categoria "${c.name}"?`)) return;
    const { error } = await supabase.from('finance_categories').delete().eq('id', c.id);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Categoria excluída');
      await logFinanceAudit({ table_name: 'finance_categories', action: 'delete', record_id: c.id });
      load();
    }
  };

  const filtered = items.filter((c) => filter === 'todos' || c.category_type === filter);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tags className="h-5 w-5 text-primary" /> Categorias
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Categorias de receita e despesa, com cor personalizada para relatórios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma categoria.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color ?? '#94a3b8' }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-foreground">{c.name}</span>
                      <Badge variant={c.category_type === 'receita' ? 'default' : 'secondary'}>
                        {c.category_type}
                      </Badge>
                      {!c.active && <Badge variant="outline">inativa</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(c)}>
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
            <DialogTitle>{editing ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
            <DialogDescription>Defina nome, tipo e cor da categoria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Marketing"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.category_type}
                onValueChange={(v) => setForm({ ...form, category_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      form.color === c ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
                <Input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-7 w-14 p-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label>Categoria ativa</Label>
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
