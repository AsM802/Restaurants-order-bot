import { NextResponse } from 'next/server';
import twilio from 'twilio';
import connectToDatabase from '@/lib/db';
import WaSession from '@/models/WaSession';
import Restaurant from '@/models/Restaurant';
import MenuItem from '@/models/MenuItem';
import Order from '@/models/Order';
import { v4 as uuidv4 } from 'uuid';

const sendWAMessage = async (to: string, body: string) => {
  if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_sid') {
    console.log(`[MOCK WHATSAPP to ${to}]:\n${body}\n`);
    return { sid: 'mock_sid' };
  }
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to,
    body,
  });
};

export async function POST(request: Request) {
  try {
    const textParams = await request.text();
    const params = new URLSearchParams(textParams);
    
    const from = params.get('From');
    const incomingMsg = params.get('Body')?.trim().toLowerCase() || '';

    if (!from) {
      return new NextResponse('Missing From parameter', { status: 400 });
    }

    await connectToDatabase();

    // Get or Create Session from DB
    let session = await WaSession.findOne({ phone: from });
    if (!session) {
      session = new WaSession({ phone: from });
    }

    const { MessagingResponse } = twilio.twiml;
    const twiml = new MessagingResponse();

    const respond = async (msg: string) => {
      await session.save();
      twiml.message(msg);
      return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    };

    // Global commands
    if (incomingMsg === 'change') {
      session.step = 'browsing_restaurants';
      session.restaurantId = null;
      session.cart = [];
    } else if (incomingMsg === 'clear') {
      session.cart = [];
      return respond('🛒 Cart cleared. Text "menu" to see items.');
    } else if (incomingMsg === 'cart') {
      if (!session.cart || session.cart.length === 0) {
        return respond('🛒 Your cart is empty. Text "menu" to see items.');
      }
      let cartStr = '🛒 *Your Cart:*\n\n';
      let total = 0;
      session.cart.forEach((item: any, index: number) => {
        cartStr += `${index + 1}. ${item.name} - ${process.env.RESTAURANT_CURRENCY_SYMBOL || '$'}${item.price}\n`;
        total += item.price;
      });
      cartStr += `\n*Total:* ${process.env.RESTAURANT_CURRENCY_SYMBOL || '$'}${total}\n\nText "order" to place the order, or "clear" to empty cart.`;
      return respond(cartStr);
    } else if (incomingMsg === 'menu' && session.restaurantId) {
      session.step = 'browsing_menu';
    } else if (incomingMsg === 'order' && session.restaurantId) {
      if (!session.cart || session.cart.length === 0) {
        return respond('🛒 Your cart is empty! Text "menu" to add items.');
      }
      const totalAmount = session.cart.reduce((sum: number, item: any) => sum + item.price, 0);
      
      const newOrder = await Order.create({
        restaurantId: session.restaurantId,
        platform: 'whatsapp',
        customerId: from.replace('whatsapp:', ''),
        customerName: 'WhatsApp Customer',
        items: session.cart.map((item: any) => ({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          qty: 1
        })),
        totalPrice: totalAmount,
        status: 'pending',
      });

      session.cart = [];
      session.step = 'browsing_menu';
      return respond(`✅ *Order Placed Successfully!*\n\nOrder #${newOrder.orderNumber}\nTotal: ${process.env.RESTAURANT_CURRENCY_SYMBOL || '$'}${totalAmount}\n\nWe will start preparing your order soon!`);
    }

    // State Machine
    if (session.step === 'browsing_restaurants') {
      const restaurants = await Restaurant.find();
      if (restaurants.length === 0) {
        return respond('Sorry, there are no restaurants available right now.');
      }

      // Check if user selected a restaurant by number
      const selectedIndex = parseInt(incomingMsg) - 1;
      if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < restaurants.length) {
        session.restaurantId = restaurants[selectedIndex]._id;
        session.step = 'browsing_menu';
        session.cart = [];
        return respond(`You selected *${restaurants[selectedIndex].name}*! 🍔\n\nText "menu" to view the menu, or "change" to select a different restaurant.`);
      }

      let reply = '👋 *Welcome to the Multi-Restaurant Bot!*\n\nPlease select a restaurant by replying with its number:\n\n';
      restaurants.forEach((r, idx) => {
        reply += `${idx + 1}. ${r.name}\n`;
      });
      return respond(reply);
    }

    if (session.step === 'browsing_menu') {
      const menuItems = await MenuItem.find({ restaurantId: session.restaurantId }).sort({ displayNumber: 1 });
      
      const selectedNumber = parseInt(incomingMsg);
      if (!isNaN(selectedNumber)) {
        const item = menuItems.find((m) => m.displayNumber === selectedNumber);
        if (item) {
          session.cart.push({
            menuItemId: item._id,
            name: item.name,
            price: item.price,
            quantity: 1,
          });
          return respond(`✅ Added *${item.name}* to your cart.\n\nText another number to add more items.\nText "cart" to view your cart.\nText "order" to place your order.`);
        }
      }

      let reply = '📜 *Menu:*\n\n';
      menuItems.forEach((item) => {
        reply += `${item.displayNumber}. ${item.name} - ${process.env.RESTAURANT_CURRENCY_SYMBOL || '$'}${item.price}\n`;
      });
      reply += '\nReply with the item *number* to add it to your cart. 🛒\nType "change" to choose a different restaurant.';
      return respond(reply);
    }

    return respond("I didn't understand that. Text 'hi' or 'menu' to start over.");
  } catch (err: any) {
    console.error('WhatsApp Webhook Error:', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
