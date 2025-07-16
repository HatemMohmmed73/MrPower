'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Permissions', null, {});
    const now = new Date();
    await queryInterface.bulkInsert('Permissions', [
      { PermissionName: 'AddInvoice', createdAt: now, updatedAt: now },
      { PermissionName: 'DownloadInvoice', createdAt: now, updatedAt: now },
      { PermissionName: 'PrintInvoice', createdAt: now, updatedAt: now },
      { PermissionName: 'SearchClient', createdAt: now, updatedAt: now },
      { PermissionName: 'AddPurchasedItem', createdAt: now, updatedAt: now },
      { PermissionName: 'CreateInvoice', createdAt: now, updatedAt: now },
      { PermissionName: 'ManageInvoice', createdAt: now, updatedAt: now },
      { PermissionName: 'FullAccess', createdAt: now, updatedAt: now },
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Permissions', null, {});
  }
};
