// supabase/functions/generate-boleto/index.ts
// Gera cobrança (boleto + PIX) no ASAAS para uma Ordem de Serviço

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_URL = "https://api.asaas.com/v3";
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;

// Formata documento removendo pontuação
function cleanDocument(doc: string): string {
  return doc.replace(/[.\-\/]/g, "").trim();
}

// Cria ou busca cliente no ASAAS pelo documento
async function getOrCreateAsaasCustomer(customer: {
  name: string;
  document: string;
  document_type: string;
  email: string | null;
  phone: string | null;
}): Promise<string> {
  const cleanDoc = cleanDocument(customer.document);

  // Busca cliente existente pelo CPF/CNPJ
  const searchRes = await fetch(
    `${ASAAS_API_URL}/customers?cpfCnpj=${cleanDoc}`,
    { headers: { access_token: ASAAS_API_KEY } }
  );
  const searchData = await searchRes.json();

  if (searchData.data?.length > 0) {
    return searchData.data[0].id;
  }

  // Cria novo cliente no ASAAS
  const createRes = await fetch(`${ASAAS_API_URL}/customers`, {
    method: "POST",
    headers: {
      access_token: ASAAS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: customer.name,
      cpfCnpj: cleanDoc,
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      notificationDisabled: false,
    }),
  });

  const createData = await createRes.json();
  if (!createRes.ok) throw new Error(`ASAAS create customer error: ${JSON.stringify(createData)}`);
  return createData.id;
}

// Gera cobrança no ASAAS
async function createPayment(payload: {
  customerId: string;
  value: number;
  dueDate: string;       // YYYY-MM-DD
  description: string;
  externalReference: string;
}) {
  const res = await fetch(`${ASAAS_API_URL}/payments`, {
    method: "POST",
    headers: {
      access_token: ASAAS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer:          payload.customerId,
      billingType:       "BOLETO",
      value:             payload.value,
      dueDate:           payload.dueDate,
      description:       payload.description,
      externalReference: payload.externalReference,
      fine: {
        value:     10,     // 10% multa
        type:      "PERCENTAGE",
      },
      interest: {
        value: 1,          // 1% ao mês
        type:  "PERCENTAGE",
      },
      postalService: false,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`ASAAS create payment error: ${JSON.stringify(data)}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) throw new Error("Token inválido");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 2. Verifica se é usuário interno
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!["admin", "user"].includes(roleData?.role)) {
      throw new Error("Sem permissão");
    }

    // 3. Busca dados da OS
    const { service_order_id } = await req.json();
    if (!service_order_id) throw new Error("service_order_id obrigatório");

    const { data: os, error: osError } = await supabaseAdmin
      .from("service_orders")
      .select(`
        id, os_number, labor_cost, payment_due_days,
        asaas_payment_id,
        so_customer_id,
        service_order_customers (
          id, name, document, document_type, email, phone, asaas_customer_id
        )
      `)
      .eq("id", service_order_id)
      .single();

    if (osError || !os) throw new Error("OS não encontrada");
    if (os.labor_cost <= 0) throw new Error("Valor da OS deve ser maior que zero");

    const customer = os.service_order_customers as any;
    if (!customer) throw new Error("Cliente não vinculado à OS");
    if (!customer.document) throw new Error("Cliente sem CPF/CNPJ cadastrado");

    // 4. Se já tem boleto gerado, retorna o existente
    if (os.asaas_payment_id) {
      const existingRes = await fetch(
        `${ASAAS_API_URL}/payments/${os.asaas_payment_id}`,
        { headers: { access_token: ASAAS_API_KEY } }
      );
      const existing = await existingRes.json();
      return new Response(JSON.stringify({
        data: {
          payment_id:  existing.id,
          boleto_url:  existing.bankSlipUrl,
          status:      existing.status,
          due_date:    existing.dueDate,
          value:       existing.value,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 5. Cria/busca cliente no ASAAS
    let asaasCustomerId = customer.asaas_customer_id;
    if (!asaasCustomerId) {
      asaasCustomerId = await getOrCreateAsaasCustomer(customer);
      // Salva o ID do cliente ASAAS para próximas cobranças
      await supabaseAdmin
        .from("service_order_customers")
        .update({ asaas_customer_id: asaasCustomerId })
        .eq("id", customer.id);
    }

    // 6. Calcula data de vencimento
    const dueDays = os.payment_due_days || 15;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);
    const dueDateStr = dueDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // 7. Gera cobrança no ASAAS
    const payment = await createPayment({
      customerId:        asaasCustomerId,
      value:             os.labor_cost,
      dueDate:           dueDateStr,
      description:       `OS-${os.os_number}`,
      externalReference: os.id,
    });

    // 8. Atualiza OS com dados do boleto
    await supabaseAdmin
      .from("service_orders")
      .update({
        asaas_payment_id: payment.id,
        asaas_boleto_url: payment.bankSlipUrl,
        payment_status:   payment.status,
        payment_value:    payment.value,
        payment_due_date: payment.dueDate,
        boleto_info:      `ASAAS:${payment.id}`,
      })
      .eq("id", service_order_id);

    return new Response(JSON.stringify({
      data: {
        payment_id: payment.id,
        boleto_url: payment.bankSlipUrl,
        status:     payment.status,
        due_date:   payment.dueDate,
        value:      payment.value,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
