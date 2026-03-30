

## Problema identificado

Dois bugs na lista "Clientes sem Compra há 60+ dias":

1. **Representante desatualizado**: A view `v_clients_summary` (base da `v_rep_clients_no_purchase_60d`) usa `owner_email` da tabela `orders`, não da tabela `clients`. Quando o responsável é alterado no cadastro do cliente, a view continua mostrando o representante antigo (do pedido).

2. **Filtro de segmento incompleto**: O filtro atual só exclui clientes com segmento exatamente `corporativo`, mas os segmentos corporativos reais são: `Construtora`, `Escritório de Arquitetura`, `Incorporadora`.

---

## Plano de correção

### 1. Recriar a view `v_clients_summary` (migration SQL)

Alterar a view para fazer JOIN com `clients` e usar `clients.owner_email` em vez de `orders.owner_email`. Isso garante que o representante reflita sempre o cadastro atualizado.

```sql
CREATE OR REPLACE VIEW v_clients_summary AS
SELECT 
  c.owner_email,
  o.client_id,
  o.client_name,
  max(o.issue_date) AS last_purchase_date,
  CURRENT_DATE - max(o.issue_date) AS days_since_last_purchase,
  -- ... (mesmas agregações existentes, sem mudanças)
  max(o.issue_date) < (CURRENT_DATE - '60 days'::interval) AS no_purchase_60d
FROM orders o
LEFT JOIN clients c ON c.id = o.client_id
GROUP BY c.owner_email, o.client_id, o.client_name;
```

### 2. Atualizar filtro de segmentos no frontend

Em `useRepDashboard.ts`, trocar a query que busca apenas `ilike('segment', 'corporativo')` por uma query que busca todos os segmentos corporativos:

```typescript
const corpQuery = supabase
  .from('clients')
  .select('id, segment')
  .or('segment.ilike.Construtora,segment.ilike.Incorporadora,segment.ilike.Escritório de Arquitetura');
```

Isso exclui da listagem todos os clientes dos 3 segmentos corporativos.

---

### Arquivos modificados

| Arquivo | Alteração |
|---|---|
| Migration SQL (nova) | Recriar `v_clients_summary` com JOIN em `clients` para pegar `owner_email` atualizado |
| `src/hooks/useRepDashboard.ts` | Expandir filtro de segmentos corporativos |

