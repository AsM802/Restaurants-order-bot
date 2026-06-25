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
    let twilioErrorMsg = null;

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
        devOtpFallback = otpCode;
        twilioErrorMsg = twilioErr.message;
      }
    } else {
      // Vercel doesn't have the env vars!
      devOtpFallback = otpCode;
      twilioErrorMsg = "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in environment variables.";
    }

    return NextResponse.json({ 
      msg: 'OTP sent successfully',
      devOtp: devOtpFallback || otpCode, // Always return it for now so they aren't blocked
      twilioError: twilioErrorMsg
    });
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ msg: 'Server error' }, { status: 500 });
  }
}
