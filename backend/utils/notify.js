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
    expiryDate: {
      $lte: new Date(now.getTime() + NEAR_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    },
  }).toArray();

  const outOfStock = await medicines.find({
    quantity: { $lte: 0 },
  }).toArray();

  // Plain text fallback
  let plainText = '';
  if (outOfStock.length > 0) {
    plainText += 'Out of stock medicines:\n' + outOfStock.map(m => m.name).join(', ') + '\n\n';
  }
  if (nearExpiry.length > 0) {
    plainText += 'Near expiry medicines (within 30 days):\n' + nearExpiry.map(m => m.name).join(', ') + '\n';
  }

  if (plainText === '') return; // nothing to notify

  // HTML template
  let html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
      <h2 style="color: #d9534f;">🚨 Medicine Inventory Alert</h2>
  `;

  if (outOfStock.length > 0) {
    html += `
      <h3 style="color: #d9534f;">Out of Stock Medicines:</h3>
      <ul style="padding-left: 20px;">
        ${outOfStock.map(m => `<li>${m.name}</li>`).join('')}
      </ul>
    `;
  }

  if (nearExpiry.length > 0) {
    html += `
      <h3 style="color: #f0ad4e;">Near Expiry Medicines (within 30 days):</h3>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #ddd; padding: 8px;">Medicine</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Expiry Date</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Quantity</th>
          </tr>
        </thead>
        <tbody>
          ${nearExpiry.map(m => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${m.name}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${new Date(m.expiryDate).toLocaleDateString()}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${m.quantity}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  html += `
      <p style="margin-top: 20px;">Please log in to your dashboard for full details.</p>
      <p>— <strong>Medicine Inventory System</strong></p>
    </div>
  `;

  await sendEmail(owner.email, '📦 Medicine Inventory Alert', plainText, html);
}

module.exports = { notifyInventoryIssues };
