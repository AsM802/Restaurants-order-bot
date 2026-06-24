import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { getUserIdFromRequest } from '@/lib/auth';

// GET all orders for the logged-in owner
export async function GET(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ msg: 'Not authorized' }, { status: 401 });
    }

    await connectToDatabase();
    const orders = await Order.find({ restaurantId: userId }).sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server Error' }, { status: 500 });
  }
}

// POST create a new order (from WhatsApp bot or public API)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, items, totalAmount, paymentMethod, restaurantId } = body;

    if (!restaurantId) {
      return NextResponse.json({ msg: 'restaurantId is required' }, { status: 400 });
    }

    await connectToDatabase();

    const orderId = uuidv4().slice(0, 8).toUpperCase();

    const newOrder = new Order({
      orderId,
      customerId: customerPhone || 'guest',
      platform: 'whatsapp',
      customerName,
      items,
      totalPrice: totalAmount,
      payment: {
        paymentMethod: paymentMethod || 'ONLINE',
        paymentStatus: 'Pending',
      },
      restaurantId,
    });

    const order = await newOrder.save();
    return NextResponse.json(order, { status: 201 });
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server Error' }, { status: 500 });
  }
}
