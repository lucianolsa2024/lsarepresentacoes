import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2 } from 'lucide-react';
import logoLsa from '@/assets/logo-lsa.png';

const REPRESENTATIVES = [
  'Juliana Cecconi',
  'Lívia Morelli',
  'Luciano Abreu',
  'Luciano Filho',
  'Marcia Morelli',
];

const NPS_QUESTIONS = [
  'Qual a sua avaliação do treinamento em geral?',
  'Conteúdo apresentado?',
  'Conhecimento técnico?',
  'Capacidade didática do representante?',
  'Nota para o material apresentado (virtual e físico)?',
];

function NpsScale({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: 11 }, (_, i) => {
        const isSelected = value === i;
        let colorClass = '';
        if (i <= 6) colorClass = isSelected ? 'bg-red-500 text-white border-red-500' : 'border-red-300 text-red-600 hover:bg-red-50';
        else if (i <= 8) colorClass = isSelected ? 'bg-yellow-500 text-white border-yellow-500' : 'border-yellow-300 text-yellow-600 hover:bg-yellow-50';
        else colorClass = isSelected ? 'bg-green-500 text-white border-green-500' : 'border-green-300 text-green-600 hover:bg-green-50';

        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={`w-9 h-9 rounded-md border-2 text-sm font-semibold transition-all ${colorClass}`}
          >
            {i}
          </button>
        );
      })}
    </div>
  );
}

export default function NpsForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState<any>(null);
  const [stores, setStores] = useState<{ id: string; company: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [trainingDate, setTrainingDate] = useState('');
  const [representative, setRepresentative] = useState('');
  const [storeId, setStoreId] = useState('');
  const [scores, setScores] = useState<(number | null)[]>([null, null, null, null, null]);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!token) { setError('Link inválido'); setLoading(false); return; }

      const { data: t, error: tErr } = await supabase
        .from('store_trainings')
        .select('*')
        .eq('nps_token', token)
        .single();

      if (tErr || !t) { setError('Link inválido ou expirado'); setLoading(false); return; }
      if ((t as any).nps_submitted) { setError('Este formulário já foi respondido'); setLoading(false); return; }

      setTraining(t);
      setTrainingDate((t as any).training_date || '');

      const { data: clients } = await supabase
        .from('clients')
        .select('id, company')
        .order('company');
      setStores((clients || []).map((c: any) => ({ id: c.id, company: c.company })));
      setLoading(false);
    };
    load();
  }, [token]);

  const handleSubmit = async () => {
    if (!name.trim()) { alert('Informe seu nome completo'); return; }
    if (!trainingDate) { alert('Informe a data do treinamento'); return; }
    if (!representative) { alert('Selecione o representante'); return; }
    if (!storeId) { alert('Selecione sua loja'); return; }
    if (scores.some(s => s === null)) { alert('Preencha todas as notas'); return; }

    setSubmitting(true);
    try {
      const { error: insertErr } = await supabase.from('nps_responses').insert({
        client_id: storeId,
        training_id: training.id,
        consultant_name: name.trim(),
        trainer_email: representative,
        score_1: scores[0]!,
        score_2: scores[1]!,
        score_3: scores[2]!,
        score_4: scores[3]!,
        score_5: scores[4]!,
        comment: comment.trim() || null,
        response_date: trainingDate,
      });
      if (insertErr) throw insertErr;

      await supabase
        .from('store_trainings')
        .update({ nps_submitted: true } as any)
        .eq('nps_token', token);

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <img src={logoLsa} alt="LSA" className="h-12 mx-auto" />
          <p className="text-lg font-medium text-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Obrigado pelo seu feedback!</h2>
          <p className="text-muted-foreground">Ele é muito importante para evoluirmos juntos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <img src={logoLsa} alt="LSA" className="h-10 mx-auto" />
          <h1 className="text-xl font-bold text-foreground">NPS Treinamento — LSA</h1>
          <p className="text-sm text-muted-foreground">
            Este formulário tem como objetivo a melhora constante do nosso treinamento.
          </p>
        </div>

        <div className="space-y-5 bg-card border rounded-xl p-6 shadow-sm">
          {/* 1. Nome */}
          <div className="space-y-1.5">
            <Label>Nome completo *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" />
          </div>

          {/* 2. Data */}
          <div className="space-y-1.5">
            <Label>Data do treinamento *</Label>
            <Input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} />
          </div>

          {/* 3. Representante */}
          <div className="space-y-1.5">
            <Label>Representante *</Label>
            <Select value={representative} onValueChange={setRepresentative}>
              <SelectTrigger><SelectValue placeholder="Selecionar representante" /></SelectTrigger>
              <SelectContent>
                {REPRESENTATIVES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Loja */}
          <div className="space-y-1.5">
            <Label>Em qual loja você é consultor(a)/gerente? *</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger><SelectValue placeholder="Selecionar loja" /></SelectTrigger>
              <SelectContent>
                {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.company}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 5-9. NPS Scales */}
          {NPS_QUESTIONS.map((q, i) => (
            <div key={i} className="space-y-2">
              <Label className="text-sm">{q} *</Label>
              <NpsScale value={scores[i]} onChange={v => {
                const ns = [...scores];
                ns[i] = v;
                setScores(ns);
              }} />
            </div>
          ))}

          {/* 10. Comentário */}
          <div className="space-y-1.5">
            <Label>Deixe seu comentário — isso nos ajuda a melhorar! 😃</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Opcional" />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : 'Enviar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
