const express = require('express');
const { ObjectId } = require('mongodb');
const { getSalesCollection } = require('../models/sale');
const { getMedicineCollection } = require('../models/medicine');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Record a sale
router.post('/', authenticateToken, authorizeRoles('owner', 'staff'), async (req, res) => {
  const { medicineId, quantitySold } = req.body;
  if (!medicineId || !quantitySold) {
    return res.status(400).json({ message: 'medicineId and quantitySold required' });
  }
  try {
    const db = req.app.locals.db;
    const medicines = getMedicineCollection(db);
    const sales = getSalesCollection(db);
    const medicine = await medicines.findOne({ _id: new ObjectId(medicineId) });
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }
    if (medicine.quantity < quantitySold) {
      return res.status(400).json({ message: 'Not enough stock' });
    }
    // Update medicine stock
    await medicines.updateOne(
      { _id: new ObjectId(medicineId) },
      { $inc: { quantity: -quantitySold }, $set: { updatedAt: new Date() } }
    );
    // Record sale
    const sale = {
      medicineId: new ObjectId(medicineId),
      quantitySold,
      date: new Date(),
      totalPrice: medicine.price * quantitySold
    };
    await sales.insertOne(sale);
    res.status(201).json({ message: 'Sale recorded' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get sales report (daily, weekly, monthly)
router.get('/report', authenticateToken, authorizeRoles('owner'), async (req, res) => {
  const { type } = req.query; // 'daily', 'weekly', 'monthly'
  let groupFormat;
  if (type === 'weekly') {
    groupFormat = { $isoWeek: '$date' };
  } else if (type === 'monthly') {
    groupFormat = { $month: '$date' };
  } else {
    groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
  }
  try {
    const db = req.app.locals.db;
    const sales = getSalesCollection(db);
    const report = await sales.aggregate([
      {
        $group: {
          _id: groupFormat,
          totalSales: { $sum: '$totalPrice' },
          totalQuantity: { $sum: '$quantitySold' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 