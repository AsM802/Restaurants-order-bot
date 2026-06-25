import mongoose, { Document, Model } from 'mongoose';

export interface IOtp extends Document {
  phone: string;
  otp: string;
  createdAt: Date;
}

const otpSchema = new mongoose.Schema<IOtp>(
  {
    phone: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 } // Expires in 5 minutes (300 seconds)
  }
);

export default (mongoose.models.Otp as Model<IOtp>) || mongoose.model<IOtp>('Otp', otpSchema);
