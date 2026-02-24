

## Modulo de Gestao de Ordens de Servico (OS)

### Resumo
Novo modulo completo dentro da aba "Operacao" para gerenciar ordens de servico com formulario dedicado, lista com filtros, calculo automatico de resultado liquido, upload de documentos/fotos e historico de alteracoes.

---

### 1. Banco de Dados

**Nova tabela `service_orders`:**

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | Identificador |
| os_number | serial/text | Numero sequencial da OS |
| product | text | Produto |
| responsible_type | text | Fabrica, Consumidor ou Lojista |
| responsible_name | text | Nome do responsavel pela tratativa |
| has_rt | boolean | Indicacao RT |
| rt_percentage | numeric | Percentual RT |
| origin_nf | text | NF de origem |
| defect | text | Defeito relatado |
| labor_cost | numeric | Valor mao de obra |
| supplies_cost | numeric | Valor insumos |
| freight_cost | numeric | Valor frete |
| net_result | numeric | Resultado liquido (calculado) |
| delivery_forecast | date | Previsao de entrega |
| status | text | Aguardando, Em andamento, Aguardando pecas, Concluido, Entregue |
| exit_nf | text | NF de saida (futuro Bling) |
| boleto_info | text | Info boleto (futuro Bling) |
| supplies_nf_url | text | URL do PDF/XML da NF de insumos |
| supplies_nf_data | jsonb | Dados extraidos do XML |
| client_id | uuid FK | Cliente vinculado |
| owner_email | text | Email do responsavel (RLS) |
| change_history | jsonb | Historico de alteracoes |
| created_at | timestamptz | Criacao |
| updated_at | timestamptz | Atualizacao |

**Nova tabela `service_order_photos`:**

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | Identificador |
| service_order_id | uuid FK | OS vinculada |
| photo_type | text | "recebimento" ou "liberacao" |
| file_url | text | URL publica |
| file_name | text | Nome do arquivo |
| created_at | timestamptz | Criacao |

**Storage:** Novo bucket `service-order-files` (publico) para fotos e NFs.

**RLS:** Mesma logica de isolamento por `owner_email` + admin com acesso total.

**Numero sequencial:** Trigger para gerar `os_number` auto-incrementado (formato OS-0001).

---

### 2. Arquivos Novos

- `src/types/serviceOrder.ts` - Tipos e constantes (status, interfaces)
- `src/hooks/useServiceOrders.ts` - Hook CRUD com Supabase
- `src/components/operations/ServiceOrderManager.tsx` - Componente principal (lista + filtros + dialogs)
- `src/components/operations/ServiceOrderForm.tsx` - Formulario de criacao/edicao
- `src/components/operations/ServiceOrderDetail.tsx` - Dialog de detalhes com historico e fotos

---

### 3. Arquivos Editados

- `src/components/operations/OperationManager.tsx` - Nova aba "Ordens de Servico"
- `src/integrations/supabase/types.ts` - Atualizado automaticamente

---

### 4. Funcionalidades Principais

**Lista de OS:**
- Tabela/cards com colunas: numero, produto, responsavel, status, previsao, resultado liquido
- Filtros por status, responsavel e periodo
- Botao "Nova OS"

**Formulario de OS:**
- Responsavel: Select com opcoes Fabrica/Consumidor/Lojista
- RT: Switch sim/nao + campo percentual condicional
- Produto, NF origem, defeito relatado (campos de texto)
- Valores: mao de obra, insumos (opcional), frete (opcional)
- Resultado liquido = mao de obra + insumos + frete (calculado em tempo real)
- Upload de NF de insumos (PDF ou XML)
- Ao enviar XML: parsing client-side do DOMParser para extrair fornecedor, valor total, itens
- Previsao de entrega (date picker)
- Status da OS com 5 opcoes
- Campos NF saida e boleto (preparados, sem integracao ainda)

**Detalhe da OS:**
- Todas as informacoes em dialog
- Secao de fotos de recebimento (upload multiplo)
- Secao de fotos de liberacao (upload multiplo)
- Historico de alteracoes: cada update grava snapshot (campo, valor anterior, valor novo, data, usuario)

**Calculo do resultado liquido:**
- Se `responsible_type = "Fabrica"` e `has_rt = true`: resultado = -(labor + supplies + freight) * (1 - rt_percentage/100)
- Senao: resultado = -(labor + supplies + freight)
- Exibido com formatacao BRL e cor (vermelho negativo, verde positivo)

---

### 5. Padrao Visual

Segue o mesmo padrao de UI ja utilizado no projeto:
- Cards com `Card/CardContent` do shadcn
- Dialogs para detalhes e formularios
- Badges para status com cores semanticas
- Responsivo (cards em mobile, tabela em desktop)
- Toasts para feedback (sonner)
- Icone `ClipboardList` para a aba

