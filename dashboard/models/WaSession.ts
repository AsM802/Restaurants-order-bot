import mongoose, { Document, Model } from 'mongoose';

export interface IWaSession extends Document {
  phone: string;
  step: string;
  restaurantId: mongoose.Types.ObjectId | null;
  cart: any[];
}

const WaSessionSchema = new mongoose.Schema<IWaSession>({
  phone: { type: String, required: true, unique: true },
  step: { type: String, default: 'browsing_restaurants' },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
  cart: { type: [Object], default: [] }
}, { timestamps: true });

export default (mongoose.models.WaSession as Model<IWaSession>) || mongoose.model<IWaSession>('WaSession', WaSessionSchema);
