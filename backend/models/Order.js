const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name: String,
  price: Number,
  qty: { type: Number, default: 1 },
});

const orderSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    platform: {
      type: String,
      enum: ['telegram', 'whatsapp'],
      required: true,
    },
    customerId: { type: String, required: true }, // Telegram chat ID or WhatsApp number
    customerName: { type: String, default: 'Guest' },
    items: [orderItemSchema],
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ['awaiting_payment', 'pending', 'preparing', 'ready', 'done'],
      default: 'awaiting_payment',
    },
    payment: {
      razorpayOrderId: { type: String, default: null },
      razorpayPaymentId: { type: String, default: null },
      paid: { type: Boolean, default: false },
    },
    orderNumber: { type: Number }, // Human readable order number like #1001
  },
  { timestamps: true }
);

// Auto-increment order number
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastOrder = await this.constructor.findOne().sort({ orderNumber: -1 });
    this.orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1001;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
