
# Plano: Mover Filtro de Fábrica para Aba de Produtos

## Resumo

Mover a seleção de fábrica da aba "Novo Orçamento" (`ProductSelector`) para a aba "Produtos" (`ProductManager`), criando uma experiência mais intuitiva onde o usuário filtra a visualização do catálogo pela fábrica desejada.

---

## Mudanças Propostas

### 1. ProductManager (Aba Produtos)

**Adicionar:**
- Seletor de fábrica no topo, antes da barra de busca
- Botões estilizados para cada fábrica disponível (SOHOME, CENTURY, etc.)
- Opção "Todas" para ver todos os produtos
- Filtrar a lista de produtos exibidos pela fábrica selecionada

**Fluxo na aba Produtos:**
```text
[SOHOME] [CENTURY] [Todas]  ← Botões de fábrica
[Buscar produtos...]        ← Barra de busca (filtra dentro da fábrica)
Lista de produtos filtrados
```

### 2. ProductSelector (Aba Orçamento)

**Remover:**
- O passo inicial de seleção de fábrica
- O estado `selectedFactory` e funções relacionadas

**Manter:**
- Busca de produtos
- Fluxo: Produto → Modulação → Base → Tamanho → Tecido

**Nova lógica:**
- Mostrar todos os produtos disponíveis (sem filtro de fábrica)
- Ou receber uma prop opcional `selectedFactory` do componente pai para filtrar

### 3. Index.tsx (Página Principal)

**Opcional - Se quiser persistir a fábrica selecionada entre abas:**
- Elevar o estado `selectedFactory` para o componente pai
- Passar para ambos ProductManager e ProductSelector
- Quando o usuário seleciona uma fábrica em Produtos, ela persiste ao ir para Orçamento

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/quote/ProductManager.tsx` | Adicionar filtro de fábrica no topo da página |
| `src/components/quote/ProductSelector.tsx` | Remover seleção de fábrica, ir direto para busca de produtos |

---

## Detalhes Técnicos

### ProductManager - Nova Estrutura

```typescript
// Novo estado
const [selectedFactory, setSelectedFactory] = useState<string>('');

// Obter fábricas disponíveis
const availableFactories = useMemo(() => {
  const factories = new Set<string>();
  products.forEach(p => {
    if (p.factory) factories.add(p.factory);
  });
  return Array.from(factories).sort();
}, [products]);

// Filtrar por fábrica antes da busca
const filteredProducts = useMemo(() => {
  let filtered = products;
  
  // Filtrar por fábrica
  if (selectedFactory) {
    filtered = filtered.filter(p => p.factory === selectedFactory);
  }
  
  // Filtrar por busca
  if (searchQuery.trim()) {
    // ... lógica existente
  }
  
  return filtered;
}, [products, selectedFactory, searchQuery]);
```

### Interface do Filtro de Fábrica

```text
┌────────────────────────────────────────────────────────────┐
│  Catálogo de Produtos                    [Atualizar] [+]   │
├────────────────────────────────────────────────────────────┤
│  Fábrica:  [Todas] [SOHOME] [CENTURY]                      │
│  ────────────────────────────────────────                  │
│  [🔍 Buscar produtos por nome, código...]                  │
│                                                            │
│  45 produtos encontrados para "SOHOME"                     │
│                                                            │
│  ► Sofás                                                   │
│    ├── ALENTO                                              │
│    └── AFAGO                                               │
│  ► Poltronas                                               │
│    └── AMBER                                               │
└────────────────────────────────────────────────────────────┘
```

### ProductSelector - Simplificado

Remove a lógica de fábrica e vai direto para a lista de produtos com busca.

---

## Resultado Esperado

**Aba Produtos:**
- Usuário seleciona a fábrica para ver/gerenciar apenas produtos daquela marca
- A busca opera dentro da fábrica selecionada

**Aba Novo Orçamento:**
- Usuário vê todos os produtos de todas as fábricas
- Busca por nome/código para encontrar rapidamente
- Fluxo direto: Buscar → Selecionar → Configurar → Adicionar
