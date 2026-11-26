const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { backendRequire, setupTestContext } = require('./helpers/testApp');

const request = backendRequire('supertest');
const bcrypt = backendRequire('bcryptjs');
const jwt = backendRequire('jsonwebtoken');

describe('Auth routes and root health endpoint', () => {
  let ctx;

  before(async () => {
    ctx = await setupTestContext();
  });

  beforeEach(async () => {
    await ctx.clearCollections();
  });

  after(async () => {
    await ctx.teardown();
  });

  it('GET / returns service banner text', async () => {
    const res = await request(ctx.app).get('/');
    assert.equal(res.status, 200);
    assert.equal(res.text, 'Medicine Inventory System Backend');
  });

  describe('POST /api/auth/register', () => {
    it('registers a new user with hashed password and persists in users collection', async () => {
      const payload = {
        username: 'alice_owner',
        email: 'alice@pharmacy.test',
        password: 'PlainPassword123!',
        role: 'owner',
      };

      const res = await request(ctx.app).post('/api/auth/register').send(payload);
      assert.equal(res.status, 201);
      assert.deepEqual(res.body, { message: 'User registered successfully' });

      const storedUser = await ctx.db.collection('users').findOne({ email: payload.email });
      assert.ok(storedUser);
      assert.equal(storedUser.username, payload.username);
      assert.equal(storedUser.email, payload.email);
      assert.equal(storedUser.role, 'owner');
      assert.ok(storedUser.createdAt instanceof Date);
      assert.notEqual(storedUser.password, payload.password);
      assert.equal(await bcrypt.compare(payload.password, storedUser.password), true);
    });

    it('returns 400 when any required registration field is missing', async () => {
      const incompletePayloads = [
        {},
        { email: 'a@b.com', password: 'pw', role: 'staff' },
        { username: 'a', password: 'pw', role: 'staff' },
        { username: 'a', email: 'a@b.com', role: 'staff' },
        { username: 'a', email: 'a@b.com', password: 'pw' },
      ];

      for (const body of incompletePayloads) {
        const res = await request(ctx.app).post('/api/auth/register').send(body);
        assert.equal(res.status, 400);
        assert.deepEqual(res.body, { message: 'All fields are required' });
      }
    });

    it('returns 409 when registering an email that already exists', async () => {
      const payload = {
        username: 'bob',
        email: 'bob@pharmacy.test',
        password: 'Password123!',
        role: 'staff',
      };

      const first = await request(ctx.app).post('/api/auth/register').send(payload);
      assert.equal(first.status, 201);

      const duplicate = await request(ctx.app)
        .post('/api/auth/register')
        .send({ ...payload, username: 'bob2', role: 'owner' });
      assert.equal(duplicate.status, 409);
      assert.deepEqual(duplicate.body, { message: 'Email already registered' });
    });
  });

  describe('POST /api/auth/login', () => {
    it('authenticates a registered user and returns a signed JWT and sanitized user object', async () => {
      const credentials = {
        username: 'staff_user',
        email: 'staff@pharmacy.test',
        password: 'StaffPassword123!',
        role: 'staff',
      };
      await request(ctx.app).post('/api/auth/register').send(credentials);

      const res = await request(ctx.app).post('/api/auth/login').send({
        email: credentials.email,
        password: credentials.password,
      });

      assert.equal(res.status, 200);
      assert.ok(typeof res.body.token === 'string' && res.body.token.length > 0);
      assert.deepEqual(res.body.user, {
        username: credentials.username,
        email: credentials.email,
        role: credentials.role,
      });
      assert.equal('password' in res.body.user, false);

      const decoded = jwt.verify(
        res.body.token,
        process.env.JWT_SECRET || 'your_jwt_secret_here'
      );
      assert.equal(decoded.role, 'staff');
      assert.ok(decoded.userId);
    });

    it('returns 400 when email or password is missing', async () => {
      for (const body of [{}, { email: 'a@b.com' }, { password: 'secret' }]) {
        const res = await request(ctx.app).post('/api/auth/login').send(body);
        assert.equal(res.status, 400);
        assert.deepEqual(res.body, { message: 'Email and password required' });
      }
    });

    it('returns 401 for non-existent email or wrong password', async () => {
      await request(ctx.app).post('/api/auth/register').send({
        username: 'realuser',
        email: 'real@pharmacy.test',
        password: 'CorrectPassword!',
        role: 'owner',
      });

      const unknownRes = await request(ctx.app).post('/api/auth/login').send({
        email: 'missing@pharmacy.test',
        password: 'CorrectPassword!',
      });
      assert.equal(unknownRes.status, 401);
      assert.deepEqual(unknownRes.body, { message: 'Invalid credentials' });

      const wrongPassRes = await request(ctx.app).post('/api/auth/login').send({
        email: 'real@pharmacy.test',
        password: 'WrongPassword!',
      });
      assert.equal(wrongPassRes.status, 401);
      assert.deepEqual(wrongPassRes.body, { message: 'Invalid credentials' });
    });
  });
});
