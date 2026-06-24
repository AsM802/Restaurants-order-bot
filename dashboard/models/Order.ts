import mongoose, { Document, Model } from 'mongoose';

export interface IOrderItem {
  menuItemId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  qty: number;
}

export interface IOrder extends Document {
  restaurantId: mongoose.Types.ObjectId;
  platform: 'telegram' | 'whatsapp';
  customerId: string;
  customerName: string;
  items: IOrderItem[];
  totalPrice: number;
  status: 'awaiting_payment' | 'pending' | 'preparing' | 'ready' | 'done';
  payment: {
    paymentMethod: 'COD' | 'ONLINE';
    paymentStatus: 'Pending' | 'Paid' | 'Failed';
  };
  orderNumber: number;
}

const orderItemSchema = new mongoose.Schema<IOrderItem>({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name: String,
  price: Number,
  qty: { type: Number, default: 1 },
});

const orderSchema = new mongoose.Schema<IOrder>(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    platform: {
      type: String,
      enum: ['telegram', 'whatsapp'],
      required: true,
    },
    customerId: { type: String, required: true }, // Telegram chat ID or WhatsApp number
    customerName: { type: String, default: 'Guest' },
    items: [orderItemSchema],
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ['awaiting_payment', 'pending', 'preparing', 'ready', 'done'],
      default: 'awaiting_payment',
    },
    payment: {
      paymentMethod: { type: String, enum: ['COD', 'ONLINE'], required: true },
      paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
    },
    orderNumber: { type: Number }, // Human readable order number like #1001
  },
  { timestamps: true }
);

// Auto-increment order number
orderSchema.pre('save', async function () {
  if (this.isNew) {
    const lastOrder = await (this.constructor as Model<IOrder>).findOne().sort({ orderNumber: -1 });
    this.orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1001;
  }
});

export default (mongoose.models.Order as Model<IOrder>) || mongoose.model<IOrder>('Order', orderSchema);
