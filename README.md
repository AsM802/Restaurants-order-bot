# 🍴 Restaurant Order Bot System

A complete restaurant ordering platform with a Telegram bot, WhatsApp bot (Twilio), Razorpay payment integration, and a real-time owner dashboard.

## 📁 Project Structure

```
Restaurants-order-bot/
├── backend/          # Node.js + Express API + Bots
│   ├── models/       # Mongoose schemas
│   ├── routes/       # REST API endpoints
│   ├── bots/         # Telegram & WhatsApp bot logic
│   ├── middleware/   # JWT auth
│   ├── config/       # DB connection
│   └── server.js     # Entry point
└── dashboard/        # Next.js owner dashboard
    ├── app/          # Pages (login, menu, orders, cook)
    ├── components/   # Sidebar, layout
    └── lib/          # API client
```

---

## ⚙️ Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in your .env values (see below)
npm install
npm run dev
```

**Required `.env` values:**

| Key | Where to get it |
|---|---|
| `MONGO_URI` | [MongoDB Atlas](https://cloud.mongodb.com) — Free cluster |
| `JWT_SECRET` | Any long random string |
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) on Telegram |
| `TWILIO_ACCOUNT_SID` | [Twilio Console](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | [Twilio Console](https://console.twilio.com) |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` (Twilio sandbox) |
| `RAZORPAY_KEY_ID` | [Razorpay Dashboard](https://dashboard.razorpay.com) |
| `RAZORPAY_KEY_SECRET` | [Razorpay Dashboard](https://dashboard.razorpay.com) |
| `RESTAURANT_NAME` | Your restaurant's name |

### 2. Dashboard

```bash
cd dashboard
npm install
npm run dev
# Opens at http://localhost:3000
```

### 3. Create Your Owner Account

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"My Restaurant","email":"owner@restaurant.com","password":"yourpassword"}'
```

---

## 🤖 Bot Setup

### Telegram
1. Message [@BotFather](https://t.me/BotFather) → `/newbot`
2. Copy the token → paste into `TELEGRAM_BOT_TOKEN` in `.env`
3. Start backend → bot is live automatically

### WhatsApp (Twilio Sandbox)
1. Go to [Twilio Console → WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Set webhook URL to: `https://your-server-url/api/whatsapp/webhook`
3. Customers join your sandbox by sending the join keyword

> 💡 Use [ngrok](https://ngrok.com) to expose localhost for Twilio during development:
> ```bash
> ngrok http 5000
> # Use the https URL as your Twilio webhook
> ```

---

## 🌐 Dashboard Pages

| Page | URL | Description |
|---|---|---|
| Login | `/login` | Owner sign in |
| Dashboard | `/` | Today's stats & recent orders |
| Menu Manager | `/menu` | Add/edit/delete menu items |
| Orders | `/orders` | Real-time order feed with status controls |
| Cook Screen | `/cook` | Tablet-optimized kitchen display |

---

## 💬 Customer Bot Flow

```
/start  → See full menu
1, 2, 3 → Add items to cart
/cart   → View cart & total
/order  → Get Razorpay payment link
/clear  → Empty cart
/menu   → Show menu again
```

---

## 🏗️ Tech Stack

- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io
- **Bots**: node-telegram-bot-api, Twilio
- **Payments**: Razorpay
- **Dashboard**: Next.js 14, TypeScript, Vanilla CSS
- **Real-time**: Socket.io