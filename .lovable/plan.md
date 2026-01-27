
# Plano: Atualização dos Arquivos Excel da Base de Produtos

## Objetivo
Substituir os arquivos Excel existentes no projeto pelos novos arquivos atualizados enviados pelo usuário.

## Arquivos a Substituir

| Arquivo Atual | Novo Arquivo |
|---------------|--------------|
| `public/data/tabela-lsa.xlsx` | `Produtos_pv_27-01.xlsx` (~5.476 linhas) |
| `public/data/produtos-century.xlsx` | `produtos_century_27-01.xlsx` (~14.020 linhas) |

## Etapas

1. **Copiar Novos Arquivos**
   - Copiar `user-uploads://Produtos_pv_27-01.xlsx` para `public/data/tabela-lsa.xlsx`
   - Copiar `user-uploads://produtos_century_27-01.xlsx` para `public/data/produtos-century.xlsx`

2. **Verificação**
   - Os nomes dos arquivos de destino permanecem os mesmos para manter compatibilidade com o `BulkImporter`
   - A estrutura das colunas é idêntica à versão anterior

## Após a Implementação

Depois que os arquivos forem substituídos, você poderá:
1. Acessar a aba **"Produtos"**
2. Clicar no botão **"Atualizar Base Completa"**
3. O sistema irá limpar a base atual e importar os ~19.500 produtos dos novos arquivos

## Observações Técnicas

- O `BulkImporter` continuará funcionando normalmente pois os caminhos dos arquivos não mudam
- A lógica de parsing existente é compatível com a estrutura das novas planilhas
- Variações como CAIXA, PE, GIRATÓRIA continuarão sendo detectadas corretamente
