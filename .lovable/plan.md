
# Plano: Ajustar Importação de Produtos com CAIXA

## O Que Será Feito

Modificar o importador Excel para que produtos com "CAIXA: FX X" na descrição sejam tratados como tamanhos individuais, mantendo a descrição completa e todos os preços de faixa de tecido.

## Mudança Técnica

**Arquivo:** `src/components/quote/ExcelImporter.tsx`

Simplificar a lógica de parsing para:

1. **Remover a lógica de consolidação CAIXA** (linhas 292-341)
2. **Tratar todas as linhas de forma igual** - cada linha é um tamanho único
3. **Usar a descrição completa** (incluindo "CAIXA: FX X") como identificador
4. **Importar todos os preços** das colunas FX B até FX COURO normalmente

### Exemplo do Resultado

Para o produto SONA com CAIXA:

| Antes (errado) | Depois (correto) |
|----------------|------------------|
| 1 tamanho com preços misturados | Múltiplos tamanhos separados |

**Tamanhos importados:**
- `SONA 1B 1AS 1,15m x 1,10m CAIXA: FX B` → Preços: FX B=3845, FX C=3898, FX D=3972...
- `SONA 1B 1AS 1,15m x 1,10m CAIXA: FX C` → Preços: FX B=3862, FX C=3914, FX D=3989...
- `SONA 1B 1AS 1,15m x 1,10m CAIXA: FX D` → Preços: FX B=3879, FX C=3932...

### Código Simplificado

```typescript
// Usar descrição RAW como chave (incluindo CAIXA: FX X)
const dimensionKey = rawDescription || `${productName} ${modulationName} ${dimensions}|${height}`;

// Processar TODAS as linhas da mesma forma
const prices: Record<string, number> = {};
priceColumns.forEach(({ name, index }) => {
  const rawValue = rowData[index];
  const value = parseFloat(String(rawValue ?? '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
  prices[name] = value;
});

sizeMap.set(dimensionKey, {
  description: rawDescription || description,
  dimensions,
  length,
  depth,
  height,
  fabricQuantity: fabricQty,
  prices,
});
```

## Fluxo do Usuário

1. Ao selecionar o produto SONA
2. Escolhe a modulação (ex: 1B 1AS)
3. Na lista de tamanhos, verá opções como:
   - "1,15m x 1,10m CAIXA: FX B"
   - "1,15m x 1,10m CAIXA: FX C"
   - etc.
4. Após selecionar o tamanho (com CAIXA específica), escolhe a faixa de tecido normalmente

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/quote/ExcelImporter.tsx` | Remover lógica especial CAIXA e tratar todas as linhas igualmente |
