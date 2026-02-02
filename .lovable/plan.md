

# Plano: Extrair Imagens dos Produtos do Catálogo PDF

## Situação Atual

O catálogo PDF foi processado com sucesso e foram extraídas imagens (screenshots) de cada página. Estas páginas contêm fotos dos produtos junto com especificações técnicas.

## Opção de Implementação

### Usar as Páginas de Apresentação dos Produtos

Cada produto tem uma página de "capa" com uma foto grande e bonita do produto. Vou copiar essas páginas específicas para usar como imagens dos produtos:

| Produto | Página com Foto Principal |
|---------|--------------------------|
| ALENTO | page_3.jpg |
| AMBER | page_6.jpg |
| ARLO | page_10.jpg |
| ATTO | page_14.jpg |
| BOLD | page_19.jpg |
| BONOBO | page_25.jpg |
| CLIFF | page_29.jpg |
| COBAIN | page_36.jpg |
| CODE | page_38.jpg |
| CORSO | page_43.jpg |
| CROMIE | page_47.jpg |

## Passos da Implementação

1. **Copiar imagens do catálogo**
   - Selecionar as páginas de apresentação de cada produto
   - Copiar para `public/images/products/` com nome do produto normalizado
   - Exemplo: `page_3.jpg` → `ALENTO.jpg`

2. **Manter compatibilidade**
   - O sistema já está configurado para buscar imagens em `public/images/products/`
   - Formato esperado: `NOME_DO_PRODUTO.jpg` (uppercase)

## Limitações

- As imagens são screenshots das páginas completas, não recortes isolados do produto
- Para imagens mais limpas (só o produto), seria necessário recorte manual ou upload de imagens individuais
- Apenas os produtos das primeiras 50 páginas foram processados

## Arquivos a Criar

| Arquivo de Origem | Arquivo de Destino |
|-------------------|-------------------|
| `parsed-documents://...page_3.jpg` | `public/images/products/ALENTO.jpg` |
| `parsed-documents://...page_6.jpg` | `public/images/products/AMBER.jpg` |
| `parsed-documents://...page_10.jpg` | `public/images/products/ARLO.jpg` |
| `parsed-documents://...page_14.jpg` | `public/images/products/ATTO.jpg` |
| `parsed-documents://...page_19.jpg` | `public/images/products/BOLD.jpg` |
| `parsed-documents://...page_25.jpg` | `public/images/products/BONOBO.jpg` |
| `parsed-documents://...page_29.jpg` | `public/images/products/CLIFF.jpg` |
| `parsed-documents://...page_36.jpg` | `public/images/products/COBAIN.jpg` |
| `parsed-documents://...page_38.jpg` | `public/images/products/CODE.jpg` |
| `parsed-documents://...page_43.jpg` | `public/images/products/CORSO.jpg` |
| `parsed-documents://...page_47.jpg` | `public/images/products/CROMIE.jpg` |

## Próximos Passos Sugeridos

Após implementar esta primeira leva, posso:
1. Continuar processando mais páginas do catálogo para outros produtos
2. Se preferir imagens mais limpas, você pode fazer upload de imagens recortadas individualmente

