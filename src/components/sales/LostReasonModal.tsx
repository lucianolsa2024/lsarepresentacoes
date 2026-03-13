import { useState } from 'react';
import { LOST_REASONS } from '@/hooks/useSalesOpportunities';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => void;
}

export function LostReasonModal({ open, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (!reason) { toast.error('Selecione o motivo da perda'); return; }
    onConfirm(reason, notes);
    setReason('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Motivo da Perda</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Selecionar motivo..." /></SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map(r => <SelectItem key={r.key} value={r.label}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Detalhes adicionais..." />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirm}>Confirmar Perda</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
