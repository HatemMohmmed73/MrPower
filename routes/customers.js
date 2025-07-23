const express = require('express');
const router = express.Router();
const { Customer, Bill } = require('../models');

// Middleware to check login and permissions
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

// List/search customers
router.get('/', ensureLoggedIn, hasPermission('SearchClient'), async (req, res) => {
  const q = req.query.q || '';
  const customers = await Customer.findAll({
    where: q ? { Phone: { [require('sequelize').Op.iLike]: `%${q}%` } } : undefined,
    order: [['createdAt', 'DESC']]
  });
  res.render('customers/list', { customers, q });
});

// Add customer form
router.get('/add', ensureLoggedIn, hasPermission('ManageCustomer'), (req, res) => {
  res.render('customers/add');
});

// Add customer POST
router.post('/add', ensureLoggedIn, hasPermission('ManageCustomer'), async (req, res) => {
  const { FullName, Phone, Email, Address, Model, VIN } = req.body;
  await Customer.create({ FullName, Phone, Email, Address, Model, VIN });
  req.flash('success_msg', 'Customer added!');
  if (req.query.from === 'invoice') {
    return res.redirect('/invoices/create');
  }
  res.redirect('/customers');
});

// Edit customer form
router.get('/:id/edit', ensureLoggedIn, hasPermission('ManageCustomer'), async (req, res) => {
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) return res.redirect('/customers');
  res.render('customers/edit', { customer });
});

// Edit customer POST
router.post('/:id/edit', ensureLoggedIn, hasPermission('ManageCustomer'), async (req, res) => {
  const { FullName, Phone, Email, Address, Model, VIN } = req.body;
  await Customer.update({ FullName, Phone, Email, Address, Model, VIN }, { where: { id: req.params.id } });
  req.flash('success_msg', 'Customer updated!');
  res.redirect('/customers');
});

// Delete customer
router.post('/:id/delete', ensureLoggedIn, hasPermission('ManageCustomer'), async (req, res) => {
  await Customer.destroy({ where: { id: req.params.id } });
  req.flash('success_msg', 'Customer deleted!');
  res.redirect('/customers');
});

// View billing history
router.get('/:id/billing', ensureLoggedIn, hasPermission('SearchClient'), async (req, res) => {
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) return res.redirect('/customers');
  const bills = await Bill.findAll({ where: { CustomerID: customer.id }, order: [['BillDate', 'DESC']] });
  res.render('customers/billing', { customer, bills });
});

module.exports = router; 