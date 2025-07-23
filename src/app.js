const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const { UserAccount, UserPermission, Permission } = require('../models');
require('dotenv').config();
const customersRouter = require('../routes/customers');
const stockRouter = require('../routes/stock');
const invoicesRouter = require('../routes/invoices');
const reportsRouter = require('../routes/reports');
const adminRouter = require('../routes/admin');

const app = express();

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Static files (for CSS, JS, images)
app.use(express.static(path.join(__dirname, '../public')));

// Body parser
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'mrpowersecret',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

// Prevent caching of protected pages
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});
// Inject user and permissions into all EJS views
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.permissions = req.session.permissions || [];
  next();
});

// Redirect root to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Login POST handler
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await UserAccount.findOne({ where: { Username: username } });
    if (!user || user.Password !== password) {
      req.flash('error_msg', 'Invalid username or password');
      return res.redirect('/login');
    }
    // Hardcoded permissions for each user
    let permissionNames = [];
    if (user.Username === 'Nawaf') {
      permissionNames = ['FullAccess'];
    } else if (user.Username === 'Nimil') {
      permissionNames = ['AddInvoice', 'DownloadInvoice', 'PrintInvoice', 'SearchClient', 'ManageCustomer'];
    } else if (user.Username === 'Ahmed') {
      permissionNames = [
        'AddInvoice',
        'DownloadInvoice',
        'PrintInvoice',
        'SearchClient',
        'ManageCustomer',
        'AddPurchasedItem',
        'CreateInvoice',
        'ManageInvoice',
        'ViewReports',
        'ManageStock'
      ];
    }
    req.session.user = {
      UserID: user.UserID,
      Username: user.Username,
      Role: user.Role
    };
    req.session.permissions = permissionNames;
    res.redirect('/dashboard');
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    req.flash('error_msg', 'Login error');
    res.redirect('/login');
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Auth middleware
function ensureLoggedIn(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// Permission middleware
function hasPermission(permission) {
  return (req, res, next) => {
    if (
      req.session.permissions &&
      (req.session.permissions.includes('FullAccess') || req.session.permissions.includes(permission))
    ) {
      return next();
    }
    // Render access denied page
    return res.status(403).render('access-denied');
  };
}

// Dashboard (protected)
app.get('/dashboard', ensureLoggedIn, async (req, res) => {
  const { Bill, BillItem, Stock, Customer } = require('../models');
  const { Op, fn, col, literal } = require('sequelize');
  // Sales summary
  const totalSales = await Bill.sum('TotalAmount');
  const totalInvoices = await Bill.count();
  // Low stock alerts (quantity <= 5)
  const lowStock = await Stock.findAll({ where: { Quantity: { [Op.lte]: 5 } } });
  // Today's sales and invoices
  const today = new Date();
  today.setHours(0,0,0,0);
  const todaySales = await Bill.sum('TotalAmount', { where: { BillDate: { [Op.gte]: today } } }) || 0;
  const todayInvoices = await Bill.count({ where: { BillDate: { [Op.gte]: today } } });
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
  res.render('dashboard', {
    user: req.session.user,
    permissions: req.session.permissions,
    totalSales,
    totalInvoices,
    lowStock,
    todaySales,
    todayInvoices,
    salesByDate,
    salesByCustomer,
    salesByItem
  });
});

app.use('/customers', customersRouter);
app.use('/stock', stockRouter);
app.use('/invoices', invoicesRouter);
app.use('/reports', reportsRouter);
app.use('/admin', adminRouter);

// 404 handler (should be last)
app.use((req, res) => {
  res.status(404).render('404');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MR Power System running on http://localhost:${PORT}`);
});
