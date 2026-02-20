

# Plano: Filtro de Fabricas + Correcao Tapetes Sao Carlos

## 1. Problema Atual

- **Fabricas sem identificacao**: Os produtos importados do BulkImporter (SOHOME, CENTURY, SOHOME WOOD) estao com campo `factory` vazio no banco. Apenas os tapetes da Sao Carlos tem fabrica preenchida.
- **Tapetes mal cadastrados**: Os 35 tapetes foram importados apenas com preco por m², sem as medidas reais (0,50x1,00, 1,00x1,50, etc.) e sem os precos por medida que constam na planilha.
- **Falta de logica para tapetes**: O fluxo de selecao de produto exige tecido/acabamento, mas tapetes nao tem tecido - o preco e diretamente pela medida.

## 2. Correcao das Fabricas nos Produtos Existentes

Atualizar o campo `factory` dos produtos ja cadastrados baseado no arquivo de origem:
- Produtos importados de `tabela-lsa.xlsx` e `tabela-lsa-2.xlsx` -> factory = `SOHOME`
- Produtos importados de `produtos-century.xlsx` -> factory = `CENTURY`
- Produtos importados de `wood-pv.xlsx`, `wood-century.xlsx`, `wood-private-label.xlsx` -> factory = `SOHOME WOOD`
- Tapetes -> factory = `SÃO CARLOS` (ja estao corretos)

Como os nomes dos produtos sao unicos por fabrica, usaremos os nomes presentes em cada arquivo Excel para fazer o UPDATE via SQL.

Adicionar LOVATO como fabrica disponivel (sem produtos por enquanto, para quando forem cadastrados).

## 3. Re-importacao dos Tapetes com Medidas Corretas

Apagar os tapetes atuais e reimportar com a estrutura correta da planilha:

**Estrutura por produto (ex: ARTESANIA):**
- Modulacao "Tapete Retangular" com sizes:
  - `1,00x1,50` -> R$ 333,74
  - `1,50x2,00` -> R$ 667,48
  - `2,00x2,50` -> R$ 1.112,47
  - `2,00x3,00` -> R$ 1.334,96
  - `2,50x3,50` -> R$ 1.946,82
  - `3,00x4,00` -> R$ 2.669,93
- Modulacao "Tapete Redondo" (quando disponivel):
  - `1,40 RED` -> R$ 479,70
- Modulacao "Passadeira" (quando disponivel):
  - `0,75x1,80` -> R$ 300,37
  - `0,75x2,40` -> R$ 400,49
- Modulacao "Medida Especial":
  - `Sob Medida (m²)` -> preco por m²

Precos serao armazenados em `price_sem_tec` (sem tecido, pois tapete nao usa tecido).
Dimensoes serao armazenadas nos campos `dimensions` e `description`.

## 4. Ajuste no ProductSelector para Tapetes

Quando a categoria do produto for "Tapetes":
- Pular os passos de "Faixa de Tecido" e "Codigo do Tecido"
- Apos selecionar modulacao e medida, ir direto para confirmacao
- Usar o preco de `price_sem_tec` (ou `SEM TEC`) como preco final
- No resumo, mostrar "Medida" em vez de "Tamanho" e nao exibir secao de tecidos

## 5. Filtro de Fabricas no ProductManager

O filtro por botoes ja existe e funciona. Com as fabricas corretamente preenchidas, os botoes aparecerao automaticamente: SOHOME, SOHOME WOOD, CENTURY, SÃO CARLOS.

---

## Detalhes Tecnicos

### Arquivos modificados:
- `src/components/quote/ProductSelector.tsx` - Adicionar logica para categoria "Tapetes" (pular tecido)

### Migracoes SQL:
1. UPDATE products SET factory para SOHOME/CENTURY/SOHOME WOOD baseado nos nomes dos produtos
2. DELETE tapetes atuais (SÃO CARLOS)
3. INSERT tapetes com medidas e precos corretos da planilha

### Dados dos tapetes (extraidos da planilha):
35 colecoes com medidas variando de 0,50x1,00 ate 3,00x4,00, mais redondos (1,40 e 1,90 de diametro), passadeiras, formatos organicos (Feijao/Lente/Curve) e medidas especiais por m².

### Logica no ProductSelector:
```
const isCarpet = selectedProduct?.category === 'Tapetes';
// Se isCarpet:
//   - Nao mostrar selecao de faixa de tecido
//   - Nao mostrar selecao de codigo de tecido
//   - Usar price_sem_tec como preco
//   - Confirmar item apos selecionar medida
```

