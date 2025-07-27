// User model for MongoDB (using native driver)

/**
 * User schema:
 * - username: String
 * - email: String
 * - password: String (hashed)
 * - role: String ('owner' or 'staff')
 * - createdAt: Date
 */

const getUserCollection = (db) => db.collection('users');

module.exports = { getUserCollection }; 