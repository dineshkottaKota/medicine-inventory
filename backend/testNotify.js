const { MongoClient } = require('mongodb');
const { notifyInventoryIssues } = require('./utils/notify');
require('dotenv').config();

MongoClient.connect(process.env.MONGO_URI)
  .then(async client => {
    const db = client.db();
    await notifyInventoryIssues(db);
    console.log('Notification check triggered!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });