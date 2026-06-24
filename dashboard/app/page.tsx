'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  pending: number;
  preparing: number;
  done: number;
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';

  const fetchData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        api.get('/orders/stats'),
        api.get('/orders?limit=5'),
      ]);
      setStats(statsRes.data);
      setRecentOrders(ordersRes.data.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusColor: Record<string, string> = {
    pending: 'badge-pending',
    preparing: 'badge-preparing',
    ready: 'badge-ready',
    done: 'badge-done',
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Real-time restaurant performance — today&apos;s snapshot</p>
      </div>

      <div className="page-body fade-in">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-label">Total Orders Today</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>
              {stats ? stats.totalOrders : '—'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-label">Revenue Today</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>
              {stats ? `${currency}${stats.totalRevenue.toLocaleString()}` : '—'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-label">Pending</div>
            <div className="stat-value" style={{ color: 'var(--yellow)' }}>
              {stats ? stats.pending : '—'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🍳</div>
            <div className="stat-label">Preparing Now</div>
            <div className="stat-value" style={{ color: 'var(--blue)' }}>
              {stats ? stats.preparing : '—'}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="flex-between mb-16">
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Recent Orders</h2>
            <a href="/orders" className="btn btn-secondary btn-sm">View All →</a>
          </div>

          {recentOrders.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🛒</div>
              <p>No orders yet today. Share your bot link!</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Platform</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order._id}>
                      <td className="bold" style={{ color: 'var(--accent)' }}>#{order.orderNumber}</td>
                      <td>
                        <span className="platform-icon">
                          {order.platform === 'telegram' ? '✈️' : '📱'} {order.platform}
                        </span>
                      </td>
                      <td>{order.customerName}</td>
                      <td>{order.items.length} items</td>
                      <td className="bold">{currency}{order.totalPrice}</td>
                      <td><span className={`badge ${statusColor[order.status] || ''}`}>{order.status}</span></td>
                      <td className="text-muted text-sm">
                        {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Help */}
        <div className="card mt-24" style={{ borderColor: 'var(--accent-glow)', borderLeft: '4px solid var(--accent)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12 }}>📝 Quick Notes</h3>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 2, paddingLeft: 20 }}>
            <li>Share your WhatsApp bot number with customers to start receiving orders directly into this dashboard.</li>
            <li>Keep your menu updated so customers always see your latest offerings.</li>
            <li>Orders are marked as Paid automatically when customers send a screenshot of their transaction.</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
