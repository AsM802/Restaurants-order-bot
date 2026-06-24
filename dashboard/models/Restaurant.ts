import mongoose, { Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IRestaurant extends Document {
  name: string;
  email: string;
  password?: string;
  phone: string;
  address: string;
  logoUrl: string;
  paymentNumber?: string;
  paymentQrCodeUrl?: string;
  location?: {
    lat: number;
    lng: number;
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const restaurantSchema = new mongoose.Schema<IRestaurant>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    paymentNumber: { type: String, default: '' },
    paymentQrCodeUrl: { type: String, default: '' },
    location: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  { timestamps: true }
);

// Hash password before saving
restaurantSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password
restaurantSchema.methods.comparePassword = async function (candidatePassword: string) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

export default (mongoose.models.Restaurant as Model<IRestaurant>) || mongoose.model<IRestaurant>('Restaurant', restaurantSchema);
