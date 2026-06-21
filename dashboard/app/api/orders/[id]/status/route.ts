import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { getUserIdFromRequest } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ msg: 'Not authorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();
    await connectToDatabase();

    const order = await Order.findOne({ _id: id, restaurantId: userId });
    if (!order) {
      return NextResponse.json({ msg: 'Order not found' }, { status: 404 });
    }

    order.status = status;
    await order.save();

    return NextResponse.json(order);
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server Error' }, { status: 500 });
  }
}
