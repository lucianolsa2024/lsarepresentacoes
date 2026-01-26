import { useState } from 'react';
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
import { Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BulkImporterProps {
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

export function BulkImporter({ onImportComplete }: BulkImporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'clearing' | 'parsing' | 'importing' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState({ products: 0, modulations: 0, sizes: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  const [currentFile, setCurrentFile] = useState('');

  const resetState = () => {
    setProgress(0);
    setStatus('idle');
    setStats({ products: 0, modulations: 0, sizes: 0 });
    setErrorMessage('');
    setCurrentFile('');
  };

  const parseExcelData = (rows: unknown[][]): ParsedProduct[] => {
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
      profundidade: findIndex(h => h.toLowerCase().includes('prof')),
      altura: findIndex(h => h.toLowerCase().includes('altura')),
      tecido: findIndex(h => h.toLowerCase().includes('tecido')),
    };

    if (colIndexes.produto === -1) {
      throw new Error('Coluna "Produto" não encontrada na planilha');
    }
    if (colIndexes.modulacao === -1) {
      throw new Error('Coluna "Modulação" não encontrada na planilha');
    }

    const priceColumns: { name: string; index: number }[] = [];
    headers.forEach((h, i) => {
      if (h == null) return;
      const headerStr = String(h).toUpperCase().trim();
      if (headerStr === 'SEM TEC' || headerStr === 'SEM TEC/OUTRO' || 
          headerStr.match(/^FX\s*[A-Z]$/) ||
          headerStr.match(/^FX\s+[A-Z]$/) ||
          headerStr === '3D' || headerStr === 'COURO' || 
          headerStr === 'FX 3D' || headerStr === 'FX COURO') {
        let normalizedName = headerStr;
        normalizedName = normalizedName.replace(/FX\s+/, 'FX ');
        if (headerStr === 'SEM TEC/OUTRO') normalizedName = 'SEM TEC';
        priceColumns.push({ name: normalizedName, index: i });
      }
    });

    const productMap = new Map<string, Map<string, Map<string, ParsedProduct['modulations'][0]['sizes'][0]>>>();
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const rowData = row as (string | number | null | undefined)[];
      const productName = String(rowData[colIndexes.produto] ?? '').trim().toUpperCase();
      const modulationName = String(rowData[colIndexes.modulacao] ?? '').trim().toUpperCase();
      
      if (!productName || !modulationName) continue;

      let rawDescription = '';
      if (colIndexes.descricao !== -1 && rowData[colIndexes.descricao]) {
        rawDescription = String(rowData[colIndexes.descricao]).trim();
      }
      
      const length = colIndexes.comprimento !== -1 ? String(rowData[colIndexes.comprimento] ?? '').trim() : '';
      const depth = colIndexes.profundidade !== -1 ? String(rowData[colIndexes.profundidade] ?? '').trim() : '';
      const height = colIndexes.altura !== -1 ? String(rowData[colIndexes.altura] ?? '').trim() : '';
      const fabricQty = colIndexes.tecido !== -1 ? (parseFloat(String(rowData[colIndexes.tecido] ?? '0')) || 0) : 0;
      
      const dimensions = [length, depth].filter(Boolean).join(' x ');
      const dimensionKey = rawDescription || `${productName} ${modulationName} ${dimensions}|${height}`;
      
      let description = rawDescription;
      if (!description) {
        description = `${productName} ${modulationName}`;
        if (dimensions) description += ` ${dimensions}`;
        if (height) description += ` (H: ${height})`;
      }

      if (!productMap.has(productName)) {
        productMap.set(productName, new Map());
      }
      const modMap = productMap.get(productName)!;
      
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

    productMap.forEach((modMap, productName) => {
      const modulations: ParsedProduct['modulations'] = [];
      modMap.forEach((sizeMap, modName) => {
        const sizes = Array.from(sizeMap.values());
        modulations.push({ name: modName, sizes });
      });
      products.push({ name: productName, modulations });
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
          .update({ has_base: hasBase, available_bases: availableBases })
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
            category: 'Sofás',
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

  const handleBulkImport = async () => {
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

      // Load and parse first file (LSA)
      setCurrentFile('Carregando TABELA_PV_26.01_LOVABLE-2.xlsx...');
      const lsaData = await loadExcelFile('/data/tabela-lsa.xlsx');
      setProgress(20);
      
      const lsaProducts = parseExcelData(lsaData);
      console.log(`LSA: ${lsaProducts.length} produtos`);
      setProgress(25);

      // Load and parse second file (Century)
      setCurrentFile('Carregando Produtos_Century_Lovable.xlsx...');
      const centuryData = await loadExcelFile('/data/produtos-century.xlsx');
      setProgress(35);
      
      const centuryProducts = parseExcelData(centuryData);
      console.log(`Century: ${centuryProducts.length} produtos`);
      setProgress(40);

      setStatus('importing');
      
      // Import LSA products (40-65%)
      setCurrentFile('Importando produtos LSA...');
      await importToDatabase(lsaProducts, 40, 65);

      // Import Century products (65-95%)
      setCurrentFile('Importando produtos Century...');
      await importToDatabase(centuryProducts, 65, 95);

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

  const handleClose = () => {
    if (!isProcessing) {
      setIsOpen(false);
      resetState();
    }
  };

  return (
    <>
      <Button variant="default" onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700">
        <Database className="h-4 w-4 mr-2" />
        Atualizar Base Completa
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atualizar Base de Produtos</DialogTitle>
            <DialogDescription>
              Esta ação irá limpar toda a base atual e importar os produtos dos 2 arquivos Excel pré-carregados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {status === 'idle' && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-medium">Arquivos que serão importados:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>TABELA_PV_26.01_LOVABLE-2.xlsx</li>
                    <li>Produtos_Century_Lovable.xlsx</li>
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
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <div>
                  <p className="font-medium text-red-600">Erro na importação</p>
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
