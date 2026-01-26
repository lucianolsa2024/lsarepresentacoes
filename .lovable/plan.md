

# Plano: Migrar Catálogo de Produtos para Supabase

## Resumo
Conectar o projeto ao Lovable Cloud (Supabase integrado) para armazenar todos os produtos e orçamentos no banco de dados, permitindo importar a planilha completa e gerenciar os dados de forma profissional.

## Etapas

### 1. Ativar Lovable Cloud
- Habilitar o Lovable Cloud no projeto para obter banco de dados integrado
- Isso criará automaticamente uma instância Supabase conectada

### 2. Criar Estrutura do Banco de Dados
Criar as seguintes tabelas:

**Tabela `products`**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Identificador único |
| code | text | Código do produto |
| name | text | Nome do produto |
| description | text | Descrição |
| category | text | Categoria |
| has_base | boolean | Tem opção de base |
| available_bases | text[] | Bases disponíveis |

**Tabela `product_modulations`**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Identificador único |
| product_id | uuid | Referência ao produto |
| name | text | Nome da modulação |
| description | text | Descrição completa |
| dimensions | text | Dimensões |
| price_fx_b | numeric | Preço FX B |
| price_fx_c | numeric | Preço FX C |
| ... | ... | (demais faixas) |
| price_fx_j | numeric | Preço FX J |

**Tabela `quotes`** (opcional para histórico)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Identificador único |
| created_at | timestamp | Data de criação |
| client_data | jsonb | Dados do cliente |
| items | jsonb | Itens do orçamento |
| payment | jsonb | Condições de pagamento |
| total | numeric | Valor total |

### 3. Importar Dados da Planilha
- Processar a planilha Excel completa
- Inserir todos os produtos e modulações no banco
- A planilha tem aproximadamente 5.000+ linhas com todas as variações

### 4. Atualizar o Código
- Instalar cliente Supabase
- Criar arquivo de configuração `src/lib/supabase.ts`
- Atualizar `useProducts` para buscar do banco
- Atualizar `useQuotes` para salvar no banco (opcional)

### 5. Interface de Gerenciamento
- A aba "Produtos" continuará funcionando
- Adicionar/editar/remover produtos será persistido no Supabase
- Opção de importar mais produtos via planilha futuramente

---

## Detalhes Técnicos

### Estrutura das Tabelas (SQL)

```text
-- Tabela de produtos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  has_base BOOLEAN DEFAULT false,
  available_bases TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de modulações
CREATE TABLE product_modulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  dimensions TEXT,
  price_fx_b NUMERIC(10,2),
  price_fx_c NUMERIC(10,2),
  price_fx_d NUMERIC(10,2),
  price_fx_e NUMERIC(10,2),
  price_fx_f NUMERIC(10,2),
  price_fx_g NUMERIC(10,2),
  price_fx_h NUMERIC(10,2),
  price_fx_i NUMERIC(10,2),
  price_fx_j NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT now()
);
```

### Hook Atualizado

O `useProducts` será atualizado para:
- Buscar produtos do Supabase em vez do localStorage
- Usar React Query para cache e revalidação
- Manter fallback para dados locais se offline

---

## Próximos Passos Após Aprovação

1. Ativar Lovable Cloud
2. Criar as tabelas no banco
3. Importar todos os dados da planilha (5.000+ registros)
4. Atualizar os hooks para usar Supabase
5. Testar o sistema completo

