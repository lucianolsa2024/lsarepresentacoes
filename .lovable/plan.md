
# Plano: Filtro por Fábrica e Imagens nos Orçamentos

## Resumo

Implementar duas funcionalidades principais:
1. **Filtro por Fábrica/Marca**: Adicionar um passo inicial na seleção de produtos onde o usuário escolhe a fábrica antes de ver os produtos
2. **Imagens nos Orçamentos**: Exibir imagens dos produtos no carrinho e no PDF gerado

---

## Parte 1: Filtro por Fábrica

### Pré-requisito do Usuário

Os arquivos Excel atuais **não possuem** coluna de fábrica. Será necessário adicionar uma nova coluna chamada **"Fábrica"** em cada arquivo:

| Arquivo | Coluna a adicionar |
|---------|-------------------|
| `tabela-lsa.xlsx` | Fábrica (ex: "SOHOME") |
| `tabela-lsa-2.xlsx` | Fábrica (ex: "SOHOME") |
| `produtos-century.xlsx` | Fábrica (ex: "CENTURY") |

### Alterações no Banco de Dados

Adicionar coluna `factory` na tabela `products`:

```sql
ALTER TABLE products ADD COLUMN factory TEXT DEFAULT '';
```

### Alterações no Importador (BulkImporter)

- Detectar nova coluna "Fábrica" no Excel
- Salvar o valor no campo `factory` do produto

### Alterações na Interface (ProductSelector)

**Novo fluxo de seleção:**

```text
Fábrica → Produto → Modulação → Base → Tamanho → Faixa de Tecido → Tecido
```

- Mostrar lista de fábricas disponíveis antes da busca de produtos
- Filtrar produtos pela fábrica selecionada
- Permitir ver "Todas as fábricas" como opção

---

## Parte 2: Imagens nos Orçamentos

### Estrutura de Pastas

Criar pasta `public/images/products/` onde o usuário fará upload de imagens nomeadas pelo nome do produto:

```text
public/
  images/
    products/
      ALENTO.jpg
      AFAGO.jpg
      ACCORD MESA.png
      ...
```

### Lógica de Busca de Imagem

O sistema buscará imagens no seguinte padrão:
- Converter nome do produto para formato de arquivo (ex: "ACCORD MESA" → "ACCORD MESA.jpg")
- Suportar extensões: `.jpg`, `.jpeg`, `.png`, `.webp`
- Fallback para imagem placeholder caso não exista

### Alterações no Carrinho (QuoteCart)

- Exibir miniatura da imagem do produto ao lado do nome
- Tamanho: 60x60 pixels
- Mostrar placeholder genérico se não houver imagem

### Alterações no PDF (pdfGenerator)

- Adicionar imagem do produto na seção de itens
- Tamanho: 25x25mm aproximadamente
- Ajustar layout da tabela para acomodar imagens

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/types/quote.ts` | Adicionar `factory` ao tipo `Product` |
| `src/hooks/useProducts.ts` | Mapear campo `factory` do banco |
| `src/components/quote/BulkImporter.tsx` | Detectar e importar coluna "Fábrica" |
| `src/components/quote/ProductSelector.tsx` | Adicionar step de seleção de fábrica |
| `src/components/quote/QuoteCart.tsx` | Exibir imagens dos produtos |
| `src/utils/pdfGenerator.ts` | Adicionar imagens ao PDF |

---

## Detalhes Técnicos

### Utilitário de Imagem do Produto

Criar função helper para buscar URL da imagem:

```typescript
// src/utils/productImage.ts
export function getProductImageUrl(productName: string): string {
  const basePath = '/images/products/';
  const normalizedName = productName.trim().toUpperCase();
  return `${basePath}${normalizedName}.jpg`;
}

export function getProductImageFallback(): string {
  return '/placeholder.svg';
}
```

### Componente de Imagem com Fallback

Criar componente que exibe imagem com fallback automático se não existir.

### Migração SQL

```sql
-- Adicionar coluna factory na tabela products
ALTER TABLE products ADD COLUMN factory TEXT DEFAULT '';

-- Criar índice para filtro por fábrica
CREATE INDEX idx_products_factory ON products(factory);
```

### Atualização do Importador Excel

O parser será atualizado para detectar a coluna "Fábrica" usando padrões:
- `fabrica`, `fábrica`, `marca`, `factory`, `brand`

---

## Após Implementação

1. **Adicionar coluna "Fábrica"** nos 3 arquivos Excel com os valores corretos
2. **Re-importar** usando "Atualizar Base Completa"
3. **Criar pasta** `public/images/products/`
4. **Adicionar imagens** dos produtos (ALENTO.jpg, AFAGO.jpg, etc.)
5. **Testar** o fluxo: Fábrica → Produto → configurações → carrinho → PDF
