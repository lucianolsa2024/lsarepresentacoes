import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plug, Sparkles, Database, Info } from 'lucide-react';

export function IntegrationsSettings() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" /> OCR — Inteligência Artificial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-sm text-foreground">
              O OCR de notas fiscais e boletos é processado pela <strong>Lovable AI Gateway</strong>{' '}
              (modelo <code className="rounded bg-muted px-1">google/gemini-2.5-flash</code>).
              <p className="mt-1 text-xs text-muted-foreground">
                Não é necessário cadastrar chave de API — o serviço já está conectado e o consumo é
                gerenciado pela plataforma.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Status do OCR</p>
              <p className="text-xs text-muted-foreground">
                Edge Function <code>extract-finance-document</code>
              </p>
            </div>
            <Badge>Ativo</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-primary" /> Importação de extratos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">OFX / CSV — Itaú e demais bancos</p>
              <p className="text-xs text-muted-foreground">
                Disponível na aba <strong>Conciliação → Importar extrato</strong>.
              </p>
            </div>
            <Badge variant="secondary">Manual</Badge>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border p-3">
            <Plug className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium">API Itaú (Open Finance)</p>
              <p className="text-xs text-muted-foreground">
                Integração direta via API requer credenciais corporativas do Itaú (Client ID /
                Secret e certificado). Quando disponíveis, podemos habilitar a sincronização
                automática de extratos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
