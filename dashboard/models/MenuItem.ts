import mongoose, { Document, Model } from 'mongoose';

export interface IMenuItem extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
  displayNumber: number;
}

const menuItemSchema = new mongoose.Schema<IMenuItem>(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, default: 'Main Course' },
    imageUrl: { type: String, default: '' },
    available: { type: Boolean, default: true },
    displayNumber: { type: Number }, // The number shown in menu (1, 2, 3...)
  },
  { timestamps: true }
);

export default (mongoose.models.MenuItem as Model<IMenuItem>) || mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
