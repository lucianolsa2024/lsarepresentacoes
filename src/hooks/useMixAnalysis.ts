import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MixCell {
  productName: string;
  clientName: string;
  value: number;
  quantity: number;
}

export interface MixProduct {
  name: string;
  line: string;
  totalValue: number;
  clientCount: number;
}

export interface MixClient {
  name: string;
  segment: string;
  totalValue: number;
  productCount: number;
}

export interface MixOpportunity {
  product: string;
  client: string;
  segment: string;
  reason: string;
  score: number;
}

export function useMixAnalysis() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [representantes, setRepresentantes] = useState<{ nome: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [ordersRes, repsRes] = await Promise.all([
        supabase.from('orders').select('client_name, product, supplier, price, quantity, issue_date, representative'),
        supabase.from('representantes').select('nome').eq('ativo', true),
      ]);
      setOrders(ordersRes.data || []);
      setRepresentantes(repsRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  return { orders, representantes, loading };
}

export function computeMixData(
  orders: any[],
  filters: { segmento: string; linha: string; periodo: number; representante: string }
) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - filters.periodo);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  let filtered = orders.filter((o: any) => o.issue_date >= cutoffStr);
  if (filters.representante) {
    filtered = filtered.filter((o: any) => (o.representative || '').toUpperCase().includes(filters.representante.toUpperCase()));
  }

  // Build product lines from supplier as proxy (since produtos table may be empty)
  const productSet = new Map<string, string>(); // product -> line(supplier)
  filtered.forEach((o: any) => {
    const prod = (o.product || 'SEM PRODUTO').toUpperCase().trim();
    if (!productSet.has(prod)) {
      productSet.set(prod, (o.supplier || 'OUTROS').toUpperCase().trim());
    }
  });

  if (filters.linha) {
    const linhaUp = filters.linha.toUpperCase();
    filtered = filtered.filter((o: any) => (o.supplier || '').toUpperCase().includes(linhaUp));
  }

  // Build cells: product × client
  const cellMap = new Map<string, MixCell>();
  const clientTotals = new Map<string, number>();

  filtered.forEach((o: any) => {
    const prod = (o.product || 'SEM PRODUTO').toUpperCase().trim();
    const cli = (o.client_name || '').toUpperCase().trim();
    if (!cli || !prod) return;

    const key = `${prod}||${cli}`;
    const existing = cellMap.get(key);
    const val = Number(o.price) || 0;
    const qty = Number(o.quantity) || 1;
    if (existing) {
      existing.value += val;
      existing.quantity += qty;
    } else {
      cellMap.set(key, { productName: prod, clientName: cli, value: val, quantity: qty });
    }
    clientTotals.set(cli, (clientTotals.get(cli) || 0) + val);
  });

  // Products aggregated
  const productMap = new Map<string, MixProduct>();
  cellMap.forEach((cell) => {
    const existing = productMap.get(cell.productName);
    if (existing) {
      existing.totalValue += cell.value;
      existing.clientCount++;
    } else {
      productMap.set(cell.productName, {
        name: cell.productName,
        line: productSet.get(cell.productName) || 'OUTROS',
        totalValue: cell.value,
        clientCount: 1,
      });
    }
  });

  // Clients aggregated
  const clientMap = new Map<string, MixClient>();
  const clientProducts = new Map<string, Set<string>>();
  cellMap.forEach((cell) => {
    if (!clientProducts.has(cell.clientName)) clientProducts.set(cell.clientName, new Set());
    clientProducts.get(cell.clientName)!.add(cell.productName);
  });
  clientProducts.forEach((prods, cli) => {
    clientMap.set(cli, {
      name: cli,
      segment: 'C', // default
      totalValue: clientTotals.get(cli) || 0,
      productCount: prods.size,
    });
  });

  // Sort clients by value desc
  const clientsList = Array.from(clientMap.values()).sort((a, b) => b.totalValue - a.totalValue);
  // Assign ABC based on cumulative value (top 20% = A, next 30% = B, rest = C)
  const totalVal = clientsList.reduce((s, c) => s + c.totalValue, 0);
  let cumul = 0;
  clientsList.forEach((c) => {
    cumul += c.totalValue;
    if (cumul <= totalVal * 0.2) c.segment = 'A';
    else if (cumul <= totalVal * 0.5) c.segment = 'B';
    else c.segment = 'C';
  });

  // Apply segment filter
  let filteredClients = clientsList;
  if (filters.segmento && filters.segmento !== 'Todos') {
    filteredClients = clientsList.filter((c) => c.segment === filters.segmento);
  }

  const products = Array.from(productMap.values()).sort((a, b) => {
    if (a.line !== b.line) return a.line.localeCompare(b.line);
    return b.totalValue - a.totalValue;
  });

  // Top opportunities: A/B clients that didn't buy popular products
  const popularProducts = products.filter((p) => p.clientCount >= 2).slice(0, 20);
  const abClients = clientsList.filter((c) => c.segment === 'A' || c.segment === 'B');
  const opportunities: MixOpportunity[] = [];
  popularProducts.forEach((prod) => {
    abClients.forEach((cli) => {
      const key = `${prod.name}||${cli.name}`;
      if (!cellMap.has(key)) {
        opportunities.push({
          product: prod.name,
          client: cli.name,
          segment: cli.segment,
          reason: `${prod.clientCount} clientes já compram`,
          score: prod.totalValue * (cli.segment === 'A' ? 2 : 1),
        });
      }
    });
  });
  opportunities.sort((a, b) => b.score - a.score);

  // Coverage metrics
  const totalProducts = products.length;
  const productsWithSales = products.filter((p) => p.clientCount > 0).length;
  const coveragePct = totalProducts > 0 ? Math.round((productsWithSales / totalProducts) * 100) : 0;

  const clientsWith3Lines = filteredClients.filter((c) => {
    const prods = clientProducts.get(c.name);
    if (!prods) return false;
    const lines = new Set<string>();
    prods.forEach((p) => lines.add(productSet.get(p) || ''));
    return lines.size >= 3;
  }).length;
  const clients3LinesPct = filteredClients.length > 0 ? Math.round((clientsWith3Lines / filteredClients.length) * 100) : 0;

  const mostSold = products.length > 0 ? products[0].name : '-';
  const leastPenetrated = products.length > 0 ? products[products.length - 1].name : '-';

  // Max value for color scale
  const maxCellValue = Math.max(...Array.from(cellMap.values()).map((c) => c.value), 1);

  return {
    cells: cellMap,
    products,
    clients: filteredClients,
    allClients: clientsList,
    opportunities: opportunities.slice(0, 10),
    coverage: { coveragePct, clients3LinesPct, mostSold, leastPenetrated },
    maxCellValue,
    lines: Array.from(new Set(products.map((p) => p.line))).sort(),
  };
}
