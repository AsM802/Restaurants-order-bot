'use client';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api from '@/lib/api';

export default function CookScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const restaurantName = process.env.NEXT_PUBLIC_RESTAURANT_NAME || 'Kitchen Screen';

  const fetchPreparingOrders = async () => {
    try {
      const { data } = await api.get('/orders?status=preparing');
      setOrders(data);
    } catch {
      console.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreparingOrders();
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl);

    socket.on('new_order', fetchPreparingOrders);
    socket.on('order_status_update', fetchPreparingOrders);

    return () => { socket.disconnect(); };
  }, []);

  const markDone = async (orderId: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: 'ready' });
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
    } catch {
      alert('Failed to update order');
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      fontFamily: 'var(--font)',
      color: 'var(--text-primary)',
    }}>
      {/* Cook Header */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '2px solid var(--blue)',
        padding: '20px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 32 }}>👨‍🍳</span>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>{restaurantName}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Kitchen Display — Orders to Prepare</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            background: 'var(--blue-bg)', color: 'var(--blue)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 100, padding: '6px 18px',
            fontWeight: 700, fontSize: 14,
          }}>
            🔵 {orders.length} Active
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            🕐 {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Cook Body */}
      <div style={{ padding: '28px 32px' }}>
        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>All caught up!</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>No orders to prepare right now. Great job!</p>
          </div>
        ) : (
          <div className="cook-grid">
            {orders.map((order) => (
              <div key={order._id} className="cook-order-card">
                <div className="cook-order-header">
                  <div>
                    <div className="cook-order-number">#{order.orderNumber}</div>
                    <div className="cook-order-platform">
                      {order.platform === 'telegram' ? '✈️ Telegram' : '📱 WhatsApp'} · {order.customerName}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="cook-order-time" style={{ fontSize: 14, color: 'var(--yellow)', fontWeight: 600 }}>
                      ⏱ {timeAgo(order.createdAt)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {order.items.length} item{order.items.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div>
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="cook-item">
                      <div>
                        <span className="cook-item-qty">{item.qty}×</span>
                        {item.name}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cook-order-footer">
                  <button
                    id={`mark-ready-${order._id}`}
                    className="btn-done"
                    onClick={() => markDone(order._id)}
                  >
                    ✅ Mark Ready
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
