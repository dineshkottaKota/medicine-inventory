const path = require('node:path');
const { createRequire } = require('node:module');

const backendRequire = createRequire(path.resolve(__dirname, '../../../backend/package.json'));

const express = backendRequire('express');
const cors = backendRequire('cors');
const { MongoClient } = backendRequire('mongodb');
const request = backendRequire('supertest');

const authRoutes = require('../../../backend/routes/auth');
const medicineRoutes = require('../../../backend/routes/medicine');
const salesRoutes = require('../../../backend/routes/sales');

const DEFAULT_MONGO_BASE_URI =
  process.env.TEST_MONGO_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';

/**
 * Builds a unique MongoDB URI targeting an isolated temporary test database
 * so tests never mutate development data.
 */
function buildTestMongoUri() {
  const uniqueSuffix = `${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const dbName = `medicine_inventory_test_${uniqueSuffix}`;
  const url = new URL(DEFAULT_MONGO_BASE_URI);
  url.pathname = `/${dbName}`;
  return url.toString();
}

/**
 * Creates an Express application wired identically to backend/server.js.
 */
function createTestApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.locals.db = db;
  app.use('/api/auth', authRoutes);
  app.use('/api/medicines', medicineRoutes);
  app.use('/api/sales', salesRoutes);
  app.get('/', (req, res) => {
    res.send('Medicine Inventory System Backend');
  });
  return app;
}

/**
 * Connects to an isolated MongoDB test database and returns helpers to reset and tear down.
 */
async function setupTestContext() {
  const uri = buildTestMongoUri();
  const client = await MongoClient.connect(uri);
  const db = client.db();
  const app = createTestApp(db);

  async function clearCollections() {
    await Promise.all([
      db.collection('users').deleteMany({}),
      db.collection('medicines').deleteMany({}),
      db.collection('sales').deleteMany({}),
    ]);
  }

  async function teardown() {
    await db.dropDatabase();
    await client.close();
  }

  return { client, db, app, uri, clearCollections, teardown };
}

/**
 * Registers and logs in a user via the real auth endpoints and returns the JWT and user payload.
 */
async function registerAndLogin(app, overrides = {}) {
  const userPayload = {
    username: overrides.username || 'testuser',
    email: overrides.email || `user_${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: overrides.password || 'Secret123!',
    role: overrides.role || 'owner',
  };

  const registerRes = await request(app).post('/api/auth/register').send(userPayload);
  if (registerRes.status !== 201) {
    throw new Error(`Failed to register test user: ${registerRes.status} ${JSON.stringify(registerRes.body)}`);
  }

  const loginRes = await request(app).post('/api/auth/login').send({
    email: userPayload.email,
    password: userPayload.password,
  });
  if (loginRes.status !== 200) {
    throw new Error(`Failed to login test user: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
  }

  return {
    token: loginRes.body.token,
    user: loginRes.body.user,
    credentials: userPayload,
  };
}

/**
 * Inserts a medicine document directly into MongoDB for deterministic setup.
 */
async function seedMedicine(db, overrides = {}) {
  const now = new Date();
  const doc = {
    name: overrides.name || 'Paracetamol 500mg',
    quantity: overrides.quantity ?? 50,
    expiryDate: overrides.expiryDate ? new Date(overrides.expiryDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    price: overrides.price ?? 12.5,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
  const result = await db.collection('medicines').insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

/**
 * Inserts a sale document directly into MongoDB for reporting tests.
 */
async function seedSale(db, overrides = {}) {
  const doc = {
    medicineId: overrides.medicineId,
    medicineName: overrides.medicineName || 'Paracetamol 500mg',
    quantitySold: overrides.quantitySold ?? 2,
    totalPrice: overrides.totalPrice ?? 25,
    date: overrides.date ? new Date(overrides.date) : new Date(),
  };
  if (overrides.pricePerItem !== undefined) {
    doc.pricePerItem = overrides.pricePerItem;
  }
  const result = await db.collection('sales').insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

module.exports = {
  backendRequire,
  createTestApp,
  setupTestContext,
  registerAndLogin,
  seedMedicine,
  seedSale,
};
