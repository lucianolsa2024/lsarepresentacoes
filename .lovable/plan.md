
# Plano: Filtro por Fábrica e Imagens nos Orçamentos ✅ CONCLUÍDO

## Resumo

Foram implementadas duas funcionalidades principais:
1. ✅ **Filtro por Fábrica/Marca**: Adicionado passo inicial na seleção de produtos onde o usuário escolhe a fábrica antes de ver os produtos
2. ✅ **Imagens nos Orçamentos**: Exibição de imagens dos produtos no carrinho e no PDF gerado

---

## Alterações Realizadas

### Banco de Dados
- ✅ Coluna `factory` adicionada à tabela `products`
- ✅ Índice `idx_products_factory` criado

### Código Modificado

| Arquivo | Alteração |
|---------|-----------|
| `src/types/quote.ts` | ✅ Campo `factory` adicionado ao tipo `Product` |
| `src/hooks/useProducts.ts` | ✅ Mapeamento do campo `factory` do banco |
| `src/components/quote/BulkImporter.tsx` | ✅ Detecção e importação da coluna "Fábrica" |
| `src/components/quote/ProductSelector.tsx` | ✅ Step de seleção de fábrica antes dos produtos |
| `src/components/quote/QuoteCart.tsx` | ✅ Exibição de miniaturas dos produtos |
| `src/utils/pdfGenerator.ts` | ✅ Imagens dos produtos no PDF |
| `src/utils/productImage.ts` | ✅ NOVO - Utilitário para busca de imagens |
| `src/components/ProductImage.tsx` | ✅ NOVO - Componente de imagem com fallback |
| `public/images/products/.gitkeep` | ✅ NOVO - Pasta para imagens de produtos |

---

## Instruções para o Usuário

### 1. Adicionar coluna "Fábrica" nos arquivos Excel

Nos 3 arquivos Excel, adicione uma nova coluna chamada **"Fábrica"** (ou "Marca"):

| Arquivo | Valor sugerido |
|---------|---------------|
| `tabela-lsa.xlsx` | SOHOME |
| `tabela-lsa-2.xlsx` | SOHOME |
| `produtos-century.xlsx` | CENTURY |

### 2. Re-importar os produtos

1. Acesse a aba **"Produtos"**
2. Clique em **"Atualizar Base Completa"**
3. Confirme a importação

### 3. Adicionar imagens dos produtos

1. Crie a pasta `public/images/products/` (já criada no projeto)
2. Adicione imagens nomeadas pelo nome do produto em MAIÚSCULO:
   - `ALENTO.jpg`
   - `AFAGO.jpg`
   - `ACCORD MESA.jpg`
   - etc.
3. Formatos suportados: `.jpg`, `.jpeg`, `.png`, `.webp`

---

## Novo Fluxo de Seleção

```text
Fábrica → Produto → Modulação → Base → Tamanho → Faixa de Tecido → Tecido
```

O sistema agora mostra primeiro as fábricas disponíveis, filtrando os produtos após a seleção.
