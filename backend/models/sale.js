// Sales model for MongoDB (using native driver)

/**
 * Sale schema:
 * - medicineId: ObjectId (reference to medicines)
 * - quantitySold: Number
 * - date: Date
 * - totalPrice: Number
 */

const getSalesCollection = (db) => db.collection('sales');

module.exports = { getSalesCollection }; 