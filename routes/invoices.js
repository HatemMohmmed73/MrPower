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
    where: q ? { BillNumber: { [Op.iLike]: `%${q}%` } } : undefined,
    include: [Customer],
    order: [['BillDate', 'DESC']]
  });
  res.render('invoices/list', { bills, q });
});

// Create invoice form
router.get('/create', ensureLoggedIn, hasPermission('AddInvoice'), async (req, res) => {
  const customers = await Customer.findAll();
  const stock = await Stock.findAll();
  // Get the latest bill number and increment
  const lastBill = await Bill.findOne({ order: [['createdAt', 'DESC']] });
  let nextBillNumber = '1001';
  if (lastBill && lastBill.BillNumber && !isNaN(Number(lastBill.BillNumber))) {
    nextBillNumber = String(Number(lastBill.BillNumber) + 1);
  }
  res.render('invoices/create', { customers, stock, nextBillNumber });
});

// Create invoice POST
router.post('/create', ensureLoggedIn, hasPermission('AddInvoice'), async (req, res) => {
  console.log('POST /invoices/create body:', req.body, 'session:', req.session.user);
  const { CustomerID, BillNumber, Model, VIN, items } = req.body;
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
    BillNumber,
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
  const bill = await Bill.findByPk(req.params.id, { include: [Customer, { model: BillItem, include: [Stock] }] });
  if (!bill) return res.status(404).send('Invoice not found');
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${bill.BillNumber || bill.id}.pdf`);
  doc.pipe(res);
  doc.fontSize(20).text('Invoice', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Bill #: ${bill.BillNumber}`);
  doc.text(`Date: ${bill.BillDate ? bill.BillDate.toISOString().slice(0,10) : ''}`);
  doc.text(`Customer: ${bill.Customer ? bill.Customer.FullName : ''}`);
  doc.text(`Model: ${bill.Model || ''}`);
  doc.text(`VIN: ${bill.VIN || ''}`);
  doc.moveDown();
  doc.text('Items:');
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Name', 50, doc.y, { continued: true });
  doc.text('Qty', 200, doc.y, { continued: true });
  doc.text('Unit Price', 250, doc.y, { continued: true });
  doc.text('Line Total', 350, doc.y);
  doc.font('Helvetica');
  bill.BillItems.forEach(item => {
    doc.text(item.Stock ? item.Stock.ItemName : '', 50, doc.y, { continued: true });
    doc.text(item.Quantity, 200, doc.y, { continued: true });
    doc.text(item.UnitPrice, 250, doc.y, { continued: true });
    doc.text(item.LineTotal, 350, doc.y);
  });
  doc.moveDown();
  doc.font('Helvetica-Bold').text(`Total: ${bill.TotalAmount}`, { align: 'right' });
  doc.end();
});

module.exports = router; 