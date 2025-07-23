'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Bill extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Bill.hasMany(models.BillItem, { foreignKey: 'billId' });
      Bill.belongsTo(models.Customer, { foreignKey: 'CustomerID' });
      Bill.belongsTo(models.UserAccount, { foreignKey: 'UserID' });
    }
  }
  Bill.init({
    CustomerID: DataTypes.INTEGER,
    UserID: DataTypes.INTEGER,
    BillDate: DataTypes.DATE,
    Status: DataTypes.STRING,
    TotalAmount: DataTypes.DECIMAL,
    Model: DataTypes.STRING,
    VIN: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Bill',
  });
  return Bill;
};