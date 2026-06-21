const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const axios = require('axios');

// Helper to send confirmation messages
const sendConfirmation = async (order) => {
  if (order.platform === 'telegram' && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: order.customerId,
        text: `🎉 *Payment Received!*\n\nYour order #${order.orderNumber} is now confirmed and sent to the kitchen. We will notify you when it is ready!`,
        parse_mode: 'Markdown'
      });
    } catch (e) { console.error('Telegram confirm failed:', e.message); }
  } else if (order.platform === 'whatsapp' && process.env.TWILIO_ACCOUNT_SID) {
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: order.customerId,
        body: `🎉 *Payment Received!*\n\nYour order #${order.orderNumber} is now confirmed and sent to the kitchen. We will notify you when it is ready!`
      });
    } catch (e) { console.error('WA confirm failed:', e.message); }
  }
};

// Lazy-initialize Razorpay so missing env keys don't crash startup
const getRazorpay = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
  });

// GET /api/orders — Owner: get all orders (with optional status filter)
router.get('/', protect, async (req, res) => {
  try {
    const filter = { restaurantId: req.user.id, status: { $ne: 'awaiting_payment' } };
    if (req.query.status) filter.status = req.query.status;
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/orders/stats — Owner: today's stats
router.get('/stats', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayOrders = await Order.find({ 
      restaurantId: req.user.id,
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $ne: 'awaiting_payment' }
    });
    const totalRevenue = todayOrders
      .filter(o => o.payment.paid)
      .reduce((sum, o) => sum + o.totalPrice, 0);

    const pending = todayOrders.filter(o => o.status === 'pending').length;
    const preparing = todayOrders.filter(o => o.status === 'preparing').length;
    const done = todayOrders.filter(o => o.status === 'done').length;

    res.json({
      totalOrders: todayOrders.length,
      totalRevenue,
      pending,
      preparing,
      done,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/orders — Bots: create a new order + Razorpay payment link
router.post('/', async (req, res) => {
  try {
    const { restaurantId, platform, customerId, customerName, items } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId is required' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

    const totalPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    // Create Razorpay order
    const razorpay = getRazorpay();
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalPrice * 100), // paise
      currency: process.env.RESTAURANT_CURRENCY || 'INR',
      receipt: `receipt_${Date.now()}`,
    });

    const order = await Order.create({
      restaurantId,
      platform,
      customerId,
      customerName: customerName || 'Guest',
      items,
      totalPrice,
      payment: { razorpayOrderId: razorpayOrder.id, paid: false },
    });

    res.status(201).json({
      order,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/orders/verify-payment — Verify Razorpay payment signature
router.post('/verify-payment', async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpaySignature } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const body = order.payment.razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    order.payment.razorpayPaymentId = razorpayPaymentId;
    order.payment.paid = true;
    order.status = 'pending';
    await order.save();

    // Emit to socket for real-time update
    const io = req.app.get('io');
    if (io) io.emit('new_order', order);
    
    // Notify customer
    await sendConfirmation(order);

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/orders/:id/mock-pay — For testing/trial payments
router.get('/:id/mock-pay', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send('Order not found');

    if (!order.payment.paid) {
      order.payment.paid = true;
      order.status = 'pending';
      await order.save();

      const io = req.app.get('io');
      if (io) io.emit('new_order', order);
      
      // Notify customer
      await sendConfirmation(order);
    }

    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #10B981;">✅ Trial Payment Successful!</h1>
        <p>Order <strong>#${order.orderNumber}</strong> has been marked as paid.</p>
        <p>It should now appear on the owner's dashboard in real-time.</p>
        <div style="margin-top: 20px;">
          <a href="http://localhost:3000/orders" style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">View Owner Dashboard</a>
        </div>
        <p style="margin-top: 20px; color: #6b7280;">You can close this window and return to your chat app.</p>
      </div>
    `);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// PUT /api/orders/:id/status — Owner: update order status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'preparing', 'ready', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user.id },
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found or unauthorized' });

    // Emit status change to sockets
    const io = req.app.get('io');
    if (io) io.emit('order_status_update', { orderId: order._id, status: order.status });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
