const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { backendRequire, setupTestContext, registerAndLogin, seedMedicine } = require('./helpers/testApp');

const request = backendRequire('supertest');
const { ObjectId } = backendRequire('mongodb');
const jwt = backendRequire('jsonwebtoken');

describe('Medicine CRUD and RBAC routes (/api/medicines)', () => {
  let ctx;
  let ownerToken;
  let staffToken;

  before(async () => {
    ctx = await setupTestContext();
  });

  beforeEach(async () => {
    await ctx.clearCollections();
    ({ token: ownerToken } = await registerAndLogin(ctx.app, {
      username: 'owner1',
      email: 'owner@test.com',
      role: 'owner',
    }));
    ({ token: staffToken } = await registerAndLogin(ctx.app, {
      username: 'staff1',
      email: 'staff@test.com',
      role: 'staff',
    }));
  });

  after(async () => {
    await ctx.teardown();
  });

  describe('GET /api/medicines', () => {
    it('rejects unauthenticated and invalid-token requests', async () => {
      const noAuth = await request(ctx.app).get('/api/medicines');
      assert.equal(noAuth.status, 401);
      assert.deepEqual(noAuth.body, { message: 'No token provided' });

      const badAuth = await request(ctx.app)
        .get('/api/medicines')
        .set('Authorization', 'Bearer invalid-token');
      assert.equal(badAuth.status, 403);
      assert.deepEqual(badAuth.body, { message: 'Invalid token' });
    });

    it('returns all medicines for both owner and staff users', async () => {
      await seedMedicine(ctx.db, { name: 'Amoxicillin', quantity: 25, price: 8.5 });
      await seedMedicine(ctx.db, { name: 'Ibuprofen', quantity: 5, price: 4.25 });

      for (const token of [ownerToken, staffToken]) {
        const res = await request(ctx.app)
          .get('/api/medicines')
          .set('Authorization', `Bearer ${token}`);

        assert.equal(res.status, 200);
        assert.equal(res.body.length, 2);
        assert.deepEqual(
          res.body.map((m) => m.name).sort(),
          ['Amoxicillin', 'Ibuprofen']
        );
      }
    });
  });

  describe('POST /api/medicines', () => {
    it('allows both owner and staff to add medicines and persists Date fields', async () => {
      const resStaff = await request(ctx.app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Cetirizine',
          quantity: 30,
          expiryDate: '2027-06-15',
          price: 6.75,
        });

      assert.equal(resStaff.status, 201);
      assert.deepEqual(resStaff.body, { message: 'Medicine added' });

      const resOwner = await request(ctx.app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'ZeroStockSample',
          quantity: 0,
          expiryDate: '2027-01-01',
          price: 0,
        });

      assert.equal(resOwner.status, 201);

      const saved = await ctx.db.collection('medicines').findOne({ name: 'Cetirizine' });
      assert.ok(saved);
      assert.equal(saved.quantity, 30);
      assert.equal(saved.price, 6.75);
      assert.ok(saved.expiryDate instanceof Date);
      assert.ok(saved.createdAt instanceof Date);
      assert.ok(saved.updatedAt instanceof Date);
    });

    it('returns 400 when required fields are missing or null', async () => {
      const invalidPayloads = [
        {},
        { quantity: 10, expiryDate: '2027-01-01', price: 5 },
        { name: 'Med', expiryDate: '2027-01-01', price: 5 },
        { name: 'Med', quantity: 10, price: 5 },
        { name: 'Med', quantity: 10, expiryDate: '2027-01-01' },
      ];

      for (const body of invalidPayloads) {
        const res = await request(ctx.app)
          .post('/api/medicines')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send(body);
        assert.equal(res.status, 400);
        assert.deepEqual(res.body, { message: 'All fields are required' });
      }
    });

    it('returns 403 for roles other than owner or staff', async () => {
      const guestToken = jwt.sign(
        { userId: 'g1', role: 'guest' },
        process.env.JWT_SECRET || 'your_jwt_secret_here'
      );

      const res = await request(ctx.app)
        .post('/api/medicines')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ name: 'Med', quantity: 1, expiryDate: '2027-01-01', price: 1 });

      assert.equal(res.status, 403);
      assert.deepEqual(res.body, { message: 'Access denied' });
    });
  });

  describe('PUT /api/medicines/:id', () => {
    it('supports full and partial updates including zero quantity/price for owner and staff', async () => {
      const med = await seedMedicine(ctx.db, {
        name: 'Aspirin',
        quantity: 40,
        price: 5.0,
        expiryDate: '2027-03-10',
      });

      const partialRes = await request(ctx.app)
        .put(`/api/medicines/${med._id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ quantity: 0, price: 0 });

      assert.equal(partialRes.status, 200);
      assert.deepEqual(partialRes.body, { message: 'Medicine updated' });

      const afterPartial = await ctx.db.collection('medicines').findOne({ _id: med._id });
      assert.equal(afterPartial.name, 'Aspirin');
      assert.equal(afterPartial.quantity, 0);
      assert.equal(afterPartial.price, 0);

      const fullRes = await request(ctx.app)
        .put(`/api/medicines/${med._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Aspirin Extra',
          quantity: 100,
          expiryDate: '2028-01-01',
          price: 9.99,
        });

      assert.equal(fullRes.status, 200);
      const afterFull = await ctx.db.collection('medicines').findOne({ _id: med._id });
      assert.equal(afterFull.name, 'Aspirin Extra');
      assert.equal(afterFull.quantity, 100);
      assert.equal(afterFull.price, 9.99);
      assert.equal(afterFull.expiryDate.toISOString().slice(0, 10), '2028-01-01');
    });

    it('returns 404 when updating a non-existent ObjectId and 500 for malformed id', async () => {
      const missingId = new ObjectId();
      const notFound = await request(ctx.app)
        .put(`/api/medicines/${missingId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ quantity: 10 });
      assert.equal(notFound.status, 404);
      assert.deepEqual(notFound.body, { message: 'Medicine not found' });

      const malformed = await request(ctx.app)
        .put('/api/medicines/not-an-object-id')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ quantity: 10 });
      assert.equal(malformed.status, 500);
      assert.equal(malformed.body.message, 'Server error');
    });
  });

  describe('DELETE /api/medicines/:id', () => {
    it('denies staff from deleting a medicine (403) and preserves the record', async () => {
      const med = await seedMedicine(ctx.db, { name: 'Protected Med' });

      const res = await request(ctx.app)
        .delete(`/api/medicines/${med._id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      assert.equal(res.status, 403);
      assert.deepEqual(res.body, { message: 'Access denied' });

      const stillExists = await ctx.db.collection('medicines').findOne({ _id: med._id });
      assert.ok(stillExists);
    });

    it('allows owner to delete an existing medicine', async () => {
      const med = await seedMedicine(ctx.db, { name: 'Deletable Med' });

      const res = await request(ctx.app)
        .delete(`/api/medicines/${med._id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      assert.equal(res.status, 200);
      assert.deepEqual(res.body, { message: 'Medicine deleted' });

      const deleted = await ctx.db.collection('medicines').findOne({ _id: med._id });
      assert.equal(deleted, null);
    });

    it('returns 404 for unknown ObjectId and 500 for malformed id', async () => {
      const missingId = new ObjectId();
      const notFound = await request(ctx.app)
        .delete(`/api/medicines/${missingId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      assert.equal(notFound.status, 404);
      assert.deepEqual(notFound.body, { message: 'Medicine not found' });

      const malformed = await request(ctx.app)
        .delete('/api/medicines/bad-id')
        .set('Authorization', `Bearer ${ownerToken}`);
      assert.equal(malformed.status, 500);
      assert.equal(malformed.body.message, 'Server error');
    });
  });
});
