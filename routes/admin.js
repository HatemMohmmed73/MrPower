const express = require('express');
const router = express.Router();
const { UserAccount, UserPermission, Permission, Customer, Bill } = require('../models');
const { fn, col } = require('sequelize');

function ensureLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}
function hasPermission(permission) {
  return (req, res, next) => {
    if (req.session.permissions && req.session.permissions.includes(permission)) return next();
    req.flash('error_msg', 'You do not have permission to access this feature.');
    res.redirect('/dashboard');
  };
}

// Admin panel
router.get('/', ensureLoggedIn, hasPermission('FullAccess'), async (req, res) => {
  const users = await UserAccount.findAll();
  const permissions = await Permission.findAll();
  const userPerms = await UserPermission.findAll();
  // Map userID to permission names
  const permsByUser = {};
  userPerms.forEach(up => {
    if (!permsByUser[up.UserID]) permsByUser[up.UserID] = [];
    const perm = permissions.find(p => p.PermissionID === up.PermissionID);
    if (perm) permsByUser[up.UserID].push(perm.PermissionName);
  });
  // Admin overview stats
  const totalCustomers = await Customer.count();
  const totalInvoices = await Bill.count();
  const totalRevenue = await Bill.sum('TotalAmount');

  // --- Reports Data ---
  const { BillItem, Stock } = require('../models');
  const { Op, fn, col, literal } = require('sequelize');
  // Sales summary
  const totalSales = totalRevenue;
  // Low stock alerts (quantity <= 5)
  const lowStock = await Stock.findAll({ where: { Quantity: { [Op.lte]: 5 } } });
  // Sales breakdown by date (last 30 days)
  const salesByDate = await Bill.findAll({
    attributes: [
      [fn('DATE', col('BillDate')), 'date'],
      [fn('SUM', col('TotalAmount')), 'total']
    ],
    group: [literal('date')],
    order: [[literal('date'), 'DESC']],
    where: { BillDate: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    raw: true
  });
  // Sales breakdown by customer
  const salesByCustomer = await Bill.findAll({
    attributes: [
      'CustomerID',
      [fn('SUM', col('TotalAmount')), 'total']
    ],
    include: [{ model: Customer, attributes: ['FullName'] }],
    group: ['Customer.id', 'Bill.CustomerID'],
    order: [[fn('SUM', col('TotalAmount')), 'DESC']],
    raw: true,
    nest: true
  });
  // Sales breakdown by stock item
  const salesByItem = await BillItem.findAll({
    attributes: [
      'StockID',
      [fn('SUM', col('LineTotal')), 'total'],
      [fn('SUM', col('BillItem.Quantity')), 'quantity']
    ],
    include: [{ model: Stock, attributes: ['ItemName'] }],
    group: ['Stock.id', 'BillItem.StockID'],
    order: [[fn('SUM', col('LineTotal')), 'DESC']],
    raw: true,
    nest: true
  });

  // Calculate completedInvoicesPercent (assuming Bill.Status === 'Completed')
  const completedCount = await Bill.count({ where: { Status: 'Completed' } });
  const completedInvoicesPercent = totalInvoices > 0 ? Math.round((completedCount / totalInvoices) * 100) : 0;
  // Calculate newInvoicesToday
  const today = new Date();
  today.setHours(0,0,0,0);
  const newInvoicesToday = await Bill.count({ where: { BillDate: { [Op.gte]: today } } });

  // Calculate today's sales and invoices
  const todaySales = await Bill.sum('TotalAmount', { where: { BillDate: { [Op.gte]: today } } }) || 0;
  const todayInvoices = await Bill.count({ where: { BillDate: { [Op.gte]: today } } });

  res.render('admin/index', {
    users,
    permsByUser,
    totalCustomers,
    totalInvoices,
    totalRevenue,
    totalSales,
    lowStock,
    salesByDate,
    salesByCustomer,
    salesByItem,
    completedInvoicesPercent,
    newInvoicesToday,
    todaySales,
    todayInvoices
  });
});

module.exports = router; 