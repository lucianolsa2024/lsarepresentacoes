import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RD_API_BASE = 'https://crm.rdstation.com/api/v1';

interface ClientData {
  name: string;
  company: string;
  document: string;
  phone: string;
  email: string;
  isNewClient: boolean;
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface QuoteItem {
  productName: string;
  modulation: string;
  fabricTier: string;
  price: number;
  quantity: number;
}

interface SyncRequest {
  client: ClientData;
  quote: {
    id: string;
    total: number;
    items: QuoteItem[];
    createdAt: string;
  };
}

async function rdFetch(endpoint: string, options: RequestInit, token: string) {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${RD_API_BASE}${endpoint}${separator}token=${token}`;
  console.log(`RD Station API call: ${options.method || 'GET'} ${endpoint}`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    redirect: 'follow',
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error(`RD Station API error [${response.status}]:`, JSON.stringify(data));
    throw new Error(`RD Station API failed [${response.status}]: ${JSON.stringify(data)}`);
  }

  return data;
}

async function searchOrganization(companyName: string, token: string): Promise<string | null> {
  try {
    const data = await rdFetch(`/organizations?name=${encodeURIComponent(companyName)}`, { method: 'GET' }, token);
    
    if (data.organizations && data.organizations.length > 0) {
      console.log(`Found existing organization: ${data.organizations[0]._id}`);
      return data.organizations[0]._id;
    }
    return null;
  } catch (error) {
    console.error('Error searching organization:', error);
    return null;
  }
}

async function createOrganization(client: ClientData, token: string): Promise<string> {
  const fullAddress = [
    client.address.street,
    client.address.number,
    client.address.complement,
    client.address.neighborhood,
    client.address.city,
    client.address.state,
    client.address.zipCode
  ].filter(Boolean).join(', ');

  const orgData = {
    organization: {
      name: client.company,
      address: fullAddress || undefined,
      organization_segments: [],
    }
  };

  console.log('Creating organization:', JSON.stringify(orgData));
  const data = await rdFetch('/organizations', {
    method: 'POST',
    body: JSON.stringify(orgData),
  }, token);

  console.log(`Organization created: ${data._id}`);
  return data._id;
}

async function searchContact(email: string, token: string): Promise<string | null> {
  if (!email) return null;
  
  try {
    const data = await rdFetch(`/contacts?email=${encodeURIComponent(email)}`, { method: 'GET' }, token);
    
    if (data.contacts && data.contacts.length > 0) {
      console.log(`Found existing contact: ${data.contacts[0]._id}`);
      return data.contacts[0]._id;
    }
    return null;
  } catch (error) {
    console.error('Error searching contact:', error);
    return null;
  }
}

async function createContact(client: ClientData, organizationId: string, token: string): Promise<string> {
  const contactData = {
    contact: {
      name: client.name || client.company,
      title: 'Cliente',
      emails: client.email ? [{ email: client.email }] : [],
      phones: client.phone ? [{ phone: client.phone, type: 'cellphone' }] : [],
      organization_id: organizationId,
    }
  };

  console.log('Creating contact:', JSON.stringify(contactData));
  const data = await rdFetch('/contacts', {
    method: 'POST',
    body: JSON.stringify(contactData),
  }, token);

  console.log(`Contact created: ${data._id}`);
  return data._id;
}

async function createDeal(
  quote: SyncRequest['quote'],
  organizationId: string,
  contactId: string | null,
  client: ClientData,
  token: string
): Promise<string> {
  const itemsList = quote.items
    .map(item => `• ${item.productName} ${item.modulation} (${item.fabricTier}) x${item.quantity}`)
    .join('\n');

  const dealData = {
    deal: {
      name: `Orçamento - ${client.company}`,
      amount_montly: 0,
      amount_unique: quote.total,
      organization_id: organizationId,
      contact_id: contactId || undefined,
      deal_products: quote.items.map(item => ({
        name: `${item.productName} ${item.modulation}`,
        price: item.price,
        amount: item.quantity,
      })),
    }
  };

  console.log('Creating deal:', JSON.stringify(dealData));
  const data = await rdFetch('/deals', {
    method: 'POST',
    body: JSON.stringify(dealData),
  }, token);

  console.log(`Deal created: ${data._id}`);
  return data._id;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RD_STATION_TOKEN = Deno.env.get('RD_STATION_TOKEN');
    if (!RD_STATION_TOKEN) {
      console.error('RD_STATION_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'RD_STATION_TOKEN não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { client, quote } = await req.json() as SyncRequest;

    if (!client.company) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome da empresa é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting RD Station sync for: ${client.company}`);
    console.log(`Is new client: ${client.isNewClient}`);

    // Step 1: Find or create organization
    let organizationId: string;
    
    if (client.isNewClient) {
      console.log('Creating new organization (marked as new client)');
      organizationId = await createOrganization(client, RD_STATION_TOKEN);
    } else {
      console.log('Searching for existing organization');
      const existingOrgId = await searchOrganization(client.company, RD_STATION_TOKEN);
      
      if (existingOrgId) {
        organizationId = existingOrgId;
      } else {
        console.log('Organization not found, creating new one');
        organizationId = await createOrganization(client, RD_STATION_TOKEN);
      }
    }

    // Step 2: Find or create contact
    let contactId: string | null = null;
    
    if (client.email || client.name) {
      const existingContactId = client.email ? await searchContact(client.email, RD_STATION_TOKEN) : null;
      
      if (existingContactId) {
        contactId = existingContactId;
      } else {
        contactId = await createContact(client, organizationId, RD_STATION_TOKEN);
      }
    }

    // Step 3: Create deal
    const dealId = await createDeal(quote, organizationId, contactId, client, RD_STATION_TOKEN);

    console.log(`RD Station sync completed successfully`);
    console.log(`Organization: ${organizationId}, Contact: ${contactId}, Deal: ${dealId}`);

    return new Response(
      JSON.stringify({
        success: true,
        organizationId,
        contactId,
        dealId,
        message: 'Sincronizado com RD Station CRM',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('RD Station sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
