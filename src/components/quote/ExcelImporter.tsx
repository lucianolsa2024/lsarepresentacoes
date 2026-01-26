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
      profundidade: findIndex(h => h.toLowerCase().includes('prof')),
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

    // Find price columns dynamically
    const priceColumns: { name: string; index: number }[] = [];
    headers.forEach((h, i) => {
      if (h == null) return;
      const headerStr = String(h).toUpperCase().trim();
      // Match FX B, FX C, ..., FX J, FX 3D, FX COURO, SEM TEC
      // More flexible pattern matching
      if (headerStr === 'SEM TEC' || headerStr === 'SEM TEC/OUTRO' || 
          headerStr.match(/^FX\s*[A-Z]$/) || // FX B, FX C, etc.
          headerStr.match(/^FX\s+[A-Z]$/) || // FX B with extra space
          headerStr === '3D' || headerStr === 'COURO' || 
          headerStr === 'FX 3D' || headerStr === 'FX COURO') {
        let normalizedName = headerStr;
        // Normalize spacing
        normalizedName = normalizedName.replace(/FX\s+/, 'FX ');
        if (headerStr === 'SEM TEC/OUTRO') normalizedName = 'SEM TEC';
        priceColumns.push({ name: normalizedName, index: i });
      }
    });

    console.log('Detected columns:', colIndexes);
    console.log('Price columns:', priceColumns);

    // CAIXA format is ONLY when there's a dedicated CAIXA column AND a single PREÇO column (no multiple FX columns)
    // If we have multiple price columns (FX B, FX C, etc), use traditional format even if description contains "CAIXA"
    const hasCaixaFormat = colIndexes.caixa !== -1 && priceColumns.length === 0;

    // Group rows by product, modulation, and dimensions
    const productMap = new Map<string, Map<string, Map<string, ParsedProduct['modulations'][0]['sizes'][0]>>>();
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const rowData = row as (string | number | null | undefined)[];
      const productName = String(rowData[colIndexes.produto] ?? '').trim().toUpperCase();
      const modulationName = String(rowData[colIndexes.modulacao] ?? '').trim().toUpperCase();
      
      if (!productName || !modulationName) continue;

      // Get description - prefer explicit description column, else build from product + modulation
      let description = '';
      if (colIndexes.descricao !== -1 && rowData[colIndexes.descricao]) {
        description = String(rowData[colIndexes.descricao]).trim();
      }
      
      // Build dimensions from row data
      const length = colIndexes.comprimento !== -1 ? String(rowData[colIndexes.comprimento] ?? '').trim() : '';
      const depth = colIndexes.profundidade !== -1 ? String(rowData[colIndexes.profundidade] ?? '').trim() : '';
      const height = colIndexes.altura !== -1 ? String(rowData[colIndexes.altura] ?? '').trim() : '';
      const fabricQty = colIndexes.tecido !== -1 ? (parseFloat(String(rowData[colIndexes.tecido] ?? '0')) || 0) : 0;
      
      // Build dimensions string (used as unique key for consolidation)
      const dimensions = [length, depth].filter(Boolean).join(' x ');
      const dimensionKey = description || `${dimensions}|${height}`;
      
      // Use description if available, else build from parts
      if (!description) {
        description = `${productName} ${modulationName}`;
        if (dimensions) {
          description += ` ${dimensions}`;
        }
        if (height) {
          description += ` (H: ${height})`;
        }
      }

      // Get or create nested maps
      if (!productMap.has(productName)) {
        productMap.set(productName, new Map());
      }
      const modMap = productMap.get(productName)!;
      
      if (!modMap.has(modulationName)) {
        modMap.set(modulationName, new Map());
      }
      const sizeMap = modMap.get(modulationName)!;

      // Handle CAIXA format: consolidate rows into single size entry with multiple prices
      if (hasCaixaFormat) {
        const caixaValue = String(rowData[colIndexes.caixa] ?? '').toUpperCase().trim();
        const tierMatch = caixaValue.match(/FX\s*([A-Z0-9]+)|COURO|3D|SEM\s*TEC/i);
        let tierName = '';
        if (tierMatch) {
          if (caixaValue.includes('COURO')) {
            tierName = 'FX COURO';
          } else if (caixaValue.includes('3D')) {
            tierName = 'FX 3D';
          } else if (caixaValue.includes('SEM TEC')) {
            tierName = 'SEM TEC';
          } else {
            tierName = `FX ${tierMatch[1]}`;
          }
        }

        let priceValue = 0;
        if (colIndexes.preco !== -1) {
          priceValue = parseFloat(String(rowData[colIndexes.preco] ?? '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
        } else {
          for (const { index } of priceColumns) {
            const val = parseFloat(String(rowData[index] ?? '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
            if (val > 0) {
              priceValue = val;
              break;
            }
          }
        }

        if (!sizeMap.has(dimensionKey)) {
          sizeMap.set(dimensionKey, {
            description,
            dimensions,
            length,
            depth,
            height,
            fabricQuantity: fabricQty,
            prices: {},
          });
        }
        
        const sizeEntry = sizeMap.get(dimensionKey)!;
        if (tierName && priceValue > 0) {
          sizeEntry.prices[tierName] = priceValue;
        }
        if (fabricQty > sizeEntry.fabricQuantity) {
          sizeEntry.fabricQuantity = fabricQty;
        }

      } else {
        // Traditional format: each row has all price columns (like this new file)
        const prices: Record<string, number> = {};
        priceColumns.forEach(({ name, index }) => {
          const rawValue = rowData[index];
          const value = parseFloat(String(rawValue ?? '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
          prices[name] = value;
        });

        // Use description as unique key since each row is a unique size
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
    }

    // Convert maps to array
    productMap.forEach((modMap, productName) => {
      const modulations: ParsedProduct['modulations'] = [];
      modMap.forEach((sizeMap, modName) => {
        const sizes = Array.from(sizeMap.values());
        modulations.push({
          name: modName,
          sizes,
        });
      });
      products.push({
        name: productName,
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

    for (const product of products) {
      // Check if product already exists
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('name', product.name)
        .maybeSingle();

      let productId: string;

      if (existingProduct) {
        // Delete existing modulations (cascade will delete sizes)
        await supabase
          .from('product_modulations')
          .delete()
          .eq('product_id', existingProduct.id);
        productId = existingProduct.id;
      } else {
        // Insert new product
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            name: product.name,
            category: 'Sofás',
            code: '',
            description: '',
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
          price_fx_3d: size.prices['3D'] || 0,
          price_fx_couro: size.prices['COURO'] || 0,
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
