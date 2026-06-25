import mongoose, { Document, Model } from 'mongoose';

export interface IRestaurant extends Document {
  name?: string;
  phone: string;
  address?: string;
  logoUrl?: string;
  paymentNumber?: string;
  paymentQrCodeUrl?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

const restaurantSchema = new mongoose.Schema<IRestaurant>(
  {
    name: { type: String, default: 'New Restaurant' },
    phone: { type: String, required: true, unique: true },
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

export default (mongoose.models.Restaurant as Model<IRestaurant>) || mongoose.model<IRestaurant>('Restaurant', restaurantSchema);
