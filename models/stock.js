'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Stock extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Stock.hasMany(models.BillItem, { foreignKey: 'StockID' });
    }
  }
  Stock.init({
    ItemName: DataTypes.STRING,
    Description: DataTypes.STRING,
    Quantity: DataTypes.INTEGER,
    UnitPrice: DataTypes.DECIMAL,
    SellPrice: DataTypes.DECIMAL,
    CreatedAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Stock',
  });
  return Stock;
};