const { describe, it, before, after, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { backendRequire, setupTestContext, seedMedicine } = require('./helpers/testApp');

const nodemailer = backendRequire('nodemailer');

describe('Email and Inventory Notification utilities', () => {
  const emailModulePath = require.resolve('../../backend/utils/email');
  const notifyModulePath = require.resolve('../../backend/utils/notify');
  const originalEmailUser = process.env.EMAIL_USER;
  const originalEmailPass = process.env.EMAIL_PASS;

  let ctx;

  before(async () => {
    ctx = await setupTestContext();
  });

  beforeEach(async () => {
    await ctx.clearCollections();
    delete require.cache[emailModulePath];
    delete require.cache[notifyModulePath];
  });

  afterEach(() => {
    mock.restoreAll();
    delete require.cache[emailModulePath];
    delete require.cache[notifyModulePath];

    if (originalEmailUser === undefined) delete process.env.EMAIL_USER;
    else process.env.EMAIL_USER = originalEmailUser;

    if (originalEmailPass === undefined) delete process.env.EMAIL_PASS;
    else process.env.EMAIL_PASS = originalEmailPass;
  });

  after(async () => {
    await ctx.teardown();
  });

  describe('utils/email.js', () => {
    it('skips sending email when EMAIL_USER or EMAIL_PASS is missing', async () => {
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;

      let sendMailCalls = 0;
      mock.method(nodemailer, 'createTransport', () => ({
        sendMail: async () => {
          sendMailCalls += 1;
          return { messageId: 'msg-1' };
        },
      }));

      const { sendEmail } = require('../../backend/utils/email');
      const result = await sendEmail('owner@test.com', 'Subject', 'Body');

      assert.equal(result, undefined);
      assert.equal(sendMailCalls, 0);
    });

    it('sends email with formatted sender, text, and optional html when configured', async () => {
      process.env.EMAIL_USER = 'pharmacy@example.com';
      process.env.EMAIL_PASS = 'app-password-1234';

      const capturedMailOptions = [];
      mock.method(nodemailer, 'createTransport', () => ({
        sendMail: async (opts) => {
          capturedMailOptions.push(opts);
          return { messageId: 'msg-42' };
        },
      }));

      const { sendEmail } = require('../../backend/utils/email');
      const info = await sendEmail('owner@example.com', 'Alert', 'Plain body', '<b>HTML</b>');

      assert.deepEqual(info, { messageId: 'msg-42' });
      assert.equal(capturedMailOptions.length, 1);
      assert.deepEqual(capturedMailOptions[0], {
        from: '"Medicine Inventory" <pharmacy@example.com>',
        to: 'owner@example.com',
        subject: 'Alert',
        text: 'Plain body',
        html: '<b>HTML</b>',
      });
    });

    it('rethrows transport errors from sendMail', async () => {
      process.env.EMAIL_USER = 'pharmacy@example.com';
      process.env.EMAIL_PASS = 'app-password-1234';

      mock.method(nodemailer, 'createTransport', () => ({
        sendMail: async () => {
          throw new Error('SMTP auth failed');
        },
      }));

      const { sendEmail } = require('../../backend/utils/email');
      await assert.rejects(
        () => sendEmail('owner@example.com', 'Alert', 'Body'),
        /SMTP auth failed/
      );
    });
  });

  describe('utils/notify.js', () => {
    function loadNotifyWithStubbedEmail() {
      const sentEmails = [];
      require.cache[emailModulePath] = {
        id: emailModulePath,
        filename: emailModulePath,
        loaded: true,
        exports: {
          sendEmail: async (to, subject, text, html) => {
            sentEmails.push({ to, subject, text, html });
            return { messageId: 'stubbed' };
          },
        },
      };
      const { notifyInventoryIssues } = require('../../backend/utils/notify');
      return { notifyInventoryIssues, sentEmails };
    }

    it('does nothing when no owner user exists', async () => {
      await ctx.db.collection('users').insertOne({
        username: 'staffOnly',
        email: 'staff@test.com',
        role: 'staff',
      });
      await seedMedicine(ctx.db, { name: 'Empty Med', quantity: 0 });

      const { notifyInventoryIssues, sentEmails } = loadNotifyWithStubbedEmail();
      await notifyInventoryIssues(ctx.db);

      assert.equal(sentEmails.length, 0);
    });

    it('does not send email when all stock is healthy and expiry is beyond 30 days', async () => {
      await ctx.db.collection('users').insertOne({
        username: 'owner',
        email: 'owner@test.com',
        role: 'owner',
      });
      await seedMedicine(ctx.db, {
        name: 'Healthy Med',
        quantity: 25,
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      const { notifyInventoryIssues, sentEmails } = loadNotifyWithStubbedEmail();
      await notifyInventoryIssues(ctx.db);

      assert.equal(sentEmails.length, 0);
    });

    it('notifies owner about both out-of-stock and near-expiry medicines', async () => {
      await ctx.db.collection('users').insertOne({
        username: 'owner',
        email: 'owner@pharmacy.test',
        role: 'owner',
      });
      await seedMedicine(ctx.db, {
        name: 'OutOfStockMed',
        quantity: 0,
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });
      await seedMedicine(ctx.db, {
        name: 'ExpiringSoonMed',
        quantity: 12,
        expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      });
      await seedMedicine(ctx.db, {
        name: 'SafeMed',
        quantity: 50,
        expiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      });

      const { notifyInventoryIssues, sentEmails } = loadNotifyWithStubbedEmail();
      await notifyInventoryIssues(ctx.db);

      assert.equal(sentEmails.length, 1);
      const email = sentEmails[0];
      assert.equal(email.to, 'owner@pharmacy.test');
      assert.equal(email.subject, '📦 Medicine Inventory Alert');

      assert.match(email.text, /Out of stock medicines:\nOutOfStockMed/);
      assert.match(email.text, /Near expiry medicines \(within 30 days\):\nExpiringSoonMed/);
      assert.doesNotMatch(email.text, /SafeMed/);

      assert.match(email.html, /Out of Stock Medicines:/);
      assert.match(email.html, /<li>OutOfStockMed<\/li>/);
      assert.match(email.html, /Near Expiry Medicines \(within 30 days\):/);
      assert.match(email.html, /ExpiringSoonMed/);
      assert.match(email.html, />12<\/td>/);
      assert.doesNotMatch(email.html, /SafeMed/);
    });
  });
});
