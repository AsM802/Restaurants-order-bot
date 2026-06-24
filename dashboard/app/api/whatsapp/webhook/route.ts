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

// Haversine formula to calculate distance in km
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export async function POST(request: Request) {
  try {
    const textParams = await request.text();
    const params = new URLSearchParams(textParams);
    
    const from = params.get('From');
    const incomingMsg = params.get('Body')?.trim().toLowerCase() || '';
    const latitude = params.get('Latitude');
    const longitude = params.get('Longitude');

    if (!from) {
      return new NextResponse('Missing From parameter', { status: 400 });
    }

    await connectToDatabase();

    // Get or Create Session from DB
    let session = await WaSession.findOne({ phone: from });
    if (!session) {
      session = new WaSession({ phone: from, step: 'asking_location' });
    }

    const { MessagingResponse } = twilio.twiml;
    const twiml = new MessagingResponse();

    const respond = async (msg: string, mediaUrl?: string) => {
      await session.save();
      const message = twiml.message(msg);
      if (mediaUrl) message.media(mediaUrl);
      return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    };

    // Global commands
    if (incomingMsg === 'change') {
      session.step = 'asking_location';
      session.restaurantId = null;
      session.cart = [];
      session.location = undefined;
      return respond('📍 Please send your location (using WhatsApp attachment 📎) to find nearby restaurants.');
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
        cartStr += `${index + 1}. ${item.name} - ${process.env.RESTAURANT_CURRENCY_SYMBOL || '₹'}${item.price}\n`;
        total += item.price;
      });
      cartStr += `\n*Total:* ${process.env.RESTAURANT_CURRENCY_SYMBOL || '₹'}${total}\n\nText "order" to place the order, or "clear" to empty cart.`;
      return respond(cartStr);
    } else if (incomingMsg === 'menu' && session.restaurantId) {
      session.step = 'browsing_menu';
    } else if (incomingMsg === 'order' && session.restaurantId) {
      if (!session.cart || session.cart.length === 0) {
        return respond('🛒 Your cart is empty! Text "menu" to add items.');
      }
      const totalAmount = session.cart.reduce((sum: number, item: any) => sum + item.price, 0);
      
      const restaurant = await Restaurant.findById(session.restaurantId);
      
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
        status: 'awaiting_payment',
        payment: {
          paymentMethod: 'ONLINE',
          paymentStatus: 'Pending'
        }
      });

      session.step = 'awaiting_payment';
      
      let paymentInstructions = `✅ *Order Placed! (Status: Awaiting Payment)*\n\nOrder #${newOrder.orderNumber}\nTotal: ${process.env.RESTAURANT_CURRENCY_SYMBOL || '₹'}${totalAmount}`;
      
      if (restaurant?.paymentQrCodeUrl) {
        paymentInstructions += `\n\n💳 Please scan the QR code to pay ${process.env.RESTAURANT_CURRENCY_SYMBOL || '₹'}${totalAmount}. After paying, reply with a *screenshot* of your successful transaction.`;
        return respond(paymentInstructions, restaurant.paymentQrCodeUrl);
      } else if (restaurant?.paymentNumber) {
        paymentInstructions += `\n\n💳 Please send ${process.env.RESTAURANT_CURRENCY_SYMBOL || '₹'}${totalAmount} to WhatsApp Number: ${restaurant.paymentNumber}\n\nAfter paying, reply with a *screenshot* of your successful transaction.`;
        return respond(paymentInstructions);
      } else {
        paymentInstructions += `\n\n💳 The restaurant will contact you shortly for payment. (Reply with any image to simulate payment for now).`;
        return respond(paymentInstructions);
      }
    }

    if (session.step === 'awaiting_payment') {
      const numMedia = parseInt(params.get('NumMedia') || '0');
      
      if (incomingMsg === 'cancel') {
         await Order.updateMany({ customerId: from.replace('whatsapp:', ''), status: 'awaiting_payment' }, { status: 'done', 'payment.paymentStatus': 'Failed' });
         session.step = 'browsing_menu';
         session.cart = [];
         return respond('🚫 Order cancelled. Text "menu" to see items.');
      }
      
      if (numMedia > 0) {
        // Assume they sent a screenshot
        await Order.updateMany(
          { customerId: from.replace('whatsapp:', ''), status: 'awaiting_payment' },
          { status: 'pending', 'payment.paymentStatus': 'Paid' }
        );
        session.step = 'browsing_menu';
        session.cart = [];
        return respond('🎉 *Payment Received!* Your order is now confirmed and sent to the kitchen. We will notify you when it is ready!');
      } else {
        return respond('📸 Please reply with a *screenshot* of your payment to confirm your order, or type "cancel" to cancel.');
      }
    }

    // State Machine
    if (session.step === 'asking_location' || session.step === 'browsing_restaurants') { // Legacy support for 'browsing_restaurants' without location
      if (latitude && longitude) {
        session.location = { lat: parseFloat(latitude), lng: parseFloat(longitude) };
        session.step = 'selecting_restaurant';
        
        const restaurants = await Restaurant.find();
        let nearbyRestaurants = [];
        
        for (const r of restaurants) {
          if (r.location && r.location.lat && r.location.lng) {
            const distance = getDistanceFromLatLonInKm(session.location.lat, session.location.lng, r.location.lat, r.location.lng);
            if (distance <= 3) {
              nearbyRestaurants.push({ ...r.toObject(), distance });
            }
          } else {
             // Include restaurants without location for now to ensure backwards compatibility
             nearbyRestaurants.push({ ...r.toObject(), distance: 0 });
          }
        }
        
        if (nearbyRestaurants.length === 0) {
          return respond('Sorry, there are no restaurants available within 3km of your location.');
        }
        
        // Sort by distance
        nearbyRestaurants.sort((a, b) => a.distance - b.distance);

        let reply = '👋 *Nearby Restaurants (within 3km):*\n\nPlease select a restaurant by replying with its number:\n\n';
        nearbyRestaurants.forEach((r, idx) => {
           let distStr = r.distance > 0 ? ` (${r.distance.toFixed(1)} km)` : '';
           reply += `${idx + 1}. ${r.name}${distStr}\n`;
        });
        
        // Save the nearby list order in session so they can select by number (simple implementation: we just re-fetch and re-sort when they send a number, but since it might change, it's a bit flaky. A better way is to rely on consistent DB sorting, but let's stick to simple re-fetch for now).
        return respond(reply);
      } else {
         if (session.step === 'asking_location') {
           return respond('👋 *Welcome to the Multi-Restaurant Bot!*\n\nTo find restaurants near you (within 3km), please send your location pin using the attachment 📎 button in WhatsApp.');
         }
      }
    }

    if (session.step === 'selecting_restaurant') {
       if (latitude && longitude) return respond('Please select a restaurant from the list above by typing its number.');
       
       const restaurants = await Restaurant.find();
       let nearbyRestaurants = [];
       if (session.location) {
         for (const r of restaurants) {
           if (r.location && r.location.lat && r.location.lng) {
             const distance = getDistanceFromLatLonInKm(session.location.lat, session.location.lng, r.location.lat, r.location.lng);
             if (distance <= 3) nearbyRestaurants.push({ ...r.toObject(), distance });
           } else {
              nearbyRestaurants.push({ ...r.toObject(), distance: 0 });
           }
         }
         nearbyRestaurants.sort((a, b) => a.distance - b.distance);
       } else {
          nearbyRestaurants = restaurants.map(r => ({...r.toObject(), distance: 0}));
       }

       const selectedIndex = parseInt(incomingMsg) - 1;
       if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < nearbyRestaurants.length) {
         session.restaurantId = nearbyRestaurants[selectedIndex]._id;
         session.step = 'browsing_menu';
         session.cart = [];
         return respond(`You selected *${nearbyRestaurants[selectedIndex].name}*! 🍔\n\nText "menu" to view the menu, or "change" to search another location.`);
       } else {
         return respond('Please reply with a valid number from the list.');
       }
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
        reply += `${item.displayNumber}. ${item.name} - ${process.env.RESTAURANT_CURRENCY_SYMBOL || '₹'}${item.price}\n`;
      });
      reply += '\nReply with the item *number* to add it to your cart. 🛒\nType "change" to start over.';
      return respond(reply);
    }

    return respond("I didn't understand that. Text 'hi' or 'menu' to start over.");
  } catch (err: any) {
    console.error('WhatsApp Webhook Error:', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
