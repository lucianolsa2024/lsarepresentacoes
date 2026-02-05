

# Plano: Data Estimada de Fechamento e Integração com Outlook

## Resumo
Adicionar um campo de "data estimada de fechamento" no formulário de pagamento, calcular automaticamente a "data prevista de entrega" (fechamento + prazo de embarque) para exibir no PDF, e criar um botão para adicionar lembrete no Outlook.

---

## 1. Adicionar Campo de Data Estimada de Fechamento

### Alterações no Tipo `PaymentConditions` (`src/types/quote.ts`)
```typescript
export interface PaymentConditions {
  // ... campos existentes ...
  estimatedClosingDate: string; // Data no formato ISO (YYYY-MM-DD)
}

export const INITIAL_PAYMENT: PaymentConditions = {
  // ... valores existentes ...
  estimatedClosingDate: '', // Vazio por padrão
};
```

### Alterações no Formulário (`src/components/quote/PaymentForm.tsx`)
- Adicionar campo de data com `<Input type="date">` 
- Posicionar após o campo de prazo de embarque
- Label: "Data Estimada de Fechamento"
- Ícone: CalendarCheck

---

## 2. Calcular e Exibir Data de Entrega no PDF

### Lógica de Cálculo
```
Data Prevista de Entrega = Data Estimada de Fechamento + Prazo de Embarque (dias)
```

### Alterações no PDF (`src/utils/pdfGenerator.ts`)
- Se `estimatedClosingDate` estiver preenchida:
  - Calcular data de entrega usando `date-fns`
  - Exibir na seção de condições de pagamento: "Previsão de entrega: DD/MM/YYYY"
- A data de fechamento **NÃO** é exibida no PDF

---

## 3. Integração com Outlook Calendar

### Funcionalidade
Ao gerar o orçamento, se a data de fechamento estiver preenchida, oferecer botão para criar evento no Outlook.

### Implementação

**Nova função utilitária (`src/utils/outlookCalendar.ts`):**
```typescript
export function generateOutlookCalendarUrl(params: {
  subject: string;
  startDate: Date;
  body: string;
  location?: string;
}): string {
  // Usar URL do Outlook Live
  // https://outlook.live.com/calendar/deeplink/compose
  // Parâmetros: path, rru, startdt, enddt, subject, body
}
```

### Fluxo de Uso
1. Usuário preenche a data estimada de fechamento
2. Ao clicar em "Gerar Orçamento":
   - PDF é gerado (com data de entrega calculada)
   - Se data de fechamento preenchida, mostrar botão "Adicionar ao Outlook"
3. Botão abre o Outlook Live com evento pré-preenchido:
   - **Título**: "Fechamento Orçamento - [Nome da Empresa] #[ID]"
   - **Data**: Data estimada de fechamento
   - **Descrição**: Resumo do orçamento (cliente, valor, nº itens)

### Opção Alternativa - Botão no Histórico
Adicionar ícone de calendário no card do histórico para criar lembrete a qualquer momento.

---

## 4. Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/types/quote.ts` | Adicionar `estimatedClosingDate` ao `PaymentConditions` |
| `src/components/quote/PaymentForm.tsx` | Adicionar campo de data |
| `src/utils/pdfGenerator.ts` | Calcular e exibir data de entrega |
| `src/utils/outlookCalendar.ts` | **NOVO** - Função para gerar URL do Outlook |
| `src/pages/Index.tsx` | Chamar função do Outlook após gerar orçamento |
| `src/components/quote/QuoteHistory.tsx` | Adicionar botão de lembrete no card |

---

## 5. Detalhes Técnicos

### URL do Outlook Calendar
```
https://outlook.live.com/calendar/deeplink/compose
  ?path=/calendar/action/compose
  &rru=addevent
  &startdt=2026-02-10T09:00:00Z
  &enddt=2026-02-10T10:00:00Z
  &subject=Fechamento%20Orçamento%20-%20Cliente%20ABC
  &body=Valor%3A%20R%24%2050.000%0AItens%3A%205
```

### Formato de Data
- Input: `YYYY-MM-DD` (formato HTML date input)
- Outlook: `YYYY-MM-DDTHH:mm:ssZ` (ISO 8601 UTC)
- PDF: `DD/MM/YYYY` (formato brasileiro)

### Cálculo com date-fns
```typescript
import { addDays, format } from 'date-fns';

const closingDate = new Date(payment.estimatedClosingDate);
const deliveryDate = addDays(closingDate, payment.deliveryDays);
const formattedDelivery = format(deliveryDate, 'dd/MM/yyyy');
```

---

## 6. Interface do Usuário

### Campo no Formulário de Pagamento
```
┌─────────────────────────────────────┐
│ 📅 Data Estimada de Fechamento      │
│ ┌─────────────────────────────────┐ │
│ │ [   10/02/2026              ▾ ] │ │
│ └─────────────────────────────────┘ │
│ ⓘ Esta data será usada para criar  │
│   lembrete e calcular previsão de   │
│   entrega                           │
└─────────────────────────────────────┘
```

### Botão no Card do Histórico
```
[ 👁 ] [ ✏ ] [ 📥 ] [ 📋 ] [ 📅 ] [ 🗑 ]
                              ↑
                    Adicionar ao Outlook
```

---

## 7. Exibição no PDF

Na seção "Condições de Pagamento":
```
Forma: Parcelado
3x de R$ 17.083,33
Prazo de embarque: 30 dias corridos
Previsão de entrega: 12/03/2026     ← NOVO
Transportadora: Braspress - CIF (Frete Pago)
```

**Nota**: A "data estimada de fechamento" NÃO aparece no PDF, apenas a data de entrega calculada.

