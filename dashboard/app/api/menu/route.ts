import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import MenuItem from '@/models/MenuItem';
import { getUserIdFromRequest } from '@/lib/auth';

// GET all menu items for the logged-in owner
export async function GET(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ msg: 'Not authorized' }, { status: 401 });
    }

    await connectToDatabase();
    const items = await MenuItem.find({ restaurantId: userId }).sort({ displayNumber: 1 });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server Error' }, { status: 500 });
  }
}

// POST create a new menu item for the logged-in owner
export async function POST(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ msg: 'Not authorized' }, { status: 401 });
    }

    const body = await request.json();
    await connectToDatabase();

    const newItem = new MenuItem({
      ...body,
      restaurantId: userId,
    });
    const item = await newItem.save();
    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server Error' }, { status: 500 });
  }
}
