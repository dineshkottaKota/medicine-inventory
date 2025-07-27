// Medicine model for MongoDB (using native driver)

/**
 * Medicine schema:
 * - name: String
 * - quantity: Number
 * - expiryDate: Date
 * - price: Number
 * - createdAt: Date
 * - updatedAt: Date
 */

const getMedicineCollection = (db) => db.collection('medicines');

module.exports = { getMedicineCollection }; 