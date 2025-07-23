const express = require('express');
const router = express.Router();
const { Bill, BillItem, Stock, Customer } = require('../models');
const PDFDocument = require('pdfkit');
const { Op, fn, col, literal } = require('sequelize');
const { Parser } = require('json2csv');

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

// Reports page
router.get('/', ensureLoggedIn, hasPermission('ViewReports'), async (req, res) => {
  // Only include real data: bills after 2024-01-01
  const realDataStart = new Date('2024-01-01');

  // Sales summary
  const totalSales = await Bill.sum('TotalAmount', { where: { BillDate: { [Op.gte]: realDataStart } } });
  const totalInvoices = await Bill.count({ where: { BillDate: { [Op.gte]: realDataStart } } });
  // Low stock alerts (quantity <= 5)
  const lowStock = await Stock.findAll({ where: { Quantity: { [Op.lte]: 5 } } });

  // Sales breakdown by date (last 30 days, but only real data)
  const salesByDate = await Bill.findAll({
    attributes: [
      [fn('DATE', col('BillDate')), 'date'],
      [fn('SUM', col('TotalAmount')), 'total']
    ],
    group: [literal('date')],
    order: [[literal('date'), 'DESC']],
    where: {
      BillDate: {
        [Op.and]: [
          { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          { [Op.gte]: realDataStart }
        ]
      }
    },
    raw: true
  });

  // Sales breakdown by customer (only real data)
  const salesByCustomer = await Bill.findAll({
    attributes: [
      'CustomerID',
      [fn('SUM', col('TotalAmount')), 'total']
    ],
    include: [{ model: Customer, attributes: ['FullName'] }],
    group: ['Customer.id', 'Bill.CustomerID'],
    order: [[fn('SUM', col('TotalAmount')), 'DESC']],
    raw: true,
    nest: true,
    where: { BillDate: { [Op.gte]: realDataStart } }
  });

  // Sales breakdown by stock item (only real data)
  const salesByItem = await BillItem.findAll({
    attributes: [
      'StockID',
      [fn('SUM', col('LineTotal')), 'total'],
      [fn('SUM', col('BillItem.Quantity')), 'quantity']
    ],
    include: [
      { model: Stock, attributes: ['ItemName'] },
      { model: Bill, attributes: [], required: true, where: { BillDate: { [Op.gte]: realDataStart } } }
    ],
    group: ['Stock.id', 'BillItem.StockID'],
    order: [[fn('SUM', col('LineTotal')), 'DESC']],
    raw: true,
    nest: true
  });

  res.render('reports/index', {
    totalSales,
    totalInvoices,
    lowStock,
    salesByDate,
    salesByCustomer,
    salesByItem
  });
});

// Export as CSV
router.get('/export/csv', ensureLoggedIn, hasPermission('ViewReports'), async (req, res) => {
  // Reuse the same queries as above
  const totalSales = await Bill.sum('TotalAmount');
  const totalInvoices = await Bill.count();
  const lowStock = await Stock.findAll({ where: { Quantity: { [Op.lte]: 5 } }, raw: true });
  const salesByDate = await Bill.findAll({
    attributes: [[fn('DATE', col('BillDate')), 'date'], [fn('SUM', col('TotalAmount')), 'total']],
    group: [literal('date')],
    order: [[literal('date'), 'DESC']],
    where: { BillDate: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    raw: true
  });
  const salesByCustomer = await Bill.findAll({
    attributes: ['CustomerID', [fn('SUM', col('TotalAmount')), 'total']],
    include: [{ model: Customer, attributes: ['FullName'] }],
    group: ['Customer.id', 'Bill.CustomerID'],
    order: [[fn('SUM', col('TotalAmount')), 'DESC']],
    raw: true,
    nest: true
  });
  const salesByItem = await BillItem.findAll({
    attributes: ['StockID', [fn('SUM', col('LineTotal')), 'total'], [fn('SUM', col('BillItem.Quantity')), 'quantity']],
    include: [{ model: Stock, attributes: ['ItemName'] }],
    group: ['Stock.id', 'BillItem.StockID'],
    order: [[fn('SUM', col('LineTotal')), 'DESC']],
    raw: true,
    nest: true
  });
  const data = {
    totalSales,
    totalInvoices,
    lowStock,
    salesByDate,
    salesByCustomer,
    salesByItem
  };
  const parser = new Parser();
  const csv = parser.parse(data);
  res.header('Content-Type', 'text/csv');
  res.attachment('mrpower-report.csv');
  return res.send(csv);
});

// Export as PDF
router.get('/export/pdf', ensureLoggedIn, hasPermission('ViewReports'), async (req, res) => {
  const totalSales = await Bill.sum('TotalAmount');
  const totalInvoices = await Bill.count();
  const lowStock = await Stock.findAll({ where: { Quantity: { [Op.lte]: 5 } }, raw: true });
  const salesByDate = await Bill.findAll({
    attributes: [[fn('DATE', col('BillDate')), 'date'], [fn('SUM', col('TotalAmount')), 'total']],
    group: [literal('date')],
    order: [[literal('date'), 'DESC']],
    where: { BillDate: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    raw: true
  });
  const salesByCustomer = await Bill.findAll({
    attributes: ['CustomerID', [fn('SUM', col('TotalAmount')), 'total']],
    include: [{ model: Customer, attributes: ['FullName'] }],
    group: ['Customer.id', 'Bill.CustomerID'],
    order: [[fn('SUM', col('TotalAmount')), 'DESC']],
    raw: true,
    nest: true
  });
  const salesByItem = await BillItem.findAll({
    attributes: ['StockID', [fn('SUM', col('LineTotal')), 'total'], [fn('SUM', col('BillItem.Quantity')), 'quantity']],
    include: [{ model: Stock, attributes: ['ItemName'] }],
    group: ['Stock.id', 'BillItem.StockID'],
    order: [[fn('SUM', col('LineTotal')), 'DESC']],
    raw: true,
    nest: true
  });
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=mrpower-report.pdf');
  doc.fontSize(20).text('MR POWER SYSTEM REPORT', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Total Revenue: ${totalSales}`);
  doc.text(`Total Invoices: ${totalInvoices}`);
  doc.moveDown();
  doc.fontSize(16).text('Sales by Date:', { underline: true });
  salesByDate.forEach(row => doc.text(`${row.date}: ${row.total}`));
  doc.moveDown();
  doc.fontSize(16).text('Sales by Customer:', { underline: true });
  salesByCustomer.forEach(row => doc.text(`${row['Customer.FullName'] || row['Customer']?.FullName || row.CustomerID}: ${row.total}`));
  doc.moveDown();
  doc.fontSize(16).text('Sales by Item:', { underline: true });
  salesByItem.forEach(row => doc.text(`${row['Stock.ItemName'] || row['Stock']?.ItemName || row.StockID}: ${row.total} (Qty: ${row.quantity})`));
  doc.moveDown();
  doc.fontSize(16).text('Low Stock:', { underline: true });
  lowStock.forEach(item => doc.text(`${item.ItemName}: ${item.Quantity}`));
  doc.end();
  doc.pipe(res);
});

module.exports = router; 