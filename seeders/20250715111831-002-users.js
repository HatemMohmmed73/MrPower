'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('UserAccounts', null, {});
    const now = new Date();
    await queryInterface.bulkInsert('UserAccounts', [
      {
        UserID: 9871,
        Username: 'Nimil',
        Password: '9871',
        Role: 'user',
        Email: 'nimil@mrpower.local',
        createdAt: now,
        updatedAt: now
      },
      {
        UserID: 9906,
        Username: 'Ahmed',
        Password: '9906',
        Role: 'user',
        Email: 'ahmed@mrpower.local',
        createdAt: now,
        updatedAt: now
      },
      {
        UserID: 1565,
        Username: 'Nawaf',
        Password: '1565',
        Role: 'admin',
        Email: 'nawaf@mrpower.local',
        createdAt: now,
        updatedAt: now
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('UserAccounts', null, {});
  }
};
