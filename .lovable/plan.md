
# Plano: Ícone de Upload de Imagem nos Produtos

## Resumo

Adicionar um ícone de câmera/imagem em cada card de produto no catálogo que permite fazer upload de uma imagem. A imagem será armazenada no Storage do backend e exibida automaticamente no carrinho e no PDF do orçamento.

---

## Situação Atual

- O PDF já tem código para exibir imagens de produtos (linhas 175-183 do `pdfGenerator.ts`)
- O carrinho já usa o componente `ProductImage` para exibir imagens
- Atualmente, as imagens são buscadas em `public/images/products/` pelo nome do produto
- Existem 11 imagens de produtos já cadastradas (ALENTO, AMBER, ARLO, etc.)
- Problema: a maioria dos produtos não tem imagem porque depende de arquivos locais

---

## O Que Será Feito

1. **Criar bucket de storage** `product-images` para armazenar as imagens
2. **Adicionar coluna `image_url`** na tabela `products` para salvar a URL da imagem
3. **Criar componente de upload** com preview e funcionalidade de remover
4. **Adicionar ícone de câmera** nos cards de produto no `ProductManager`
5. **Atualizar lógica de exibição** para priorizar imagem do storage

---

## Fluxo de Upload

```text
Usuário clica no ícone de câmera no card
              |
              v
     Abre dialog de upload
              |
              v
  Mostra imagem atual (se existir)
              |
              v
  Seleciona nova imagem (JPG/PNG/WebP)
              |
              v
    Upload para o Storage
              |
              v
   URL salva na tabela products
              |
              v
 Imagem aparece no card e orçamentos
```

---

## Alterações Visuais

### Card de Produto (antes)
```text
+-------------------------------+
| Nome do Produto    [✏️] [🗑️]  |
| Cód: 12345                    |
| Modulações: 3                 |
| Tamanhos: 5                   |
+-------------------------------+
```

### Card de Produto (depois)
```text
+-------------------------------+
| Nome do Produto [📷] [✏️] [🗑️] |
| Cód: 12345                    |
| [    Miniatura    ]           |
| Modulações: 3                 |
| Tamanhos: 5                   |
+-------------------------------+
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/quote/ProductImageUpload.tsx` | **Criar** - Dialog de upload com preview |
| `src/components/quote/ProductManager.tsx` | **Modificar** - Adicionar ícone e integração |
| `src/hooks/useProducts.ts` | **Modificar** - Incluir campo `image_url` nas operações |
| `src/utils/productImage.ts` | **Modificar** - Priorizar imagem do storage |
| `src/types/quote.ts` | **Modificar** - Adicionar campo `imageUrl` em Product |
| `src/components/ProductImage.tsx` | **Modificar** - Receber URL do storage como prop |

---

## Detalhes Técnicos

### 1. Migration: Criar Bucket e Coluna

```sql
-- Criar bucket público para imagens de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Políticas de acesso
CREATE POLICY "Imagens de produtos são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Admins podem deletar imagens"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Adicionar coluna na tabela products
ALTER TABLE products
ADD COLUMN image_url TEXT;
```

### 2. Componente ProductImageUpload

Funcionalidades:
- Input de arquivo com validação (JPG, PNG, WebP, máx 2MB)
- Preview da imagem selecionada
- Upload para storage com nome único (product_id + timestamp)
- Atualização automática do produto
- Botão para remover imagem existente

### 3. Lógica de Exibição Atualizada

```typescript
// Prioridade de busca de imagem:
// 1. image_url do banco (storage do backend)
// 2. Arquivo local em /images/products/NOME.jpg
// 3. Placeholder padrão
```

### 4. Integração com PDF

O `pdfGenerator.ts` será atualizado para:
- Receber a URL da imagem do storage via `imageUrl` do item
- Fazer o carregamento da imagem do storage se disponível
- Manter fallback para imagens locais

---

## Resultado Esperado

Ao clicar no ícone de câmera em um produto:
1. Abre dialog com área de upload
2. Mostra imagem atual se existir (do storage ou local)
3. Permite selecionar nova imagem
4. Faz upload automático ao confirmar
5. Atualiza o card imediatamente
6. Imagem aparece nos próximos orçamentos (carrinho + PDF)

---

## Considerações

- **Formatos aceitos**: JPG, PNG, WebP
- **Tamanho máximo**: 2MB
- **Dimensões de exibição**: 
  - Cards: 80x80px
  - Carrinho: 40x40px
  - PDF: 12x12mm
- **Fallback**: Mantém compatibilidade com imagens locais existentes
- **Permissões**: Apenas usuários autenticados podem fazer upload; apenas admins podem deletar
