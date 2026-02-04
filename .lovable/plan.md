
# Plano: Reduzir Tamanho do PDF e Adicionar Número do Orçamento no Histórico

## 1. Problema do Tamanho do PDF (11MB)

### Causa Principal
As imagens dos produtos estão sendo convertidas para base64 sem compressão adequada. Na linha 77 do `pdfGenerator.ts`, a qualidade está em 0.8 (80%), mas as imagens originais podem ser muito grandes.

### Solução
1. **Reduzir qualidade das imagens** - Diminuir de 0.8 para 0.5 (50%)
2. **Redimensionar imagens antes de converter** - Limitar a 100x100 pixels (já que são exibidas em 12x12mm no PDF)
3. **Usar formato mais leve** - JPEG com compressão agressiva para fotos

## 2. Número do Orçamento no Histórico

### Situação Atual
- O histórico mostra: nome do cliente, data e total
- O número do orçamento (primeiros 8 caracteres do UUID) só aparece no PDF

### Solução
- Adicionar o número do orçamento no card do histórico
- Permitir busca pelo número do orçamento

---

## Detalhes Técnicos

### Arquivo: `src/utils/pdfGenerator.ts`

**Modificações na função de carregamento de imagem:**

```typescript
// Novo tamanho máximo para imagens (pixels)
const MAX_IMAGE_SIZE = 100;

// Na função loadImageViaElement, redimensionar a imagem:
img.onload = () => {
  const canvas = document.createElement('canvas');
  // Calcular dimensões mantendo proporção, máximo 100x100
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
    const ratio = Math.min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height);
    width = width * ratio;
    height = height * ratio;
  }
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  // Usar qualidade 0.5 ao invés de 0.8
  const base64 = canvas.toDataURL('image/jpeg', 0.5);
};
```

### Arquivo: `src/components/quote/QuoteHistory.tsx`

**Adicionar número do orçamento no card:**

```tsx
// Na exibição do card, adicionar:
<span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
  <FileText className="h-3 w-3" />
  #{quote.id.slice(0, 8).toUpperCase()}
</span>
```

**Permitir busca pelo número:**

```typescript
// No filtro de busca, adicionar:
const filteredQuotes = quotes.filter((quote) => {
  const search = searchTerm.toLowerCase();
  const quoteNumber = quote.id.slice(0, 8).toLowerCase();
  return (
    quote.client.name.toLowerCase().includes(search) ||
    quote.client.company?.toLowerCase().includes(search) ||
    formatDate(quote.createdAt).includes(search) ||
    quoteNumber.includes(search) // Novo
  );
});
```

---

## Resultado Esperado

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Tamanho PDF | ~11MB | ~500KB-1MB |
| Busca por número | Não | Sim |
| Visualização número | Só no PDF | Card + PDF |

## Arquivos a Modificar
- `src/utils/pdfGenerator.ts` - Otimização de imagens
- `src/components/quote/QuoteHistory.tsx` - Exibição e busca por número
