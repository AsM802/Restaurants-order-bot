const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const axios = require('axios');

const API_BASE = `http://localhost:${process.env.PORT || 5000}/api`;
const CURRENCY_SYMBOL = process.env.RESTAURANT_CURRENCY_SYMBOL || '₹';

// In-memory sessions: { waNumber: { step: 'browsing_restaurants', restaurantId: null, restaurantName: null, cart: [] } }
const sessions = {};
const getSession = (from) => {
  if (!sessions[from]) sessions[from] = { step: 'browsing_restaurants', restaurantId: null, restaurantName: null, cart: [] };
  return sessions[from];
};

const sendWAMessage = async (to, body) => {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to,
    body,
  });
};

const fetchRestaurants = async () => {
  const { data } = await axios.get(`${API_BASE}/restaurants`);
  return data;
};

const fetchMenu = async (restaurantId) => {
  const { data } = await axios.get(`${API_BASE}/menu?restaurantId=${restaurantId}`);
  return data;
};

const formatRestaurants = (restaurants) => {
  if (!restaurants || restaurants.length === 0) return '😔 Sorry, no restaurants are currently available.';
  let msg = `📍 *Nearby Restaurants*\n\n`;
  restaurants.forEach((r, idx) => {
    msg += `*${idx + 1}. ${r.name}*\n`;
    if (r.address) msg += `   🏠 ${r.address}\n`;
    msg += `\n`;
  });
  msg += `👉 Type the *number* of the restaurant to view its menu.`;
  return msg;
};

const formatMenu = (restaurantName, items) => {
  let msg = `🍽️ *${restaurantName} Menu*\n\n`;
  if (!items || items.length === 0) return msg + 'Menu is currently empty.';
  
  const grouped = {};
  items.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });
  
  for (const [category, catItems] of Object.entries(grouped)) {
    msg += `🔸 *${category}*\n`;
    catItems.forEach((item) => {
      msg += `  ${item.displayNumber}. ${item.name} — ${CURRENCY_SYMBOL}${item.price}\n`;
    });
    msg += '\n';
  }
  msg += `\n🛒 *How to Order:*\n• Type item numbers to add to cart (e.g., 1, 2)\n• Type a negative number to remove (e.g., -1)\n\n📌 *Options:*\n• Type *cart* to view cart\n• Type *order* to place order\n• Type *change* to select another restaurant`;
  return msg;
};

const formatCart = (cart) => {
  if (cart.length === 0) return '🛒 Your cart is empty. Type *menu* to browse!';
  let msg = `🛒 *Your Cart:*\n\n`;
  let total = 0;
  cart.forEach((item) => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    msg += `• ${item.name} x${item.qty} — ${CURRENCY_SYMBOL}${subtotal}\n`;
  });
  msg += `\n💰 Total: *${CURRENCY_SYMBOL}${total}*\n\n👉 Type *order* to place your order\n👉 Type *menu* to keep browsing.`;
  return msg;
};

// Twilio webhook handler — POST /api/whatsapp/webhook
router.post('/webhook', async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const from = req.body.From; // e.g. whatsapp:+91...
  const body = (req.body.Body || '').trim().toLowerCase();
  const session = getSession(from);

  try {
    // Global reset/start commands
    if (body === 'hi' || body === 'hello' || body === 'start' || body === 'change' || body === 'restaurants') {
      const restaurants = await fetchRestaurants();
      // Store temp list mapping in session to resolve numbers later
      session.step = 'browsing_restaurants';
      session.restaurantId = null;
      session.restaurantName = null;
      session.cart = [];
      session.tempRestaurants = restaurants;
      
      await sendWAMessage(from, `👋 Welcome!\n\n${formatRestaurants(restaurants)}`);
      return res.type('text/xml').send(twiml.toString());
    }

    if (session.step === 'browsing_restaurants') {
      const num = parseInt(body);
      if (!isNaN(num) && session.tempRestaurants && num > 0 && num <= session.tempRestaurants.length) {
        const selected = session.tempRestaurants[num - 1];
        session.restaurantId = selected._id;
        session.restaurantName = selected.name;
        session.step = 'browsing_menu';
        session.cart = [];
        delete session.tempRestaurants; // cleanup
        
        const items = await fetchMenu(session.restaurantId);
        await sendWAMessage(from, formatMenu(session.restaurantName, items));
      } else {
        await sendWAMessage(from, `🤔 Invalid selection. Please type the *number* of the restaurant you want to select.`);
      }
      return res.type('text/xml').send(twiml.toString());
    }

    // From here on, user must have selected a restaurant
    if (!session.restaurantId) {
      session.step = 'browsing_restaurants';
      const restaurants = await fetchRestaurants();
      session.tempRestaurants = restaurants;
      await sendWAMessage(from, `⚠️ Please select a restaurant first.\n\n${formatRestaurants(restaurants)}`);
      return res.type('text/xml').send(twiml.toString());
    }

    if (body === 'menu') {
      const items = await fetchMenu(session.restaurantId);
      await sendWAMessage(from, formatMenu(session.restaurantName, items));
    } else if (body === 'cart') {
      await sendWAMessage(from, formatCart(session.cart));
    } else if (body === 'clear') {
      session.cart = [];
      await sendWAMessage(from, '🗑️ Cart cleared! Type *menu* to start again.');
    } else if (body === 'order') {
      if (session.cart.length === 0) {
        await sendWAMessage(from, '🛒 Your cart is empty! Type *menu* to browse items.');
      } else {
        const totalPrice = session.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        const { data } = await axios.post(`${API_BASE}/orders`, {
          restaurantId: session.restaurantId,
          platform: 'whatsapp',
          customerId: from,
          customerName: from.replace('whatsapp:', ''),
          items: session.cart,
          totalPrice,
        });

        const paymentUrl = `https://rzp.io/i/${data.razorpayOrderId}`;
        const mockPayUrl = `${API_BASE.replace('/api', '')}/api/orders/${data.order._id}/mock-pay`;
        await sendWAMessage(
          from,
          `✅ Order *#${data.order.orderNumber}* placed at *${session.restaurantName}*!\n\n` +
            `💰 Total: ${CURRENCY_SYMBOL}${totalPrice}\n\n` +
            `🔗 *Real Payment:* ${paymentUrl}\n` +
            `🧪 *Trial Payment:* ${mockPayUrl}\n\n` +
            `We'll start preparing once payment is confirmed! 🍳\n\nType *change* to view other restaurants.`
        );
        // Reset cart after order
        session.cart = [];
      }
    } else {
      // Try to parse item numbers for the cart
      const numbers = body
        .split(/[\s,]+/)
        .map((n) => parseInt(n))
        .filter((n) => !isNaN(n) && n !== 0);

      if (numbers.length > 0) {
        const menuItems = await fetchMenu(session.restaurantId);
        const added = [];
        const removed = [];
        const notFound = [];

        for (const num of numbers) {
          const isRemove = num < 0;
          const absNum = Math.abs(num);
          const item = menuItems.find((i) => i.displayNumber === absNum);
          if (!item) { notFound.push(absNum); continue; }
          
          const existingIdx = session.cart.findIndex((c) => String(c.menuItemId) === String(item._id));
          
          if (isRemove) {
            if (existingIdx !== -1) {
              if (session.cart[existingIdx].qty > 1) {
                session.cart[existingIdx].qty -= 1;
              } else {
                session.cart.splice(existingIdx, 1);
              }
              removed.push(item.name);
            }
          } else {
            if (existingIdx !== -1) {
              session.cart[existingIdx].qty += 1;
            } else {
              session.cart.push({ menuItemId: item._id, name: item.name, price: item.price, qty: 1 });
            }
            added.push(item.name);
          }
        }

        let reply = '';
        if (added.length > 0) reply += `✅ Added: ${added.join(', ')}\n`;
        if (removed.length > 0) reply += `➖ Removed: ${removed.join(', ')}\n`;
        if (notFound.length > 0) reply += `❌ Item(s) not found: ${notFound.join(', ')}\n`;
        reply += `\n${formatCart(session.cart)}`;
        await sendWAMessage(from, reply);
      } else {
        await sendWAMessage(
          from,
          `🤔 I didn't understand that.\n\n📌 Options:\n• Type *menu* to see the menu\n• Type *cart* to view your cart\n• Type *order* to place an order\n• Type *change* to select a different restaurant.`
        );
      }
    }
  } catch (err) {
    console.error('WhatsApp bot error:', err.message);
    twiml.message(`❌ Something went wrong. Please check if your Twilio Auth Token is correct in the .env file.`);
  }

  res.type('text/xml').send(twiml.toString());
});

module.exports = router;
