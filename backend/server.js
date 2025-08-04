const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const { notifyInventoryIssues } = require('./utils/notify');
const cron = require('node-cron');

// Import routes at the top
const authRoutes = require('./routes/auth');
const medicineRoutes = require('./routes/medicine');
const salesRoutes = require('./routes/sales');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medicine_inventory';
const cors = require('cors');
app.use(cors());
app.use(express.json());

let db;
MongoClient.connect(MONGO_URI)
  .then(client => {
    db = client.db();
    app.locals.db = db;
    app.use('/api/auth', authRoutes);
    app.use('/api/medicines', medicineRoutes);
    app.use('/api/sales', salesRoutes);

    // Schedule daily notification job
    cron.schedule('19 17 * * *', async () => {
      try {
        await notifyInventoryIssues(db);
        console.log('Inventory notification sent');
      } catch (e) {
        console.error('Notification error:', e.message);
      }
    });

    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

app.get('/', (req, res) => {
  res.send('Medicine Inventory System Backend');
}); 
