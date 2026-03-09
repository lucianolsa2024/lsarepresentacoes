import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, PlayCircle, UserPlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BulkActionBarProps {
  selectedCount: number;
  onBulkComplete: () => void;
  onBulkCancel: () => void;
  onBulkStart: () => void;
  onBulkAssign: (email: string) => void;
  onClearSelection: () => void;
}

interface TeamMember {
  name: string;
  email: string;
}

export function BulkActionBar({
  selectedCount,
  onBulkComplete,
  onBulkCancel,
  onBulkStart,
  onBulkAssign,
  onClearSelection,
}: BulkActionBarProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignEmail, setAssignEmail] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('representatives_map')
        .select('representative_name, email')
        .eq('active', true)
        .order('representative_name');
      
      const members: TeamMember[] = (data || []).map((r: any) => ({
        name: r.representative_name,
        email: r.email,
      }));
      
      // Add backoffice
      const backoffice = [
        { name: 'Joice (Backoffice)', email: 'joice@lsarepresentacoes.com.br' },
        { name: 'Maíra (Backoffice)', email: 'posicao@lsarepresentacoes.com.br' },
        { name: 'Marcia (Assistência)', email: 'assistencia@lsarepresentacoes.com.br' },
        { name: 'Isabella (Backoffice)', email: 'pedidos2@lsarepresentacoes.com.br' },
        { name: 'Nilva (Backoffice)', email: 'pedidos@lsarepresentacoes.com.br' },
        { name: 'Camila (Backoffice)', email: 'camila@lsarepresentacoes.com.br' },
        { name: 'Milla (Backoffice)', email: 'milla@lsarepresentacoes.com.br' },
      ];
      for (const bo of backoffice) {
        if (!members.find(m => m.email === bo.email)) {
          members.push(bo);
        }
      }
      setTeamMembers(members);
    };
    load();
  }, []);

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-20 bg-primary text-primary-foreground rounded-lg p-3 flex flex-wrap items-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
      <span className="font-medium text-sm">
        {selectedCount} selecionada{selectedCount > 1 ? 's' : ''}
      </span>
      
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="secondary" onClick={onBulkComplete}>
          <CheckCircle className="h-4 w-4 mr-1" />
          Concluir
        </Button>
        <Button size="sm" variant="secondary" onClick={onBulkStart}>
          <PlayCircle className="h-4 w-4 mr-1" />
          Iniciar
        </Button>
        <Button size="sm" variant="secondary" onClick={onBulkCancel}>
          <XCircle className="h-4 w-4 mr-1" />
          Cancelar
        </Button>
        
        <div className="flex items-center gap-1">
          <Select
            value={assignEmail}
            onValueChange={(val) => {
              setAssignEmail(val);
              onBulkAssign(val);
              setAssignEmail('');
            }}
          >
            <SelectTrigger className="h-9 w-[200px] bg-secondary text-secondary-foreground border-0">
              <UserPlus className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Designar para..." />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map(m => (
                <SelectItem key={m.email} value={m.email}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button size="sm" variant="ghost" onClick={onClearSelection} className="ml-auto text-primary-foreground hover:bg-primary-foreground/20">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
