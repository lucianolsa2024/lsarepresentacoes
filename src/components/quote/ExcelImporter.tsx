import { useState, useRef } from 'react';
import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExcelImporterProps {
  onImportComplete: () => void;
}

interface ParsedProduct {
  name: string;
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

export function ExcelImporter({ onImportComplete }: ExcelImporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'importing' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState({ products: 0, modulations: 0, sizes: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setProgress(0);
    setStatus('idle');
    setStats({ products: 0, modulations: 0, sizes: 0 });
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Arquivo inválido. Use um arquivo Excel (.xlsx ou .xls)');
      return;
    }

    setIsProcessing(true);
    setStatus('parsing');
    setProgress(10);

    try {
      const data = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      
      setProgress(20);
      
      // Get the first sheet
      const worksheet = workbook.worksheets[0];
      
      if (!worksheet) {
        throw new Error('Planilha vazia ou sem dados');
      }

      // Get the total columns count
      const columnCount = worksheet.columnCount;
      console.log('Worksheet info:', { 
        rowCount: worksheet.rowCount, 
        columnCount,
        actualRowCount: worksheet.actualRowCount 
      });

      // Convert to array of arrays (similar to xlsx format)
      const jsonData: unknown[][] = [];
      
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const rowData: unknown[] = new Array(columnCount).fill(null);
        
        // Use row.values which is 1-indexed (first element is undefined)
        const values = row.values as (unknown[] | undefined);
        if (values) {
          for (let i = 1; i < values.length; i++) {
            let value = values[i];
            // Handle different cell value types
            if (value && typeof value === 'object') {
              if ('result' in value) {
                // Formula result
                value = (value as { result: unknown }).result;
              } else if ('text' in value) {
                // Rich text
                value = (value as { text: string }).text;
              } else if ('richText' in value) {
                // Rich text array
                const richText = value as { richText: Array<{ text: string }> };
                value = richText.richText.map(rt => rt.text).join('');
              }
            }
            rowData[i - 1] = value;
          }
        }
        
        jsonData.push(rowData);
      });
      
      console.log('Parsed rows:', jsonData.length);
      console.log('First row (headers):', jsonData[0]);
      
      if (jsonData.length < 2) {
        throw new Error('Planilha vazia ou sem dados');
      }

      setProgress(30);
      
      // Parse the Excel data
      const parsedProducts = parseExcelData(jsonData);
      
      if (parsedProducts.length === 0) {
        throw new Error('Nenhum produto encontrado na planilha');
      }

      setProgress(40);
      setStatus('importing');
      
      // Import to database
      await importToDatabase(parsedProducts);
      
      setStatus('success');
      setProgress(100);
      toast.success(`Importação concluída! ${stats.products} produtos importados.`);
      
    } catch (error) {
      console.error('Import error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      toast.error('Erro ao importar planilha');
    } finally {
      setIsProcessing(false);
    }
  };

  const parseExcelData = (rows: unknown[][]): ParsedProduct[] => {
    const products: ParsedProduct[] = [];
    const headers = rows[0] as string[];
    
    if (!headers || !Array.isArray(headers)) {
      throw new Error('Cabeçalho da planilha não encontrado');
    }
    
    // Find column indexes - safely handle missing columns
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
      // CAIXA column only counts if it's a dedicated column header (exact match), not if "CAIXA" appears in description column
      caixa: findIndex(h => {
        const upper = h.toUpperCase().trim();
        return upper === 'CAIXA' || upper === 'FX CAIXA' || upper === 'FAIXA CAIXA';
      }),
      preco: findIndex(h => h.toUpperCase().includes('PREÇO') || h.toUpperCase().includes('PRECO')),
    };

    // Validate required columns
    if (colIndexes.produto === -1) {
      throw new Error('Coluna "Produto" não encontrada na planilha');
    }
    if (colIndexes.modulacao === -1) {
      throw new Error('Coluna "Modulação" não encontrada na planilha');
    }

    // Table finish column mapping: "Tampo: ..." headers → FX B, C, D, E
    const TABLE_PRICE_MAPPINGS: { pattern: RegExp; fxKey: string }[] = [
      { pattern: /tampo.*vidro\s*fosco/i, fxKey: 'FX B' },
      { pattern: /tampo.*laca.*lamina/i, fxKey: 'FX C' },
      { pattern: /tampo.*m[aá]rmore\s*especial/i, fxKey: 'FX D' },
      { pattern: /tampo.*m[aá]rmore\s*normal/i, fxKey: 'FX E' },
      { pattern: /tampo.*recoro/i, fxKey: 'FX F' },
    ];

    // Find price columns dynamically
    const priceColumns: { name: string; index: number }[] = [];
    headers.forEach((h, i) => {
      if (h == null) return;
      const headerStr = String(h).trim();
      const headerUpper = headerStr.toUpperCase();
      
      // Standard FX / SEM TEC patterns
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
      
      // Table finish columns: "Tampo: Vidro Fosco..." → mapped to FX keys
      for (const mapping of TABLE_PRICE_MAPPINGS) {
        if (mapping.pattern.test(headerStr)) {
          priceColumns.push({ name: mapping.fxKey, index: i });
          return;
        }
      }
    });

    console.log('Detected columns:', colIndexes);
    console.log('Price columns:', priceColumns);

    // Helper to extract clean product name from table-style PRODUTO column
    // "Belga Mesa de Jantar - 1.8x1.2x0.75 - Acabamentos Customizados" → "BELGA"
    const TABLE_MOD_PATTERNS = [
      /\s+mesa\s+de\s+jantar\b/i,
      /\s+mesa\s+de\s+centro\b/i,
      /\s+mesa\s+lateral\b/i,
      /\s+mesa\s+de\s+cabeceira\b/i,
      /\s+mesa\s+home\s+office\b/i,
      /\s+mesa\b/i,
      /\s+buffet\b/i,
      /\s+aparador\b/i,
    ];

    const extractProductName = (fullName: string, modulationName: string): string => {
      const upper = fullName.toUpperCase();
      // Check if the modulation name is inside the product name (table format)
      const modUpper = modulationName.toUpperCase();
      if (modUpper && upper.includes(modUpper)) {
        const idx = upper.indexOf(modUpper);
        const extracted = upper.substring(0, idx).trim().replace(/\s*-\s*$/, '').trim();
        if (extracted.length > 0) return extracted;
      }
      // Try common patterns
      for (const pattern of TABLE_MOD_PATTERNS) {
        const match = upper.match(pattern);
        if (match && match.index && match.index > 0) {
          return upper.substring(0, match.index).trim();
        }
      }
      return upper;
    };

    // Auto-detect category from modulation name
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
      return '';  // empty = default to 'Sofás' at insert time
    };

    // Group rows by product, modulation, and dimensions
    const productMap = new Map<string, { category: string; modMap: Map<string, Map<string, ParsedProduct['modulations'][0]['sizes'][0]>> }>();
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const rowData = row as (string | number | null | undefined)[];
      const rawProductName = String(rowData[colIndexes.produto] ?? '').trim().toUpperCase();
      const modulationName = String(rowData[colIndexes.modulacao] ?? '').trim().toUpperCase();
      
      if (!rawProductName || !modulationName) continue;

      // Extract clean product name (handles table-format PRODUTO columns)
      const productName = extractProductName(rawProductName, modulationName);

      // Get description from the description column
      let rawDescription = '';
      if (colIndexes.descricao !== -1 && rowData[colIndexes.descricao]) {
        rawDescription = String(rowData[colIndexes.descricao]).trim();
      }
      
      // Build dimensions from row data
      const length = colIndexes.comprimento !== -1 ? String(rowData[colIndexes.comprimento] ?? '').trim() : '';
      const depth = colIndexes.profundidade !== -1 ? String(rowData[colIndexes.profundidade] ?? '').trim() : '';
      const height = colIndexes.altura !== -1 ? String(rowData[colIndexes.altura] ?? '').trim() : '';
      const fabricQty = colIndexes.tecido !== -1 ? (parseFloat(String(rowData[colIndexes.tecido] ?? '0')) || 0) : 0;
      
      // Build dimensions string
      const dimensions = [length, depth].filter(Boolean).join(' x ');
      
      // Use raw description as dimension key (including CAIXA: FX X if present)
      const dimensionKey = rawDescription || `${rawProductName} ${dimensions}|${height}`;
      
      // Final description to store
      let description = rawDescription;
      if (!description) {
        description = rawProductName;
        if (!dimensions && !height) {
          // no dimensions at all
        }
      }

      // Get or create nested maps
      if (!productMap.has(productName)) {
        const category = detectCategory(modulationName);
        productMap.set(productName, { category, modMap: new Map() });
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

    // Convert maps to array
    productMap.forEach((productEntry, productName) => {
      const modulations: ParsedProduct['modulations'] = [];
      productEntry.modMap.forEach((sizeMap, modName) => {
        const sizes = Array.from(sizeMap.values());
        modulations.push({
          name: modName,
          sizes,
        });
      });
      products.push({
        name: productName,
        category: productEntry.category,
        modulations,
      });
    });

    return products;
  };

  const importToDatabase = async (products: ParsedProduct[]) => {
    let totalProducts = 0;
    let totalModulations = 0;
    let totalSizes = 0;

    const progressStep = 50 / products.length;

    // Common base patterns to extract
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
      // Collect all bases found across all sizes
      const foundBases = new Set<string>();
      
      // First pass: extract bases from all descriptions
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

      // Check if product already exists
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('name', product.name)
        .maybeSingle();

      let productId: string;

      if (existingProduct) {
        // Update existing product with base info
        await supabase
          .from('products')
          .update({
            has_base: hasBase,
            available_bases: availableBases,
          })
          .eq('id', existingProduct.id);
          
        // Delete existing modulations (cascade will delete sizes)
        await supabase
          .from('product_modulations')
          .delete()
          .eq('product_id', existingProduct.id);
        productId = existingProduct.id;
      } else {
        // Insert new product with base info
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            name: product.name,
            category: product.category || 'Sofás',
            code: '',
            description: '',
            has_base: hasBase,
            available_bases: availableBases,
          })
          .select('id')
          .single();

        if (productError) throw productError;
        productId = newProduct.id;
        totalProducts++;
      }

      // Insert modulations and sizes
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

        // Insert sizes in batch
        const sizesToInsert = mod.sizes.map(size => ({
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

      setProgress(prev => Math.min(prev + progressStep, 95));
      setStats({ products: totalProducts, modulations: totalModulations, sizes: totalSizes });
    }

    onImportComplete();
  };

  const handleClose = () => {
    if (!isProcessing) {
      setIsOpen(false);
      resetState();
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Importar Excel
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Planilha Excel</DialogTitle>
            <DialogDescription>
              Selecione um arquivo Excel (.xlsx) com os produtos para importar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {status === 'idle' && (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Clique para selecionar</p>
                    <p className="text-sm text-muted-foreground">
                      ou arraste o arquivo aqui
                    </p>
                  </div>
                </label>
              </div>
            )}

            {(status === 'parsing' || status === 'importing') && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>
                    {status === 'parsing' ? 'Lendo planilha...' : 'Importando dados...'}
                  </span>
                </div>
                <Progress value={progress} />
                {stats.products > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {stats.products} produtos • {stats.modulations} modulações • {stats.sizes} tamanhos
                  </p>
                )}
              </div>
            )}

            {status === 'success' && (
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                <div>
                  <p className="font-medium text-lg">Importação concluída!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {stats.products} produtos • {stats.modulations} modulações • {stats.sizes} tamanhos
                  </p>
                </div>
                <Button onClick={handleClose} className="w-full">
                  Fechar
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <div>
                  <p className="font-medium text-lg">Erro na importação</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {errorMessage}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetState} className="flex-1">
                    Tentar novamente
                  </Button>
                  <Button variant="destructive" onClick={handleClose} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {status === 'idle' && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Formato esperado da planilha:</strong></p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Coluna "PRODUTO" com o nome do produto</li>
                  <li>Coluna "MODULAÇÃO" com a modulação</li>
                  <li>Colunas de preços: SEM TEC, FX B, FX C... FX J, 3D, COURO</li>
                  <li>Colunas opcionais: COMPRIMENTO, PROFUNDIDADE, ALTURA, TECIDO</li>
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
