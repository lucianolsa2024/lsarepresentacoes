import { useState } from 'react';
import { useCalendarToken } from '@/hooks/useCalendarToken';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

export function CalendarSubscription() {
  const { feedUrl, loading } = useCalendarToken();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    toast.success('URL copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenOutlook = () => {
    if (!feedUrl) return;
    // Outlook web subscription URL
    const outlookUrl = `https://outlook.office.com/calendar/addfromweb?url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent('LSA Atividades')}`;
    window.open(outlookUrl, '_blank');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-1" />
          Assinar Calendário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assinar Calendário no Outlook</DialogTitle>
          <DialogDescription>
            Suas atividades serão sincronizadas automaticamente com o Outlook (~30min de atualização).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Opção 1: Adicionar direto no Outlook</p>
            <Button onClick={handleOpenOutlook} disabled={!feedUrl || loading} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir no Outlook
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Opção 2: Copiar URL do feed</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={feedUrl || 'Carregando...'}
                className="text-xs font-mono"
              />
              <Button variant="outline" size="icon" onClick={handleCopy} disabled={!feedUrl}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              No Outlook: Configurações → Calendário → Calendários compartilhados → Assinar pela Internet → Cole a URL acima.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
