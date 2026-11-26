const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { backendRequire } = require('./helpers/testApp');

const jwt = backendRequire('jsonwebtoken');
const { authenticateToken, authorizeRoles } = require('../../backend/middleware/auth');

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('auth middleware', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  describe('authenticateToken', () => {
    it('returns 401 when Authorization header is missing or has no token', () => {
      const invalidHeaders = [undefined, '', 'Bearer', 'Bearer ', 'TokenOnly'];

      for (const header of invalidHeaders) {
        const req = { headers: header === undefined ? {} : { authorization: header } };
        const res = createMockRes();
        let nextCalled = false;

        authenticateToken(req, res, () => {
          nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, { message: 'No token provided' });
      }
    });

    it('returns 403 when token is malformed, signed with wrong secret, or expired', () => {
      const wrongSecretToken = jwt.sign({ userId: 'u1', role: 'owner' }, 'wrong_secret');
      const expiredToken = jwt.sign(
        { userId: 'u1', role: 'owner', exp: Math.floor(Date.now() / 1000) - 60 },
        'your_jwt_secret_here'
      );

      for (const token of ['not.a.valid.jwt', wrongSecretToken, expiredToken]) {
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = createMockRes();
        let nextCalled = false;

        authenticateToken(req, res, () => {
          nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, { message: 'Invalid token' });
      }
    });

    it('attaches decoded user payload and calls next() with fallback secret', () => {
      const token = jwt.sign({ userId: 'user-123', role: 'staff' }, 'your_jwt_secret_here');
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = createMockRes();
      let nextCalled = false;

      authenticateToken(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
      assert.equal(req.user.userId, 'user-123');
      assert.equal(req.user.role, 'staff');
    });

    it('uses process.env.JWT_SECRET when configured', () => {
      process.env.JWT_SECRET = 'custom_super_secret';
      const token = jwt.sign({ userId: 'owner-1', role: 'owner' }, 'custom_super_secret');
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = createMockRes();
      let nextCalled = false;

      authenticateToken(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
      assert.equal(req.user.userId, 'owner-1');
      assert.equal(req.user.role, 'owner');
    });
  });

  describe('authorizeRoles', () => {
    it('calls next() when req.user.role is permitted', () => {
      const middleware = authorizeRoles('owner', 'staff');
      for (const role of ['owner', 'staff']) {
        const req = { user: { userId: '1', role } };
        const res = createMockRes();
        let nextCalled = false;

        middleware(req, res, () => {
          nextCalled = true;
        });

        assert.equal(nextCalled, true);
        assert.equal(res.body, null);
      }
    });

    it('returns 403 Access denied when req.user.role is not permitted', () => {
      const ownerOnly = authorizeRoles('owner');
      for (const role of ['staff', 'viewer', undefined]) {
        const req = { user: { userId: '1', role } };
        const res = createMockRes();
        let nextCalled = false;

        ownerOnly(req, res, () => {
          nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, { message: 'Access denied' });
      }
    });
  });
});
