import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/lib/db';
import Restaurant from '@/models/Restaurant';
import Otp from '@/models/Otp';

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json({ msg: 'Phone number and OTP are required' }, { status: 400 });
    }

    await connectToDatabase();

    // Verify OTP
    const validOtp = await Otp.findOne({ phone, otp });
    if (!validOtp) {
      return NextResponse.json({ msg: 'Invalid or expired OTP' }, { status: 400 });
    }

    // OTP is valid, delete it so it can't be reused
    await Otp.deleteOne({ _id: validOtp._id });

    // Find or create user
    let restaurant = await Restaurant.findOne({ phone });
    
    if (!restaurant) {
      restaurant = new Restaurant({
        phone,
        name: 'New Restaurant',
        address: '',
        logoUrl: '',
      });
      await restaurant.save();
    }

    const payload = {
      restaurant: {
        id: restaurant.id,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
      expiresIn: '5h',
    });

    return NextResponse.json({ token, restaurant });
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server error' }, { status: 500 });
  }
}
