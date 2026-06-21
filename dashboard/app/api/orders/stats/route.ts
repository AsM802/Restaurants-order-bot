import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ msg: 'Not authorized' }, { status: 401 });
    }

    await connectToDatabase();

    const totalOrders = await Order.countDocuments({ restaurantId: userId });
    
    const revenueResult = await Order.aggregate([
      { $match: { status: 'Delivered', restaurantId: userId } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    const pendingOrders = await Order.countDocuments({ status: 'pending', restaurantId: userId });

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      pendingOrders,
    });
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server Error' }, { status: 500 });
  }
}
