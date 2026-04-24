import { supabase } from '@/integrations/supabase/client';
import { Quote } from '@/types/quote';
import { getQuoteLabel } from '@/utils/quoteLabel';

/**
 * Cria ou atualiza um único follow-up por cadeia de versões de orçamento.
 * Consulta o banco diretamente (evita race conditions com estado React local).
 *
 * Regra: existe no máximo 1 follow-up ativo por cadeia (root + versões).
 * Se já existir um follow-up ativo apontando para qualquer versão da cadeia,
 * ele é atualizado para refletir a versão mais recente.
 * Se não existir, cria um novo com vencimento D+5.
 */
export async function upsertFollowUpForQuote(
  quote: Quote,
  clientId: string | null | undefined,
): Promise<void> {
  try {
    const rootId = quote.parentQuoteId || quote.id;

    // 1) IDs de toda a cadeia: root + todas as versões filhas
    const { data: chainQuotes, error: chainErr } = await supabase
      .from('quotes')
      .select('id')
      .or(`id.eq.${rootId},parent_quote_id.eq.${rootId}`);

    if (chainErr) throw chainErr;
    const chainIds = new Set<string>([rootId, quote.id, ...(chainQuotes || []).map((q) => q.id)]);

    // 2) Follow-ups ativos apontando para qualquer item da cadeia
    const { data: existing, error: existErr } = await supabase
      .from('activities')
      .select('id, status, quote_id, created_at')
      .eq('type', 'followup')
      .in('quote_id', Array.from(chainIds))
      .not('status', 'in', '("concluida","cancelada","realizada")')
      .order('created_at', { ascending: true });

    if (existErr) throw existErr;

    const label = getQuoteLabel(quote);
    const description = `Lembrete automático de follow-up: ${label}. Total: R$ ${quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const title = `Follow-up ${label}`;

    if (existing && existing.length > 0) {
      // Mantém o mais antigo apontando para a versão atual; cancela os demais
      const [keep, ...dups] = existing;
      await supabase
        .from('activities')
        .update({ quote_id: quote.id, title, description })
        .eq('id', keep.id);

      if (dups.length > 0) {
        await supabase
          .from('activities')
          .update({ status: 'cancelada' })
          .in('id', dups.map((d) => d.id));
      }
      return;
    }

    // 3) Não existe — cria novo D+5
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 5);

    await supabase.from('activities').insert({
      activity_category: 'crm',
      type: 'followup',
      title,
      description,
      due_date: followUpDate.toISOString().split('T')[0],
      priority: 'media',
      client_id: clientId || null,
      quote_id: quote.id,
    });
  } catch (err) {
    console.error('[upsertFollowUpForQuote] erro:', err);
  }
}
