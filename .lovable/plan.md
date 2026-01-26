

# Plano: Correção de Preço e Personalização do PDF SoHome

## Resumo

Este plano corrige o preço do produto OASI e personaliza o PDF do orçamento com o logo da LSA/SoHome e identidade visual da empresa.

---

## O que será feito

### 1. Correção do Preço OASI

O preço do produto **OASI 1B 2AS 1,90m na faixa FX C** será atualizado de `4691` para `4733` conforme a tabela correta.

**Arquivo:** `src/data/products.ts` (linha 141)

---

### 2. Personalização do PDF

O PDF será reformulado para seguir o padrão "Orçamento SoHome" com:

**Cabeçalho personalizado:**
- Logo LSA no topo (centralizado ou à esquerda)
- Título alterado de "ORÇAMENTO DE ESTOFADOS" para "ORÇAMENTO SOHOME"
- Subtítulo opcional com dados da empresa

**Estrutura do documento:**
```text
┌─────────────────────────────────────────┐
│           [LOGO LSA]                    │
│        ORÇAMENTO SOHOME                 │
│   Data: 26/01/2026  |  Nº A1B2C3D4     │
├─────────────────────────────────────────┤
│  DADOS DO CLIENTE                       │
│  Nome: João Silva                       │
│  Empresa: XYZ Decorações               │
│  ...                                    │
├─────────────────────────────────────────┤
│  ITENS DO ORÇAMENTO                     │
│  ...                                    │
├─────────────────────────────────────────┤
│  TOTAL: R$ 4.733,00                    │
├─────────────────────────────────────────┤
│  CONDIÇÕES DE PAGAMENTO                 │
│  ...                                    │
├─────────────────────────────────────────┤
│  Validade: 15 dias                     │
│  (rodapé com informações legais)        │
└─────────────────────────────────────────┘
```

---

## Arquivos a serem modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/data/products.ts` | Corrigir preço OASI FX C: 4691 -> 4733 |
| `src/assets/logo-lsa.png` | Novo arquivo (cópia do logo enviado) |
| `src/utils/pdfGenerator.ts` | Adicionar logo, alterar título, melhorar layout |

---

## Detalhes Técnicos

### Integração do Logo no PDF

O jsPDF suporta imagens via `doc.addImage()`. O logo será:
1. Copiado para `src/assets/logo-lsa.png`
2. Importado como módulo ES6 no gerador de PDF
3. Convertido para base64 para uso no jsPDF
4. Posicionado no topo do documento, centralizado

```typescript
// Exemplo de implementação
import logoBase64 from '@/assets/logo-lsa.png';

// No gerador:
doc.addImage(logoBase64, 'PNG', x, y, width, height);
```

### Correção do Preço

Linha 141 em `src/data/products.ts`:
```typescript
// Antes:
{ name: '1B 2AS 1,90m', ..., prices: createPrices(4451, 4691, 5028, ...) }

// Depois (FX C corrigido):
{ name: '1B 2AS 1,90m', ..., prices: createPrices(4451, 4733, 5028, ...) }
```

---

## Resultado Esperado

Após a implementação:
- O produto OASI 1B 2AS 1,90m mostrará R$ 4.733,00 na faixa FX C
- O PDF gerado terá o logo LSA no cabeçalho
- O título será "ORÇAMENTO SOHOME"
- O layout será mais profissional e identitário

