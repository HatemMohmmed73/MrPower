'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Customer.hasMany(models.Bill, { foreignKey: 'CustomerID' });
    }
  }
  Customer.init({
    FullName: DataTypes.STRING,
    Phone: DataTypes.STRING,
    Email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    Address: DataTypes.STRING,
    Model: DataTypes.STRING,
    VIN: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Customer',
  });
  return Customer;
};