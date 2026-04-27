import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Params {
  start_date?: string;
  end_date?: string;
  marca?: string;
  cliente?: string;
  limit?: number;
  days?: number;
  ano?: number;
  activity_id?: string;
}

const PAGE = 1000;

async function fetchAll(supabase: any, build: (from: number, to: number) => any) {
  const rows: any[] = [];
  let from = 0;
  // safety cap: 50k rows
  for (let i = 0; i < 50; i++) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json({ error: "Missing Supabase env vars" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => null);
    if (!body || typeof body.query_type !== "string") {
      return json({ error: "Body inválido. Esperado { query_type, params }" }, 400);
    }

    const { query_type } = body as { query_type: string };
    const params: Params = body.params || {};

    switch (query_type) {
      case "monthly_comparison": {
        const rows = await fetchAll(supabase, (from, to) => {
          let q = supabase
            .from("sellout_lsa")
            .select("dt_emissao, marca, valor, quantidade")
            .not("dt_emissao", "is", null)
            .order("dt_emissao", { ascending: true })
            .range(from, to);
          if (params.start_date) q = q.gte("dt_emissao", params.start_date);
          if (params.end_date) q = q.lte("dt_emissao", params.end_date);
          if (params.marca) q = q.eq("marca", params.marca);
          return q;
        });

        const map = new Map<string, { mes: string; marca: string; valor: number; quantidade: number; pedidos: number }>();
        for (const r of rows) {
          const mes = String(r.dt_emissao).slice(0, 7); // YYYY-MM
          const marca = r.marca || "SEM MARCA";
          const key = `${mes}|${marca}`;
          const cur = map.get(key) || { mes, marca, valor: 0, quantidade: 0, pedidos: 0 };
          cur.valor += Number(r.valor || 0);
          cur.quantidade += Number(r.quantidade || 0);
          cur.pedidos += 1;
          map.set(key, cur);
        }
        const result = Array.from(map.values()).sort((a, b) =>
          a.mes === b.mes ? a.marca.localeCompare(b.marca) : a.mes.localeCompare(b.mes),
        );
        return json({ query_type, count: result.length, data: result });
      }

      case "top_clients": {
        const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 200);
        const rows = await fetchAll(supabase, (from, to) => {
          let q = supabase
            .from("sellout_lsa")
            .select("cliente, marca, valor, quantidade, dt_emissao")
            .not("cliente", "is", null)
            .range(from, to);
          if (params.start_date) q = q.gte("dt_emissao", params.start_date);
          if (params.end_date) q = q.lte("dt_emissao", params.end_date);
          if (params.marca) q = q.eq("marca", params.marca);
          return q;
        });

        const map = new Map<string, { cliente: string; valor: number; quantidade: number; pedidos: number; marcas: Set<string> }>();
        for (const r of rows) {
          const cliente = r.cliente || "SEM CLIENTE";
          const cur = map.get(cliente) || { cliente, valor: 0, quantidade: 0, pedidos: 0, marcas: new Set<string>() };
          cur.valor += Number(r.valor || 0);
          cur.quantidade += Number(r.quantidade || 0);
          cur.pedidos += 1;
          if (r.marca) cur.marcas.add(r.marca);
          map.set(cliente, cur);
        }
        const result = Array.from(map.values())
          .map((c) => ({ ...c, marcas: Array.from(c.marcas) }))
          .sort((a, b) => b.valor - a.valor)
          .slice(0, limit);
        return json({ query_type, count: result.length, data: result });
      }

      case "products_no_sale": {
        const days = Math.max(Number(params.days) || 90, 1);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);

        const allRows = await fetchAll(supabase, (from, to) =>
          supabase
            .from("sellout_lsa")
            .select("produto_completo, marca, categoria, dt_emissao")
            .not("produto_completo", "is", null)
            .range(from, to),
        );

        const lastSale = new Map<string, { produto: string; marca: string | null; categoria: string | null; ultima_venda: string | null }>();
        for (const r of allRows) {
          const key = r.produto_completo;
          const cur = lastSale.get(key);
          const dt = r.dt_emissao || null;
          if (!cur) {
            lastSale.set(key, { produto: key, marca: r.marca || null, categoria: r.categoria || null, ultima_venda: dt });
          } else if (dt && (!cur.ultima_venda || dt > cur.ultima_venda)) {
            cur.ultima_venda = dt;
          }
        }

        const result = Array.from(lastSale.values())
          .filter((p) => !p.ultima_venda || p.ultima_venda < cutoffStr)
          .sort((a, b) => (a.ultima_venda || "").localeCompare(b.ultima_venda || ""));

        return json({ query_type, cutoff_date: cutoffStr, count: result.length, data: result });
      }

      case "client_mix": {
        if (!params.cliente) return json({ error: "params.cliente é obrigatório" }, 400);
        const rows = await fetchAll(supabase, (from, to) => {
          let q = supabase
            .from("sellout_lsa")
            .select("categoria, marca, valor, quantidade, dt_emissao")
            .ilike("cliente", `%${params.cliente}%`)
            .range(from, to);
          if (params.start_date) q = q.gte("dt_emissao", params.start_date);
          if (params.end_date) q = q.lte("dt_emissao", params.end_date);
          return q;
        });

        const map = new Map<string, { categoria: string; marca: string; valor: number; quantidade: number; pedidos: number; ultima_compra: string | null }>();
        for (const r of rows) {
          const categoria = r.categoria || "SEM CATEGORIA";
          const marca = r.marca || "SEM MARCA";
          const key = `${categoria}|${marca}`;
          const cur = map.get(key) || { categoria, marca, valor: 0, quantidade: 0, pedidos: 0, ultima_compra: null };
          cur.valor += Number(r.valor || 0);
          cur.quantidade += Number(r.quantidade || 0);
          cur.pedidos += 1;
          if (r.dt_emissao && (!cur.ultima_compra || r.dt_emissao > cur.ultima_compra)) {
            cur.ultima_compra = r.dt_emissao;
          }
          map.set(key, cur);
        }
        const result = Array.from(map.values()).sort((a, b) => b.valor - a.valor);
        return json({ query_type, cliente: params.cliente, count: result.length, data: result });
      }

      case "lookalike": {
        if (!params.cliente) return json({ error: "params.cliente é obrigatório" }, 400);

        // 1) Perfil do cliente alvo
        const targetRows = await fetchAll(supabase, (from, to) =>
          supabase
            .from("sellout_lsa")
            .select("categoria, marca, valor")
            .ilike("cliente", `%${params.cliente}%`)
            .range(from, to),
        );
        if (targetRows.length === 0) {
          return json({ query_type, cliente: params.cliente, count: 0, data: [], message: "Cliente sem histórico" });
        }
        const targetCategorias = new Set<string>();
        const targetMarcas = new Set<string>();
        let targetValor = 0;
        for (const r of targetRows) {
          if (r.categoria) targetCategorias.add(r.categoria);
          if (r.marca) targetMarcas.add(r.marca);
          targetValor += Number(r.valor || 0);
        }
        const ticketAlvo = targetValor; // total histórico
        const minValor = ticketAlvo * 0.5;
        const maxValor = ticketAlvo * 2;

        // 2) Todos os clientes
        const allRows = await fetchAll(supabase, (from, to) =>
          supabase
            .from("sellout_lsa")
            .select("cliente, categoria, marca, valor")
            .not("cliente", "is", null)
            .range(from, to),
        );

        const clientes = new Map<string, { cliente: string; valor: number; categorias: Set<string>; marcas: Set<string> }>();
        for (const r of allRows) {
          const cliente = r.cliente;
          const cur = clientes.get(cliente) || { cliente, valor: 0, categorias: new Set<string>(), marcas: new Set<string>() };
          cur.valor += Number(r.valor || 0);
          if (r.categoria) cur.categorias.add(r.categoria);
          if (r.marca) cur.marcas.add(r.marca);
          clientes.set(cliente, cur);
        }

        const targetKey = (params.cliente || "").toLowerCase();
        const result = Array.from(clientes.values())
          .filter((c) => !c.cliente.toLowerCase().includes(targetKey))
          .filter((c) => c.valor >= minValor && c.valor <= maxValor)
          .map((c) => {
            const catOverlap = Array.from(c.categorias).filter((x) => targetCategorias.has(x)).length;
            const marcaOverlap = Array.from(c.marcas).filter((x) => targetMarcas.has(x)).length;
            const score =
              (catOverlap / Math.max(targetCategorias.size, 1)) * 0.6 +
              (marcaOverlap / Math.max(targetMarcas.size, 1)) * 0.4;
            return {
              cliente: c.cliente,
              valor_total: c.valor,
              categorias: Array.from(c.categorias),
              marcas: Array.from(c.marcas),
              categorias_em_comum: catOverlap,
              marcas_em_comum: marcaOverlap,
              similaridade: Number(score.toFixed(3)),
            };
          })
          .filter((c) => c.similaridade > 0)
          .sort((a, b) => b.similaridade - a.similaridade)
          .slice(0, Math.min(Number(params.limit) || 20, 100));

        return json({
          query_type,
          cliente: params.cliente,
          perfil_alvo: {
            valor_total: ticketAlvo,
            faixa_busca: { min: minValor, max: maxValor },
            categorias: Array.from(targetCategorias),
            marcas: Array.from(targetMarcas),
          },
          count: result.length,
          data: result,
        });
      }

      case "brand_comparison": {
        const marcas = ["CENTURY", "PONTO VIRGULA", "TAPETES SC"];
        const rows = await fetchAll(supabase, (from, to) => {
          let q = supabase
            .from("sellout_lsa")
            .select("marca, valor, quantidade, cliente, categoria, dt_emissao")
            .in("marca", marcas)
            .range(from, to);
          if (params.start_date) q = q.gte("dt_emissao", params.start_date);
          if (params.end_date) q = q.lte("dt_emissao", params.end_date);
          return q;
        });

        const agg = new Map<string, { marca: string; valor: number; quantidade: number; pedidos: number; clientes: Set<string>; categorias: Set<string> }>();
        for (const m of marcas) {
          agg.set(m, { marca: m, valor: 0, quantidade: 0, pedidos: 0, clientes: new Set(), categorias: new Set() });
        }
        for (const r of rows) {
          const cur = agg.get(r.marca);
          if (!cur) continue;
          cur.valor += Number(r.valor || 0);
          cur.quantidade += Number(r.quantidade || 0);
          cur.pedidos += 1;
          if (r.cliente) cur.clientes.add(r.cliente);
          if (r.categoria) cur.categorias.add(r.categoria);
        }
        const totalValor = Array.from(agg.values()).reduce((s, x) => s + x.valor, 0);
        const result = Array.from(agg.values()).map((c) => ({
          marca: c.marca,
          valor: c.valor,
          quantidade: c.quantidade,
          pedidos: c.pedidos,
          clientes_unicos: c.clientes.size,
          categorias_unicas: c.categorias.size,
          ticket_medio: c.pedidos ? Number((c.valor / c.pedidos).toFixed(2)) : 0,
          share_pct: totalValor ? Number(((c.valor / totalValor) * 100).toFixed(2)) : 0,
        }));
        return json({ query_type, periodo: { start: params.start_date, end: params.end_date }, total_valor: totalValor, data: result });
      }

      case "client_history": {
        if (!params.cliente) return json({ error: "params.cliente é obrigatório" }, 400);
        const ano = params.ano ? Number(params.ano) : null;
        const start = ano ? `${ano}-01-01` : null;
        const end = ano ? `${ano}-12-31` : null;

        const rows = await fetchAll(supabase, (from, to) => {
          let q = supabase
            .from("sellout_lsa")
            .select("produto_completo, marca, categoria, valor, quantidade, dt_emissao")
            .ilike("cliente", `%${params.cliente}%`)
            .not("produto_completo", "is", null)
            .range(from, to);
          if (start) q = q.gte("dt_emissao", start);
          if (end) q = q.lte("dt_emissao", end);
          return q;
        });

        const map = new Map<string, { produto_completo: string; marca: string; categoria: string | null; valor: number; quantidade: number; pedidos: number; ultima_compra: string | null }>();
        for (const r of rows) {
          const produto = r.produto_completo;
          const marca = r.marca || "SEM MARCA";
          const key = `${produto}|${marca}`;
          const cur = map.get(key) || {
            produto_completo: produto,
            marca,
            categoria: r.categoria || null,
            valor: 0,
            quantidade: 0,
            pedidos: 0,
            ultima_compra: null,
          };
          cur.valor += Number(r.valor || 0);
          cur.quantidade += Number(r.quantidade || 0);
          cur.pedidos += 1;
          if (r.dt_emissao && (!cur.ultima_compra || r.dt_emissao > cur.ultima_compra)) {
            cur.ultima_compra = r.dt_emissao;
          }
          map.set(key, cur);
        }
        const result = Array.from(map.values()).sort((a, b) => b.valor - a.valor);
        const totalValor = result.reduce((s, x) => s + x.valor, 0);
        const totalQtd = result.reduce((s, x) => s + x.quantidade, 0);
        return json({
          query_type,
          cliente: params.cliente,
          ano,
          totals: { valor: totalValor, quantidade: totalQtd, produtos_distintos: result.length },
          count: result.length,
          data: result,
        });
      }

      case "client_top_product": {
        if (!params.cliente) return json({ error: "params.cliente é obrigatório" }, 400);
        if (!params.ano) return json({ error: "params.ano é obrigatório" }, 400);
        const ano = Number(params.ano);
        const start = `${ano}-01-01`;
        const end = `${ano}-12-31`;

        const rows = await fetchAll(supabase, (from, to) =>
          supabase
            .from("sellout_lsa")
            .select("produto_completo, marca, categoria, faixa_preco, tecido, valor, quantidade, dt_emissao")
            .ilike("cliente", `%${params.cliente}%`)
            .not("produto_completo", "is", null)
            .gte("dt_emissao", start)
            .lte("dt_emissao", end)
            .range(from, to),
        );

        if (rows.length === 0) {
          return json({ query_type, cliente: params.cliente, ano, data: null, message: "Sem vendas no período" });
        }

        const map = new Map<string, { produto_completo: string; marca: string; categoria: string | null; faixa_preco: string | null; tecido: string | null; valor: number; quantidade: number }>();
        for (const r of rows) {
          const key = r.produto_completo;
          const cur = map.get(key) || {
            produto_completo: r.produto_completo,
            marca: r.marca || "SEM MARCA",
            categoria: r.categoria || null,
            faixa_preco: r.faixa_preco || null,
            tecido: r.tecido || null,
            valor: 0,
            quantidade: 0,
          };
          cur.valor += Number(r.valor || 0);
          cur.quantidade += Number(r.quantidade || 0);
          // mantém última faixa/tecido vistos se não houver
          if (!cur.faixa_preco && r.faixa_preco) cur.faixa_preco = r.faixa_preco;
          if (!cur.tecido && r.tecido) cur.tecido = r.tecido;
          map.set(key, cur);
        }
        const sorted = Array.from(map.values()).sort((a, b) => b.valor - a.valor);
        const top = sorted[0];
        return json({ query_type, cliente: params.cliente, ano, data: top });
      }

      case "inactive_curve_a": {
        const days = params.days || 60;
        const limit = params.limit || 5;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split("T")[0];

        const { data, error } = await supabase
          .from("clients")
          .select("id, company, trade_name, curve, last_purchase_date, owner_email, phone")
          .eq("curve", "A")
          .lt("last_purchase_date", cutoffStr)
          .order("last_purchase_date", { ascending: true })
          .limit(limit);

        if (error) throw error;

        return json({
          query_type,
          cutoff_date: cutoffStr,
          days,
          inactive_clients: data || [],
        });
      }

      case "client_showroom": {
        if (!params.cliente) {
          return json({ error: "params.cliente é obrigatório" }, 400);
        }
        const cliente = String(params.cliente).trim();

        // Buscar todos itens de showroom do cliente
        const showroomRows = await fetchAll(supabase, (from, to) =>
          supabase
            .from("showroom_tracking")
            .select("nf_numero, dt_faturamento, cliente, produto, cidade, representante, quantidade, valor, status_exposicao, status_treinamento, data_confirmacao, observacao, segmento_cliente")
            .ilike("cliente", `%${cliente}%`)
            .order("dt_faturamento", { ascending: false })
            .range(from, to)
        );

        if (showroomRows.length === 0) {
          return json({
            query_type,
            cliente,
            count: 0,
            data: { expostos: [], pendentes: [], nao_expostos: [], substituidos: [] },
            message: "Nenhum produto de showroom encontrado para este cliente",
          });
        }

        const expostos = showroomRows.filter(r => r.status_exposicao === "exposto");
        const pendentes = showroomRows.filter(r => r.status_exposicao === "pendente" || r.status_exposicao === null);
        const nao_expostos = showroomRows.filter(r => r.status_exposicao === "nao_exposto");
        const substituidos = showroomRows.filter(r => r.status_exposicao === "substituido");

        return json({
          query_type,
          cliente,
          count: showroomRows.length,
          totals: {
            total: showroomRows.length,
            expostos: expostos.length,
            pendentes: pendentes.length,
            nao_expostos: nao_expostos.length,
            substituidos: substituidos.length,
          },
          data: {
            expostos: expostos.map(r => ({ produto: r.produto, dt_faturamento: r.dt_faturamento, valor: r.valor, quantidade: r.quantidade, treinamento: r.status_treinamento })),
            pendentes: pendentes.map(r => ({ produto: r.produto, dt_faturamento: r.dt_faturamento, valor: r.valor, quantidade: r.quantidade, observacao: r.observacao })),
            nao_expostos: nao_expostos.map(r => ({ produto: r.produto, dt_faturamento: r.dt_faturamento, valor: r.valor, quantidade: r.quantidade, observacao: r.observacao })),
            substituidos: substituidos.map(r => ({ produto: r.produto, dt_faturamento: r.dt_faturamento, valor: r.valor, observacao: r.observacao })),
          },
        });
      }

      case "client_checklists": {
        if (!params.cliente) {
          return json({ error: "params.cliente é obrigatório" }, 400);
        }
        // Primeira tentativa: buscar por client_name
        let { data, error } = await supabase
          .from("activities")
          .select("id, client_name, client_id, due_date, description, result, completed_notes, status")
          .eq("type", "checklist_loja")
          .ilike("client_name", `%${params.cliente}%`)
          .order("due_date", { ascending: false })
          .limit(params.limit || 10);
        if (error) return json({ error: error.message }, 500);

        // Segunda tentativa: buscar dentro do JSON description
        if (!data || data.length === 0) {
          const fallback = await supabase
            .from("activities")
            .select("id, client_name, client_id, due_date, description, result, completed_notes, status")
            .eq("type", "checklist_loja")
            .ilike("description", `%${params.cliente}%`)
            .order("due_date", { ascending: false })
            .limit(params.limit || 10);
          if (fallback.error) return json({ error: fallback.error.message }, 500);
          data = fallback.data;
        }

        const checklists = (data || []).map((a: any) => {
          let parsed: any = {};
          try { parsed = JSON.parse(a.description || "{}"); } catch { /* noop */ }
          const total = (parsed.qtdProdutosNossos || 0) + (parsed.qtdProdutosConcorrentes || 0);
          const share = total > 0 ? Math.round((parsed.qtdProdutosNossos / total) * 100) : null;
          return {
            id: a.id,
            cliente: parsed.cliente || a.client_name,
            data_visita: parsed.dataVisita || a.due_date,
            status: a.status,
            produtos_expostos: parsed.produtosExpostos || [],
            qtd_nossos: parsed.qtdProdutosNossos,
            qtd_concorrentes: parsed.qtdProdutosConcorrentes,
            share_pct: share,
            score_loja: parsed.scoreLoja,
            fluxo_loja: parsed.fluxoLoja,
            humor_lojista: parsed.humorLojista,
            ticket_medio: parsed.ticketMedio,
            oportunidade: parsed.oportunidadeIdentificada,
            proximo_passo: parsed.proximoPasso,
            concorrentes: parsed.concorrentesExpostos,
            resultado: a.result,
            notas: a.completed_notes,
          };
        });

        return json({ query_type, cliente: params.cliente, total: checklists.length, checklists });
      }

      case "checklist_detail": {
        if (!params.activity_id) {
          return json({ error: "params.activity_id é obrigatório" }, 400);
        }
        const { data, error } = await supabase
          .from("activities")
          .select("id, title, due_date, completed_at, status, client_name, description, result, completed_notes, type")
          .eq("id", params.activity_id)
          .single();
        if (error) return json({ error: error.message }, 500);

        let checklist_data: any = null;
        if (data?.description) {
          try {
            checklist_data = JSON.parse(data.description);
          } catch {
            checklist_data = null;
          }
        }
        return json({ query_type, checklist: { ...data, checklist_data } });
      }

      case "checklist_comparison": {
        if (!params.cliente) {
          return json({ error: "params.cliente é obrigatório" }, 400);
        }
        // Primeira tentativa: buscar por client_name
        let { data, error } = await supabase
          .from("activities")
          .select("id, client_name, due_date, description, result, completed_notes")
          .eq("type", "checklist_loja")
          .ilike("client_name", `%${params.cliente}%`)
          .order("due_date", { ascending: false })
          .limit(10);
        if (error) return json({ error: error.message }, 500);

        // Segunda tentativa: buscar dentro do JSON description
        if (!data || data.length === 0) {
          const fallback = await supabase
            .from("activities")
            .select("id, client_name, due_date, description, result, completed_notes")
            .eq("type", "checklist_loja")
            .ilike("description", `%${params.cliente}%`)
            .order("due_date", { ascending: false })
            .limit(10);
          if (fallback.error) return json({ error: fallback.error.message }, 500);
          data = fallback.data;
        }

        const parsed = (data || []).map((a: any) => {
          let d: any = {};
          try { d = JSON.parse(a.description || "{}"); } catch { /* noop */ }
          const total = (d.qtdProdutosNossos || 0) + (d.qtdProdutosConcorrentes || 0);
          return {
            id: a.id,
            data_visita: d.dataVisita || a.due_date,
            produtos_expostos: d.produtosExpostos || [],
            qtd_nossos: d.qtdProdutosNossos,
            qtd_concorrentes: d.qtdProdutosConcorrentes,
            share_pct: total > 0 ? Math.round((d.qtdProdutosNossos / total) * 100) : null,
            score_loja: d.scoreLoja,
            fluxo_loja: d.fluxoLoja,
            humor_lojista: d.humorLojista,
            oportunidade: d.oportunidadeIdentificada,
            proximo_passo: d.proximoPasso,
            concorrentes: d.concorrentesExpostos,
            resultado: a.result,
          };
        });

        if (parsed.length < 2) {
          return json({ query_type, cliente: params.cliente, erro: "Menos de 2 checklists encontrados", total: parsed.length });
        }

        const [recente, anterior] = parsed;
        const produtosNovos = (recente.produtos_expostos as string[]).filter(
          (p: string) => !(anterior.produtos_expostos as string[]).includes(p),
        );
        const produtosRemovidos = (anterior.produtos_expostos as string[]).filter(
          (p: string) => !(recente.produtos_expostos as string[]).includes(p),
        );
        const produtosMantidos = (recente.produtos_expostos as string[]).filter(
          (p: string) => (anterior.produtos_expostos as string[]).includes(p),
        );

        return json({
          query_type,
          cliente: params.cliente,
          recente,
          anterior,
          evolucao: {
            share_anterior: anterior.share_pct,
            share_recente: recente.share_pct,
            variacao_share:
              recente.share_pct != null && anterior.share_pct != null
                ? recente.share_pct - anterior.share_pct
                : null,
            produtos_novos: produtosNovos,
            produtos_removidos: produtosRemovidos,
            produtos_mantidos: produtosMantidos,
          },
        });
      }

      default:
        return json({ error: `query_type inválido: ${query_type}` }, 400);
    }
  } catch (err) {
    console.error("crm-analytics error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
