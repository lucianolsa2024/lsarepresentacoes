import jsPDF from 'jspdf';
import { addDays, format } from 'date-fns';
import { Quote, QuoteItem } from '@/types/quote';
import logoLsa from '@/assets/logo-lsa.png';
import { getProductImageUrl, getProductImageFallback, getBestProductImageUrl } from '@/utils/productImage';

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
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    console.log('Fetching image via fetch:', url.substring(0, 80));
    const response = await fetch(url);
    if (!response.ok) {
      console.log('Fetch failed with status:', response.status);
      return null;
    }
    const blob = await response.blob();
    
    // Create an image element to resize/compress
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const compressed = compressImage(img, MAX_IMAGE_SIZE, 0.5);
        console.log('Image fetched and compressed:', url.substring(0, 50));
        resolve(compressed || null);
      };
      img.onerror = () => {
        console.log('Image load error after fetch');
        resolve(null);
      };
      img.src = URL.createObjectURL(blob);
    });
  } catch (e) {
    console.log('Fetch error:', e);
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

// Main image loading function - tries fetch first for external URLs, then element
async function loadImageAsBase64(url: string): Promise<string | null> {
  if (!url || url === '/placeholder.svg') {
    return null;
  }
  
  // For external URLs (like Supabase Storage), try fetch first as it handles CORS better
  if (isExternalUrl(url)) {
    const fetchResult = await fetchImageAsBase64(url);
    if (fetchResult) {
      return fetchResult;
    }
    // Fallback to element method
    console.log('Fetch failed, trying element method for:', url.substring(0, 50));
  }
  
  // For local URLs or as fallback, use element method
  return loadImageViaElement(url);
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
  // Logo on the left - maintain aspect ratio (original logo is approximately 300x100)
  const logoOriginalWidth = 300;
  const logoOriginalHeight = 100;
  const logoWidth = 45;
  const logoHeight = (logoWidth * logoOriginalHeight) / logoOriginalWidth; // ~15
  const logoX = 15;
  doc.addImage(logoLsa, 'PNG', logoX, y, logoWidth, logoHeight);

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

  // Table header - adjusted for image column
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y - 4, pageWidth - 30, 7, 'F');
  doc.text('Item', 17, y);
  doc.text('Img', 28, y);
  doc.text('Descrição', 45, y);
  doc.text('Qtd', 140, y);
  doc.text('Unit.', 155, y);
  doc.text('Total', 175, y);
  y += 6;

  // Determine if surcharge should be baked into prices
  const isSurcharge = quote.payment.discountType === 'percentage' && quote.payment.discountValue < 0;
  const surchargeMultiplier = isSurcharge ? 1 + Math.abs(quote.payment.discountValue) / 100 : 1;
  const getDisplayPrice = (price: number) => Math.round(price * surchargeMultiplier * 100) / 100;

  doc.setFont('helvetica', 'normal');
  quote.items.forEach((item, index) => {
    // Check if we need a new page
    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    const startY = y;
    doc.text(`${index + 1}`, 17, y);

    // Add product image if available
    const cacheKey = item.imageUrl || item.productName;
    const productImage = imageCache[cacheKey];
    if (productImage) {
      try {
        doc.addImage(productImage, 'JPEG', 27, y - 3, 12, 12);
      } catch {
        // Image failed, continue without
      }
    }

    // Product details with size description - adjusted for image
    const details = [
      item.productName,
      item.factory ? `Fábrica: ${item.factory}` : '',
      `Mod: ${item.modulation}`,
      item.sizeDescription ? `Tam: ${item.sizeDescription}` : '',
      item.base ? `Base: ${item.base}` : '',
      `Tecido: ${item.fabricDescription} (${item.fabricTier})`,
    ]
      .filter(Boolean)
      .join(' | ');

    const splitDetails = doc.splitTextToSize(details, 90);
    doc.text(splitDetails, 45, y);

    const displayPrice = getDisplayPrice(item.price);
    doc.text(item.quantity.toString(), 140, y);
    doc.text(formatCurrency(displayPrice), 155, y);
    doc.text(formatCurrency(displayPrice * item.quantity), 175, y);

    // Ensure minimum row height for image
    const textHeight = splitDetails.length * 5 + 2;
    const imageHeight = 14;
    y += Math.max(textHeight, imageHeight);
    
    // Item observations
    if (item.observations && item.observations.trim()) {
      doc.setFontSize(8);
      doc.setTextColor(100);
      const obsText = `Obs: ${item.observations}`;
      const splitObs = doc.splitTextToSize(obsText, 150);
      doc.text(splitObs, 45, y);
      y += splitObs.length * 4 + 2;
      doc.setFontSize(9);
      doc.setTextColor(0);
    }
    
    y += 1;
  });

  y += 5;
  doc.setDrawColor(180);
  doc.line(15, y, pageWidth - 15, y);
  y += 10;

  // Calculate IPI (3.25% on total after surcharge adjustment)
  const ipiRate = 0.0325;
  const displaySubtotal = isSurcharge ? quote.total : quote.subtotal;
  const ipiValue = displaySubtotal * ipiRate;
  const totalWithIpi = quote.total + ipiValue;

  // Totals - only show IPI and final total (no subtotal or discount lines)
  doc.setFontSize(10);

  // IPI
  doc.text('IPI (3,25%):', 120, y);
  doc.text(formatCurrency(ipiValue), 175, y);
  y += 6;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL GERAL:', 120, y);
  doc.text(formatCurrency(totalWithIpi), 175, y);
  y += 12;

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
  const clientName = quote.client.name.replace(/\s/g, '_') || 'cliente';
  const date = formatDate(quote.createdAt).replace(/\//g, '-');
  doc.save(`orcamento_sohome_${clientName}_${date}.pdf`);
}
