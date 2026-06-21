const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const API_BASE = `http://localhost:${process.env.PORT || 5000}/api`;
const CURRENCY_SYMBOL = process.env.RESTAURANT_CURRENCY_SYMBOL || '₹';
const RESTAURANT_NAME = process.env.RESTAURANT_NAME || 'Our Restaurant';

// In-memory session store: { chatId: { cart: [], step: 'browsing'|'confirming' } }
const sessions = {};

const getSession = (chatId) => {
  if (!sessions[chatId]) sessions[chatId] = { cart: [], step: 'browsing' };
  return sessions[chatId];
};

const fetchMenu = async () => {
  const { data } = await axios.get(`${API_BASE}/menu`);
  return data;
};

const formatMenu = (items) => {
  const grouped = {};
  items.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  let msg = `🍽️ *${RESTAURANT_NAME} Menu*\n\n`;
  for (const [category, catItems] of Object.entries(grouped)) {
    msg += `*${category}*\n`;
    catItems.forEach((item) => {
      msg += `  ${item.displayNumber}. ${item.name} — *${CURRENCY_SYMBOL}${item.price}*\n`;
      if (item.description) msg += `     _${item.description}_\n`;
    });
    msg += '\n';
  }
  msg += `\n📝 Type item numbers separated by commas to add to cart.\n`;
  msg += `e.g., \`1, 2\` to add, or \`-1, -2\` to remove items.\n\n`;
  msg += `Commands:\n/cart — View your cart\n/order — Place your order\n/clear — Clear cart\n/menu — Show menu again`;
  return msg;
};

const formatCart = (cart) => {
  if (cart.length === 0) return '🛒 Your cart is empty. Browse the /menu to add items!';

  let msg = `🛒 *Your Cart:*\n\n`;
  let total = 0;
  cart.forEach((item, idx) => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    msg += `${idx + 1}. ${item.name} x${item.qty} — ${CURRENCY_SYMBOL}${subtotal}\n`;
  });
  msg += `\n💰 *Total: ${CURRENCY_SYMBOL}${total}*\n\n`;
  msg += `Type /order to place your order or /clear to start over.`;
  return msg;
};

const initTelegramBot = () => {
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

  console.log('🤖 Telegram Bot started!');

  // /start
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || 'there';
    getSession(chatId).cart = [];

    try {
      const items = await fetchMenu();
      const menuText = formatMenu(items);
      await bot.sendMessage(
        chatId,
        `👋 Welcome, *${name}*! Welcome to *${RESTAURANT_NAME}*.\n\n${menuText}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await bot.sendMessage(chatId, `❌ Sorry, couldn't load the menu. Please try again later.`);
    }
  });

  // /menu
  bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const items = await fetchMenu();
      await bot.sendMessage(chatId, formatMenu(items), { parse_mode: 'Markdown' });
    } catch {
      await bot.sendMessage(chatId, `❌ Couldn't load menu. Try again later.`);
    }
  });

  // /cart
  bot.onText(/\/cart/, (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    bot.sendMessage(chatId, formatCart(session.cart), { parse_mode: 'Markdown' });
  });

  // /clear
  bot.onText(/\/clear/, (msg) => {
    const chatId = msg.chat.id;
    sessions[chatId] = { cart: [], step: 'browsing' };
    bot.sendMessage(chatId, '🗑️ Cart cleared! Browse the /menu to start again.');
  });

  // /order — Place the order
  bot.onText(/\/order/, async (msg) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);

    if (session.cart.length === 0) {
      return bot.sendMessage(chatId, '🛒 Your cart is empty! Browse the /menu first.');
    }

    const totalPrice = session.cart.reduce((sum, i) => sum + i.price * i.qty, 0);

    try {
      const { data } = await axios.post(`${API_BASE}/orders`, {
        platform: 'telegram',
        customerId: String(chatId),
        customerName: msg.from.first_name || 'Guest',
        items: session.cart,
        totalPrice,
      });

      const paymentUrl = `https://rzp.io/i/${data.razorpayOrderId}`;
      const mockPayUrl = `${API_BASE.replace('/api', '')}/api/orders/${data.order._id}/mock-pay`;

      await bot.sendMessage(
        chatId,
        `✅ Order *#${data.order.orderNumber}* created!\n\n` +
          `💰 Total: *${CURRENCY_SYMBOL}${totalPrice}*\n\n` +
          `🔗 *Real Payment:* [Click here to pay](${paymentUrl})\n` +
          `🧪 *Trial Payment:* [Simulate Payment](${mockPayUrl})\n\n` +
          `Once paid, we'll start preparing your order right away! 🍳`,
        { parse_mode: 'Markdown' }
      );

      // Clear cart after ordering
      sessions[chatId] = { cart: [], step: 'browsing' };
    } catch (err) {
      await bot.sendMessage(chatId, `❌ Couldn't place order. Please try again.\n${err.message}`);
    }
  });

  // Handle item number input (e.g. "1, 2, 3" or "1 2 3")
  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const chatId = msg.chat.id;
    const session = getSession(chatId);

    // Parse numbers from message
    const numbers = msg.text
      .split(/[\s,]+/)
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n) && n !== 0);

    if (numbers.length === 0) {
      return bot.sendMessage(chatId, `🤔 I didn't understand that. Type /menu to see available items, or use negative numbers like \`-1\` to remove items.`);
    }

    try {
      const menuItems = await fetchMenu();
      const added = [];
      const removed = [];
      const notFound = [];

      for (const num of numbers) {
        const isRemove = num < 0;
        const absNum = Math.abs(num);

        const item = menuItems.find((i) => i.displayNumber === absNum);
        if (!item) {
          notFound.push(absNum);
          continue;
        }

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
            session.cart.push({
              menuItemId: item._id,
              name: item.name,
              price: item.price,
              qty: 1,
            });
          }
          added.push(item.name);
        }
      }

      let reply = '';
      if (added.length > 0) reply += `✅ Added: *${added.join(', ')}*\n`;
      if (removed.length > 0) reply += `➖ Removed: *${removed.join(', ')}*\n`;
      if (notFound.length > 0) reply += `❌ Not found: ${notFound.join(', ')}\n`;

      reply += `\n${formatCart(session.cart)}`;
      await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
    } catch {
      await bot.sendMessage(chatId, `❌ Error fetching menu. Try again later.`);
    }
  });

  return bot;
};

module.exports = initTelegramBot;
