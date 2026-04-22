// Edge function: extrai dados de documentos financeiros (NF, boleto, recibo) via Lovable AI Gateway
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_EMAIL = 'lucianoabreu@lsarepresentacoes.com.br';

const SYSTEM_PROMPT = `Você é um assistente especializado em extração de dados de documentos financeiros brasileiros (notas fiscais, boletos bancários, recibos, faturas, DANFE, NFe).

Analise o documento enviado e extraia os campos. Sempre responda chamando a função extract_finance_data.

Regras:
- Valores em reais (BRL), use ponto como separador decimal (ex: 1234.56)
- Datas no formato ISO YYYY-MM-DD
- entry_type: "a_pagar" se for despesa/conta a pagar (NF de fornecedor, boleto, fatura) ou "a_receber" se for recebível (NF emitida pela LSA)
- suggested_category: sugira UMA categoria entre: Aluguel, Fornecedores, Marketing, Vendas, Salários, Impostos, Energia, Água, Internet/Telefone, Manutenção, Combustível, Frete, Comissões, Material de Escritório, Serviços de Terceiros, Outros
- confidence: "alta" (todos os campos legíveis), "media" (alguns campos incertos), "baixa" (documento ruim/parcial)
- Se algum campo não estiver visível, retorne null
- IMPORTANTE — PARCELAS: Se o documento mencionar múltiplos vencimentos/parcelas/duplicatas, preencha o array "installments" com TODAS as parcelas, cada uma com number (1,2,3...), due_date (YYYY-MM-DD) e amount. A soma das parcelas deve bater com o "amount" total. Se houver apenas 1 vencimento, retorne installments como [] ou null.`;

const TOOL = {
  type: 'function',
  function: {
    name: 'extract_finance_data',
    description: 'Retorna os dados extraídos do documento financeiro',
    parameters: {
      type: 'object',
      properties: {
        document_type: {
          type: 'string',
          enum: ['nota_fiscal', 'boleto', 'recibo', 'fatura', 'extrato', 'outro'],
        },
        counterparty: { type: ['string', 'null'], description: 'Fornecedor (a pagar) ou cliente (a receber)' },
        document_number: { type: ['string', 'null'], description: 'Número da NF, boleto ou documento' },
        amount: { type: ['number', 'null'], description: 'Valor total do documento em reais' },
        issue_date: { type: ['string', 'null'], description: 'Data de emissão (YYYY-MM-DD)' },
        due_date: { type: ['string', 'null'], description: 'Vencimento da 1ª parcela (ou única)' },
        description: { type: ['string', 'null'], description: 'Descrição resumida do documento' },
        entry_type: { type: 'string', enum: ['a_pagar', 'a_receber'] },
        suggested_category: { type: ['string', 'null'] },
        boleto_line: { type: ['string', 'null'], description: 'Linha digitável do boleto se houver' },
        confidence: { type: 'string', enum: ['alta', 'media', 'baixa'] },
        notes: { type: ['string', 'null'], description: 'Observações relevantes' },
        installments: {
          type: ['array', 'null'],
          description: 'Lista de parcelas/duplicatas com vencimento e valor.',
          items: {
            type: 'object',
            properties: {
              number: { type: 'number' },
              due_date: { type: 'string', description: 'YYYY-MM-DD' },
              amount: { type: 'number' },
            },
            required: ['number', 'due_date', 'amount'],
          },
        },
      },
      required: ['document_type', 'entry_type', 'confidence'],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userEmail = String(userData.user.email ?? '').toLowerCase();
    if (userEmail !== ALLOWED_EMAIL) {
      return new Response(JSON.stringify({ error: 'Acesso restrito ao admin LSA' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { document_id, storage_path, mime_type } = body ?? {};
    if (!document_id || !storage_path || !mime_type) {
      return new Response(JSON.stringify({ error: 'Parâmetros obrigatórios: document_id, storage_path, mime_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Marca como processando
    await adminClient
      .from('finance_documents')
      .update({ status: 'processing', error_message: null })
      .eq('id', document_id);

    // Baixa o arquivo do storage
    const { data: fileBlob, error: dlErr } = await adminClient.storage
      .from('finance-documents')
      .download(storage_path);

    if (dlErr || !fileBlob) {
      throw new Error(`Falha ao baixar arquivo: ${dlErr?.message ?? 'desconhecido'}`);
    }

    const buf = new Uint8Array(await fileBlob.arrayBuffer());
    const isXml =
      mime_type === 'text/xml' ||
      mime_type === 'application/xml' ||
      storage_path.toLowerCase().endsWith('.xml');

    let userContent: Array<Record<string, unknown>>;

    if (isXml) {
      // Envia XML como texto puro — geralmente NFe/duplicatas vêm bem estruturadas
      const xmlText = new TextDecoder('utf-8').decode(buf).slice(0, 200000); // até ~200KB
      userContent = [
        {
          type: 'text',
          text:
            'Extraia os dados financeiros deste XML de Nota Fiscal Eletrônica (NFe). ' +
            'Atenção especial às duplicatas/parcelas em <dup><nDup><dVenc><vDup>. ' +
            'Cada <dup> é uma parcela: number=nDup, due_date=dVenc, amount=vDup. ' +
            'O total deve bater com <ICMSTot><vNF> ou <vLiq>.\n\n' +
            xmlText,
        },
      ];
    } else {
      let base64 = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < buf.length; i += CHUNK) {
        base64 += String.fromCharCode(...buf.subarray(i, i + CHUNK));
      }
      base64 = btoa(base64);
      const dataUrl = `data:${mime_type};base64,${base64}`;
      userContent = [
        { type: 'text', text: 'Extraia os dados deste documento financeiro.' },
        { type: 'image_url', image_url: { url: dataUrl } },
      ];
    }

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        tools: [TOOL],
        tool_choice: { type: 'function', function: { name: 'extract_finance_data' } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      if (aiResp.status === 429) throw new Error('Limite de requisições atingido. Tente novamente em instantes.');
      if (aiResp.status === 402) throw new Error('Créditos de IA esgotados. Adicione fundos no workspace.');
      throw new Error(`Falha na IA (${aiResp.status}): ${errText.slice(0, 300)}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('Resposta da IA sem tool call esperado');
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    await adminClient
      .from('finance_documents')
      .update({
        status: 'extracted',
        extracted_data: extracted,
        ocr_confidence: extracted.confidence ?? null,
        error_message: null,
      })
      .eq('id', document_id);

    return new Response(JSON.stringify({ success: true, extracted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error('extract-finance-document error:', msg);

    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
      const body = await req.clone().json().catch(() => ({}));
      if (body?.document_id) {
        await adminClient
          .from('finance_documents')
          .update({ status: 'error', error_message: msg })
          .eq('id', body.document_id);
      }
    } catch (_) {
      // ignora
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
