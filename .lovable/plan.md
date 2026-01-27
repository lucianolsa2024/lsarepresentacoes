
# Plano: Substituição dos Arquivos Excel de Produtos

## Objetivo
Substituir os arquivos Excel existentes pelos novos arquivos atualizados enviados.

## Arquivos a Substituir

| Novo Arquivo | Arquivo de Destino | Total de Linhas |
|--------------|-------------------|-----------------|
| `Produtos_pv_27-01-3.xlsx` | `public/data/tabela-lsa.xlsx` | ~5.476 |
| `produtos_century_27-01-2.xlsx` | `public/data/produtos-century.xlsx` | ~14.020 |

## Compatibilidade

Ambos os arquivos novos mantêm a estrutura idêntica à versão anterior:

```text
Colunas do Excel
┌─────────────────┬──────────┬───────────┬───────────┬─────────────┬──────────────┬─────────────────┬────────┬────────┬───┬──────────┐
│ Código do Item  │ Produto  │ Modulação │ Descrição │ Comprimento │ Profundidade │ SEM TEC/OUTRO   │ FX B   │ FX C   │...│ FX COURO │
└─────────────────┴──────────┴───────────┴───────────┴─────────────┴──────────────┴─────────────────┴────────┴────────┴───┴──────────┘
```

## Etapas da Implementação

1. **Copiar os novos arquivos para o projeto**
   - Copiar `Produtos_pv_27-01-3.xlsx` → `public/data/tabela-lsa.xlsx`
   - Copiar `produtos_century_27-01-2.xlsx` → `public/data/produtos-century.xlsx`

2. **Manter o terceiro arquivo**
   - O arquivo `public/data/tabela-lsa-2.xlsx` permanece inalterado

## Após a Implementação

Para atualizar a base de dados com os novos produtos:

1. Acesse a aba **"Produtos"**
2. Clique no botão **"Atualizar Base Completa"**
3. Confirme a operação clicando em **"Iniciar Importação"**

O sistema irá:
- Limpar toda a base atual
- Importar os 3 arquivos: `tabela-lsa.xlsx`, `tabela-lsa-2.xlsx` e `produtos-century.xlsx`
- Total aproximado: ~19.500 produtos

## Observações

- Nenhuma mudança de código é necessária - apenas substituição de arquivos
- A lógica de parsing existente é 100% compatível com os novos arquivos
- Variações como CAIXA, BASE/PE, GIRATÓRIA continuarão sendo detectadas corretamente
