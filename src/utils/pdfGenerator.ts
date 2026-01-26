import jsPDF from 'jspdf';
import { Quote } from '@/types/quote';
import logoLsa from '@/assets/logo-lsa.png';

export function generateQuotePDF(quote: Quote): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR');

  // Logo
  const logoWidth = 40;
  const logoHeight = 15;
  const logoX = (pageWidth - logoWidth) / 2;
  doc.addImage(logoLsa, 'PNG', logoX, y, logoWidth, logoHeight);
  y += logoHeight + 5;

  // Company Info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text('(11) 98207-1185  |  lucianoabreu@lsarepresentacoes.com.br', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('Rua Mont\'alverne, 345 - CEP 04265-060', pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 8;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO SOHOME', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${formatDate(quote.createdAt)}  |  Nº ${quote.id.slice(0, 8).toUpperCase()}`, pageWidth / 2, y, {
    align: 'center',
  });
  y += 12;

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

  // Table header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(245, 245, 245);
  doc.rect(15, y - 4, pageWidth - 30, 7, 'F');
  doc.text('Item', 17, y);
  doc.text('Descrição', 32, y);
  doc.text('Qtd', 132, y);
  doc.text('Unit.', 150, y);
  doc.text('Total', 175, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  quote.items.forEach((item, index) => {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.text(`${index + 1}`, 17, y);

    // Product details
    const details = [
      item.productName,
      `Mod: ${item.modulation}`,
      item.base ? `Base: ${item.base}` : '',
      `Tecido: ${item.fabricDescription} (${item.fabricTier})`,
    ]
      .filter(Boolean)
      .join(' | ');

    const splitDetails = doc.splitTextToSize(details, 95);
    doc.text(splitDetails, 32, y);

    doc.text(item.quantity.toString(), 132, y);
    doc.text(formatCurrency(item.price), 150, y);
    doc.text(formatCurrency(item.price * item.quantity), 175, y);

    y += splitDetails.length * 5 + 3;
  });

  y += 5;
  doc.setDrawColor(180);
  doc.line(15, y, pageWidth - 15, y);
  y += 10;

  // Totals
  doc.setFontSize(10);
  doc.text('Subtotal:', 130, y);
  doc.text(formatCurrency(quote.subtotal), 175, y);
  y += 6;

  if (quote.discount > 0) {
    doc.setTextColor(180, 0, 0);
    doc.text('Desconto:', 130, y);
    doc.text(`- ${formatCurrency(quote.discount)}`, 175, y);
    doc.setTextColor(0);
    y += 6;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 130, y);
  doc.text(formatCurrency(quote.total), 175, y);
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
    const installmentValue = quote.total / quote.payment.installments;
    doc.text(
      `${quote.payment.installments}x de ${formatCurrency(installmentValue)}`,
      15,
      y
    );
    y += 5;
  } else if (quote.payment.method === 'entrada_parcelas') {
    const remaining = quote.total - quote.payment.downPayment;
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

  doc.text(`Prazo de entrega: ${quote.payment.deliveryDays} dias úteis`, 15, y);
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
  doc.text('Validade deste orçamento: 15 dias a partir da data de emissão.', 15, y);
  y += 4;
  doc.text(
    'Os valores podem sofrer alteração sem aviso prévio após o vencimento.',
    15,
    y
  );
  y += 4;
  doc.text(
    'Prazo de entrega a partir da confirmação do pedido e escolha de tecido.',
    15,
    y
  );

  // Save
  const clientName = quote.client.name.replace(/\s/g, '_') || 'cliente';
  const date = formatDate(quote.createdAt).replace(/\//g, '-');
  doc.save(`orcamento_sohome_${clientName}_${date}.pdf`);
}
