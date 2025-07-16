'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('UserPermissions', null, {});
    const now = new Date();
    await queryInterface.bulkInsert('UserPermissions', [
      // Nimil (9871): AddInvoice, DownloadInvoice, PrintInvoice, SearchClient
      { UserID: 9871, PermissionID: 1, createdAt: now, updatedAt: now }, // AddInvoice
      { UserID: 9871, PermissionID: 2, createdAt: now, updatedAt: now }, // DownloadInvoice
      { UserID: 9871, PermissionID: 3, createdAt: now, updatedAt: now }, // PrintInvoice
      { UserID: 9871, PermissionID: 4, createdAt: now, updatedAt: now }, // SearchClient
      // Ahmed (9906): AddPurchasedItem, CreateInvoice, ManageInvoice (not delete)
      { UserID: 9906, PermissionID: 5, createdAt: now, updatedAt: now }, // AddPurchasedItem
      { UserID: 9906, PermissionID: 6, createdAt: now, updatedAt: now }, // CreateInvoice
      { UserID: 9906, PermissionID: 7, createdAt: now, updatedAt: now }, // ManageInvoice
      // Nawaf (1565): FullAccess (all operations)
      { UserID: 1565, PermissionID: 8, createdAt: now, updatedAt: now }, // FullAccess
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('UserPermissions', null, {});
  }
};
