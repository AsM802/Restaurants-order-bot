require('dotenv').config();
const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');

const items = [
  // SOUPS & SALADS
  { name: 'Hot and Sour Veg/Chicken', price: 100, category: 'Soups & Salads' },
  { name: 'Sweet Corn Veg/Chicken', price: 110, category: 'Soups & Salads' },
  { name: 'Cream of Chicken', price: 150, category: 'Soups & Salads' },
  { name: 'Creamy Fruit Chaat', price: 120, category: 'Soups & Salads' },
  { name: 'Mixed Veg Salad', price: 80, category: 'Soups & Salads' },
  { name: '4 O\'CLOCK Chicken Salad', price: 130, category: 'Soups & Salads' },

  // STARTERS
  { name: 'Mushroom Pakora', price: 140, category: 'Starters', description: 'Mushrooms coated with a spicy batter and deep fried.' },
  { name: 'Fried Sweet Potato', price: 110, category: 'Starters' },
  { name: 'Gobi 65', price: 110, category: 'Starters' },
  { name: 'Pineapple Tikka', price: 100, category: 'Starters' },
  { name: 'Chicken Tikka', price: 165, category: 'Starters' },
  { name: 'Koonthal Dry Fry', price: 240, category: 'Starters' },
  { name: 'Chicken 65', price: 135, category: 'Starters' },
  { name: 'Crispy Chicken Wings', price: 160, category: 'Starters' },
  { name: 'Chicken Pakora', price: 150, category: 'Starters' },
  { name: 'Fried Spring Chicken', price: 260, category: 'Starters' },

  // CURRY
  { name: 'Chicken Kurumulaku', price: 150, category: 'Curry' },
  { name: 'Butter Chicken', price: 170, category: 'Curry' },
  { name: 'Chilli Chicken', price: 150, category: 'Curry' },
  { name: 'Chicken Kondatam', price: 160, category: 'Curry' },
  { name: 'Goan Chicken Cafreal', price: 170, category: 'Curry' },
  { name: 'Afghani Chicken', price: 200, category: 'Curry' },

  // FROM THE GRILL
  { name: 'Alfaham (Quarter)', price: 130, category: 'Grill' },
  { name: 'Peri Peri (Quarter)', price: 140, category: 'Grill' },
  { name: 'BBQ (Quarter)', price: 150, category: 'Grill' },

  // BIRIYANI
  { name: 'Dum Biriyani', price: 150, category: 'Biriyani' },
  { name: 'Ghee Rice', price: 80, category: 'Biriyani' },

  // FRIED RICE & NOODLES
  { name: 'Veg Fried Rice', price: 140, category: 'Fried Rice & Noodles' },
  { name: 'Chicken Fried Rice', price: 170, category: 'Fried Rice & Noodles' },
  { name: 'Schezwan Fried Rice', price: 200, category: 'Fried Rice & Noodles' },

  // BREADS
  { name: 'Puttu', price: 12, category: 'Breads' },
  { name: 'Chapathi', price: 12, category: 'Breads' },
  { name: 'Wheat Porotta', price: 15, category: 'Breads' },
  { name: 'Naan', price: 30, category: 'Breads' },
  { name: 'Butter Naan', price: 35, category: 'Breads' },

  // DESSERTS
  { name: 'Bread Butter Pudding', price: 70, category: 'Desserts' },
  { name: 'Caramel Pudding', price: 60, category: 'Desserts' },
  { name: 'Pineapple Kesari with Ice Cream', price: 60, category: 'Desserts' },
  { name: 'Brownie with Ice Cream', price: 80, category: 'Desserts' },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    await MenuItem.deleteMany({});
    console.log('Cleared existing menu items.');

    let displayNum = 1;
    for (const item of items) {
      item.displayNumber = displayNum++;
      await MenuItem.create(item);
    }
    console.log(`Successfully added ${items.length} items to the menu!`);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

seed();
