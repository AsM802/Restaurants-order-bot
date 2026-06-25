import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Restaurant from '@/models/Restaurant';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ msg: 'No token, authorization denied' }, { status: 401 });
    }

    await connectToDatabase();
    const restaurant = await Restaurant.findById(userId).select('-password');
    if (!restaurant) {
      return NextResponse.json({ msg: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(restaurant);
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ msg: 'No token, authorization denied' }, { status: 401 });
    }

    const data = await request.json();

    await connectToDatabase();
    const restaurant = await Restaurant.findById(userId);
    if (!restaurant) {
      return NextResponse.json({ msg: 'User not found' }, { status: 404 });
    }

    // Update allowed fields
    const allowedFields = ['name', 'phone', 'address', 'logoUrl', 'paymentNumber', 'paymentQrCodeUrl', 'location'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        restaurant[field] = data[field];
      }
    }

    await restaurant.save();

    // Return the updated restaurant (excluding password)
    const updatedRestaurant = await Restaurant.findById(userId).select('-password');
    return NextResponse.json(updatedRestaurant);
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server error' }, { status: 500 });
  }
}
