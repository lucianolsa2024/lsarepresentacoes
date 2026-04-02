import { useState, useRef } from 'react';
import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Database, CheckCircle2, AlertCircle, Loader2, FilePlus, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface BulkImporterProps {
  onImportComplete: () => void;
}

interface ParsedProduct {
  name: string;
  factory: string;
  category: string;
  modulations: {
    name: string;
    sizes: {
      description: string;
      dimensions: string;
      length: string;
      depth: string;
      height: string;
      fabricQuantity: number;
      prices: Record<string, number>;
    }[];
  }[];
}

type ImportMode = 'full' | 'individual' | 'csv';

interface FileOption {
  id: string;
  name: string;
  path: string;
  description: string;
  factory: string;
}

const AVAILABLE_FILES: FileOption[] = [
  { id: 'lsa1', name: 'tabela-lsa.xlsx', path: '/data/tabela-lsa.xlsx', description: 'Sohome PV parte 1', factory: 'SOHOME' },
  { id: 'lsa2', name: 'tabela-lsa-2.xlsx', path: '/data/tabela-lsa-2.xlsx', description: 'Sohome PV parte 2', factory: 'SOHOME' },
  { id: 'century', name: 'produtos-century.xlsx', path: '/data/produtos-century.xlsx', description: 'Century', factory: 'CENTURY' },
  { id: 'wood-pv', name: 'wood-pv.xlsx', path: '/data/wood-pv.xlsx', description: 'Sohome Wood PV', factory: 'SOHOME WOOD' },
  { id: 'wood-century', name: 'wood-century.xlsx', path: '/data/wood-century.xlsx', description: 'Sohome Wood Century', factory: 'SOHOME WOOD' },
  { id: 'wood-pl', name: 'wood-private-label.xlsx', path: '/data/wood-private-label.xlsx', description: 'Sohome Wood Private Label', factory: 'SOHOME WOOD' },
];

export function BulkImporter({ onImportComplete }: BulkImporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('full');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'clearing' | 'parsing' | 'importing' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState({ products: 0, modulations: 0, sizes: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  const [currentFile, setCurrentFile] = useState('');
  const [csvPreview, setCsvPreview] = useState<{ rows: number; products: string[]; factories: string[] } | null>(null);
  const csvFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setProgress(0);
    setStatus('idle');
    setStats({ products: 0, modulations: 0, sizes: 0 });
    setErrorMessage('');
    setCurrentFile('');
    setSelectedFiles([]);
    setCsvPreview(null);
    csvFileRef.current = null;
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const parseExcelData = (rows: unknown[][], defaultFactory: string = ''): ParsedProduct[] => {
    const products: ParsedProduct[] = [];
    const headers = rows[0] as string[];
    
    if (!headers || !Array.isArray(headers)) {
      throw new Error('Cabeçalho da planilha não encontrado');
    }
    
    const findIndex = (predicate: (h: string) => boolean): number => {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        if (h != null && predicate(String(h))) return i;
      }
      return -1;
    };
    
    const colIndexes = {
      codigo: findIndex(h => h.toLowerCase().includes('código') || h.toLowerCase().includes('codigo')),
      produto: findIndex(h => h.toLowerCase().includes('produto')),
      modulacao: findIndex(h => h.toLowerCase().includes('modul')),
      descricao: findIndex(h => h.toLowerCase().includes('descrição') || h.toLowerCase().includes('descricao')),
      comprimento: findIndex(h => h.toLowerCase().includes('compri')),
      profundidade: findIndex(h => h.toLowerCase().includes('prof') || h.toLowerCase().includes('largura')),
      altura: findIndex(h => h.toLowerCase().includes('altura')),
      tecido: findIndex(h => h.toLowerCase().includes('tecido')),
      fabrica: findIndex(h => {
        const lower = h.toLowerCase();
        return lower.includes('fabrica') || lower.includes('fábrica') || 
               lower.includes('marca') || lower.includes('factory') || lower.includes('brand');
      }),
    };

    if (colIndexes.produto === -1) {
      throw new Error('Coluna "Produto" não encontrada na planilha');
    }
    if (colIndexes.modulacao === -1) {
      throw new Error('Coluna "Modulação" não encontrada na planilha');
    }

    // Table finish column mapping
    const TABLE_PRICE_MAPPINGS: { pattern: RegExp; fxKey: string }[] = [
      { pattern: /tampo.*vidro\s*fosco/i, fxKey: 'FX B' },
      { pattern: /tampo.*laca.*lamina/i, fxKey: 'FX C' },
      { pattern: /tampo.*m[aá]rmore\s*especial/i, fxKey: 'FX D' },
      { pattern: /tampo.*m[aá]rmore\s*normal/i, fxKey: 'FX E' },
      { pattern: /tampo.*recoro/i, fxKey: 'FX F' },
    ];

    const priceColumns: { name: string; index: number }[] = [];
    headers.forEach((h, i) => {
      if (h == null) return;
      const headerStr = String(h).trim();
      const headerUpper = headerStr.toUpperCase();
      if (headerUpper === 'SEM TEC' || headerUpper === 'SEM TEC/OUTRO' || 
          headerUpper.match(/^FX\s*[A-Z]$/) ||
          headerUpper.match(/^FX\s+[A-Z]$/) ||
          headerUpper === '3D' || headerUpper === 'COURO' || 
          headerUpper === 'FX 3D' || headerUpper === 'FX COURO') {
        let normalizedName = headerUpper;
        normalizedName = normalizedName.replace(/FX\s+/, 'FX ');
        if (headerUpper === 'SEM TEC/OUTRO') normalizedName = 'SEM TEC';
        priceColumns.push({ name: normalizedName, index: i });
        return;
      }
      for (const mapping of TABLE_PRICE_MAPPINGS) {
        if (mapping.pattern.test(headerStr)) {
          priceColumns.push({ name: mapping.fxKey, index: i });
          return;
        }
      }
    });

    // Helper to extract clean product name from table-style PRODUTO column
    const TABLE_MOD_PATTERNS = [
      /\s+mesa\s+de\s+jantar\b/i, /\s+mesa\s+de\s+centro\b/i,
      /\s+mesa\s+lateral\b/i, /\s+mesa\s+de\s+cabeceira\b/i,
      /\s+mesa\s+home\s+office\b/i, /\s+mesa\b/i, /\s+buffet\b/i, /\s+aparador\b/i,
    ];
    const extractProductName = (fullName: string, modulationName: string): string => {
      const upper = fullName.toUpperCase();
      const modUpper = modulationName.toUpperCase();
      if (modUpper && upper.includes(modUpper)) {
        const idx = upper.indexOf(modUpper);
        const extracted = upper.substring(0, idx).trim().replace(/\s*-\s*$/, '').trim();
        if (extracted.length > 0) return extracted;
      }
      for (const pattern of TABLE_MOD_PATTERNS) {
        const match = upper.match(pattern);
        if (match && match.index && match.index > 0) return upper.substring(0, match.index).trim();
      }
      return upper;
    };
    const detectCategory = (modulationName: string): string => {
      const upper = modulationName.toUpperCase();
      if (upper.includes('MESA DE JANTAR') || upper.includes('MESA JANTAR')) return 'Mesas';
      if (upper.includes('MESA DE CENTRO')) return 'Mesas de Centro';
      if (upper.includes('MESA LATERAL')) return 'Mesas Laterais';
      if (upper.includes('MESA DE CABECEIRA')) return 'Mesas de Cabeceira';
      if (upper.includes('BUFFET') || upper.includes('APARADOR')) return 'Buffets';
      if (upper.includes('POLTRONA')) return 'Poltronas';
      if (upper.includes('CADEIRA')) return 'Cadeiras';
      if (upper.includes('BANQUETA')) return 'Banquetas';
      if (upper.includes('PUFF')) return 'Puffs';
      if (upper.includes('TAPETE')) return 'Tapetes';
      return '';
    };

    const productMap = new Map<string, { factory: string; category: string; modMap: Map<string, Map<string, ParsedProduct['modulations'][0]['sizes'][0]>> }>();
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const rowData = row as (string | number | null | undefined)[];
      const rawProductName = String(rowData[colIndexes.produto] ?? '').trim().toUpperCase();
      const modulationName = String(rowData[colIndexes.modulacao] ?? '').trim().toUpperCase();
      
      const rowFactory = colIndexes.fabrica !== -1 && rowData[colIndexes.fabrica]
        ? String(rowData[colIndexes.fabrica]).trim().toUpperCase()
        : defaultFactory;
      
      if (!rawProductName || !modulationName) continue;

      const productName = extractProductName(rawProductName, modulationName);

      let rawDescription = '';
      if (colIndexes.descricao !== -1 && rowData[colIndexes.descricao]) {
        rawDescription = String(rowData[colIndexes.descricao]).trim();
      }
      
      const length = colIndexes.comprimento !== -1 ? String(rowData[colIndexes.comprimento] ?? '').trim() : '';
      const depth = colIndexes.profundidade !== -1 ? String(rowData[colIndexes.profundidade] ?? '').trim() : '';
      const height = colIndexes.altura !== -1 ? String(rowData[colIndexes.altura] ?? '').trim() : '';
      const fabricQty = colIndexes.tecido !== -1 ? (parseFloat(String(rowData[colIndexes.tecido] ?? '0')) || 0) : 0;
      
      const dimensions = [length, depth].filter(Boolean).join(' x ');
      const dimensionKey = rawDescription || `${rawProductName} ${dimensions}|${height}`;
      
      let description = rawDescription;
      if (!description) {
        description = rawProductName;
      }

      if (!productMap.has(productName)) {
        const category = detectCategory(modulationName);
        productMap.set(productName, { factory: rowFactory, category, modMap: new Map() });
      }
      const productEntry = productMap.get(productName)!;
      const modMap = productEntry.modMap;
      
      if (!modMap.has(modulationName)) {
        modMap.set(modulationName, new Map());
      }
      const sizeMap = modMap.get(modulationName)!;

      const prices: Record<string, number> = {};
      priceColumns.forEach(({ name, index }) => {
        const rawValue = rowData[index];
        const value = parseFloat(String(rawValue ?? '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
        prices[name] = value;
      });

      sizeMap.set(dimensionKey, {
        description,
        dimensions,
        length,
        depth,
        height,
        fabricQuantity: fabricQty,
        prices,
      });
    }

    productMap.forEach((productEntry, productName) => {
      const modulations: ParsedProduct['modulations'] = [];
      productEntry.modMap.forEach((sizeMap, modName) => {
        const sizes = Array.from(sizeMap.values());
        modulations.push({ name: modName, sizes });
      });
      products.push({ name: productName, factory: productEntry.factory, category: productEntry.category, modulations });
    });

    return products;
  };

  const loadExcelFile = async (url: string): Promise<unknown[][]> => {
    const response = await fetch(url);
    const data = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error('Planilha vazia');

    const columnCount = worksheet.columnCount;
    const jsonData: unknown[][] = [];
    
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const rowData: unknown[] = new Array(columnCount).fill(null);
      const values = row.values as (unknown[] | undefined);
      if (values) {
        for (let i = 1; i < values.length; i++) {
          let value = values[i];
          if (value && typeof value === 'object') {
            if ('result' in value) {
              value = (value as { result: unknown }).result;
            } else if ('text' in value) {
              value = (value as { text: string }).text;
            } else if ('richText' in value) {
              const richText = value as { richText: Array<{ text: string }> };
              value = richText.richText.map(rt => rt.text).join('');
            }
          }
          rowData[i - 1] = value;
        }
      }
      jsonData.push(rowData);
    });
    
    return jsonData;
  };

  const importToDatabase = async (products: ParsedProduct[], startProgress: number, endProgress: number) => {
    let totalProducts = stats.products;
    let totalModulations = stats.modulations;
    let totalSizes = stats.sizes;

    const progressRange = endProgress - startProgress;
    const progressStep = progressRange / products.length;

    const basePatterns = [
      /\b(MTX)\b/i,
      /\b(FOSCA)\b/i,
      /\b(METALIZADO)\b/i,
      /\b(FOSCA\/METALIZADO)\b/i,
      /\b(METAL)\b/i,
      /\b(MADEIRA)\b/i,
      /\b(INOX)\b/i,
      /\b(CROMADO)\b/i,
      /\bBASE\s+(MTX|FOSCA|METALIZADO|METAL|MADEIRA|INOX|CROMADO)\b/i,
    ];

    for (const product of products) {
      const foundBases = new Set<string>();
      
      for (const mod of product.modulations) {
        for (const size of mod.sizes) {
          for (const pattern of basePatterns) {
            const match = size.description.match(pattern);
            if (match) {
              let baseName = match[1] || match[0];
              baseName = baseName.toUpperCase().replace('BASE ', '').trim();
              foundBases.add(baseName);
            }
          }
        }
      }

      const hasBase = foundBases.size > 0;
      const availableBases = Array.from(foundBases);

      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('name', product.name)
        .maybeSingle();

      let productId: string;

      if (existingProduct) {
        await supabase
          .from('products')
          .update({ has_base: hasBase, available_bases: availableBases, factory: product.factory, category: product.category || undefined })
          .eq('id', existingProduct.id);
          
        await supabase
          .from('product_modulations')
          .delete()
          .eq('product_id', existingProduct.id);
        productId = existingProduct.id;
      } else {
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            name: product.name,
            category: product.category || 'Sofás',
            code: '',
            description: '',
            has_base: hasBase,
            available_bases: availableBases,
            factory: product.factory,
          })
          .select('id')
          .single();

        if (productError) throw productError;
        productId = newProduct.id;
        totalProducts++;
      }

      for (const mod of product.modulations) {
        const { data: newMod, error: modError } = await supabase
          .from('product_modulations')
          .insert({
            product_id: productId,
            name: mod.name,
            description: mod.name,
          })
          .select('id')
          .single();

        if (modError) throw modError;
        totalModulations++;

        // Insert sizes in batches of 100 to avoid timeout
        const batchSize = 100;
        for (let i = 0; i < mod.sizes.length; i += batchSize) {
          const batch = mod.sizes.slice(i, i + batchSize);
          const sizesToInsert = batch.map(size => ({
            modulation_id: newMod.id,
            description: size.description,
            dimensions: size.dimensions,
            length: size.length,
            depth: size.depth,
            height: size.height,
            fabric_quantity: size.fabricQuantity,
            price_sem_tec: size.prices['SEM TEC'] || 0,
            price_fx_b: size.prices['FX B'] || 0,
            price_fx_c: size.prices['FX C'] || 0,
            price_fx_d: size.prices['FX D'] || 0,
            price_fx_e: size.prices['FX E'] || 0,
            price_fx_f: size.prices['FX F'] || 0,
            price_fx_g: size.prices['FX G'] || 0,
            price_fx_h: size.prices['FX H'] || 0,
            price_fx_i: size.prices['FX I'] || 0,
            price_fx_j: size.prices['FX J'] || 0,
            price_fx_3d: size.prices['3D'] || size.prices['FX 3D'] || 0,
            price_fx_couro: size.prices['COURO'] || size.prices['FX COURO'] || 0,
          }));

          const { error: sizesError } = await supabase
            .from('modulation_sizes')
            .insert(sizesToInsert);

          if (sizesError) throw sizesError;
          totalSizes += sizesToInsert.length;
        }
      }

      setProgress(prev => Math.min(prev + progressStep, endProgress - 1));
      setStats({ products: totalProducts, modulations: totalModulations, sizes: totalSizes });
    }
  };

  // ======================== CSV IMPORT LOGIC ========================

  const ACABAMENTO_TO_PRICE_COL: Record<string, string> = {
    'espelho/vidro': 'FX B',
    'laca/lamina': 'FX C',
    'marmore especial': 'FX D',
    'marmore normal': 'FX E',
    'recoro': 'FX F',
  };

  const parseCsvText = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error('CSV vazio ou sem dados');
    
    // Parse header
    const headerLine = lines[0];
    const headers = parseCsvLine(headerLine).map(h => h.toLowerCase().trim());
    
    const idx = {
      marca: headers.indexOf('marca'),
      categoria: headers.indexOf('categoria'),
      modelo: headers.indexOf('modelo'),
      variante: headers.indexOf('variante'),
      tamanho: headers.indexOf('tamanho_label'),
      diametro: headers.indexOf('diametro_m'),
      comprimento: headers.indexOf('comprimento_m'),
      largura: headers.indexOf('largura_m'),
      altura: headers.indexOf('altura_m'),
      acabGrupo: headers.indexOf('acabamento_grupo'),
      acabDetalhe: headers.indexOf('acabamento_detalhe'),
      preco: headers.indexOf('preco'),
      // Support fabric tiers for upholstery CSV
      faixaTecido: headers.indexOf('faixa_tecido'),
      baseFinish: headers.indexOf('acabamento_base'),
    };
    
    if (idx.modelo === -1) throw new Error('Coluna "modelo" não encontrada no CSV');
    if (idx.preco === -1) throw new Error('Coluna "preco" não encontrada no CSV');
    
    const isWoodFormat = idx.acabGrupo !== -1;
    const isUpholsteryFormat = idx.faixaTecido !== -1;
    
    // Parse rows and group by product
    type SizeAccum = {
      description: string;
      dimensions: string;
      length: string;
      depth: string;
      height: string;
      fabricQuantity: number;
      prices: Record<string, number>;
    };
    
    const productMap = new Map<string, {
      factory: string;
      category: string;
      modMap: Map<string, Map<string, SizeAccum>>;
    }>();
    
    let rowCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 3) continue;
      
      const factory = idx.marca !== -1 ? cols[idx.marca]?.trim().toUpperCase() || '' : '';
      const category = idx.categoria !== -1 ? cols[idx.categoria]?.trim() || '' : '';
      const modelo = cols[idx.modelo]?.trim().toUpperCase() || '';
      const variante = idx.variante !== -1 ? cols[idx.variante]?.trim() || '' : '';
      const tamanho = idx.tamanho !== -1 ? cols[idx.tamanho]?.trim() || '' : '';
      const comprimento = idx.comprimento !== -1 ? cols[idx.comprimento]?.trim() || '' : '';
      const largura = idx.largura !== -1 ? cols[idx.largura]?.trim() || '' : '';
      const altura = idx.altura !== -1 ? cols[idx.altura]?.trim() || '' : '';
      const preco = parseFloat(cols[idx.preco]?.replace(',', '.').replace(/[^\d.]/g, '') || '0') || 0;
      
      if (!modelo) continue;
      rowCount++;
      
      // Determine modulation name: use variante if exists, otherwise categoria
      const modName = variante || category || modelo;
      
      // Build size key (tamanho_label or dimensions)
      const sizeKey = tamanho || [comprimento, largura, altura].filter(Boolean).join('x');
      const dimensions = [comprimento, largura].filter(Boolean).join(' x ');
      const description = `${modelo} ${modName} ${sizeKey}`.trim();
      
      // Get or create product entry
      const productKey = `${factory}|${modelo}`;
      if (!productMap.has(productKey)) {
        productMap.set(productKey, { factory, category, modMap: new Map() });
      }
      const productEntry = productMap.get(productKey)!;
      
      if (!productEntry.modMap.has(modName)) {
        productEntry.modMap.set(modName, new Map());
      }
      const sizeMap = productEntry.modMap.get(modName)!;
      
      if (!sizeMap.has(sizeKey)) {
        sizeMap.set(sizeKey, {
          description,
          dimensions,
          length: comprimento,
          depth: largura,
          height: altura,
          fabricQuantity: 0,
          prices: {},
        });
      }
      
      const sizeEntry = sizeMap.get(sizeKey)!;
      
      if (isWoodFormat && idx.acabGrupo !== -1) {
        const acabGrupo = cols[idx.acabGrupo]?.trim().toLowerCase() || '';
        const priceCol = ACABAMENTO_TO_PRICE_COL[acabGrupo];
        if (priceCol) {
          sizeEntry.prices[priceCol] = preco;
        }
      } else if (isUpholsteryFormat && idx.faixaTecido !== -1) {
        const faixa = cols[idx.faixaTecido]?.trim().toUpperCase() || '';
        // Map to standard tier names
        const normalized = faixa.replace(/\s+/g, ' ');
        sizeEntry.prices[normalized] = preco;
      }
    }
    
    // Convert to ParsedProduct[]
    const products: ParsedProduct[] = [];
    productMap.forEach((entry, key) => {
      const modelo = key.split('|')[1];
      const modulations: ParsedProduct['modulations'] = [];
      
      entry.modMap.forEach((sizeMap, modName) => {
        modulations.push({
          name: modName.toUpperCase(),
          sizes: Array.from(sizeMap.values()),
        });
      });
      
      products.push({
        name: modelo,
        factory: entry.factory,
        category: mapCsvCategory(entry.category),
        modulations,
      });
    });
    
    return { products, rowCount };
  };
  
  const mapCsvCategory = (cat: string): string => {
    const lower = cat.toLowerCase();
    if (lower.includes('aparador') || lower.includes('buffet')) return 'Buffets';
    if (lower.includes('mesa de centro')) return 'Mesas de Centro';
    if (lower.includes('mesa lateral')) return 'Mesas Laterais';
    if (lower.includes('mesa de cabeceira') || lower.includes('cabeceira') || lower.includes('criado')) return 'Mesas de Cabeceira';
    if (lower.includes('mesa')) return 'Mesas';
    if (lower.includes('sofá') || lower.includes('sofa')) return 'Sofás';
    if (lower.includes('poltrona')) return 'Poltronas';
    if (lower.includes('cadeira')) return 'Cadeiras';
    if (lower.includes('puff')) return 'Puffs';
    if (lower.includes('banqueta')) return 'Banquetas';
    if (lower.includes('cama')) return 'Outros';
    if (lower.includes('tapete')) return 'Tapetes';
    if (lower.includes('espelho')) return 'Outros';
    return 'Outros';
  };
  
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleCsvFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    csvFileRef.current = file;
    
    try {
      const text = await file.text();
      const { products, rowCount } = parseCsvText(text);
      const factories = [...new Set(products.map(p => p.factory))];
      const productNames = products.map(p => p.name).slice(0, 10);
      
      setCsvPreview({
        rows: rowCount,
        products: productNames,
        factories,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao ler CSV');
      csvFileRef.current = null;
    }
  };
  
  const handleCsvImport = async () => {
    if (!csvFileRef.current) {
      toast.error('Selecione um arquivo CSV');
      return;
    }
    
    setIsProcessing(true);
    setStatus('parsing');
    setProgress(10);
    
    try {
      const text = await csvFileRef.current.text();
      setCurrentFile(`Processando ${csvFileRef.current.name}...`);
      const { products } = parseCsvText(text);
      
      setProgress(30);
      setStatus('importing');
      setCurrentFile(`Importando ${products.length} produtos...`);
      
      await importToDatabase(products, 30, 95);
      
      setStatus('success');
      setProgress(100);
      setCurrentFile('');
      toast.success(`Importação CSV concluída! ${stats.products} produtos, ${stats.sizes} configurações.`);
      onImportComplete();
    } catch (error) {
      console.error('CSV import error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      toast.error('Erro ao importar CSV');
    } finally {
      setIsProcessing(false);
    }
  };

  // ======================== END CSV IMPORT LOGIC ========================


    setIsProcessing(true);
    setStatus('clearing');
    setProgress(5);

    try {
      // Clear existing data
      setCurrentFile('Limpando base de dados...');
      await supabase.from('modulation_sizes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('product_modulations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      setProgress(10);
      setStatus('parsing');

      // Load and parse first file (LSA 1)
      setCurrentFile('Carregando tabela-lsa.xlsx...');
      const lsaData = await loadExcelFile('/data/tabela-lsa.xlsx');
      setProgress(15);
      
      const lsaProducts = parseExcelData(lsaData, 'SOHOME');
      console.log(`LSA 1: ${lsaProducts.length} produtos`);
      setProgress(20);

      // Load and parse second file (LSA 2)
      setCurrentFile('Carregando tabela-lsa-2.xlsx...');
      const lsa2Data = await loadExcelFile('/data/tabela-lsa-2.xlsx');
      setProgress(25);
      
      const lsa2Products = parseExcelData(lsa2Data, 'SOHOME');
      console.log(`LSA 2: ${lsa2Products.length} produtos`);
      setProgress(30);

      // Load and parse third file (Century)
      setCurrentFile('Carregando produtos-century.xlsx...');
      const centuryData = await loadExcelFile('/data/produtos-century.xlsx');
      setProgress(35);
      
      const centuryProducts = parseExcelData(centuryData, 'CENTURY');
      console.log(`Century: ${centuryProducts.length} produtos`);
      setProgress(40);

      setStatus('importing');
      
      // Import LSA 1 products (40-55%)
      setCurrentFile('Importando produtos LSA (parte 1)...');
      await importToDatabase(lsaProducts, 40, 55);

      // Import LSA 2 products (55-70%)
      setCurrentFile('Importando produtos LSA (parte 2)...');
      await importToDatabase(lsa2Products, 55, 70);

      // Import Century products (70-95%)
      setCurrentFile('Importando produtos Century...');
      await importToDatabase(centuryProducts, 70, 95);

      setStatus('success');
      setProgress(100);
      setCurrentFile('');
      toast.success(`Importação concluída! ${stats.products} produtos, ${stats.sizes} configurações.`);
      onImportComplete();
      
    } catch (error) {
      console.error('Import error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      toast.error('Erro ao importar planilhas');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIndividualImport = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Selecione pelo menos um arquivo para importar');
      return;
    }

    setIsProcessing(true);
    setStatus('parsing');
    setProgress(5);

    try {
      const filesToImport = AVAILABLE_FILES.filter(f => selectedFiles.includes(f.id));
      const progressPerFile = 90 / filesToImport.length;
      let currentProgress = 5;

      for (let i = 0; i < filesToImport.length; i++) {
        const file = filesToImport[i];
        
        setCurrentFile(`Carregando ${file.name}...`);
        const data = await loadExcelFile(file.path);
        currentProgress += progressPerFile * 0.3;
        setProgress(currentProgress);

        const products = parseExcelData(data, file.factory);
        console.log(`${file.name}: ${products.length} produtos`);
        currentProgress += progressPerFile * 0.1;
        setProgress(currentProgress);

        setStatus('importing');
        setCurrentFile(`Importando ${file.description}...`);
        
        const startProg = currentProgress;
        const endProg = currentProgress + progressPerFile * 0.6;
        await importToDatabase(products, startProg, endProg);
        currentProgress = endProg;
        setProgress(currentProgress);
      }

      setStatus('success');
      setProgress(100);
      setCurrentFile('');
      toast.success(`Importação concluída! ${stats.products} produtos adicionados/atualizados, ${stats.sizes} configurações.`);
      onImportComplete();

    } catch (error) {
      console.error('Import error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      toast.error('Erro ao importar planilhas');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setIsOpen(false);
      resetState();
    }
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button variant="default" onClick={() => { setImportMode('full'); setIsOpen(true); }} className="bg-primary hover:bg-primary/90">
          <Database className="h-4 w-4 mr-2" />
          Atualizar Base Completa
        </Button>
        <Button variant="outline" onClick={() => { setImportMode('individual'); setIsOpen(true); }}>
          <FilePlus className="h-4 w-4 mr-2" />
          Adicionar Arquivo Excel
        </Button>
        <Button variant="outline" onClick={() => { setImportMode('csv'); setIsOpen(true); }}>
          <Upload className="h-4 w-4 mr-2" />
          Importar CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleCsvFileSelect}
        />
      </div>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {importMode === 'full' ? 'Atualizar Base de Produtos' : importMode === 'csv' ? 'Importar CSV de Produtos' : 'Importar Arquivo Individual'}
            </DialogTitle>
            <DialogDescription>
              {importMode === 'full' 
                ? 'Esta ação irá limpar toda a base atual e importar os produtos dos 3 arquivos Excel pré-carregados.'
                : importMode === 'csv'
                ? 'Faça upload de um CSV no formato: marca, categoria, modelo, variante, tamanho_label, acabamento_grupo, preco'
                : 'Selecione os arquivos que deseja importar. Os produtos existentes serão atualizados ou novos serão adicionados.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {status === 'idle' && importMode === 'full' && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-medium">Arquivos que serão importados:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>tabela-lsa.xlsx (Produtos PV parte 1)</li>
                    <li>tabela-lsa-2.xlsx (Produtos PV parte 2)</li>
                    <li>produtos-century.xlsx (Century)</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Atenção:</strong> Todos os produtos existentes serão substituídos. Esta operação pode levar alguns minutos.
                  </p>
                </div>
                <Button onClick={handleBulkImport} className="w-full">
                  Iniciar Importação
                </Button>
              </div>
            )}

            {status === 'idle' && importMode === 'individual' && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <p className="font-medium">Selecione os arquivos para importar:</p>
                  {AVAILABLE_FILES.map(file => (
                    <div key={file.id} className="flex items-center space-x-3">
                      <Checkbox 
                        id={file.id}
                        checked={selectedFiles.includes(file.id)}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                      />
                      <label htmlFor={file.id} className="text-sm cursor-pointer flex-1">
                        <span className="font-medium">{file.name}</span>
                        <span className="text-muted-foreground ml-2">({file.description})</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Modo incremental:</strong> Os produtos existentes serão atualizados com as novas informações. Nenhum dado será excluído.
                  </p>
                </div>
                <Button 
                  onClick={handleIndividualImport} 
                  className="w-full"
                  disabled={selectedFiles.length === 0}
                >
                  Importar {selectedFiles.length > 0 ? `(${selectedFiles.length} arquivo${selectedFiles.length > 1 ? 's' : ''})` : ''}
                </Button>
              </div>
            )}

            {(status === 'clearing' || status === 'parsing' || status === 'importing') && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm">
                    {status === 'clearing' && 'Limpando base de dados...'}
                    {status === 'parsing' && 'Processando planilhas...'}
                    {status === 'importing' && 'Importando dados...'}
                  </span>
                </div>
                {currentFile && (
                  <p className="text-xs text-muted-foreground">{currentFile}</p>
                )}
                <Progress value={progress} className="h-2" />
                <div className="text-sm text-muted-foreground">
                  <p>Produtos: {stats.products}</p>
                  <p>Modulações: {stats.modulations}</p>
                  <p>Configurações: {stats.sizes}</p>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <div>
                  <p className="font-medium">Importação concluída!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {stats.products} produtos, {stats.modulations} modulações, {stats.sizes} configurações
                  </p>
                </div>
                <Button onClick={handleClose} variant="outline" className="w-full">
                  Fechar
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <div>
                  <p className="font-medium text-destructive">Erro na importação</p>
                  <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
                </div>
                <Button onClick={resetState} variant="outline" className="w-full">
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
