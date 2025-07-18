'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BillItem extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      BillItem.belongsTo(models.Bill, { foreignKey: 'billId' });
      BillItem.belongsTo(models.Stock, { foreignKey: 'StockID' });
    }
  }
  BillItem.init({
    billId: DataTypes.INTEGER,
    StockID: DataTypes.INTEGER,
    Quantity: DataTypes.INTEGER,
    UnitPrice: DataTypes.DECIMAL,
    LineTotal: DataTypes.DECIMAL
  }, {
    sequelize,
    modelName: 'BillItem',
  });
  return BillItem;
};