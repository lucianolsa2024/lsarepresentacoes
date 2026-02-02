
# Plano: Integração com RD Station CRM

## Resumo

Integrar o sistema de orçamentos com o RD Station CRM para criar automaticamente empresas (Organizations) e vincular os orçamentos como negociações (Deals) quando um orçamento for gerado.

---

## O que será feito

1. **Criar empresa no RD Station** quando um orçamento for gerado para um cliente novo
2. **Criar negociação (Deal)** vinculada à empresa com os dados do orçamento
3. **Sincronizar contato** do cliente com a empresa no CRM

---

## Fluxo de Integração

```text
Usuário gera orçamento
        ↓
  É cliente novo?
   /         \
 Sim         Não
  ↓           ↓
Criar      Buscar
Empresa    Empresa
  ↓           ↓
     ↓     ↓
   Criar/Atualizar Contato
        ↓
   Criar Deal (Negociação)
        ↓
   Sucesso → Toast de confirmação
```

---

## Dados a Sincronizar

### Empresa (Organization)
| Campo LSA | Campo RD Station |
|-----------|------------------|
| client.company | name |
| client.document | custom_field (CNPJ) |
| Endereço completo | custom_fields (endereço) |

### Contato (Contact)
| Campo LSA | Campo RD Station |
|-----------|------------------|
| client.name | name |
| client.email | emails[0] |
| client.phone | phones[0] |
| organization_id | Vinculado à empresa |

### Negociação (Deal)
| Campo LSA | Campo RD Station |
|-----------|------------------|
| quote.total | deal_value |
| "Orçamento #ID" | name |
| Lista de produtos | custom_field ou notes |
| quote.createdAt | created_at |

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/rdstation-sync/index.ts` | Criar edge function para comunicação com API RD Station |
| `src/hooks/useRDStation.ts` | Criar hook para gerenciar integração |
| `src/pages/Index.tsx` | Adicionar chamada de sincronização ao gerar orçamento |
| `src/components/quote/ClientForm.tsx` | Adicionar feedback de sincronização |

---

## Pré-requisitos

Você precisará fornecer:

1. **Token de API do RD Station CRM** - Obtido em:
   - Acesse sua conta RD Station CRM
   - Vá em Configurações → Integrações → API
   - Gere um token de acesso

---

## Detalhes Técnicos

### Edge Function: rdstation-sync

```typescript
// Endpoints RD Station CRM v2
const RD_API_BASE = 'https://api.rd.services/crm/v2';

// Criar organização
POST /organizations
{
  "data": {
    "name": "Nome da Empresa",
    "custom_fields": { ... }
  }
}

// Criar contato
POST /contacts
{
  "data": {
    "name": "Nome do Contato",
    "emails": [{ "email": "email@exemplo.com" }],
    "phones": [{ "phone": "+5511999999999" }],
    "organization_id": "uuid-da-empresa"
  }
}

// Criar deal
POST /deals
{
  "data": {
    "name": "Orçamento #123",
    "deal_value": 15000.00,
    "organization_id": "uuid-da-empresa",
    "contact_id": "uuid-do-contato"
  }
}
```

### Autenticação

Todas as requisições usam Bearer Token:
```
Authorization: Bearer {RD_STATION_TOKEN}
```

### Tratamento de Erros

- Falha na sincronização não bloqueia a geração do PDF
- Toast informativo sobre status da sincronização
- Log de erros para debugging

---

## Resultado Esperado

Ao gerar um orçamento:

1. ✅ PDF é gerado normalmente
2. ✅ Empresa é criada/encontrada no RD Station
3. ✅ Contato é vinculado à empresa
4. ✅ Negociação é criada com valor do orçamento
5. ✅ Toast confirma sincronização bem-sucedida

---

## Próximos Passos Após Implementação

- Adicionar campo para selecionar etapa do funil
- Sincronizar status de orçamentos (ganho/perdido)
- Dashboard mostrando orçamentos sincronizados
