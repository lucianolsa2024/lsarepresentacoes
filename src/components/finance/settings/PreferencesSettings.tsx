import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Bell, KeyRound, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { logFinanceAudit } from '@/hooks/useFinanceAudit';

type Prefs = {
  id?: string;
  user_email: string;
  date_format: string;
  currency: string;
  dre_email_recipients: string[];
  dre_email_frequency: string;
  due_alert_days: number;
  due_alerts_enabled: boolean;
};

const DEFAULTS: Omit<Prefs, 'user_email'> = {
  date_format: 'dd/MM/yyyy',
  currency: 'BRL',
  dre_email_recipients: [],
  dre_email_frequency: 'mensal',
  due_alert_days: 3,
  due_alerts_enabled: true,
};

export function PreferencesSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recipientsText, setRecipientsText] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('finance_user_preferences')
        .select('*')
        .eq('user_email', user.email!)
        .maybeSingle();
      const next: Prefs = data
        ? (data as Prefs)
        : { user_email: user.email!, ...DEFAULTS };
      setPrefs(next);
      setRecipientsText((next.dre_email_recipients ?? []).join(', '));
      setLoading(false);
    })();
  }, [user?.email]);

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    const recipients = recipientsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const payload = {
      user_email: prefs.user_email,
      date_format: prefs.date_format,
      currency: prefs.currency,
      dre_email_recipients: recipients,
      dre_email_frequency: prefs.dre_email_frequency,
      due_alert_days: prefs.due_alert_days,
      due_alerts_enabled: prefs.due_alerts_enabled,
    };
    const { error } = await supabase
      .from('finance_user_preferences')
      .upsert(payload, { onConflict: 'user_email' });
    if (error) toast.error('Erro ao salvar preferências');
    else {
      toast.success('Preferências salvas');
      await logFinanceAudit({
        table_name: 'finance_user_preferences',
        action: 'update',
        payload,
      });
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (pwd.length < 8) {
      toast.error('A senha deve ter ao menos 8 caracteres');
      return;
    }
    if (pwd !== pwd2) {
      toast.error('As senhas não coincidem');
      return;
    }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) toast.error('Erro ao alterar senha');
    else {
      toast.success('Senha alterada com sucesso');
      setPwd('');
      setPwd2('');
    }
    setPwdSaving(false);
  };

  if (loading || !prefs) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" /> Notificações
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Envio do DRE por e-mail e alertas de vencimento.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Frequência do DRE</Label>
              <Select
                value={prefs.dre_email_frequency}
                onValueChange={(v) => setPrefs({ ...prefs, dre_email_frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desativado">Desativado</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Destinatários (separados por vírgula)
              </Label>
              <Input
                value={recipientsText}
                onChange={(e) => setRecipientsText(e.target.value)}
                placeholder="financeiro@empresa.com, socio@empresa.com"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label>Alertas de vencimento</Label>
                <p className="text-xs text-muted-foreground">
                  Notificar contas próximas do vencimento.
                </p>
              </div>
              <Switch
                checked={prefs.due_alerts_enabled}
                onCheckedChange={(v) => setPrefs({ ...prefs, due_alerts_enabled: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Antecedência (dias)</Label>
              <Input
                type="number"
                min={0}
                value={prefs.due_alert_days}
                onChange={(e) =>
                  setPrefs({ ...prefs, due_alert_days: Number(e.target.value || 0) })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferências do usuário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Formato de data</Label>
              <Select
                value={prefs.date_format}
                onValueChange={(v) => setPrefs({ ...prefs, date_format: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/MM/yyyy">31/12/2026</SelectItem>
                  <SelectItem value="yyyy-MM-dd">2026-12-31</SelectItem>
                  <SelectItem value="dd MMM yyyy">31 dez 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Moeda</Label>
              <Select
                value={prefs.currency}
                onValueChange={(v) => setPrefs({ ...prefs, currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (R$)</SelectItem>
                  <SelectItem value="USD">Dólar (US$)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar preferências
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5 text-primary" /> Alterar senha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar senha</Label>
              <Input
                type="password"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={changePassword} disabled={pwdSaving} variant="outline">
              {pwdSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alterar senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
