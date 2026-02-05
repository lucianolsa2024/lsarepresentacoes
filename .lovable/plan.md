

# Plano: Modulo Completo de Atividades/Tarefas

## Resumo
Implementar um sistema completo de atividades e tarefas para representantes comerciais, incluindo todas as funcionalidades avancadas solicitadas: notificacoes push/email, relatorios por periodo, templates recorrentes, integracao WhatsApp e historico por cliente.

---

## 1. Estrutura de Dados

### Tabela Principal: `activities`
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Identificador unico |
| type | text | 'followup', 'ligacao', 'email', 'visita', 'reuniao', 'tarefa' |
| title | text | Titulo curto da atividade |
| description | text | Descricao detalhada |
| due_date | date | Data prevista |
| due_time | time | Horario (opcional) |
| priority | text | 'baixa', 'media', 'alta', 'urgente' |
| status | text | 'pendente', 'em_andamento', 'concluida', 'cancelada' |
| client_id | uuid | FK para clients (opcional) |
| quote_id | uuid | FK para quotes (opcional) |
| route_visit_id | uuid | FK para route_visits (opcional) |
| template_id | uuid | FK para activity_templates (se criada de template) |
| completed_at | timestamp | Quando foi concluida |
| completed_notes | text | Notas ao concluir |
| reminder_at | timestamp | Quando enviar lembrete |
| reminder_sent | boolean | Se lembrete ja foi enviado |
| recurrence_rule | jsonb | Regra de recorrencia (opcional) |
| parent_activity_id | uuid | FK para atividade pai (recorrentes) |
| created_at | timestamp | Data de criacao |
| updated_at | timestamp | Ultima atualizacao |

### Nova Tabela: `activity_templates`
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Identificador unico |
| name | text | Nome do template |
| type | text | Tipo da atividade |
| title_template | text | Titulo com variaveis (ex: "Followup - {cliente}") |
| description_template | text | Descricao padrao |
| default_priority | text | Prioridade padrao |
| default_time | time | Horario padrao |
| days_offset | integer | Dias a partir de hoje (ex: +3 para followup) |
| is_active | boolean | Se template esta ativo |
| created_at | timestamp | Data de criacao |

### Nova Tabela: `activity_reminders`
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Identificador unico |
| activity_id | uuid | FK para activities |
| reminder_type | text | 'email', 'push', 'both' |
| scheduled_at | timestamp | Quando enviar |
| sent_at | timestamp | Quando foi enviado |
| status | text | 'pending', 'sent', 'failed' |
| error_message | text | Mensagem de erro se falhou |

---

## 2. Funcionalidades Core

### 2.1 Tipos de Atividades
```
┌─────────────────────────────────────────────────────────────┐
│                     TIPOS DE ATIVIDADE                       │
├─────────────────────────────────────────────────────────────┤
│  LIGACAO     - Contato telefonico com cliente               │
│  EMAIL       - Enviar proposta ou responder duvida          │
│  FOLLOWUP    - Acompanhamento de orcamento                  │
│  VISITA      - Visita presencial (integrado com rotas)      │
│  REUNIAO     - Reuniao presencial ou virtual                │
│  TAREFA      - Atividade generica                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Visualizacoes
- **Lista**: Agrupada por dia (hoje, amanha, esta semana, atrasadas)
- **Kanban**: Colunas por status (pendente, em andamento, concluida)
- **Calendario**: Visualizacao mensal/semanal

---

## 3. Notificacoes Push/Email

### 3.1 Arquitetura
```
┌─────────────────────────────────────────────────────────────┐
│                   SISTEMA DE LEMBRETES                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Usuario cria atividade com lembrete                     │
│     ↓                                                       │
│  2. Sistema agenda lembrete na tabela activity_reminders    │
│     ↓                                                       │
│  3. Edge Function (cron) verifica lembretes pendentes       │
│     ↓                                                       │
│  4. Envia email via Resend                                  │
│     ↓                                                       │
│  5. Marca lembrete como enviado                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Configuracao de Lembretes
- **Opcoes de horario**: 15min antes, 1h antes, 1 dia antes, no horario
- **Tipo**: Email, push (browser notification), ambos
- **Edge function**: `activity-reminders` executada a cada 5 minutos

### 3.3 Implementacao Email
```typescript
// Edge function: activity-reminders
// - Busca lembretes pendentes (reminder_at <= now() AND status = 'pending')
// - Envia email via Resend com dados da atividade
// - Atualiza status para 'sent' ou 'failed'
```

### 3.4 Push Notifications (Browser)
- Solicitar permissao do navegador na primeira atividade
- Service Worker para receber notificacoes
- Notificacao local quando app esta aberto

---

## 4. Relatorio de Atividades por Periodo

### 4.1 Tela de Relatorios
```
┌────────────────────────────────────────────────────────────┐
│ Relatorio de Atividades                                    │
├────────────────────────────────────────────────────────────┤
│ Periodo: [01/01/2026] a [31/01/2026]  [Gerar]              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ RESUMO                                                     │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │  45          │ │  38          │ │  84%         │        │
│ │ Atividades   │ │ Concluidas   │ │ Taxa Conclus.│        │
│ └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                            │
│ POR TIPO                                                   │
│ ├─ Ligacoes: 15 (12 concluidas)                           │
│ ├─ Followups: 12 (10 concluidas)                          │
│ ├─ Visitas: 8 (8 concluidas)                              │
│ ├─ Emails: 6 (5 concluidas)                               │
│ └─ Tarefas: 4 (3 concluidas)                              │
│                                                            │
│ POR CLIENTE (Top 10)                                       │
│ ├─ ABC Moveis: 8 atividades                               │
│ ├─ XYZ Decoracoes: 5 atividades                           │
│ └─ ...                                                     │
│                                                            │
│ [Exportar PDF]  [Exportar Excel]                           │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Metricas
- Total de atividades no periodo
- Taxa de conclusao
- Atividades por tipo
- Atividades por cliente
- Tempo medio de conclusao
- Atividades atrasadas

---

## 5. Templates de Atividades Recorrentes

### 5.1 Templates Pre-definidos
| Template | Tipo | Offset | Descricao |
|----------|------|--------|-----------|
| Followup Orcamento | followup | +3 dias | Retorno apos envio de proposta |
| Retorno Semanal | ligacao | +7 dias | Acompanhamento semanal |
| Visita Mensal | visita | +30 dias | Visita de manutencao |
| Cobranca de Proposta | followup | +5 dias | Proposta sem resposta |

### 5.2 Tela de Templates
```
┌────────────────────────────────────────────────────────────┐
│ Templates de Atividades                    [+ Novo Template]│
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Followup Orcamento                                     │ │
│ │ Tipo: Followup | +3 dias | Prioridade: Media          │ │
│ │ "Retornar para {cliente} sobre orcamento"             │ │
│ │                                     [Editar] [Excluir] │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Visita Trimestral                                      │ │
│ │ Tipo: Visita | +90 dias | Prioridade: Baixa           │ │
│ │ "Visita de relacionamento em {cliente}"               │ │
│ │                                     [Editar] [Excluir] │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 5.3 Uso do Template
```
1. Ao concluir orcamento, sistema pergunta:
   "Deseja agendar followup?"
   ↓
2. Usuario seleciona template
   ↓
3. Sistema cria atividade com dados preenchidos
   ↓
4. Atividade aparece na data correta
```

---

## 6. Integracao WhatsApp

### 6.1 Funcionalidades
- **Botao em cada atividade**: Abre WhatsApp com mensagem pre-formatada
- **Mensagens por tipo de atividade**:
  - Followup: "Ola! Passando para verificar sobre o orcamento..."
  - Ligacao: "Ola! Tentei ligar, podemos conversar?"
  - Reuniao: "Ola! Confirmando nossa reuniao para..."

### 6.2 Implementacao
```typescript
function openWhatsAppForActivity(activity: Activity, client: Client): void {
  const messages: Record<ActivityType, string> = {
    followup: `Olá ${client.name}! Passando para verificar sobre o orçamento que enviamos.`,
    ligacao: `Olá ${client.name}! Tentei entrar em contato por telefone.`,
    email: `Olá ${client.name}! Enviei um email, conseguiu verificar?`,
    visita: `Olá ${client.name}! Confirmando nossa visita para ${activity.due_date}.`,
    reuniao: `Olá ${client.name}! Confirmando nossa reunião para ${activity.due_date}.`,
    tarefa: `Olá ${client.name}!`,
  };
  
  const phone = client.phone.replace(/\D/g, '');
  const message = encodeURIComponent(messages[activity.type]);
  window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
}
```

### 6.3 Botao WhatsApp no Card
```
┌────────────────────────────────────────────────────────────┐
│ Followup - ABC Moveis                        [...]         │
│ Amanha, 10:00 | Prioridade: Alta                           │
│                                                            │
│ [Concluir] [WhatsApp] [Outlook] [Editar]                   │
└────────────────────────────────────────────────────────────┘
```

---

## 7. Historico de Atividades por Cliente

### 7.1 Nova Aba no Detalhe do Cliente
Adicionar aba "Atividades" na tela de clientes:

```
┌────────────────────────────────────────────────────────────┐
│ ABC Moveis                                                 │
│ [Dados] [Orcamentos] [Atividades]                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ESTATISTICAS                                               │
│ Total: 25 | Concluidas: 20 (80%) | Pendentes: 3            │
│                                                            │
│ TIMELINE                                                   │
│                                                            │
│ 05/02/2026                                                 │
│ ├─ Concluida 14:30 - Ligacao: Retorno sobre orcamento     │
│ │   Notas: Cliente vai fechar semana que vem              │
│ │                                                          │
│ 01/02/2026                                                 │
│ ├─ Concluida 10:00 - Followup: Verificar proposta         │
│ │   Notas: Cliente pediu mais prazo                       │
│ │                                                          │
│ 28/01/2026                                                 │
│ ├─ Concluida 09:00 - Email: Enviar catalogo               │
│ │   Notas: Catalogo Century enviado                       │
│ │                                                          │
│ [Carregar mais...]                                         │
│                                                            │
│ [+ Nova Atividade para este cliente]                       │
└────────────────────────────────────────────────────────────┘
```

### 7.2 Filtros do Historico
- Por tipo de atividade
- Por periodo
- Por status
- Busca por texto

### 7.3 Visualizacao Rapida
No card do cliente na listagem, mostrar:
- Ultima atividade realizada
- Proxima atividade pendente
- Total de atividades

---

## 8. Arquivos a Criar/Modificar

### Novos Arquivos
| Arquivo | Descricao |
|---------|-----------|
| `src/types/activity.ts` | Tipos TypeScript para atividades |
| `src/hooks/useActivities.ts` | Hook principal de atividades |
| `src/hooks/useActivityTemplates.ts` | Hook para templates |
| `src/components/activities/ActivityManager.tsx` | Tela principal |
| `src/components/activities/ActivityCard.tsx` | Card de atividade |
| `src/components/activities/ActivityForm.tsx` | Formulario criar/editar |
| `src/components/activities/ActivityList.tsx` | Visualizacao lista |
| `src/components/activities/ActivityKanban.tsx` | Visualizacao kanban |
| `src/components/activities/ActivityCalendar.tsx` | Visualizacao calendario |
| `src/components/activities/ActivityFilters.tsx` | Filtros |
| `src/components/activities/ActivityWidget.tsx` | Widget do dashboard |
| `src/components/activities/ActivityReport.tsx` | Relatorio de atividades |
| `src/components/activities/TemplateManager.tsx` | Gerenciador de templates |
| `src/components/activities/TemplateForm.tsx` | Formulario de template |
| `src/components/activities/ReminderConfig.tsx` | Config de lembretes |
| `src/components/activities/ClientActivityHistory.tsx` | Historico por cliente |
| `src/utils/activityWhatsApp.ts` | Funcoes WhatsApp para atividades |
| `src/utils/activityCalendar.ts` | Funcoes Outlook para atividades |
| `src/utils/activityNotifications.ts` | Notificacoes browser |
| `supabase/functions/activity-reminders/index.ts` | Edge function de lembretes |

### Arquivos Modificados
| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Index.tsx` | Adicionar aba "Atividades" |
| `src/components/quote/QuoteDashboard.tsx` | Widget de atividades pendentes |
| `src/components/quote/ClientManager.tsx` | Aba de historico de atividades |
| `src/components/routes/VisitCard.tsx` | Criar atividade ao adicionar visita |

---

## 9. Detalhes Tecnicos

### 9.1 Migracao SQL
```sql
-- Tabela de atividades
CREATE TABLE activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('followup', 'ligacao', 'email', 'visita', 'reuniao', 'tarefa')),
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  due_time time,
  priority text DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  route_visit_id uuid REFERENCES route_visits(id) ON DELETE SET NULL,
  template_id uuid,
  completed_at timestamptz,
  completed_notes text,
  reminder_at timestamptz,
  reminder_sent boolean DEFAULT false,
  recurrence_rule jsonb,
  parent_activity_id uuid REFERENCES activities(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de templates
CREATE TABLE activity_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('followup', 'ligacao', 'email', 'visita', 'reuniao', 'tarefa')),
  title_template text NOT NULL,
  description_template text,
  default_priority text DEFAULT 'media',
  default_time time,
  days_offset integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tabela de lembretes
CREATE TABLE activity_reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
  reminder_type text DEFAULT 'email' CHECK (reminder_type IN ('email', 'push', 'both')),
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Indices
CREATE INDEX idx_activities_due_date ON activities(due_date);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_client_id ON activities(client_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activity_reminders_scheduled ON activity_reminders(scheduled_at) WHERE status = 'pending';

-- Trigger updated_at
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_reminders ENABLE ROW LEVEL SECURITY;

-- Policies (authenticated users)
CREATE POLICY "Activities viewable by authenticated" ON activities 
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Activities insertable by authenticated" ON activities 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Activities updatable by authenticated" ON activities 
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Activities deletable by admins" ON activities 
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Templates policies
CREATE POLICY "Templates viewable by authenticated" ON activity_templates 
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Templates manageable by admins" ON activity_templates 
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Reminders policies (service role only for edge function)
CREATE POLICY "Reminders viewable by authenticated" ON activity_reminders 
  FOR SELECT USING (auth.role() = 'authenticated');
```

### 9.2 Edge Function: activity-reminders
```typescript
// supabase/functions/activity-reminders/index.ts
// Executada via cron a cada 5 minutos
// 1. Busca lembretes pendentes (scheduled_at <= now())
// 2. Para cada lembrete, envia email via Resend
// 3. Atualiza status do lembrete
```

### 9.3 Notificacoes Browser
```typescript
// src/utils/activityNotifications.ts
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function showActivityNotification(activity: Activity): void {
  if (Notification.permission === 'granted') {
    new Notification(`Lembrete: ${activity.title}`, {
      body: `${activity.type} - ${activity.client?.company || 'Sem cliente'}`,
      icon: '/favicon.ico',
    });
  }
}
```

---

## 10. Fluxo de Uso Completo

### Criar Atividade com Lembrete
```
1. Usuario clica "+ Nova Atividade"
   ↓
2. Preenche: tipo, titulo, data, cliente
   ↓
3. Configura lembrete: "1 hora antes, por email"
   ↓
4. Salva atividade
   ↓
5. Sistema cria registro em activity_reminders
   ↓
6. Na hora do lembrete, edge function envia email
   ↓
7. Usuario recebe email com link para atividade
```

### Usar Template
```
1. Usuario gera orcamento
   ↓
2. Sistema pergunta: "Agendar followup?"
   ↓
3. Usuario seleciona template "Followup Orcamento"
   ↓
4. Sistema cria atividade para +3 dias
   ↓
5. Atividade vinculada ao orcamento e cliente
```

### Consultar Historico do Cliente
```
1. Usuario abre cliente na listagem
   ↓
2. Clica na aba "Atividades"
   ↓
3. Ve timeline de todas as atividades
   ↓
4. Pode filtrar por tipo/periodo
   ↓
5. Clica para ver detalhes ou criar nova
```

---

## 11. Beneficios

| Funcionalidade | Beneficio |
|----------------|-----------|
| **Lembretes Email** | Nunca perder uma atividade importante |
| **Push Browser** | Notificacao instantanea quando app aberto |
| **Relatorios** | Visao clara da produtividade |
| **Templates** | Agilidade na criacao de atividades padrao |
| **WhatsApp** | Comunicacao rapida com cliente |
| **Historico** | Contexto completo do relacionamento |

---

## 12. Integracao com Sistema Existente

### Com Rotas
- Ao adicionar visita na rota, criar atividade tipo "visita"
- Check-in na rota = concluir atividade
- Sincronizacao bidirecional

### Com Orcamentos
- Opcao de criar followup ao gerar orcamento
- Atividade vinculada ao orcamento
- Ver orcamentos relacionados na atividade

### Com Dashboard
- Widget de atividades pendentes
- Contador de atrasadas
- Proximas 3 atividades do dia

