const express = require('express');
const { ObjectId } = require('mongodb');
const { getSalesCollection } = require('../models/sale');
const { getMedicineCollection } = require('../models/medicine');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Record a single sale
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
    await medicines.updateOne(
      { _id: new ObjectId(medicineId) },
      { $inc: { quantity: -quantitySold }, $set: { updatedAt: new Date() } }
    );
    const sale = {
      medicineId: new ObjectId(medicineId),
      medicineName: medicine.name,
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

// Record multiple sales
router.post('/bulk', authenticateToken, authorizeRoles('owner', 'staff'), async (req, res) => {
    const { sales: salesItems } = req.body;
    if (!salesItems || !Array.isArray(salesItems) || salesItems.length === 0) {
        return res.status(400).json({ message: 'Sales array is required.' });
    }
    const db = req.app.locals.db;
    const medicines = getMedicineCollection(db);
    const sales = getSalesCollection(db);
    try {
        for (const item of salesItems) {
            const { medicineId, quantitySold } = item;
            const medicine = await medicines.findOne({ _id: new ObjectId(medicineId) });
            if (!medicine) throw new Error(`Medicine with ID ${medicineId} not found.`);
            if (medicine.quantity < quantitySold) throw new Error(`Not enough stock for ${medicine.name}.`);
            const sale = {
                medicineId: new ObjectId(medicineId),
                medicineName: medicine.name,
                quantitySold: Number(quantitySold),
                pricePerItem: medicine.price,
                totalPrice: medicine.price * Number(quantitySold),
                date: new Date()
            };
            await sales.insertOne(sale);
            await medicines.updateOne(
                { _id: new ObjectId(medicineId) },
                { $inc: { quantity: -quantitySold }, $set: { updatedAt: new Date() } }
            );
        }
        res.status(201).json({ message: 'Bulk sale recorded successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error during bulk sale', error: err.message });
    }
});

// GET /api/sales/report/custom - Get individual sales for a custom date range
// IMPORTANT: This route must come BEFORE the '/report' route.
router.get('/report/custom', authenticateToken, authorizeRoles('owner'), async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'startDate and endDate are required query parameters.' });
  }

  try {
    const db = req.app.locals.db;
    const sales = getSalesCollection(db);

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999); // Ensure the entire end day is included

    const salesRecords = await sales.find({
      date: {
        $gte: start,
        $lte: end
      }
    }).sort({ date: -1 }).toArray();

    res.json(salesRecords);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Get aggregated sales report (daily, weekly, monthly)
router.get('/report', authenticateToken, authorizeRoles('owner'), async (req, res) => {
  const { type } = req.query;
  const db = req.app.locals.db;
  const sales = getSalesCollection(db);
  let aggregationPipeline = [];

  try {
    switch (type) {
      case 'daily':
        aggregationPipeline = [
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, totalSales: { $sum: '$totalPrice' }, totalQuantity: { $sum: '$quantitySold' }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ];
        break;
      case 'weekly':
        aggregationPipeline = [
          { $group: { _id: { $dateTrunc: { date: "$date", unit: "week", startOfWeek: "Sunday" } }, totalSales: { $sum: '$totalPrice' }, totalQuantity: { $sum: '$quantitySold' }, count: { $sum: 1 } } },
          { $project: { _id: { $concat: [ { $dateToString: { format: "%Y-%m-%d", date: "$_id" } }, " to ", { $dateToString: { format: "%Y-%m-%d", date: { $add: ["$_id", 6 * 24 * 60 * 60 * 1000] } } } ] }, totalSales: 1, totalQuantity: 1, count: 1 } },
          { $sort: { _id: 1 } }
        ];
        break;
      case 'monthly':
        aggregationPipeline = [
          { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, totalSales: { $sum: '$totalPrice' }, totalQuantity: { $sum: '$quantitySold' }, count: { $sum: 1 } } },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
          { $project: { _id: { $dateToString: { format: "%B %Y", date: { $dateFromParts: { year: "$_id.year", month: "$_id.month", day: 1 } } } }, totalSales: 1, totalQuantity: 1, count: 1 } }
        ];
        break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }
    const report = await sales.aggregate(aggregationPipeline).toArray();
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;