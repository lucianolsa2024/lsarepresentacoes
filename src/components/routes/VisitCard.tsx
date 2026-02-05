import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Phone, Clock, CheckCircle, LogIn, LogOut, FileText, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RouteVisit, VisitStatus } from '@/types/route';
import { formatAddress, openInMaps } from '@/utils/mapUtils';
import { generateVisitCalendarUrl } from '@/utils/outlookCalendar';
import { useState } from 'react';

interface VisitCardProps {
  visit: RouteVisit;
  order: number;
  onCheckIn: (visitId: string) => Promise<boolean>;
  onCheckOut: (visitId: string) => Promise<boolean>;
  onUpdateNotes: (visitId: string, notes: string) => Promise<boolean>;
  onCreateQuote?: (clientId: string) => void;
}

const statusConfig: Record<VisitStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  realizada: { label: 'Realizada', variant: 'default' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
};

export function VisitCard({ visit, order, onCheckIn, onCheckOut, onUpdateNotes, onCreateQuote }: VisitCardProps) {
  const [notes, setNotes] = useState(visit.notes || '');
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);

  const client = visit.client;
  const status = statusConfig[visit.status];

  const address = client ? formatAddress({
    street: client.street,
    number: client.number,
    neighborhood: client.neighborhood,
    city: client.city,
    state: client.state,
  }) : '';

  const handleOpenMaps = () => {
    if (client) {
      openInMaps({
        street: client.street,
        number: client.number,
        city: client.city,
        state: client.state,
      });
    }
  };

  const handleOpenOutlook = () => {
    if (client) {
      const url = generateVisitCalendarUrl(visit, client);
      window.open(url, '_blank');
    }
  };

  const handleCheckIn = async () => {
    await onCheckIn(visit.id);
  };

  const handleCheckOut = async () => {
    await onCheckOut(visit.id);
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    await onUpdateNotes(visit.id, notes);
    setSaving(false);
    setShowNotes(false);
  };

  const getDuration = () => {
    if (visit.check_in_at && visit.check_out_at) {
      const minutes = differenceInMinutes(new Date(visit.check_out_at), new Date(visit.check_in_at));
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
    }
    return null;
  };

  const duration = getDuration();

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              {order}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{client?.company || 'Cliente não encontrado'}</h4>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              
              {address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{address}</span>
                </div>
              )}
              
              {client?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${client.phone}`} className="hover:text-primary">
                    {client.phone}
                  </a>
                </div>
              )}

              {/* Check-in/out times */}
              {(visit.check_in_at || visit.check_out_at) && (
                <div className="flex items-center gap-4 text-sm">
                  {visit.check_in_at && (
                    <span className="flex items-center gap-1 text-primary">
                      <LogIn className="h-3 w-3" />
                      {format(new Date(visit.check_in_at), 'HH:mm')}
                    </span>
                  )}
                  {visit.check_out_at && (
                    <span className="flex items-center gap-1 text-primary">
                      <LogOut className="h-3 w-3" />
                      {format(new Date(visit.check_out_at), 'HH:mm')}
                    </span>
                  )}
                  {duration && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {duration}
                    </span>
                  )}
                </div>
              )}

              {visit.notes && !showNotes && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  {visit.notes}
                </p>
              )}

              {showNotes && (
                <div className="space-y-2">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicionar observações..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes} disabled={saving}>
                      Salvar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowNotes(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {/* Action buttons */}
            <Button variant="ghost" size="icon" onClick={handleOpenMaps} title="Abrir no Maps">
              <MapPin className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleOpenOutlook} title="Adicionar ao Outlook">
              <Clock className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowNotes(!showNotes)} title="Observações">
              <MessageSquare className="h-4 w-4" />
            </Button>
            {client && onCreateQuote && (
              <Button variant="ghost" size="icon" onClick={() => onCreateQuote(client.id)} title="Novo Orçamento">
                <FileText className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Check-in/out buttons */}
        {visit.status !== 'cancelada' && (
          <div className="flex gap-2 mt-4">
            {!visit.check_in_at && (
              <Button size="sm" variant="outline" className="flex-1" onClick={handleCheckIn}>
                <LogIn className="h-4 w-4 mr-2" />
                Check-in
              </Button>
            )}
            {visit.check_in_at && !visit.check_out_at && (
              <Button size="sm" variant="outline" className="flex-1" onClick={handleCheckOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Check-out
              </Button>
            )}
            {visit.check_in_at && visit.check_out_at && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle className="h-4 w-4" />
                Visita concluída
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
