const { getMedicineCollection } = require('../models/medicine');
const { getUserCollection } = require('../models/user');
const { sendEmail } = require('./email');

const NEAR_EXPIRY_DAYS = 30;

async function notifyInventoryIssues(db) {
  const medicines = getMedicineCollection(db);
  const users = getUserCollection(db);
  const owner = await users.findOne({ role: 'owner' });
  if (!owner) return;
  const now = new Date();
  const nearExpiry = await medicines.find({
    expiryDate: { $lte: new Date(now.getTime() + NEAR_EXPIRY_DAYS * 24 * 60 * 60 * 1000) }
  }).toArray();
  const outOfStock = await medicines.find({ quantity: { $lte: 0 } }).toArray();
  let message = '';
  if (outOfStock.length > 0) {
    message += 'Out of stock medicines:\n' + outOfStock.map(m => m.name).join(', ') + '\n';
  }
  if (nearExpiry.length > 0) {
    message += 'Near expiry medicines (within 30 days):\n' + nearExpiry.map(m => m.name).join(', ') + '\n';
  }
  if (message) {
    await sendEmail(owner.email, 'Medicine Inventory Alert', message);
  }
}

module.exports = { notifyInventoryIssues }; 