const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { backendRequire, setupTestContext, registerAndLogin, seedMedicine, seedSale } = require('./helpers/testApp');

const request = backendRequire('supertest');
const { ObjectId } = backendRequire('mongodb');

describe('Sales and Reporting routes (/api/sales)', () => {
  let ctx;
  let ownerToken;
  let staffToken;

  before(async () => {
    ctx = await setupTestContext();
  });

  beforeEach(async () => {
    await ctx.clearCollections();
    ({ token: ownerToken } = await registerAndLogin(ctx.app, {
      username: 'owner_sales',
      email: 'owner.sales@test.com',
      role: 'owner',
    }));
    ({ token: staffToken } = await registerAndLogin(ctx.app, {
      username: 'staff_sales',
      email: 'staff.sales@test.com',
      role: 'staff',
    }));
  });

  after(async () => {
    await ctx.teardown();
  });

  describe('POST /api/sales (single sale)', () => {
    it('records a sale, decrements stock, and calculates totalPrice', async () => {
      const med = await seedMedicine(ctx.db, { name: 'Vitamin D3', quantity: 10, price: 15.5 });

      const res = await request(ctx.app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ medicineId: med._id.toString(), quantitySold: 4 });

      assert.equal(res.status, 201);
      assert.deepEqual(res.body, { message: 'Sale recorded' });

      const updatedMed = await ctx.db.collection('medicines').findOne({ _id: med._id });
      assert.equal(updatedMed.quantity, 6);

      const sales = await ctx.db.collection('sales').find().toArray();
      assert.equal(sales.length, 1);
      assert.equal(sales[0].medicineId.toString(), med._id.toString());
      assert.equal(sales[0].medicineName, 'Vitamin D3');
      assert.equal(sales[0].quantitySold, 4);
      assert.equal(sales[0].totalPrice, 62);
      assert.ok(sales[0].date instanceof Date);
    });

    it('allows selling exact remaining stock down to 0', async () => {
      const med = await seedMedicine(ctx.db, { name: 'Last Pack', quantity: 3, price: 10 });

      const res = await request(ctx.app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ medicineId: med._id.toString(), quantitySold: 3 });

      assert.equal(res.status, 201);
      const updatedMed = await ctx.db.collection('medicines').findOne({ _id: med._id });
      assert.equal(updatedMed.quantity, 0);
    });

    it('validates required inputs, missing medicine, and insufficient stock', async () => {
      const med = await seedMedicine(ctx.db, { name: 'Cough Syrup', quantity: 2, price: 12 });

      const missingRes = await request(ctx.app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ medicineId: med._id.toString() });
      assert.equal(missingRes.status, 400);
      assert.deepEqual(missingRes.body, { message: 'medicineId and quantitySold required' });

      const notFoundRes = await request(ctx.app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ medicineId: new ObjectId().toString(), quantitySold: 1 });
      assert.equal(notFoundRes.status, 404);
      assert.deepEqual(notFoundRes.body, { message: 'Medicine not found' });

      const overStockRes = await request(ctx.app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ medicineId: med._id.toString(), quantitySold: 5 });
      assert.equal(overStockRes.status, 400);
      assert.deepEqual(overStockRes.body, { message: 'Not enough stock' });

      const unchangedMed = await ctx.db.collection('medicines').findOne({ _id: med._id });
      assert.equal(unchangedMed.quantity, 2);
      assert.equal(await ctx.db.collection('sales').countDocuments(), 0);
    });

    it('requires authentication', async () => {
      const res = await request(ctx.app).post('/api/sales').send({ medicineId: 'x', quantitySold: 1 });
      assert.equal(res.status, 401);
    });
  });

  describe('POST /api/sales/bulk (multi-item sale)', () => {
    it('records multiple sale items and decrements each medicine stock', async () => {
      const medA = await seedMedicine(ctx.db, { name: 'Paracetamol', quantity: 20, price: 2.5 });
      const medB = await seedMedicine(ctx.db, { name: 'Azithromycin', quantity: 10, price: 12.0 });

      const res = await request(ctx.app)
        .post('/api/sales/bulk')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          sales: [
            { medicineId: medA._id.toString(), quantitySold: 3 },
            { medicineId: medB._id.toString(), quantitySold: '2' },
          ],
        });

      assert.equal(res.status, 201);
      assert.deepEqual(res.body, { message: 'Bulk sale recorded successfully' });

      const updatedA = await ctx.db.collection('medicines').findOne({ _id: medA._id });
      const updatedB = await ctx.db.collection('medicines').findOne({ _id: medB._id });
      assert.equal(updatedA.quantity, 17);
      assert.equal(updatedB.quantity, 8);

      const salesDocs = await ctx.db.collection('sales').find().toArray();
      assert.equal(salesDocs.length, 2);

      const saleA = salesDocs.find((s) => s.medicineName === 'Paracetamol');
      const saleB = salesDocs.find((s) => s.medicineName === 'Azithromycin');
      assert.equal(saleA.quantitySold, 3);
      assert.equal(saleA.pricePerItem, 2.5);
      assert.equal(saleA.totalPrice, 7.5);
      assert.equal(saleB.quantitySold, 2);
      assert.equal(saleB.pricePerItem, 12);
      assert.equal(saleB.totalPrice, 24);
    });

    it('returns 400 when sales array is missing, not an array, or empty', async () => {
      for (const body of [{}, { sales: null }, { sales: 'invalid' }, { sales: [] }]) {
        const res = await request(ctx.app)
          .post('/api/sales/bulk')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send(body);

        assert.equal(res.status, 400);
        assert.deepEqual(res.body, { message: 'Sales array is required.' });
      }
    });

    it('returns 500 when a bulk sale item references a missing medicine or exceeds stock', async () => {
      const med = await seedMedicine(ctx.db, { name: 'Limited Med', quantity: 2, price: 5 });

      const missingRes = await request(ctx.app)
        .post('/api/sales/bulk')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ sales: [{ medicineId: new ObjectId().toString(), quantitySold: 1 }] });
      assert.equal(missingRes.status, 500);
      assert.equal(missingRes.body.message, 'Server error during bulk sale');
      assert.match(missingRes.body.error, /not found/i);

      const overStockRes = await request(ctx.app)
        .post('/api/sales/bulk')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ sales: [{ medicineId: med._id.toString(), quantitySold: 5 }] });
      assert.equal(overStockRes.status, 500);
      assert.equal(overStockRes.body.message, 'Server error during bulk sale');
      assert.match(overStockRes.body.error, /Not enough stock for Limited Med/i);
    });
  });

  describe('GET /api/sales/report/custom and /api/sales/report (owner-only)', () => {
    it('denies staff access to both /report and /report/custom with 403', async () => {
      const aggRes = await request(ctx.app)
        .get('/api/sales/report?type=daily')
        .set('Authorization', `Bearer ${staffToken}`);
      assert.equal(aggRes.status, 403);
      assert.deepEqual(aggRes.body, { message: 'Access denied' });

      const customRes = await request(ctx.app)
        .get('/api/sales/report/custom?startDate=2026-01-01&endDate=2026-01-31')
        .set('Authorization', `Bearer ${staffToken}`);
      assert.equal(customRes.status, 403);
      assert.deepEqual(customRes.body, { message: 'Access denied' });
    });

    it('GET /api/sales/report/custom validates dates and returns inclusive UTC range sorted descending', async () => {
      const missingRes = await request(ctx.app)
        .get('/api/sales/report/custom?startDate=2026-11-01')
        .set('Authorization', `Bearer ${ownerToken}`);
      assert.equal(missingRes.status, 400);
      assert.deepEqual(missingRes.body, {
        message: 'startDate and endDate are required query parameters.',
      });

      const medId = new ObjectId();
      await seedSale(ctx.db, {
        medicineId: medId,
        medicineName: 'Before Range',
        quantitySold: 1,
        totalPrice: 10,
        date: '2026-11-09T23:59:59.000Z',
      });
      await seedSale(ctx.db, {
        medicineId: medId,
        medicineName: 'Start Day Sale',
        quantitySold: 2,
        totalPrice: 20,
        date: '2026-11-10T00:00:00.000Z',
      });
      await seedSale(ctx.db, {
        medicineId: medId,
        medicineName: 'End Day Late Sale',
        quantitySold: 3,
        totalPrice: 30,
        date: '2026-11-12T23:59:59.000Z',
      });
      await seedSale(ctx.db, {
        medicineId: medId,
        medicineName: 'After Range',
        quantitySold: 1,
        totalPrice: 10,
        date: '2026-11-13T00:00:00.000Z',
      });

      const res = await request(ctx.app)
        .get('/api/sales/report/custom?startDate=2026-11-10&endDate=2026-11-12')
        .set('Authorization', `Bearer ${ownerToken}`);

      assert.equal(res.status, 200);
      assert.deepEqual(
        res.body.map((s) => s.medicineName),
        ['End Day Late Sale', 'Start Day Sale']
      );
    });

    it('GET /api/sales/report returns 400 for missing or invalid report type', async () => {
      for (const query of ['', '?type=yearly']) {
        const res = await request(ctx.app)
          .get(`/api/sales/report${query}`)
          .set('Authorization', `Bearer ${ownerToken}`);
        assert.equal(res.status, 400);
        assert.deepEqual(res.body, { message: 'Invalid report type' });
      }
    });

    it('GET /api/sales/report aggregates daily, weekly, and monthly sales accurately', async () => {
      const medId = new ObjectId();
      // Dec 2025 sale (Sunday 2025-12-28 to Saturday 2026-01-03)
      await seedSale(ctx.db, {
        medicineId: medId,
        medicineName: 'Med A',
        quantitySold: 2,
        totalPrice: 20,
        date: '2025-12-29T10:00:00.000Z',
      });
      // Two sales on same day in Nov 2026 (Sunday 2026-11-22 to Saturday 2026-11-28)
      await seedSale(ctx.db, {
        medicineId: medId,
        medicineName: 'Med B',
        quantitySold: 3,
        totalPrice: 45,
        date: '2026-11-24T09:00:00.000Z',
      });
      await seedSale(ctx.db, {
        medicineId: medId,
        medicineName: 'Med C',
        quantitySold: 1,
        totalPrice: 15,
        date: '2026-11-24T18:00:00.000Z',
      });
      await seedSale(ctx.db, {
        medicineId: medId,
        medicineName: 'Med D',
        quantitySold: 4,
        totalPrice: 80,
        date: '2026-11-26T12:00:00.000Z',
      });

      const dailyRes = await request(ctx.app)
        .get('/api/sales/report?type=daily')
        .set('Authorization', `Bearer ${ownerToken}`);
      assert.equal(dailyRes.status, 200);
      assert.deepEqual(dailyRes.body, [
        { _id: '2025-12-29', totalSales: 20, totalQuantity: 2, count: 1 },
        { _id: '2026-11-24', totalSales: 60, totalQuantity: 4, count: 2 },
        { _id: '2026-11-26', totalSales: 80, totalQuantity: 4, count: 1 },
      ]);

      const weeklyRes = await request(ctx.app)
        .get('/api/sales/report?type=weekly')
        .set('Authorization', `Bearer ${ownerToken}`);
      assert.equal(weeklyRes.status, 200);
      assert.deepEqual(weeklyRes.body, [
        { _id: '2025-12-28 to 2026-01-03', totalSales: 20, totalQuantity: 2, count: 1 },
        { _id: '2026-11-22 to 2026-11-28', totalSales: 140, totalQuantity: 8, count: 3 },
      ]);

      const monthlyRes = await request(ctx.app)
        .get('/api/sales/report?type=monthly')
        .set('Authorization', `Bearer ${ownerToken}`);
      assert.equal(monthlyRes.status, 200);
      assert.deepEqual(monthlyRes.body, [
        { _id: 'December 2025', totalSales: 20, totalQuantity: 2, count: 1 },
        { _id: 'November 2026', totalSales: 140, totalQuantity: 8, count: 3 },
      ]);
    });
  });
});
