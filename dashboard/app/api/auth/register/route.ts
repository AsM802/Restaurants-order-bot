import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/db';
import Restaurant from '@/models/Restaurant';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    await connectToDatabase();

    let restaurant = await Restaurant.findOne({ email });
    if (restaurant) {
      return NextResponse.json({ msg: 'Restaurant owner already exists' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    restaurant = new Restaurant({
      name,
      email,
      password: hashedPassword,
    });

    await restaurant.save();

    return NextResponse.json({ msg: 'Registered successfully', id: restaurant.id }, { status: 201 });
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server error' }, { status: 500 });
  }
}
