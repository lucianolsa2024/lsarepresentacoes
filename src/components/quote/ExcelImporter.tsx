import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

// Column mapping from Excel to database
const PRICE_COLUMN_MAP: Record<string, string> = {
  'SEM TEC': 'price_sem_tec',
  'FX B': 'price_fx_b',
  'FX C': 'price_fx_c',
  'FX D': 'price_fx_d',
  'FX E': 'price_fx_e',
  'FX F': 'price_fx_f',
  'FX G': 'price_fx_g',
  'FX H': 'price_fx_h',
  'FX I': 'price_fx_i',
  'FX J': 'price_fx_j',
  '3D': 'price_fx_3d',
  'COURO': 'price_fx_couro',
};

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
      const workbook = XLSX.read(data, { type: 'array' });
      
      setProgress(20);
      
      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
      
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
    
    // Find column indexes
    const colIndexes = {
      produto: headers.findIndex(h => String(h).toLowerCase().includes('produto')),
      modulacao: headers.findIndex(h => String(h).toLowerCase().includes('modul')),
      comprimento: headers.findIndex(h => String(h).toLowerCase().includes('compri')),
      profundidade: headers.findIndex(h => String(h).toLowerCase().includes('prof')),
      altura: headers.findIndex(h => String(h).toLowerCase().includes('altura')),
      tecido: headers.findIndex(h => String(h).toLowerCase().includes('tecido')),
      semTec: headers.findIndex(h => String(h).toUpperCase() === 'SEM TEC'),
    };

    // Find price columns dynamically
    const priceColumns: { name: string; index: number }[] = [];
    headers.forEach((h, i) => {
      const headerStr = String(h).toUpperCase().trim();
      if (headerStr === 'SEM TEC' || headerStr.startsWith('FX ') || headerStr === '3D' || headerStr === 'COURO') {
        priceColumns.push({ name: headerStr, index: i });
      }
    });

    // Group rows by product and modulation
    const productMap = new Map<string, Map<string, ParsedProduct['modulations'][0]['sizes']>>();
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as (string | number)[];
      if (!row || row.length === 0) continue;

      const productName = String(row[colIndexes.produto] || '').trim().toUpperCase();
      const modulationName = String(row[colIndexes.modulacao] || '').trim().toUpperCase();
      
      if (!productName || !modulationName) continue;

      // Build description from row data
      const length = String(row[colIndexes.comprimento] || '').trim();
      const depth = String(row[colIndexes.profundidade] || '').trim();
      const height = String(row[colIndexes.altura] || '').trim();
      const fabricQty = parseFloat(String(row[colIndexes.tecido] || '0')) || 0;
      
      // Build dimensions string
      const dimensions = [length, depth].filter(Boolean).join(' x ');
      
      // Build description - take from a description column if exists, or build from dimensions
      let description = `${productName} ${modulationName}`;
      if (dimensions) {
        description += ` ${dimensions}`;
      }
      if (height) {
        description += ` (H: ${height})`;
      }

      // Extract prices
      const prices: Record<string, number> = {};
      priceColumns.forEach(({ name, index }) => {
        const value = parseFloat(String(row[index] || '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0;
        prices[name] = value;
      });

      // Get or create product map
      if (!productMap.has(productName)) {
        productMap.set(productName, new Map());
      }
      const modMap = productMap.get(productName)!;
      
      // Get or create modulation array
      if (!modMap.has(modulationName)) {
        modMap.set(modulationName, []);
      }
      
      modMap.get(modulationName)!.push({
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
    productMap.forEach((modMap, productName) => {
      const modulations: ParsedProduct['modulations'] = [];
      modMap.forEach((sizes, modName) => {
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
