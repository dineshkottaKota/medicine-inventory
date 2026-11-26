const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { getUserCollection } = require('../../backend/models/user');
const { getMedicineCollection } = require('../../backend/models/medicine');
const { getSalesCollection } = require('../../backend/models/sale');

describe('MongoDB collection model helpers', () => {
  it('resolves the expected collection names from a db instance', () => {
    const requested = [];
    const fakeDb = {
      collection(name) {
        requested.push(name);
        return { collectionName: name };
      },
    };

    const users = getUserCollection(fakeDb);
    const medicines = getMedicineCollection(fakeDb);
    const sales = getSalesCollection(fakeDb);

    assert.equal(users.collectionName, 'users');
    assert.equal(medicines.collectionName, 'medicines');
    assert.equal(sales.collectionName, 'sales');
    assert.deepEqual(requested, ['users', 'medicines', 'sales']);
  });
});
