/**
 * useFunilActions — Hook de integração Funil × Supabase
 * ─────────────────────────────────────────────────────────────────
 * Tabelas:
 *   sales_opportunities  → atualiza a fase
 *   activities           → cria atividades automáticas (type: 'tarefa')
 *   historico_fases      → registra cada transição
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AtividadeGerada } from "./FunilChecklist";
import type { FaseId } from "./funil-config";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AvancarFaseParams {
  oportunidadeId: string;
  faseAtual:      FaseId;
  faseNova:       FaseId;
  atividades:     AtividadeGerada[];
  responsavelId?: string;
}

interface ResultadoAvancar {
  sucesso:           boolean;
  atividadesCriadas: number;
  erro?:             string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFunilActions() {
  const [loading, setLoading] = useState(false);
  const [erro,    setErro]    = useState<string | null>(null);

  // ── Avançar fase + criar atividades ────────────────────────────────────────
  const avancarFase = useCallback(async ({
    oportunidadeId,
    faseAtual,
    faseNova,
    atividades,
    responsavelId,
  }: AvancarFaseParams): Promise<ResultadoAvancar> => {
    setLoading(true);
    setErro(null);

    try {
      // 1. Atualizar fase em sales_opportunities
      const { error: erroFase } = await supabase
        .from("sales_opportunities")
        .update({
          fase:               faseNova,
          fase_anterior:      faseAtual,
          fase_atualizada_em: new Date().toISOString(),
        })
        .eq("id", oportunidadeId);

      if (erroFase) throw new Error(`Erro ao atualizar fase: ${erroFase.message}`);

      // 2. Registrar histórico
      const { error: erroHistorico } = await supabase
        .from("historico_fases")
        .insert({
          sales_opportunity_id: oportunidadeId,
          fase_anterior:        faseAtual,
          fase_nova:            faseNova,
          alterado_por:         responsavelId ?? null,
        });

      if (erroHistorico) {
        console.warn("Aviso: histórico não salvo:", erroHistorico.message);
      }

      // 3. Criar atividades em activities
      let atividadesCriadas = 0;

      if (atividades.length > 0) {
        const registros = atividades.map((at) => ({
          title:                at.titulo,
          due_date:             at.prazo,
          priority:             at.prioridade,      // 'alta' | 'media' | 'baixa'
          status:               "pendente",
          type:                 "tarefa",
          activity_category:    "crm",
          origem:               "checklist_funil",
          fase_origem:          faseAtual,
          fase_destino:         faseNova,
          sales_opportunity_id: oportunidadeId,
          assigned_to_email:    responsavelId ?? null,
          watcher_emails:       [],
        }));

        const { data, error: erroAtividades } = await supabase
          .from("activities")
          .insert(registros)
          .select("id");

        if (erroAtividades) throw new Error(`Erro ao criar atividades: ${erroAtividades.message}`);

        atividadesCriadas = data?.length ?? 0;
      }

      return { sucesso: true, atividadesCriadas };

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setErro(msg);
      console.error("[useFunilActions]", msg);
      return { sucesso: false, atividadesCriadas: 0, erro: msg };

    } finally {
      setLoading(false);
    }
  }, []);

  // ── Buscar atividades de uma oportunidade ──────────────────────────────────
  const buscarAtividades = useCallback(async (oportunidadeId: string) => {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("sales_opportunity_id", oportunidadeId)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Erro ao buscar atividades:", error.message);
      return [];
    }

    return data ?? [];
  }, []);

  // ── Concluir uma atividade ─────────────────────────────────────────────────
  const concluirAtividade = useCallback(async (atividadeId: string) => {
    const { error } = await supabase
      .from("activities")
      .update({
        status:       "concluida",
        completed_at: new Date().toISOString(),
      })
      .eq("id", atividadeId);

    if (error) {
      console.error("Erro ao concluir atividade:", error.message);
      return false;
    }

    return true;
  }, []);

  return {
    avancarFase,
    buscarAtividades,
    concluirAtividade,
    loading,
    erro,
  };
}
