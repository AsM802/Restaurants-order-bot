const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, default: 'Main Course' },
    imageUrl: { type: String, default: '' },
    available: { type: Boolean, default: true },
    displayNumber: { type: Number }, // The number shown in menu (1, 2, 3...)
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
