'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserPermission extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  UserPermission.init({
    UserID: DataTypes.INTEGER,
    PermissionID: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'UserPermission',
  });
  UserPermission.associate = function(models) {
    UserPermission.belongsTo(models.Permission, { foreignKey: 'PermissionID' });
  };
  return UserPermission;
};