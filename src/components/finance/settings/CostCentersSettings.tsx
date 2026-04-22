import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Pencil, Trash2, Layers } from 'lucide-react';
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

type CostCenter = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

const emptyForm = { name: '', description: '', active: true };

export function CostCentersSettings() {
  const [items, setItems] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CostCenter | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('finance_cost_centers')
      .select('*')
      .order('name');
    if (error) toast.error('Erro ao carregar centros de custo');
    setItems((data as CostCenter[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome do centro de custo');
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from('finance_cost_centers')
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          active: form.active,
        })
        .eq('id', editing.id);
      if (error) toast.error('Erro ao atualizar');
      else {
        toast.success('Centro de custo atualizado');
        await logFinanceAudit({
          table_name: 'finance_cost_centers',
          action: 'update',
          record_id: editing.id,
          payload: form,
        });
        setOpen(false);
        load();
      }
    } else {
      const { data, error } = await supabase
        .from('finance_cost_centers')
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          active: form.active,
        })
        .select('id')
        .single();
      if (error) toast.error('Erro ao criar');
      else {
        toast.success('Centro de custo criado');
        await logFinanceAudit({
          table_name: 'finance_cost_centers',
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

  const remove = async (c: CostCenter) => {
    if (!confirm(`Excluir o centro de custo "${c.name}"?`)) return;
    const { error } = await supabase.from('finance_cost_centers').delete().eq('id', c.id);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Centro de custo excluído');
      await logFinanceAudit({
        table_name: 'finance_cost_centers',
        action: 'delete',
        record_id: c.id,
      });
      load();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-primary" /> Centros de Custo
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Opcionais para análises mais detalhadas em relatórios.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setForm(emptyForm);
            setOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum centro de custo cadastrado.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{c.name}</span>
                    {!c.active && <Badge variant="outline">inativo</Badge>}
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(c);
                      setForm({
                        name: c.name,
                        description: c.description ?? '',
                        active: c.active,
                      });
                      setOpen(true);
                    }}
                  >
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
            <DialogTitle>
              {editing ? 'Editar centro de custo' : 'Novo centro de custo'}
            </DialogTitle>
            <DialogDescription>
              Use centros para agrupar despesas/receitas (ex.: Comercial, Showroom).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Showroom São Paulo"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label>Ativo</Label>
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
