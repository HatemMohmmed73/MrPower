// Example data seeder for Customer, Stock, Bill, BillItem
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Insert Customers
    await queryInterface.bulkInsert('Customers', [
      {
        FullName: 'John Doe',
        Phone: '555-1234',
        Email: 'john@example.com',
        Address: '123 Main St',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        FullName: 'Jane Smith',
        Phone: '555-5678',
        Email: 'jane@example.com',
        Address: '456 Oak Ave',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Insert Stock
    await queryInterface.bulkInsert('Stocks', [
      {
        ItemName: 'Battery 12V',
        Description: 'Car battery 12V 60Ah',
        Quantity: 10,
        UnitPrice: 2000.00,
        SellPrice: 2500.00,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        ItemName: 'Alternator',
        Description: 'Alternator for sedan',
        Quantity: 5,
        UnitPrice: 1500.00,
        SellPrice: 1800.00,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Get inserted Customer and Stock IDs
    const customers = await queryInterface.sequelize.query('SELECT id FROM "Customers" ORDER BY id ASC;', { type: Sequelize.QueryTypes.SELECT });
    const stocks = await queryInterface.sequelize.query('SELECT id FROM "Stocks" ORDER BY id ASC;', { type: Sequelize.QueryTypes.SELECT });

    // Insert Bills
    await queryInterface.bulkInsert('Bills', [
      {
        CustomerID: customers[0].id,
        UserID: 1, // Example user
        BillDate: new Date(),
        Status: 'paid',
        TotalAmount: 5000.00,
        BillNumber: 'INV-1001',
        Model: 'Toyota',
        VIN: 'VIN1234567890',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        CustomerID: customers[1].id,
        UserID: 1, // Example user
        BillDate: new Date(),
        Status: 'paid',
        TotalAmount: 1800.00,
        BillNumber: 'INV-1002',
        Model: 'Honda',
        VIN: 'VIN0987654321',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Get inserted Bill IDs
    const bills = await queryInterface.sequelize.query('SELECT id FROM "Bills" ORDER BY id ASC;', { type: Sequelize.QueryTypes.SELECT });

    // Insert BillItems
    await queryInterface.bulkInsert('BillItems', [
      {
        billId: bills[0].id,
        StockID: stocks[0].id,
        Quantity: 2,
        UnitPrice: 2500.00,
        LineTotal: 5000.00,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        billId: bills[1].id,
        StockID: stocks[1].id,
        Quantity: 1,
        UnitPrice: 1800.00,
        LineTotal: 1800.00,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('BillItems', null, {});
    await queryInterface.bulkDelete('Bills', null, {});
    await queryInterface.bulkDelete('Stocks', null, {});
    await queryInterface.bulkDelete('Customers', null, {});
  }
}; 