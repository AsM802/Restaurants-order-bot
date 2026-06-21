'use client';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

const STATUSES = ['pending', 'preparing', 'ready', 'done'];
const STATUS_NEXT: Record<string, string> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'done',
  done: 'done',
};
const STATUS_LABEL: Record<string, string> = {
  pending: '🍳 Start Preparing',
  preparing: '✅ Mark Ready',
  ready: '☑️ Mark Done',
  done: '✓ Completed',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';

  const fetchOrders = useCallback(async () => {
    try {
      const url = filter === 'all' ? '/orders' : `/orders?status=${filter}`;
      const { data } = await api.get(url);
      setOrders(data);
    } catch {
      console.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { 
    fetchOrders(); 
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: string, currentStatus: string) => {
    const nextStatus = STATUS_NEXT[currentStatus];
    if (nextStatus === currentStatus) return;
    try {
      await api.put(`/orders/${orderId}/status`, { status: nextStatus });
    } catch {
      alert('Failed to update status');
    }
  };

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>Orders</h1>
            <p>Real-time orders from Telegram and WhatsApp</p>
          </div>
          <div className="flex gap-8">
            {['all', ...STATUSES].map((s) => (
              <button
                key={s}
                id={`filter-${s}`}
                className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setFilter(s); setLoading(true); }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-body fade-in">
        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>No {filter === 'all' ? '' : filter} orders found.</p>
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
                  <th>Paid</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr
                    key={order._id}
                    style={newOrderIds.has(order._id) ? { background: 'rgba(249,115,22,0.08)', transition: 'background 0.5s' } : {}}
                  >
                    <td className="bold" style={{ color: 'var(--accent)' }}>#{order.orderNumber}</td>
                    <td>
                      {order.platform === 'telegram' ? '✈️ Telegram' : '📱 WhatsApp'}
                    </td>
                    <td>{order.customerName}</td>
                    <td>
                      <ul className="order-items-list">
                        {order.items.map((item: any, i: number) => (
                          <li key={i}>{item.name} x{item.qty}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="bold">{currency}{order.totalPrice}</td>
                    <td>
                      <span className={`badge ${order.payment?.paid ? 'badge-ready' : 'badge-pending'}`}>
                        {order.payment?.paid ? '✅ Paid' : '⏳ Unpaid'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${order.status}`}>{order.status}</span>
                    </td>
                    <td className="text-muted text-sm">
                      {new Date(order.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </td>
                    <td>
                      {STATUS_LABEL[order.status] && order.status !== 'done' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleStatusUpdate(order._id, order.status)}
                        >
                          {STATUS_LABEL[order.status]}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
