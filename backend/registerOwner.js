require('dotenv').config();
const mongoose = require('mongoose');
const Restaurant = require('./models/Restaurant');

async function register() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const existing = await Restaurant.findOne({ email: 'owner@restaurant.com' });
    if (existing) {
      console.log('Owner already exists! Login: owner@restaurant.com / yourpassword');
    } else {
      await Restaurant.create({
        name: 'My Restaurant',
        email: 'owner@restaurant.com',
        password: 'yourpassword'
      });
      console.log('Owner created successfully! Login: owner@restaurant.com / yourpassword');
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

register();
