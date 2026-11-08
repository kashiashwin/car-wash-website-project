const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function createAdmin() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/carwash_booking');
    console.log('Connected to MongoDB.');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin', salt);

    const usersCol = mongoose.connection.db.collection('users');

    // Upsert admin@admin.com
    await usersCol.updateOne(
      { email: 'admin@admin.com' },
      {
        $set: {
          name: 'Admin User',
          email: 'admin@admin.com',
          password: hashedPassword,
          phone: '9876543210',
          role: 'Admin',
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    // Upsert admin username alias
    await usersCol.updateOne(
      { email: 'admin' },
      {
        $set: {
          name: 'Admin User',
          email: 'admin',
          password: hashedPassword,
          phone: '9876543210',
          role: 'Admin',
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('Admin accounts (admin@admin.com & admin) verified/created with password "admin".');

  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
