import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import MenuItem from '@/models/MenuItem';

// GET all menu items for a specific restaurant (public)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ msg: 'restaurantId is required' }, { status: 400 });
    }

    await connectToDatabase();
    const items = await MenuItem.find({ restaurantId }).sort({ displayNumber: 1 });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server Error' }, { status: 500 });
  }
}
