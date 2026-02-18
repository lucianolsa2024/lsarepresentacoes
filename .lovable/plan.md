
# Plano: Relatorio de Vendas + Painel Administrativo

## Resumo

Criar 3 funcionalidades novas:
1. **Relatorio de Vendas** agrupado por fornecedor, vendedor e periodo
2. **Painel de Administracao** (somente para seu login admin) com cadastro de metas, gerenciamento de usuarios e reset de senha
3. Nova aba "Admin" visivel apenas para admins

---

## 1. Relatorio de Vendas por Fornecedor/Vendedor

Criar um componente `SalesReport` que permite filtrar pedidos por periodo e exibe:

- **Tabela resumo por fornecedor**: faturamento, volume, qtd pedidos, ticket medio
- **Tabela resumo por vendedor**: mesmos indicadores
- **Tabela cruzada fornecedor x vendedor**: para ver qual vendedor vende mais de cada marca
- Filtros de data (de/ate) no topo
- Graficos de barras (Recharts) para visualizacao rapida

Dados virao diretamente da tabela `orders` filtrada por periodo no frontend (ja carregada), ou das views existentes (`v_rep_suppliers_month`, `v_rep_supplier_90d_compare`) para dados pre-calculados.

---

## 2. Painel de Administracao

### 2a. Cadastro de Metas
- Formulario para selecionar representante (lista de `representatives_map`), mes e valor da meta
- CRUD na tabela `rep_goals` (ja existente com RLS admin-only para insert/update/delete)
- Tabela listando metas cadastradas com opcao de editar/excluir

### 2b. Gerenciamento de Usuarios
- Listar usuarios do `representatives_map` + backoffice
- Criar novos usuarios via edge function (usando `supabase.auth.admin.createUser`)
- A edge function tera acesso ao `SUPABASE_SERVICE_ROLE_KEY` (ja configurado)

### 2c. Reset de Senha
- Botao para resetar senha de qualquer usuario via edge function (`supabase.auth.admin.updateUserById`)
- Input para nova senha, confirmacao, e execucao

---

## 3. Nova Aba "Admin"

- Visivel apenas quando `has_role(uid, 'admin')` for true
- Usar hook `useIsAdmin` que consulta `user_roles`
- Contera sub-abas: Relatorio de Vendas | Metas | Usuarios

---

## Detalhes Tecnicos

### Arquivos novos:
- `src/hooks/useIsAdmin.ts` - hook para verificar role admin
- `src/components/admin/AdminPanel.tsx` - container com sub-abas
- `src/components/admin/SalesReport.tsx` - relatorio de vendas
- `src/components/admin/GoalManager.tsx` - CRUD de metas
- `src/components/admin/UserManager.tsx` - gestao de usuarios + reset senha
- `supabase/functions/admin-users/index.ts` - edge function para criar usuario e resetar senha

### Arquivos modificados:
- `src/pages/Index.tsx` - adicionar aba Admin condicional

### Edge Function `admin-users`:
```
POST /admin-users
Body: { action: "create", email, password, name }
      { action: "reset-password", userId, newPassword }
      { action: "list" }
```
- Valida que o chamador eh admin (via JWT + `has_role`)
- Usa service role key para operacoes admin do auth

### Banco de dados:
- Nenhuma migracao necessaria - `rep_goals` e `user_roles` ja existem
- Views de fornecedor (`v_rep_suppliers_month`, `v_rep_supplier_90d_compare`) ja existem

### Seguranca:
- Aba Admin so renderiza se `useIsAdmin()` retornar true
- Edge function valida role admin server-side antes de executar
- Reset de senha e criacao de usuario sao operacoes server-side apenas
