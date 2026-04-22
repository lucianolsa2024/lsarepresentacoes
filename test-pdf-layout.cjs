const { jsPDF } = require('jspdf');
const fs = require('fs');

const doc = new jsPDF();
const pageWidth = doc.internal.pageSize.getWidth();
let y = 30;
const formatCurrency = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const COL = { item: 15, img: 20, desc: 44, qtyC: 125, unitC: 146, totalC: 177.5 };
const COL_DIVIDERS = [20, 44, 118, 132, 160];
const IMG_SIZE = 22;
const ROW_MIN_H = IMG_SIZE + 6;
const HEADER_H = 12;

doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
doc.setFillColor(26, 26, 26); doc.setTextColor(255, 255, 255);
doc.rect(15, y - 5, pageWidth - 30, HEADER_H, 'F');
doc.text('#', COL.item + 1, y + 2);
doc.text('Imagem', COL.img + 1, y + 2);
doc.text('Descrição', COL.desc, y + 2);
doc.text('Quanti-', COL.qtyC, y, { align: 'center' });
doc.text('Preço', COL.unitC, y, { align: 'center' });
doc.text('Preço', COL.totalC, y, { align: 'center' });
doc.text('dade', COL.qtyC, y + 4, { align: 'center' });
doc.text('Unitário', COL.unitC, y + 4, { align: 'center' });
doc.text('Total', COL.totalC, y + 4, { align: 'center' });
doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.2);
COL_DIVIDERS.forEach((x) => doc.line(x, y - 5, x, y - 5 + HEADER_H));
doc.setTextColor(0);
y += HEADER_H - 1;

const items = [
  { productName: 'SUBLIME', factory: 'SOHOME', modulation: 'POL',
    sizeDescription: 'POL ALTO 0,81 m x 0,96 m', base: 'VERNIZ',
    fabricDescription: 'J10019', fabricTier: 'FX J', price: 12077.80, quantity: 2 },
  { productName: 'PRODUTO CARO XYZ', factory: 'CENTURY', modulation: 'MOD-LONG',
    sizeDescription: 'MEGA 3,50 m x 4,20 m', base: 'METALIZADO',
    fabricDescription: 'COURO PREMIUM J9999', fabricTier: 'FX COURO',
    price: 1234567.89, quantity: 99, observations: 'Observação longa para testar quebra' },
  { productName: 'CADEIRA STD', factory: 'PV', modulation: 'CAD',
    sizeDescription: '0,50x0,50', fabricDescription: 'TEC1', fabricTier: 'FX B',
    price: 850, quantity: 1500 },
  { productName: 'PUFF', factory: 'SOHOME', modulation: 'PUF',
    sizeDescription: '40x40', base: 'PE METAL',
    fabricDescription: 'B2020', fabricTier: 'FX B', price: 99.50, quantity: 1 },
];

doc.setFont('helvetica', 'normal');
items.forEach((item, index) => {
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

  if (index % 2 === 0) doc.setFillColor(250, 250, 250);
  else doc.setFillColor(255, 255, 255);
  doc.rect(15, y - 2, pageWidth - 30, rowH, 'F');

  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(160);
  doc.text(`${index + 1}`, COL.item + 1, y + 4);
  doc.setTextColor(0);

  doc.setDrawColor(200); doc.setLineWidth(0.2);
  doc.rect(COL.img, y - 1, IMG_SIZE, IMG_SIZE);

  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(20);
  doc.text(item.productName, COL.desc, y + 3);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100);
  doc.text(splitDetails, COL.desc, y + 8);
  doc.setTextColor(0);

  const displayPrice = item.price;
  const drawCentered = (text, cx, ty, maxW, baseSize, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    let size = baseSize;
    doc.setFontSize(size);
    while (doc.getTextWidth(text) > maxW - 1 && size > 6) { size -= 0.5; doc.setFontSize(size); }
    doc.text(text, cx, ty, { align: 'center' });
  };
  doc.setTextColor(60);
  drawCentered(item.quantity.toString(), COL.qtyC, y + 4, 14, 9);
  drawCentered(formatCurrency(displayPrice), COL.unitC, y + 4, 28, 9);
  doc.setTextColor(20);
  drawCentered(formatCurrency(displayPrice * item.quantity), COL.totalC, y + 4, 35, 9, true);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');

  y += rowH;

  if (item.observations?.trim()) {
    doc.setFontSize(7.5); doc.setTextColor(120);
    const splitObs = doc.splitTextToSize(`Obs: ${item.observations}`, 95);
    doc.text(splitObs, COL.desc, y);
    y += splitObs.length * 3.5 + 1;
    doc.setTextColor(0);
  }

  doc.setDrawColor(220); doc.setLineWidth(0.2);
  const rowTop = y - rowH - 2;
  COL_DIVIDERS.forEach((x) => doc.line(x, rowTop, x, y));
  doc.line(15, y, pageWidth - 15, y);
  y += 2;
});

fs.writeFileSync('/tmp/test-layout.pdf', Buffer.from(doc.output('arraybuffer')));
console.log('PDF v2 gerado');
