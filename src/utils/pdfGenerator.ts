import jsPDF from 'jspdf';
import { addDays, format } from 'date-fns';
import { Quote, QuoteItem } from '@/types/quote';
import logoLsa from '@/assets/logo-lsa-new.jpg';
import { getProductImageUrl, getProductImageFallback, getBestProductImageUrl } from '@/utils/productImage';
import { getQuoteFileName } from '@/utils/quoteLabel';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

// Returns the unit price to display in the PDF, applying the per-item
// discount/surcharge (itemDiscountValue: positive = desconto, negative = acréscimo).
function getDisplayPrice(item: QuoteItem): number {
  const base = Number((item as any).price ?? (item as any).unitPrice ?? 0);
  const v = Number(item.itemDiscountValue || 0);
  if (!v) return base;
  const mult = v > 0 ? 1 - v / 100 : 1 + Math.abs(v) / 100;
  return Math.round(base * mult * 100) / 100;
}

// Helper to check if URL is external
function isExternalUrl(url: string): boolean {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
    return false;
  }
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return false;
  }
}

// Route external (cross-origin) image URLs through our edge proxy so the
// browser can read pixels without CORS-tainting the canvas. Supabase Storage
// URLs already serve permissive CORS, so we leave those untouched.
function toFetchableUrl(url: string): string {
  if (!isExternalUrl(url)) return url;
  if (!SUPABASE_URL) return url;
  // Supabase Storage public URLs are CORS-friendly already
  if (url.includes('/storage/v1/object/public/')) return url;
  return `${SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
}


// Maximum image size for PDF optimization (reduces file size significantly)
const MAX_IMAGE_SIZE = 100;

// Helper to compress and resize image
function compressImage(img: HTMLImageElement, maxSize: number, quality: number): string {
  const canvas = document.createElement('canvas');
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  
  // Resize to max dimensions while maintaining aspect ratio
  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  }
  return '';
}

// Helper to load image via fetch (handles CORS better)
// Works with WebP, AVIF, PNG, JPEG — converts everything to JPEG via canvas.
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    console.log('[PDF] Fetching image:', url.substring(0, 100));
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('[PDF] Fetch failed with status:', response.status, 'for', url.substring(0, 80));
      return null;
    }
    const blob = await response.blob();
    console.log('[PDF] Fetched blob:', blob.type, blob.size, 'bytes');

    // Create an image element to decode + re-encode as JPEG
    const objectUrl = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      const img = new Image();
      const cleanup = () => URL.revokeObjectURL(objectUrl);
      const timeout = setTimeout(() => {
        console.warn('[PDF] Decode timeout for', url.substring(0, 80));
        cleanup();
        resolve(null);
      }, 8000);
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const compressed = compressImage(img, MAX_IMAGE_SIZE, 0.7);
          cleanup();
          if (compressed && compressed.startsWith('data:image/jpeg')) {
            console.log('[PDF] ✓ Image converted to JPEG:', url.substring(0, 60));
            resolve(compressed);
          } else {
            console.warn('[PDF] Compression returned invalid data for', url.substring(0, 60));
            resolve(null);
          }
        } catch (e) {
          console.warn('[PDF] Canvas conversion error:', e);
          cleanup();
          resolve(null);
        }
      };
      img.onerror = (e) => {
        clearTimeout(timeout);
        console.warn('[PDF] Image decode error for', url.substring(0, 80), e);
        cleanup();
        resolve(null);
      };
      img.src = objectUrl;
    });
  } catch (e) {
    console.warn('[PDF] Fetch exception:', e);
    return null;
  }
}

// Helper to load image as base64 using Image element
async function loadImageViaElement(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    // Skip invalid URLs
    if (!url || url === '/placeholder.svg') {
      resolve(null);
      return;
    }
    
    const img = new Image();
    
    // CRITICAL: Only set crossOrigin for external URLs, and set it BEFORE src
    if (isExternalUrl(url)) {
      img.crossOrigin = 'anonymous';
    }
    
    const timeout = setTimeout(() => {
      console.log('Image load timeout:', url);
      resolve(null);
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const compressed = compressImage(img, MAX_IMAGE_SIZE, 0.5);
        if (compressed) {
          console.log('Image loaded and compressed via element:', url.substring(0, 50));
          resolve(compressed);
        } else {
          console.log('Failed to compress image');
          resolve(null);
        }
      } catch (e) {
        console.log('Image canvas error:', e);
        resolve(null);
      }
    };
    
    img.onerror = (e) => {
      clearTimeout(timeout);
      console.log('Image element load error:', url.substring(0, 50), e);
      resolve(null);
    };
    
    // Set src AFTER crossOrigin
    img.src = url;
  });
}

// Main image loading function — always tries fetch first (handles WebP/AVIF
// via blob decoding), then falls back to <img> element for local URLs.
async function loadImageAsBase64(url: string): Promise<string | null> {
  if (!url || url === '/placeholder.svg') {
    return null;
  }

  // Route cross-origin URLs through our proxy to bypass CORS
  const effectiveUrl = toFetchableUrl(url);

  // Always try fetch first — works for both external (proxied) and same-origin
  // URLs, and properly handles WebP/AVIF formats by decoding via blob.
  const fetchResult = await fetchImageAsBase64(effectiveUrl);
  if (fetchResult) {
    return fetchResult;
  }

  // Fallback to <img> element method (mainly for local /images/products/* JPEGs)
  console.log('[PDF] Fetch failed, trying <img> element for:', effectiveUrl.substring(0, 80));
  return loadImageViaElement(effectiveUrl);
}

// Cache for loaded images (per session, cleared on each PDF generation for fresh data)
let imageCache: Record<string, string | null> = {};

export async function generateQuotePDF(quote: Quote): Promise<void> {
  // Clear image cache to ensure fresh images
  imageCache = {};
  
  console.log('Starting PDF generation with', quote.items.length, 'items');
  
  // Preload product images - prioritize storage URLs
  // Create a map of productName -> imageUrl for unique products
  const productImageMap = new Map<string, string | null>();
  quote.items.forEach(item => {
    console.log('Item:', item.productName, 'imageUrl:', item.imageUrl);
    if (!productImageMap.has(item.productName)) {
      productImageMap.set(item.productName, item.imageUrl || null);
    }
  });
  
  for (const [productName, imageUrl] of productImageMap) {
    const cacheKey = imageUrl || productName;
    console.log('Loading image for:', productName, 'URL:', imageUrl);
    
    // Try storage URL first if available
    if (imageUrl) {
      const base64 = await loadImageAsBase64(imageUrl);
      if (base64) {
        console.log('Loaded from storage URL:', productName);
        imageCache[cacheKey] = base64;
        continue;
      }
    }
    
    // Try local file
    const localUrl = getProductImageUrl(productName);
    console.log('Trying local URL:', localUrl);
    const localBase64 = await loadImageAsBase64(localUrl);
    if (localBase64) {
      console.log('Loaded from local file:', productName);
      imageCache[cacheKey] = localBase64;
    } else {
      console.log('No image found for:', productName);
      imageCache[cacheKey] = null;
    }
  }
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR');

  // ===== HEADER LAYOUT (similar to RD style) =====
  // Logo on the left - true aspect ratio of source image (1000x546 ≈ 0.546)
  const logoWidth = 38;
  const logoHeight = logoWidth * 0.546; // ~20.7
  const logoX = 15;
  doc.addImage(logoLsa, 'JPEG', logoX, y, logoWidth, logoHeight);

  // Company info on the right (italic style)
  const rightX = pageWidth - 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor(80);
  
  // Representative name (if available)
  const representativeName = quote.payment.representativeName || 'Luciano Abreu';
  doc.text(representativeName, rightX, y + 3, { align: 'right' });
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('(11) 98207-1185', rightX, y + 8, { align: 'right' });
  doc.text('lucianoabreu@lsarepresentacoes.com.br', rightX, y + 13, { align: 'right' });
  
  doc.setTextColor(0);
  y += logoHeight + 10;

  // Divider line
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Title centered
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO SOHOME', pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${formatDate(quote.createdAt)}  |  Nº ${quote.id.slice(0, 8).toUpperCase()}`, pageWidth / 2, y, {
    align: 'center',
  });
  y += 10;

  // Divider
  doc.setDrawColor(180);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 10;

  // Client Data
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 15, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const clientLines = [
    `Nome: ${quote.client.name}`,
    quote.client.company ? `Empresa: ${quote.client.company}` : '',
    quote.client.document ? `CPF/CNPJ: ${quote.client.document}` : '',
    quote.client.phone ? `Telefone: ${quote.client.phone}` : '',
    quote.client.email ? `Email: ${quote.client.email}` : '',
  ].filter(Boolean);

  clientLines.forEach((line) => {
    doc.text(line, 15, y);
    y += 5;
  });

  // Address
  const { address } = quote.client;
  if (address.street || address.city) {
    const addressParts = [
      address.street,
      address.number,
      address.complement,
      address.neighborhood,
      address.city,
      address.state,
      address.zipCode,
    ]
      .filter(Boolean)
      .join(', ');
    if (addressParts) {
      doc.text(`Endereço: ${addressParts}`, 15, y);
      y += 5;
    }
  }

  y += 8;
  doc.setDrawColor(180);
  doc.line(15, y, pageWidth - 15, y);
  y += 10;

  // Items
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ITENS DO ORÇAMENTO', 15, y);
  y += 8;

// Table header — 2 linhas, larguras dimensionadas para valores longos
  // Layout (margem 15→195 = 180mm úteis):
  //  Item  Imagem  Descrição        | Qtd  | Unit.  | Total
  //  15→20  20→44   44→118 (74mm)   118→132 132→160  160→195
  const COL = {
    item: 15,           // x início "#"
    img: 20,            // x início imagem
    desc: 44,           // x início descrição (74mm)
    qtyC: 125,          // CENTRO Qtd  (118-132 = 14mm)
    unitC: 146,         // CENTRO Unit. (132-160 = 28mm)
    totalC: 177.5,      // CENTRO Total (160-195 = 35mm)
  };
  const COL_DIVIDERS = [20, 44, 118, 132, 160];
  const IMG_SIZE = 22;
  const ROW_MIN_H = IMG_SIZE + 6;
  const HEADER_H = 12;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(26, 26, 26);
  doc.setTextColor(255, 255, 255);
  doc.rect(15, y - 5, pageWidth - 30, HEADER_H, 'F');

  // Linha 1 dos cabeçalhos (sem título "Item" — só o número aparece nas linhas)
  doc.text('#', COL.item + 1, y + 2);
  doc.text('Imagem', COL.img + 1, y + 2);
  doc.text('Descrição', COL.desc, y + 2);
  doc.text('Quanti-', COL.qtyC, y, { align: 'center' });
  doc.text('Preço', COL.unitC, y, { align: 'center' });
  doc.text('Preço', COL.totalC, y, { align: 'center' });
  // Linha 2
  doc.text('dade', COL.qtyC, y + 4, { align: 'center' });
  doc.text('Unitário', COL.unitC, y + 4, { align: 'center' });
  doc.text('Total', COL.totalC, y + 4, { align: 'center' });

  // Pipes brancos divisores no header
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.2);
  COL_DIVIDERS.forEach((x) => doc.line(x, y - 5, x, y - 5 + HEADER_H));

  doc.setTextColor(0);
  y += HEADER_H - 1;

  doc.setFont('helvetica', 'normal');
  quote.items.forEach((item, index) => {
    if (y > 230) { doc.addPage(); y = 20; }

    const cacheKey = item.imageUrl || item.productName;
    const productImage = imageCache[cacheKey];

    const details = [
      item.factory ? `Fábrica: ${item.factory}` : '',
      `Mod: ${item.modulation}`,
      item.sizeDescription ? `Tam: ${item.sizeDescription}` : '',
      item.base ? `Base: ${item.base}` : '',
      `Tecido: ${item.fabricDescription} (${item.fabricTier})`,
    ].filter(Boolean).join(' | ');

    const splitDetails = doc.splitTextToSize(details, 72);
    const textHeight = (splitDetails.length + 1) * 4.5 + 4;
    const rowH = Math.max(textHeight, ROW_MIN_H);

    // Zebra suave
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(15, y - 2, pageWidth - 30, rowH, 'F');

    // Número do item
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(160);
    doc.text(`${index + 1}`, COL.item + 1, y + 4);
    doc.setTextColor(0);

    // Imagem maior
    if (productImage) {
      try {
        doc.addImage(productImage, 'JPEG', COL.img, y - 1, IMG_SIZE, IMG_SIZE);
      } catch { /* sem imagem */ }
    }

    // Nome do produto em destaque
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20);
    doc.text(item.productName, COL.desc, y + 3);

    // Detalhes técnicos abaixo do nome
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    doc.text(splitDetails, COL.desc, y + 8);
    doc.setTextColor(0);

    // Qtd / Preços (centralizados, com auto-shrink se valor exceder largura)
    const displayPrice = getDisplayPrice(item);
    const drawCentered = (text: string, cx: number, ty: number, maxW: number, baseSize: number, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      let size = baseSize;
      doc.setFontSize(size);
      while (doc.getTextWidth(text) > maxW - 1 && size > 6) {
        size -= 0.5;
        doc.setFontSize(size);
      }
      doc.text(text, cx, ty, { align: 'center' });
    };
    doc.setTextColor(60);
    drawCentered(item.quantity.toString(), COL.qtyC, y + 4, 14, 9);
    drawCentered(formatCurrency(displayPrice), COL.unitC, y + 4, 28, 9);
    doc.setTextColor(20);
    drawCentered(formatCurrency(displayPrice * item.quantity), COL.totalC, y + 4, 35, 9, true);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    y += rowH;

    // Observações do item
    if (item.observations?.trim()) {
      doc.setFontSize(7.5);
      doc.setTextColor(120);
      const splitObs = doc.splitTextToSize(`Obs: ${item.observations}`, 95);
      doc.text(splitObs, COL.desc, y);
      y += splitObs.length * 3.5 + 1;
      doc.setTextColor(0);
    }

    // Pipes verticais cinzas entre as colunas (na altura da linha)
    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    const rowTop = y - rowH - 2;
    COL_DIVIDERS.forEach((x) => doc.line(x, rowTop, x, y));

    // Linha divisória horizontal entre itens
    doc.line(15, y, pageWidth - 15, y);
    y += 2;
  });

  y += 5;
  doc.setDrawColor(180);
  doc.line(15, y, pageWidth - 15, y);
  y += 10;

  // Calculate IPI (3.25% on total)
  const ipiRate = 0.0325;
  const ipiValue = quote.total * ipiRate;
  const totalWithIpi = quote.total + ipiValue;

  // Totals - only show IPI and final total (no subtotal or discount lines)
  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('IPI (3,25%):', 130, y);
  doc.text(formatCurrency(ipiValue), pageWidth - 15, y, { align: 'right' });
  y += 8;

  // Caixa total escura
  doc.setFillColor(26, 26, 26);
  doc.roundedRect(110, y - 5, pageWidth - 125, 12, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL GERAL:', 115, y + 3);
  doc.text(formatCurrency(totalWithIpi), pageWidth - 17, y + 3, { align: 'right' });
  doc.setTextColor(0);
  y += 16;

  // Payment Conditions
  doc.setDrawColor(180);
  doc.line(15, y, pageWidth - 15, y);
  y += 10;

  doc.setFontSize(11);
  doc.text('CONDIÇÕES DE PAGAMENTO', 15, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const paymentMethodLabels = {
    avista: 'À Vista',
    parcelado: 'Parcelado',
    entrada_parcelas: 'Entrada + Parcelas',
  };

  doc.text(`Forma: ${paymentMethodLabels[quote.payment.method]}`, 15, y);
  y += 5;

  if (quote.payment.method === 'parcelado') {
    const installmentValue = totalWithIpi / quote.payment.installments;
    doc.text(
      `${quote.payment.installments}x de ${formatCurrency(installmentValue)}`,
      15,
      y
    );
    y += 5;
  } else if (quote.payment.method === 'entrada_parcelas') {
    const remaining = totalWithIpi - quote.payment.downPayment;
    const installmentValue = remaining / quote.payment.installments;
    doc.text(`Entrada: ${formatCurrency(quote.payment.downPayment)}`, 15, y);
    y += 5;
    doc.text(
      `${quote.payment.installments}x de ${formatCurrency(installmentValue)}`,
      15,
      y
    );
    y += 5;
  }

  doc.text(`Prazo de embarque: ${quote.payment.deliveryDays} dias corridos`, 15, y);
  y += 5;

  // TODO: Cálculo automático de data de entrega desabilitado temporariamente
  // if (quote.payment.estimatedClosingDate) {
  //   const closingDate = new Date(quote.payment.estimatedClosingDate);
  //   const deliveryDate = addDays(closingDate, quote.payment.deliveryDays);
  //   const formattedDelivery = format(deliveryDate, 'dd/MM/yyyy');
  //   doc.text(`Previsão de entrega: ${formattedDelivery}`, 15, y);
  //   y += 5;
  // }

  // Carrier and freight type
  const freightType = quote.payment.freightType || 'CIF';
  const freightLabel = freightType === 'CIF' ? 'CIF (Frete Pago)' : 'FOB (Frete a Pagar)';
  if (quote.payment.carrier) {
    doc.text(`Transportadora: ${quote.payment.carrier} - ${freightLabel}`, 15, y);
    y += 5;
  } else {
    doc.text(`Frete: ${freightLabel}`, 15, y);
    y += 5;
  }
  y += 5;

  if (quote.payment.observations) {
    y += 3;
    doc.text('Observações:', 15, y);
    y += 5;
    const obsLines = doc.splitTextToSize(quote.payment.observations, pageWidth - 30);
    doc.text(obsLines, 15, y);
    y += obsLines.length * 5;
  }

  y += 12;

  // Footer
  doc.setDrawColor(180);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Orçamento válido por 7 dias.', 15, y);
  y += 4;
  doc.text('Prazo de entrega em dias corridos, sujeito a alteração.', 15, y);

  // Save
  doc.save(getQuoteFileName(quote));
}
