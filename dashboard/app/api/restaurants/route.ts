import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Restaurant from '@/models/Restaurant';

export async function GET() {
  try {
    await connectToDatabase();
    const restaurants = await Restaurant.find().select('-password -__v');
    return NextResponse.json(restaurants);
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server error' }, { status: 500 });
  }
}
