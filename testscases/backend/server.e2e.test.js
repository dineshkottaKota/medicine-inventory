const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { backendRequire } = require('./helpers/testApp');
const { MongoClient } = backendRequire('mongodb');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

function startServerProcess({ port, mongoUri, jwtSecret }) {
  return new Promise((resolve, reject) => {
    const backendRoot = path.resolve(__dirname, '../../backend');
    const child = spawn(process.execPath, ['server.js'], {
      cwd: backendRoot,
      env: {
        ...process.env,
        PORT: String(port),
        MONGO_URI: mongoUri,
        JWT_SECRET: jwtSecret,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Server startup timed out. stdout=${stdout} stderr=${stderr}`));
    }, 15000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.includes(`Server running on port ${port}`)) {
        clearTimeout(timeout);
        resolve(child);
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Server exited prematurely (${code}). stdout=${stdout} stderr=${stderr}`));
      }
    });
  });
}

describe('server.js live process E2E workflow', () => {
  it('boots server.js and executes full owner & staff pharmacy workflow over HTTP', async () => {
    const port = await getFreePort();
    const baseMongo = process.env.TEST_MONGO_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const url = new URL(baseMongo);
    url.pathname = `/medicine_inventory_e2e_${process.pid}_${Date.now()}`;
    const mongoUri = url.toString();
    const baseUrl = `http://127.0.0.1:${port}`;

    let child;
    try {
      child = await startServerProcess({
        port,
        mongoUri,
        jwtSecret: 'e2e_test_secret',
      });

      const health = await fetch(`${baseUrl}/`);
      assert.equal(health.status, 200);
      assert.equal(await health.text(), 'Medicine Inventory System Backend');

      // 1. Register owner and staff
      const regOwner = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'OwnerE2E',
          email: 'owner.e2e@test.com',
          password: 'Password123!',
          role: 'owner',
        }),
      });
      assert.equal(regOwner.status, 201);

      const regStaff = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'StaffE2E',
          email: 'staff.e2e@test.com',
          password: 'Password123!',
          role: 'staff',
        }),
      });
      assert.equal(regStaff.status, 201);

      // 2. Login both
      const loginOwner = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'owner.e2e@test.com', password: 'Password123!' }),
      });
      const { token: ownerToken } = await loginOwner.json();
      assert.ok(ownerToken);

      const loginStaff = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'staff.e2e@test.com', password: 'Password123!' }),
      });
      const { token: staffToken } = await loginStaff.json();
      assert.ok(staffToken);

      // 3. Add medicine and fetch inventory
      const addMed = await fetch(`${baseUrl}/api/medicines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          name: 'Metformin',
          quantity: 15,
          expiryDate: '2027-12-31',
          price: 10.5,
        }),
      });
      assert.equal(addMed.status, 201);

      const listRes = await fetch(`${baseUrl}/api/medicines`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const meds = await listRes.json();
      assert.equal(meds.length, 1);
      const medId = meds[0]._id;

      // 4. Staff performs bulk sale
      const saleRes = await fetch(`${baseUrl}/api/sales/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ sales: [{ medicineId: medId, quantitySold: 3 }] }),
      });
      assert.equal(saleRes.status, 201);

      // 5. Staff blocked from reports, owner gets daily report
      const staffReport = await fetch(`${baseUrl}/api/sales/report?type=daily`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      assert.equal(staffReport.status, 403);

      const ownerReport = await fetch(`${baseUrl}/api/sales/report?type=daily`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(ownerReport.status, 200);
      const reportRows = await ownerReport.json();
      assert.equal(reportRows.length, 1);
      assert.equal(reportRows[0].totalQuantity, 3);
      assert.equal(reportRows[0].totalSales, 31.5);
    } finally {
      if (child && !child.killed) {
        child.kill('SIGTERM');
      }
      const client = await MongoClient.connect(mongoUri);
      await client.db().dropDatabase();
      await client.close();
    }
  });
});
