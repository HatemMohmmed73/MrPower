const express = require('express');
const router = express.Router();
const { Stock } = require('../models');
const { Op } = require('sequelize');

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

// List/search stock items
router.get('/', ensureLoggedIn, hasPermission('ManageStock'), async (req, res) => {
  const q = req.query.q || '';
  const items = await Stock.findAll({
    where: q ? { ItemName: { [Op.iLike]: `%${q}%` } } : undefined,
    order: [['createdAt', 'DESC']]
  });
  res.render('stock/list', { items, q });
});

// Add stock item form
router.get('/add', ensureLoggedIn, hasPermission('ManageStock'), (req, res) => {
  res.render('stock/add');
});

// Add stock item POST
router.post('/add', ensureLoggedIn, hasPermission('ManageStock'), async (req, res) => {
  const { ItemName, Description, Quantity, UnitPrice, SellPrice } = req.body;
  await Stock.create({ ItemName, Description, Quantity, UnitPrice, SellPrice });
  req.flash('success_msg', 'Stock item added!');
  res.redirect('/stock');
});

// Edit stock item form
router.get('/:id/edit', ensureLoggedIn, hasPermission('ManageStock'), async (req, res) => {
  const item = await Stock.findByPk(req.params.id);
  if (!item) return res.redirect('/stock');
  res.render('stock/edit', { item });
});

// Edit stock item POST
router.post('/:id/edit', ensureLoggedIn, hasPermission('ManageStock'), async (req, res) => {
  const { ItemName, Description, Quantity, UnitPrice, SellPrice } = req.body;
  await Stock.update({ ItemName, Description, Quantity, UnitPrice, SellPrice }, { where: { StockID: req.params.id } });
  req.flash('success_msg', 'Stock item updated!');
  res.redirect('/stock');
});

// Delete stock item
router.post('/:id/delete', ensureLoggedIn, hasPermission('ManageStock'), async (req, res) => {
  await Stock.destroy({ where: { StockID: req.params.id } });
  req.flash('success_msg', 'Stock item deleted!');
  res.redirect('/stock');
});

module.exports = router; 