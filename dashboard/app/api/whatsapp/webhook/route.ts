import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import WaSession from '@/models/WaSession';
import Restaurant from '@/models/Restaurant';
import MenuItem from '@/models/MenuItem';
import Order from '@/models/Order';

// --- TWILIO HELPERS ---
import twilio from 'twilio';

const sendWAMessage = async (to: string, body: string, mediaUrl?: string) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.log(`\n[MOCK TWILIO WA to ${to}]:\n${body}`);
    if (mediaUrl) console.log(`[Media URL]: ${mediaUrl}`);
    console.log(`\n`);
    return { success: true };
  }

  const twilioClient = twilio(accountSid, authToken);
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_SMS_NUMBER;
  
  // Ensure we format the to number for Twilio Whatsapp (whatsapp:+91...)
  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:+${to.replace(/^\+/, '')}`;

  try {
    const payload: any = {
      body,
      from: fromNumber,
      to: formattedTo
    };
    
    // If there's an image
    if (mediaUrl) {
      payload.mediaUrl = [mediaUrl];
    }

    await twilioClient.messages.create(payload);
    return { success: true };
  } catch (error) {
    console.error('Error sending Twilio WA Message:', error);
  }
};

// --- WEBHOOK VERIFICATION (GET) ---

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify the token matches the one in .env
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('WEBHOOK VERIFIED');
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

// --- UTILS ---

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

// --- WEBHOOK HANDLER (POST) ---

export async function POST(request: Request) {
  try {
    const textData = await request.text();
    const params = new URLSearchParams(textData);

    const fromTwilio = params.get('From'); // e.g. "whatsapp:+919999999999"
    const bodyStr = params.get('Body') || '';
    const numMedia = parseInt(params.get('NumMedia') || '0', 10);
    const latitudeStr = params.get('Latitude');
    const longitudeStr = params.get('Longitude');

    if (!fromTwilio) {
      return new NextResponse('Not a Twilio Webhook', { status: 400 });
    }

    // Extract raw phone number to be consistent with DB (strip 'whatsapp:' and '+')
    const from = fromTwilio.replace('whatsapp:', '').replace('+', ''); 

    let incomingMsg = bodyStr.trim().toLowerCase();
    let latitude: number | null = latitudeStr ? parseFloat(latitudeStr) : null;
    let longitude: number | null = longitudeStr ? parseFloat(longitudeStr) : null;
    let hasMedia = numMedia > 0;

    // Twilio sends media but the Body might be empty. If there is media and no body, set it to 'image' to simulate it
    if (hasMedia && !incomingMsg) {
       incomingMsg = 'image';
    }

    await connectToDatabase();

    // Get or Create Session from DB
    let session = await WaSession.findOne({ phone: from });
    if (!session) {
      session = new WaSession({ phone: from, step: 'asking_location' });
    }

    // A helper function to send messages via Twilio and respond with 200 OK
    const respond = async (msg: string, mediaUrl?: string) => {
      await session.save();
      await sendWAMessage(from, msg, mediaUrl);
      
      // We must return valid empty TwiML so Twilio knows we processed the webhook successfully
      const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
      return new NextResponse(twiml, { 
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      });
    };

    // --- GLOBAL COMMANDS ---
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
      cartStr += `\n*Total:* ${process.env.RESTAURANT_CURRENCY_SYMBOL || '₹'}${total}\n\nText "remove [number]" to remove an item, "order" to place the order, or "clear" to empty cart.`;
      return respond(cartStr);
    } else if (incomingMsg.startsWith('remove ')) {
      const indexStr = incomingMsg.split(' ')[1];
      const index = parseInt(indexStr) - 1;
      
      if (!isNaN(index) && session.cart && index >= 0 && index < session.cart.length) {
        const removedItem = session.cart.splice(index, 1)[0];
        return respond(`🗑️ Removed *${removedItem.name}* from your cart.\n\nText "cart" to see your updated cart, or "menu" to add more.`);
      } else {
        return respond('⚠️ Invalid item number. Text "cart" to see your cart and reply with "remove [number]".');
      }
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
        customerId: from, // Meta numbers are just the raw digits
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
        // Construct the full URL if it's a relative local upload path
        let qrUrl = restaurant.paymentQrCodeUrl;
        if (qrUrl.startsWith('/uploads/')) {
           const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://restaurants-order-bot.vercel.app';
           qrUrl = `${baseUrl}${qrUrl}`;
        }
        paymentInstructions += `\n\n💳 Please scan the QR code to pay ${process.env.RESTAURANT_CURRENCY_SYMBOL || '₹'}${totalAmount}. After paying, reply with a *screenshot* of your successful transaction.`;
        return respond(paymentInstructions, qrUrl);
      } else if (restaurant?.paymentNumber) {
        paymentInstructions += `\n\n💳 Please send ${process.env.RESTAURANT_CURRENCY_SYMBOL || '₹'}${totalAmount} to WhatsApp Number: ${restaurant.paymentNumber}\n\nAfter paying, reply with a *screenshot* of your successful transaction.`;
        return respond(paymentInstructions);
      } else {
        paymentInstructions += `\n\n💳 The restaurant will contact you shortly for payment. (Reply with any image to simulate payment for now).`;
        return respond(paymentInstructions);
      }
    }

    // --- STATE MACHINE ---

    if (session.step === 'awaiting_payment') {
      if (incomingMsg === 'cancel') {
         await Order.updateMany({ customerId: from, status: 'awaiting_payment' }, { status: 'done', 'payment.paymentStatus': 'Failed' });
         session.step = 'browsing_menu';
         session.cart = [];
         return respond('🚫 Order cancelled. Text "menu" to see items.');
      }
      
      if (hasMedia) {
        // Assume they sent a screenshot
        await Order.updateMany(
          { customerId: from, status: 'awaiting_payment' },
          { status: 'pending', 'payment.paymentStatus': 'Paid' }
        );
        session.step = 'browsing_menu';
        session.cart = [];
        return respond('🎉 *Payment Received!* Your order is now confirmed and sent to the kitchen. We will notify you when it is ready!');
      } else {
        return respond('📸 Please reply with a *screenshot* of your payment to confirm your order, or type "cancel" to cancel.');
      }
    }

    if (session.step === 'asking_location' || session.step === 'browsing_restaurants') {
      if (latitude && longitude) {
        session.location = { lat: latitude, lng: longitude };
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
             nearbyRestaurants.push({ ...r.toObject(), distance: 0 });
          }
        }
        
        if (nearbyRestaurants.length === 0) {
          return respond('Sorry, there are no restaurants available within 3km of your location.');
        }
        
        nearbyRestaurants.sort((a, b) => a.distance - b.distance);

        let reply = '👋 *Nearby Restaurants (within 3km):*\n\nPlease select a restaurant by replying with its number:\n\n';
        nearbyRestaurants.forEach((r, idx) => {
           let distStr = r.distance > 0 ? ` (${r.distance.toFixed(1)} km)` : '';
           reply += `${idx + 1}. ${r.name}${distStr}\n`;
        });
        
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
