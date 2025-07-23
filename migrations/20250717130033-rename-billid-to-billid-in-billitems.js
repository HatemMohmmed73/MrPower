'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Rename column BillID to billId if it exists
    // This is safe for Postgres; if the column does not exist, it will throw, so we check first
    const table = await queryInterface.describeTable('BillItems');
    if (table.BillID) {
      await queryInterface.renameColumn('BillItems', 'BillID', 'billId');
    }
    // Reset the Bills id sequence to start from 1
    await queryInterface.sequelize.query('ALTER SEQUENCE "Bills_id_seq" RESTART WITH 1;');
  },

  async down (queryInterface, Sequelize) {
    // Revert the column name if needed
    const table = await queryInterface.describeTable('BillItems');
    if (table.billId && !table.BillID) {
      await queryInterface.renameColumn('BillItems', 'billId', 'BillID');
    }
  }
};
