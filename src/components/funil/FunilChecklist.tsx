/**
 * FunilChecklist — Modal de Checklist para Avanço de Fase
 * ─────────────────────────────────────────────────────────────────
 * Exibe as perguntas de qualificação ao mover uma oportunidade
 * para a próxima fase do funil corporativo.
 *
 * Comportamento:
 *  - Bloqueia o avanço se perguntas críticas não forem atendidas
 *  - Cria atividades automaticamente baseado nas respostas
 *  - Exibe resumo das atividades que serão geradas antes de confirmar
 *
 * Uso:
 *   <FunilChecklist
 *     oportunidade={oportunidade}
 *     faseAtual="proposta_enviada"
 *     fasedestino="negociacao"
 *     onConfirmar={(atividades) => { moverFase(); criarAtividades(atividades); }}
 *     onCancelar={() => setModalAberto(false)}
 *   />
 */

import { useState, useMemo } from "react";
import {
  FaseId,
  Pergunta,
  AtividadeAutomatica,
  getTransicao,
  calcularPrazo,
} from "./funil-config";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Oportunidade {
  id:      string;
  empresa: string;
  valor?:  number;
}

export interface AtividadeGerada {
  titulo:       string;
  prazo:        string;      // "YYYY-MM-DD"
  prioridade:   "alta" | "media" | "baixa";
  oportunidade_id: string;
  oportunidade_empresa: string;
}

interface Props {
  oportunidade: Oportunidade;
  faseAtual:    FaseId;
  fasedestino:  FaseId;
  onConfirmar:  (atividadesGeradas: AtividadeGerada[]) => void;
  onCancelar:   () => void;
}

type Respostas = Record<string, string | boolean | null>;

// ── Cores de prioridade ───────────────────────────────────────────────────────
const COR_PRIORIDADE: Record<string, string> = {
  alta:  "#ef4444",
  media: "#f97316",
  baixa: "#6b7280",
};

// ── Componentes internos ──────────────────────────────────────────────────────

function Badge({ texto, cor }: { texto: string; cor: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 9999,
      fontSize: 11, fontWeight: 600, background: cor + "20", color: cor,
    }}>
      {texto}
    </span>
  );
}

function BotaoBoolean({
  valor, opcao, selecionado, onChange,
}: {
  valor: boolean; opcao: string; selecionado: boolean; onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      style={{
        padding: "7px 18px", borderRadius: 8, border: "1.5px solid",
        borderColor:    selecionado ? (valor ? "#22c55e" : "#ef4444") : "#d1d5db",
        background:     selecionado ? (valor ? "#f0fdf4" : "#fef2f2") : "#fff",
        color:          selecionado ? (valor ? "#16a34a" : "#dc2626") : "#374151",
        fontWeight:     selecionado ? 600 : 400,
        cursor:         "pointer", fontSize: 14, transition: "all .15s",
      }}
    >
      {opcao}
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function FunilChecklist({
  oportunidade, faseAtual, fasedestino, onConfirmar, onCancelar,
}: Props) {
  const transicao = getTransicao(faseAtual, fasedestino);
  const [respostas, setRespostas] = useState<Respostas>({});
  const [etapa, setEtapa] = useState<"checklist" | "resumo">("checklist");

  // ── Calcula bloqueios e atividades com base nas respostas ─────────────────
  const { bloqueios, atividadesGeradas, totalRespondidas } = useMemo(() => {
    if (!transicao) return { bloqueios: [], atividadesGeradas: [], totalRespondidas: 0 };

    const bloqueios: string[] = [];
    const atividadesGeradas: AtividadeGerada[] = [];
    let totalRespondidas = 0;

    for (const p of transicao.perguntas) {
      const resp = respostas[p.id];
      if (resp !== undefined && resp !== null) totalRespondidas++;

      // Verificar bloqueios
      if (p.obrigatoria && p.bloqueia_se !== null) {
        if (p.bloqueia_se === "nao" && resp === false) bloqueios.push(p.id);
        if (p.bloqueia_se === "sim" && resp === true)  bloqueios.push(p.id);
      }

      // Gerar atividades para boolean
      if (p.tipo === "boolean") {
        if (resp === false && p.atividade_se_nao) {
          atividadesGeradas.push({
            ...p.atividade_se_nao,
            prazo:                calcularPrazo(p.atividade_se_nao.prazo_dias),
            oportunidade_id:      oportunidade.id,
            oportunidade_empresa: oportunidade.empresa,
          });
        }
        if (resp === true && p.atividade_se_sim) {
          atividadesGeradas.push({
            ...p.atividade_se_sim,
            prazo:                calcularPrazo(p.atividade_se_sim.prazo_dias),
            oportunidade_id:      oportunidade.id,
            oportunidade_empresa: oportunidade.empresa,
          });
        }
      }

      // Gerar atividades para select
      if (p.tipo === "select" && typeof resp === "string" && p.atividade_por_opcao?.[resp]) {
        const at = p.atividade_por_opcao[resp];
        atividadesGeradas.push({
          ...at,
          prazo:                calcularPrazo(at.prazo_dias),
          oportunidade_id:      oportunidade.id,
          oportunidade_empresa: oportunidade.empresa,
        });
      }
    }

    return { bloqueios, atividadesGeradas, totalRespondidas };
  }, [respostas, transicao, oportunidade]);

  const podeAvancar =
    bloqueios.length === 0 &&
    totalRespondidas >= (transicao?.minimo_para_avancar ?? 0);

  if (!transicao) {
    return (
      <div style={estilos.overlay}>
        <div style={estilos.modal}>
          <p style={{ color: "#ef4444" }}>Transição não configurada para estas fases.</p>
          <button onClick={onCancelar} style={estilos.btnSecundario}>Fechar</button>
        </div>
      </div>
    );
  }

  // ── Renderizar pergunta ───────────────────────────────────────────────────
  function renderPergunta(p: Pergunta) {
    const resp = respostas[p.id];
    const bloqueado = bloqueios.includes(p.id);

    return (
      <div key={p.id} style={{
        ...estilos.perguntaBox,
        borderColor: bloqueado ? "#fca5a5" : "#e5e7eb",
        background:  bloqueado ? "#fff5f5" : "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          {/* Ícone de status */}
          <span style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>
            {resp === undefined || resp === null ? "○"
              : bloqueado ? "✗"
              : "✓"}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>{p.texto}</span>
              {p.obrigatoria && (
                <Badge texto="Obrigatória" cor="#3b82f6" />
              )}
              {bloqueado && (
                <Badge texto="Bloqueando avanço" cor="#ef4444" />
              )}
            </div>
            {p.dica && (
              <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>{p.dica}</p>
            )}
          </div>
        </div>

        {/* Controles de resposta */}
        <div style={{ paddingLeft: 24 }}>
          {p.tipo === "boolean" && (
            <div style={{ display: "flex", gap: 8 }}>
              <BotaoBoolean valor opcao="Sim" selecionado={resp === true}  onChange={() => setResposta(p.id, resp === true ? null : true)}  />
              <BotaoBoolean valor={false} opcao="Não" selecionado={resp === false} onChange={() => setResposta(p.id, resp === false ? null : false)} />
            </div>
          )}

          {p.tipo === "select" && p.opcoes && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {p.opcoes.map(op => (
                <button
                  key={op}
                  onClick={() => setResposta(p.id, resp === op ? null : op)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 13,
                    border:     "1.5px solid",
                    borderColor: resp === op ? "#3d5a4c" : "#d1d5db",
                    background:  resp === op ? "#f0f7f4" : "#fff",
                    color:       resp === op ? "#3d5a4c" : "#374151",
                    fontWeight:  resp === op ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  {op}
                </button>
              ))}
            </div>
          )}

          {p.tipo === "text" && (
            <input
              type="text"
              placeholder="Digite aqui..."
              value={typeof resp === "string" ? resp : ""}
              onChange={e => setResposta(p.id, e.target.value || null)}
              style={{
                width: "100%", padding: "8px 10px", borderRadius: 8,
                border: "1.5px solid #d1d5db", fontSize: 14, outline: "none",
                boxSizing: "border-box",
              }}
            />
          )}
        </div>
      </div>
    );
  }

  function setResposta(id: string, valor: string | boolean | null) {
    setRespostas(prev => ({ ...prev, [id]: valor }));
  }

  // ── Tela de resumo antes de confirmar ─────────────────────────────────────
  if (etapa === "resumo") {
    return (
      <div style={estilos.overlay}>
        <div style={estilos.modal}>
          <div style={estilos.header}>
            <div>
              <h2 style={estilos.titulo}>Confirmar avanço de fase</h2>
              <p style={estilos.subtitulo}>{oportunidade.empresa}</p>
            </div>
          </div>

          <div style={{ padding: "0 24px 8px" }}>
            <div style={{
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 10, padding: "12px 16px", marginBottom: 16,
            }}>
              <p style={{ margin: 0, fontSize: 14, color: "#15803d", fontWeight: 500 }}>
                ✓ Pronto para avançar para <strong>{fasedestino.replace(/_/g, " ")}</strong>
              </p>
            </div>

            {atividadesGeradas.length > 0 ? (
              <>
                <p style={{ fontSize: 14, color: "#374151", fontWeight: 600, marginBottom: 8 }}>
                  {atividadesGeradas.length} atividade(s) serão criadas automaticamente:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {atividadesGeradas.map((at, i) => (
                    <div key={i} style={{
                      background: "#fff", border: "1px solid #e5e7eb",
                      borderRadius: 8, padding: "10px 14px",
                      display: "flex", alignItems: "flex-start", gap: 10,
                    }}>
                      <span style={{ fontSize: 16 }}>📋</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>
                          {at.titulo}
                        </p>
                        <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                          <Badge texto={`Prazo: ${at.prazo}`} cor="#6b7280" />
                          <Badge
                            texto={at.prioridade.charAt(0).toUpperCase() + at.prioridade.slice(1)}
                            cor={COR_PRIORIDADE[at.prioridade]}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 14, color: "#6b7280" }}>
                Nenhuma atividade automática para esta transição.
              </p>
            )}
          </div>

          <div style={estilos.footer}>
            <button onClick={() => setEtapa("checklist")} style={estilos.btnSecundario}>
              ← Voltar
            </button>
            <button
              onClick={() => onConfirmar(atividadesGeradas)}
              style={estilos.btnPrimario}
            >
              Confirmar e avançar fase
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Tela principal de checklist ───────────────────────────────────────────
  const progresso = Math.round(
    (totalRespondidas / transicao.perguntas.length) * 100
  );

  return (
    <div style={estilos.overlay}>
      <div style={estilos.modal}>
        {/* Header */}
        <div style={estilos.header}>
          <div>
            <h2 style={estilos.titulo}>{transicao.titulo}</h2>
            <p style={estilos.subtitulo}>{oportunidade.empresa}</p>
          </div>
          <button onClick={onCancelar} style={estilos.btnFechar}>✕</button>
        </div>

        {/* Descrição + progresso */}
        <div style={{ padding: "0 24px 12px" }}>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
            {transicao.descricao}
          </p>

          {/* Barra de progresso */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, background: "#e5e7eb", borderRadius: 99, height: 6 }}>
              <div style={{
                width: `${progresso}%`, background: "#3d5a4c",
                borderRadius: 99, height: 6, transition: "width .3s",
              }} />
            </div>
            <span style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
              {totalRespondidas}/{transicao.perguntas.length} respondidas
            </span>
          </div>
        </div>

        {/* Perguntas */}
        <div style={estilos.corpo}>
          {transicao.perguntas.map(renderPergunta)}
        </div>

        {/* Status de bloqueio */}
        {bloqueios.length > 0 && (
          <div style={{
            margin: "0 24px 12px",
            background: "#fef2f2", border: "1px solid #fca5a5",
            borderRadius: 8, padding: "10px 14px",
          }}>
            <p style={{ margin: 0, fontSize: 13, color: "#dc2626", fontWeight: 500 }}>
              ✗ {bloqueios.length} item(s) crítico(s) impedem o avanço.
              Resolva antes de continuar.
            </p>
          </div>
        )}

        {/* Rodapé */}
        <div style={estilos.footer}>
          <button onClick={onCancelar} style={estilos.btnSecundario}>
            Cancelar
          </button>
          <button
            onClick={() => setEtapa("resumo")}
            disabled={!podeAvancar}
            title={!podeAvancar
              ? `Responda pelo menos ${transicao.minimo_para_avancar} perguntas obrigatórias`
              : "Avançar para próxima fase"}
            style={{
              ...estilos.btnPrimario,
              opacity:  podeAvancar ? 1 : 0.4,
              cursor:   podeAvancar ? "pointer" : "not-allowed",
            }}
          >
            Revisar e avançar →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const estilos = {
  overlay: {
    position: "fixed" as const, inset: 0,
    background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: 16,
  },
  modal: {
    background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560,
    maxHeight: "90vh", display: "flex", flexDirection: "column" as const,
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    overflow: "hidden",
  },
  header: {
    padding: "20px 24px 16px",
    borderBottom: "1px solid #f3f4f6",
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    flexShrink: 0,
  },
  titulo: {
    margin: 0, fontSize: 18, fontWeight: 700, color: "#111827",
  },
  subtitulo: {
    margin: "2px 0 0", fontSize: 13, color: "#6b7280",
  },
  corpo: {
    flex: 1, overflowY: "auto" as const,
    padding: "12px 24px",
    display: "flex", flexDirection: "column" as const, gap: 10,
  },
  perguntaBox: {
    padding: "12px 14px", borderRadius: 10,
    border: "1.5px solid #e5e7eb",
    transition: "border-color .2s, background .2s",
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #f3f4f6",
    display: "flex", justifyContent: "flex-end", gap: 10,
    flexShrink: 0,
  },
  btnPrimario: {
    padding: "10px 20px", borderRadius: 8, border: "none",
    background: "#3d5a4c", color: "#fff",
    fontWeight: 600, fontSize: 14, cursor: "pointer",
    transition: "opacity .2s",
  },
  btnSecundario: {
    padding: "10px 20px", borderRadius: 8,
    border: "1.5px solid #d1d5db", background: "#fff",
    color: "#374151", fontWeight: 500, fontSize: 14, cursor: "pointer",
  },
  btnFechar: {
    background: "none", border: "none",
    fontSize: 16, color: "#9ca3af", cursor: "pointer",
    padding: "0 4px",
  },
};
