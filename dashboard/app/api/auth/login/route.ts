import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/lib/db';
import Restaurant from '@/models/Restaurant';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    await connectToDatabase();

    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) {
      return NextResponse.json({ msg: 'Invalid Credentials' }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(password, restaurant.password);
    if (!isMatch) {
      return NextResponse.json({ msg: 'Invalid Credentials' }, { status: 400 });
    }

    const payload = {
      restaurant: {
        id: restaurant.id,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
      expiresIn: '5h',
    });

    return NextResponse.json({ token });
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server error' }, { status: 500 });
  }
}
