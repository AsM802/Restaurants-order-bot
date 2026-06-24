import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/db';
import Restaurant from '@/models/Restaurant';

export async function POST(request: Request) {
  try {
    const { name, email, password, phone, paymentNumber, paymentQrCodeUrl, lat, lng } = await request.json();
    await connectToDatabase();

    let restaurant = await Restaurant.findOne({ email });
    if (restaurant) {
      return NextResponse.json({ msg: 'Restaurant owner already exists' }, { status: 400 });
    }

    restaurant = new Restaurant({
      name,
      email,
      password, // The pre-save hook in the Restaurant model will hash this!
      phone,
      paymentNumber,
      paymentQrCodeUrl,
      location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined
    });

    await restaurant.save();

    return NextResponse.json({ msg: 'Registered successfully', id: restaurant.id }, { status: 201 });
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server error' }, { status: 500 });
  }
}
