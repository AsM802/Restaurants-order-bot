import { NextResponse } from 'next/server';
import twilio from 'twilio';
import connectToDatabase from '@/lib/db';
import Otp from '@/models/Otp';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ msg: 'Phone number is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Generate 6 digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB (this will overwrite or we can just delete old OTPs for this phone)
    await Otp.deleteMany({ phone });
    await Otp.create({ phone, otp: otpCode });

    let devOtpFallback = null;

    // Try sending SMS/WhatsApp via Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const fromNumber = process.env.TWILIO_SMS_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;
      const toNumber = fromNumber?.startsWith('whatsapp:') ? `whatsapp:${phone}` : phone;
      
      try {
        await client.messages.create({
          body: `Your login OTP is: ${otpCode}. It will expire in 5 minutes.`,
          from: fromNumber,
          to: toNumber
        });
        console.log(`OTP sent to ${toNumber} via Twilio`);
      } catch (twilioErr: any) {
        console.error('Twilio Error:', twilioErr.message);
        // Fallback for development/testing if Twilio fails (e.g. sandbox not joined)
        console.log(`[DEV FALLBACK] OTP for ${phone} is ${otpCode}`);
        devOtpFallback = otpCode;
      }
    } else {
      console.log(`[DEV MODE] OTP for ${phone} is ${otpCode}`);
      devOtpFallback = otpCode;
    }

    return NextResponse.json({ 
      msg: 'OTP sent successfully',
      devOtp: devOtpFallback 
    });
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server error' }, { status: 500 });
  }
}
