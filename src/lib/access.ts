/**
 * Controle de acesso para áreas exclusivas.
 * Centraliza o(s) e-mail(s) autorizados para evitar checagens espalhadas.
 */

export const FINANCEIRO_LSA_ALLOWED_EMAIL = 'lucianoabreu@lsarepresentacoes.com.br';
export const ASSISTENCIA_USER_EMAIL = 'assistencia@lsarepresentacoes.com.br';

const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();

/**
 * Retorna true apenas para o usuário admin autorizado a acessar a Área LSA (Financeiro).
 * Requer ser admin E ter o e-mail autorizado — defesa em profundidade.
 */
export function canAccessFinanceiroLSA(email?: string | null, isAdmin?: boolean | null): boolean {
  if (!isAdmin) return false;
  return normalize(email) === FINANCEIRO_LSA_ALLOWED_EMAIL;
}

/**
 * Usuário dedicado ao time de Assistência Técnica.
 * Acesso restrito a: Atividades (assistências) e Ordens de Serviço.
 */
export function isAssistenciaUser(email?: string | null): boolean {
  return normalize(email) === ASSISTENCIA_USER_EMAIL;
}
