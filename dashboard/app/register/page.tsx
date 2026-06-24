'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '', paymentNumber: '', lat: '', lng: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('token')) router.push('/');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('restaurant', JSON.stringify({ name: data.name, email: data.email }));
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="login-header">
          <div className="logo">🍴</div>
          <h1>Create your Restaurant</h1>
          <p>Sign up to start receiving orders</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">⚠️ {error}</div>}

          <div className="form-group">
            <label className="form-label">Restaurant Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Spice Route"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="owner@restaurant.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Phone Number (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="+91..."
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment WhatsApp Number (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="+91..."
              value={form.paymentNumber}
              onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment QR Code Image URL (Optional)</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://..."
              value={form.paymentQrCodeUrl || ''}
              onChange={(e) => setForm({ ...form, paymentQrCodeUrl: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Latitude</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="e.g. 19.0760"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Longitude</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="e.g. 72.8777"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? '⏳ Creating...' : '🚀 Create Account'}
          </button>
        </form>

        <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: '24px' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Sign in here</Link>.
        </p>
      </div>
    </div>
  );
}
