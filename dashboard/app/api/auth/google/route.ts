import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/lib/db';
import Restaurant from '@/models/Restaurant';

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json({ msg: 'Missing Google credential' }, { status: 400 });
    }

    // Verify the Google JWT token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ msg: 'Invalid Google token' }, { status: 401 });
    }

    const { email, name, picture } = payload;

    await connectToDatabase();

    // Check if user exists
    let restaurant = await Restaurant.findOne({ email });

    // If no user exists, create a new Restaurant automatically
    if (!restaurant) {
      restaurant = new Restaurant({
        name: name || 'Google User',
        email,
        logoUrl: picture || '',
        // password is not required anymore, so we leave it undefined
      });
      await restaurant.save();
    }

    // Generate our own JWT token for the session
    const token = jwt.sign(
      { restaurant: { id: restaurant.id } },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '5h' }
    );

    return NextResponse.json({ token, id: restaurant.id }, { status: 200 });
  } catch (error: any) {
    console.error('Google Auth Error:', error);
    return NextResponse.json({ msg: 'Authentication failed' }, { status: 500 });
  }
}
