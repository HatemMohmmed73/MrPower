const express = require('express');
const router = express.Router();
const { Bill, BillItem, Customer, Stock } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');

function ensureLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}
function hasPermission(permission) {
  return (req, res, next) => {
    if (
      req.session.permissions &&
      (req.session.permissions.includes('FullAccess') || req.session.permissions.includes(permission))
    ) {
      return next();
    }
    return res.status(403).render('access-denied');
  };
}

// List/search invoices
router.get('/', ensureLoggedIn, (req, res, next) => {
  if (
    req.session.permissions &&
    (req.session.permissions.includes('FullAccess') || req.session.permissions.includes('ManageInvoice') || req.session.permissions.includes('AddInvoice'))
  ) {
    return next();
  }
  return res.status(403).render('access-denied');
}, async (req, res) => {
  const q = req.query.q || '';
  const bills = await Bill.findAll({
    where: q ? { id: { [Op.eq]: Number(q) } } : undefined,
    include: [Customer],
    order: [['BillDate', 'DESC']]
  });
  res.render('invoices/list', { bills, q });
});

// Create invoice form
router.get('/create', ensureLoggedIn, hasPermission('AddInvoice'), async (req, res) => {
  const customers = await Customer.findAll();
  // Only get stock items with quantity greater than 0
  const stock = await Stock.findAll({
    where: {
      Quantity: {
        [require('sequelize').Op.gt]: 0
      }
    }
  });
  res.render('invoices/create', { customers, stock });
});

// Create invoice POST
router.post('/create', ensureLoggedIn, hasPermission('AddInvoice'), async (req, res) => {
  console.log('POST /invoices/create body:', req.body, 'session:', req.session.user);
  const { CustomerID, Model, VIN, items } = req.body;
  const userID = req.session.user && req.session.user.UserID;
  const customerIdInt = parseInt(CustomerID, 10);
  if (!customerIdInt) {
    return res.status(400).send('Error: Customer is required and must be valid.');
  }
  if (!userID || isNaN(Number(userID))) {
    return res.status(400).send('Error: User is not logged in or invalid.');
  }

  // --- Debug log for items ---
  console.log('RAW items:', items, 'Type:', typeof items);

  let itemsArray = [];
  if (Array.isArray(items)) {
    itemsArray = items;
  } else if (typeof items === 'object' && items !== null) {
    itemsArray = Object.values(items).filter(v => typeof v === 'object' && v !== null);
  }
  itemsArray = itemsArray.filter(item => item && item.StockID && item.StockID !== 'undefined' && item.StockID !== '');
  console.log('Normalized Items:', itemsArray, 'Type:', typeof itemsArray, 'Length:', itemsArray.length);

  const bill = await Bill.create({
    CustomerID: customerIdInt,
    UserID: userID,
    Model,
    VIN,
    Status: 'paid',
    BillDate: new Date(),
    TotalAmount: 0 // will update after items
  });
  let total = 0;
  for (const item of itemsArray) {
    if (!item || !item.StockID) continue;
    const stockItem = await Stock.findByPk(item.StockID);
    if (!stockItem) continue;
    const qty = parseInt(item.Quantity, 10) || 1;
    const unitPrice = parseFloat(item.UnitPrice) || stockItem.SellPrice;
    const lineTotal = qty * unitPrice;
    await BillItem.create({ billId: bill.id, StockID: item.StockID, Quantity: qty, UnitPrice: unitPrice, LineTotal: lineTotal });
    total += lineTotal;
    // Optionally update stock quantity
    stockItem.Quantity -= qty;
    await stockItem.save();
  }
  bill.TotalAmount = total;
  await bill.save();
  req.flash('success_msg', 'Invoice created!');
  res.redirect('/invoices');
});

// Delete invoice
router.post('/:id/delete', ensureLoggedIn, hasPermission('DeleteInvoice'), async (req, res) => {
  await Bill.destroy({ where: { id: req.params.id } });
  req.flash('success_msg', 'Invoice deleted!');
  res.redirect('/invoices');
});

// Show invoice (fly-in/printable)
router.get('/:id', ensureLoggedIn, async (req, res) => {
  const bill = await Bill.findByPk(req.params.id, { include: [Customer, { model: BillItem, include: [Stock] }] });
  if (!bill) return res.status(404).render('404');
  res.render('invoices/show', { bill });
});
// Print invoice (same as show, but can add print-specific logic if needed)
router.get('/:id/print', ensureLoggedIn, async (req, res) => {
  const bill = await Bill.findByPk(req.params.id, { include: [Customer, { model: BillItem, include: [Stock] }] });
  if (!bill) return res.status(404).render('404');
  res.render('invoices/show', { bill });
});

// Download invoice PDF
router.get('/:id/download', ensureLoggedIn, hasPermission('DownloadInvoice'), async (req, res) => {
  const bill = await Bill.findByPk(req.params.id, { 
    include: [
      Customer, 
      { model: BillItem, as: 'BillItems', include: [Stock] }
    ]
  });
  if (!bill) return res.status(404).send('Invoice not found');
  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${bill.id}.pdf`);
  doc.pipe(res);

  // --- Header with Logo, Company Name, and Invoice Number ---
  const logoX = 30, logoY = 40, logoW = 120, logoH = 80;
  try {
    doc.image('public/images/invoicelogo.png', logoX, logoY, { width: logoW, height: logoH });
  } catch (e) {}

  // Company name and tagline to the right of the logo
  const headerLeft = logoX + logoW + 20;
  const headerTop = logoY + 10;
  doc.fontSize(24).font('Helvetica-Bold').text('MR POWER', headerLeft, headerTop, { continued: false });
  doc.fontSize(14).font('Helvetica').text('VEHICLE REPAIR & MAINTENANCE', headerLeft, doc.y + 2);

  // Invoice number at top right
  doc.fontSize(18).fillColor('#e53935').font('Helvetica-Bold').text(`INVOICE : ${bill.id}`, 400, logoY, { align: 'right' });
  doc.fillColor('#000');

  // --- Customer & Vehicle Info Block ---
  let infoY = logoY + logoH + 10;
  doc.font('Helvetica-Bold').fontSize(12);
  const infoBlock = [
    ['DATE:', bill.BillDate ? bill.BillDate.toISOString().slice(0,10).split('-').reverse().join('/') : ''],
    ['NAME:', bill.Customer ? bill.Customer.FullName : ''],
    ['MODEL:', bill.Model || (bill.Customer && bill.Customer.Model) || ''],
    ['VIN:', bill.VIN || (bill.Customer && bill.Customer.VIN) || '0'],
    ['PHONE:', bill.Customer ? bill.Customer.Phone : '']
  ];
  infoBlock.forEach(([label, value]) => {
    doc.text(label, 30, infoY, { continued: true }).font('Helvetica').text(value, { continued: false });
    infoY = doc.y + 5;
    doc.font('Helvetica-Bold');
  });
  doc.moveDown(1);

  // --- Items Table ---
  const tableTop = infoY + 10;
  const col = {
    no: 30,
    desc: 70,
    unit: 300,
    qty: 390,
    total: 470
  };
  // Table Header
  doc.font('Helvetica-Bold').fontSize(11);
  doc.rect(30, tableTop, 510, 24).fillAndStroke('#e0e0e0', '#bbb');
  doc.fillColor('#000');
  doc.text('NO:', col.no, tableTop + 6, { width: 35, align: 'center' });
  doc.text('DESCRIPTION', col.desc, tableTop + 6, { width: 220, align: 'left' });
  doc.text('UNIT PRICE', col.unit, tableTop + 6, { width: 80, align: 'right' });
  doc.text('QTY', col.qty, tableTop + 6, { width: 50, align: 'center' });
  doc.text('PRICE', col.total, tableTop + 6, { width: 70, align: 'right' });
  // Draw vertical borders for header
  doc.moveTo(col.desc, tableTop).lineTo(col.desc, tableTop + 24).stroke('#bbb');
  doc.moveTo(col.unit, tableTop).lineTo(col.unit, tableTop + 24).stroke('#bbb');
  doc.moveTo(col.qty, tableTop).lineTo(col.qty, tableTop + 24).stroke('#bbb');
  doc.moveTo(col.total, tableTop).lineTo(col.total, tableTop + 24).stroke('#bbb');
  doc.moveTo(30, tableTop + 24).lineTo(540, tableTop + 24).stroke('#bbb');

  // Table Rows
  let y = tableTop + 24;
  doc.font('Helvetica').fontSize(10);
  if (bill.BillItems && bill.BillItems.length > 0) {
    bill.BillItems.forEach((item, idx) => {
      doc.rect(30, y, 510, 20).fill('#fff').stroke('#eee');
      doc.fillColor('#000');
      doc.text(idx + 1, col.no, y + 6, { width: 35, align: 'center' });
      doc.text(item.Stock ? item.Stock.ItemName : '', col.desc, y + 6, { width: 220, align: 'left' });
      doc.text(Number(item.UnitPrice).toFixed(3), col.unit, y + 6, { width: 80, align: 'right' });
      doc.text(item.Quantity, col.qty, y + 6, { width: 50, align: 'center' });
      doc.text(Number(item.LineTotal).toFixed(3), col.total, y + 6, { width: 70, align: 'right' });
      // Draw vertical borders for each row
      doc.moveTo(col.desc, y).lineTo(col.desc, y + 20).stroke('#eee');
      doc.moveTo(col.unit, y).lineTo(col.unit, y + 20).stroke('#eee');
      doc.moveTo(col.qty, y).lineTo(col.qty, y + 20).stroke('#eee');
      doc.moveTo(col.total, y).lineTo(col.total, y + 20).stroke('#eee');
      y += 20;
    });
  } else {
    doc.rect(30, y, 510, 20).fill('#fff').stroke('#eee');
    doc.fillColor('#000');
    doc.text('No items found.', col.desc, y + 6, { width: 220, align: 'left' });
    doc.moveTo(col.desc, y).lineTo(col.desc, y + 20).stroke('#eee');
    doc.moveTo(col.unit, y).lineTo(col.unit, y + 20).stroke('#eee');
    doc.moveTo(col.qty, y).lineTo(col.qty, y + 20).stroke('#eee');
    doc.moveTo(col.total, y).lineTo(col.total, y + 20).stroke('#eee');
    y += 20;
  }

  // --- Total & Signature ---
  y += 20;
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#000');
  doc.text(`TOTAL : ${Number(bill.TotalAmount).toFixed(3)} OMR`, 30, y, { width: 250, align: 'left' });
  doc.text('SIGNATURE:', 320, y, { width: 220, align: 'right' });

  // --- Notes Section at Bottom ---
  const pageHeight = doc.page.height - doc.page.margins.bottom;
  let noteY = pageHeight - 80;
  doc.font('Helvetica').fontSize(10).fillColor('#000');
  doc.text('NOTE:', 30, noteY, { align: 'center', width: 510 });
  noteY += 15;
  doc.font('Helvetica-Bold').text('THANK YOU FOR YOUR VISIT', 30, noteY, { align: 'center', width: 510 });
  noteY += 15;
  doc.font('Helvetica').text('+968 92025455   90606776', 30, noteY, { align: 'center', width: 510 });
  noteY += 15;
  doc.text('Nizwa Karsha industrial', 30, noteY, { align: 'center', width: 510 });

  doc.end();
});

module.exports = router; 