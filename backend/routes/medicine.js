const express = require('express');
const { ObjectId } = require('mongodb');
const { getMedicineCollection } = require('../models/medicine');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get all medicines
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const medicines = getMedicineCollection(db);
    const all = await medicines.find().toArray();
    res.json(all);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add a new medicine
router.post('/', authenticateToken, authorizeRoles('owner', 'staff'), async (req, res) => {
  const { name, quantity, expiryDate, price } = req.body;
  if (!name || quantity == null || !expiryDate || price == null) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const db = req.app.locals.db;
    const medicines = getMedicineCollection(db);
    const medicine = {
      name,
      quantity,
      expiryDate: new Date(expiryDate),
      price,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await medicines.insertOne(medicine);
    res.status(201).json({ message: 'Medicine added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update a medicine
router.put('/:id', authenticateToken, authorizeRoles('owner', 'staff'), async (req, res) => {
  const { id } = req.params;
  const { name, quantity, expiryDate, price } = req.body;
  try {
    const db = req.app.locals.db;
    const medicines = getMedicineCollection(db);
    const update = {
      ...(name && { name }),
      ...(quantity != null && { quantity }),
      ...(expiryDate && { expiryDate: new Date(expiryDate) }),
      ...(price != null && { price }),
      updatedAt: new Date()
    };
    const result = await medicines.updateOne({ _id: new ObjectId(id) }, { $set: update });
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Medicine not found' });
    }
    res.json({ message: 'Medicine updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a medicine (owner only)
router.delete('/:id', authenticateToken, authorizeRoles('owner'), async (req, res) => {
  const { id } = req.params;
  try {
    const db = req.app.locals.db;
    const medicines = getMedicineCollection(db);
    const result = await medicines.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Medicine not found' });
    }
    res.json({ message: 'Medicine deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 