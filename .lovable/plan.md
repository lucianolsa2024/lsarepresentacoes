

## Plan: Isolamento de Pedidos por Representante

### Objetivo
Implementar controle de acesso nos pedidos para que cada representante veja apenas seus proprios pedidos, enquanto admins veem tudo. Inclui criacao da tabela de mapeamento representante-email e atualizacao das politicas de seguranca.

### Etapas

#### 1. Migracao do banco de dados

Executar uma unica migracao SQL que:

- Adiciona coluna `owner_email` (text, nullable) na tabela `orders`
- Cria tabela `representatives_map` com colunas `representative_name` (PK), `email` (unique), `active` (boolean)
- Habilita RLS na tabela `representatives_map` com politica de leitura para autenticados
- Remove as politicas antigas de SELECT e UPDATE da tabela `orders`
- Cria novas politicas de SELECT e UPDATE baseadas em `owner_email = auth.jwt()->>'email'` OU admin via `has_role()`
- Mantem as politicas existentes de INSERT e DELETE inalteradas

#### 2. Inserir dados de mapeamento

Usar ferramenta de insert para popular `representatives_map` com os 5 representantes:
- LUCIANO ABREU -> luciano@lsarepresentacoes.com.br
- MARCIA MORELLI -> marcia.morelli@lsarepresentacoes.com.br
- JULIANA CECONI -> comercial2@lsarepresentacoes.com.br
- LIVIA MORELLI -> livia.morelli@lsarepresentacoes.com.br
- LUCIANO MORETTI -> lucianoabreu@lsarepresentacoes.com.br

#### 3. Backfill de owner_email nos pedidos existentes

Executar UPDATE via insert tool para preencher `owner_email` nos pedidos existentes fazendo match normalizado (UPPER/TRIM) entre `orders.representative` e `representatives_map.representative_name`.

#### 4. Atualizar o tipo Order e o hook useOrders

- Adicionar `ownerEmail` ao interface `Order` em `src/types/order.ts`
- Atualizar `dbToOrder` para mapear `row.owner_email`
- Atualizar `orderToDb` para incluir `owner_email` baseado no representante selecionado (fazendo lookup na tabela `representatives_map` ou usando o email do usuario logado)

#### 5. Atualizar a lista de REPRESENTATIVES

Atualizar a constante `REPRESENTATIVES` em `src/types/order.ts` para incluir os 5 nomes atualizados:
- LUCIANO ABREU, MARCIA MORELLI, JULIANA CECONI, LIVIA MORELLI, LUCIANO MORETTI

#### 6. Auto-preencher owner_email ao criar pedidos

No `orderToDb`, ao inserir um novo pedido, resolver o `owner_email` a partir do campo `representative` usando a tabela de mapeamento, ou usar o email do usuario autenticado como fallback.

### Detalhes Tecnicos

**Politicas RLS finais na tabela orders:**

```text
SELECT: admin via has_role() OU owner_email = jwt email
UPDATE: admin via has_role() OU owner_email = jwt email  
INSERT: qualquer autenticado (mantido)
DELETE: somente admin (mantido)
```

**Arquivos modificados:**
- `src/types/order.ts` - adicionar ownerEmail, atualizar REPRESENTATIVES
- `src/hooks/useOrders.ts` - mapear owner_email no dbToOrder e orderToDb
- Nova migracao SQL
- Insert de dados na representatives_map + backfill

