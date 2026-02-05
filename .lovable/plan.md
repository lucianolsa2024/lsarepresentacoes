
# Plano: Sistema de Rotas de Visitas

## Resumo
Implementar um módulo de planejamento de rotas de visitas a clientes, permitindo criar roteiros de viagem com múltiplos clientes agrupados por cidade/região, integrado ao calendário Outlook e com visualização em mapa.

---

## 1. Estrutura de Dados

### Nova Tabela: `visit_routes` (Rotas de Visita)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Identificador único |
| name | text | Nome da rota (ex: "Rota Curitiba - Fevereiro") |
| start_date | date | Data de início da viagem |
| end_date | date | Data de término |
| status | text | 'planejada', 'em_andamento', 'concluida' |
| notes | text | Observações gerais |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Última atualização |

### Nova Tabela: `route_visits` (Visitas da Rota)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Identificador único |
| route_id | uuid | FK para visit_routes |
| client_id | uuid | FK para clients |
| visit_date | date | Data planejada da visita |
| visit_order | integer | Ordem na sequência do dia |
| status | text | 'pendente', 'realizada', 'cancelada' |
| notes | text | Observações da visita |
| check_in_at | timestamp | Horário de check-in (opcional) |
| check_out_at | timestamp | Horário de check-out (opcional) |

---

## 2. Funcionalidades Principais

### 2.1 Tela de Gerenciamento de Rotas
- Nova aba "Rotas" no sistema
- Listagem de rotas com filtros por status e período
- Criar/editar/excluir rotas

### 2.2 Criação de Rota
1. Definir nome, período (data início/fim)
2. Selecionar clientes da base
3. Agrupar por cidade automaticamente
4. Definir ordem de visitas por dia
5. Adicionar observações

### 2.3 Visualização
```
┌────────────────────────────────────────────────────────────┐
│ Rota: Curitiba/Ponta Grossa - Fev/2026                    │
│ Status: Planejada | 10/02 a 12/02                         │
├────────────────────────────────────────────────────────────┤
│ 📅 10/02 (Segunda) - Curitiba                             │
│   ┌─────────────────────────────────────────────────────┐ │
│   │ 1. Cliente ABC Móveis                               │ │
│   │    📍 R. das Flores, 123 - Centro                   │ │
│   │    📞 (41) 99999-0000                               │ │
│   │    ⏱️ Pendente                                      │ │
│   ├─────────────────────────────────────────────────────┤ │
│   │ 2. Decorações XYZ                                   │ │
│   │    📍 Av. Brasil, 456 - Batel                       │ │
│   │    📞 (41) 88888-0000                               │ │
│   │    ⏱️ Pendente                                      │ │
│   └─────────────────────────────────────────────────────┘ │
│ 📅 11/02 (Terça) - Ponta Grossa                           │
│   ...                                                     │
└────────────────────────────────────────────────────────────┘
```

### 2.4 Ações por Visita
- **Check-in/Check-out**: Marcar início e fim da visita
- **Novo Orçamento**: Criar orçamento já vinculado ao cliente
- **Adicionar ao Outlook**: Criar evento no calendário
- **Abrir no Maps**: Link para Google Maps com o endereço
- **Registrar Observação**: Anotar informações da visita

---

## 3. Funcionalidades Extras

### 3.1 Agrupamento Inteligente por Cidade
Ao adicionar clientes, o sistema sugere agrupá-los por cidade:
- Filtra clientes por cidade/estado
- Sugere ordem baseada em proximidade (opcional)
- Permite arrastar para reordenar (drag & drop)

### 3.2 Integração com Outlook
Criar eventos de calendário para:
- Rota completa (evento de múltiplos dias)
- Cada visita individual com horário estimado
- Incluir endereço e dados do cliente

### 3.3 Link para Google Maps
- Botão que abre o Maps com o endereço do cliente
- Opção de abrir rota completa do dia (múltiplos pontos)

### 3.4 Check-in/Check-out
- Registrar horário real da visita
- Calcular tempo total no cliente
- Relatório de tempo por cliente/região

---

## 4. Arquivos a Criar/Modificar

### Novos Arquivos
| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useRoutes.ts` | Hook para gerenciar rotas |
| `src/components/routes/RouteManager.tsx` | Tela principal de rotas |
| `src/components/routes/RouteCard.tsx` | Card de exibição da rota |
| `src/components/routes/RouteForm.tsx` | Formulário de criação/edição |
| `src/components/routes/VisitCard.tsx` | Card de visita individual |
| `src/components/routes/ClientSelector.tsx` | Seletor de clientes para rota |
| `src/types/route.ts` | Tipos TypeScript |
| `src/utils/mapUtils.ts` | Utilitários para links do Maps |

### Arquivos Modificados
| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Index.tsx` | Adicionar aba "Rotas" |
| `src/utils/outlookCalendar.ts` | Adicionar função para rotas |

---

## 5. Fluxo de Uso

```
1. Usuário cria nova rota
   ↓
2. Define período (ex: 10-12/02/2026)
   ↓
3. Seleciona clientes (filtro por cidade disponível)
   ↓
4. Sistema agrupa por cidade automaticamente
   ↓
5. Usuário ajusta ordem de visitas
   ↓
6. Salva a rota
   ↓
7. Pode adicionar eventos ao Outlook
   ↓
8. Durante a viagem: check-in/check-out
   ↓
9. Ao finalizar: marca como concluída
```

---

## 6. Interface do Usuário

### Nova Aba "Rotas"
```
┌─────────────────────────────────────────────────────────────┐
│ [Dashboard] [Novo] [Histórico] [Clientes] [Produtos] [Rotas]│
└─────────────────────────────────────────────────────────────┘
```

### Tela de Rotas
```
┌────────────────────────────────────────────────────────────┐
│ Rotas de Visitas                           [+ Nova Rota]   │
├────────────────────────────────────────────────────────────┤
│ Filtros: [Todas ▾] [Este mês ▾] [Pesquisar...          ]   │
├────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐          │
│ │ 🗺️ Curitiba Fev      │ │ 🗺️ Londrina Jan      │          │
│ │ 10/02 - 12/02/2026   │ │ 20/01 - 21/01/2026   │          │
│ │ 5 clientes           │ │ 3 clientes           │          │
│ │ ⚡ Planejada          │ │ ✅ Concluída          │          │
│ │                      │ │                      │          │
│ │ [Ver] [Outlook] [📍] │ │ [Ver] [Relatório]    │          │
│ └──────────────────────┘ └──────────────────────┘          │
└────────────────────────────────────────────────────────────┘
```

---

## 7. Detalhes Técnicos

### Migração SQL
```sql
-- Tabela de rotas
CREATE TABLE visit_routes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'planejada' CHECK (status IN ('planejada', 'em_andamento', 'concluida')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de visitas
CREATE TABLE route_visits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id uuid REFERENCES visit_routes(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  visit_date date NOT NULL,
  visit_order integer DEFAULT 1,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'realizada', 'cancelada')),
  notes text,
  check_in_at timestamptz,
  check_out_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE visit_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_visits ENABLE ROW LEVEL SECURITY;
```

### Link Google Maps
```typescript
export function generateGoogleMapsUrl(address: {
  street: string;
  number: string;
  city: string;
  state: string;
}): string {
  const query = encodeURIComponent(
    `${address.street}, ${address.number} - ${address.city}, ${address.state}`
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

// Rota com múltiplos pontos
export function generateMultiPointRoute(addresses: string[]): string {
  const waypoints = addresses.map(encodeURIComponent).join('/');
  return `https://www.google.com/maps/dir/${waypoints}`;
}
```

---

## 8. Benefícios

- **Organização**: Planejamento estruturado de visitas
- **Produtividade**: Agrupamento por cidade economiza tempo
- **Integração**: Outlook + Google Maps
- **Histórico**: Registro de check-in/out para análise
- **Mobilidade**: Funciona no celular para uso em campo

---

## 9. Próximas Evoluções (Futuras)

- Estimativa de tempo de deslocamento
- Otimização automática de rota (API de rotas)
- Relatório de visitas realizadas vs planejadas
- Integração com despesas de viagem
- Notificações de lembrete
