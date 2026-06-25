'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { GoogleLogin } from '@react-oauth/google';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', paymentNumber: '', paymentQrCodeUrl: '', lat: '', lng: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('token')) router.push('/');
  }, [router]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('restaurant', JSON.stringify({ name: data.name || 'Google User', email: data.email || '' }));
        router.push('/');
      } else {
        setError(data.msg || 'Google Sign-up failed');
      }
    } catch (err) {
      setError('Error connecting to server');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    // basic loading indication
    setLoading(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: data });
      const json = await res.json();
      if (res.ok) {
        setForm(prev => ({ ...prev, paymentQrCodeUrl: json.url }));
      } else {
        setError(json.msg || 'Upload failed');
      }
    } catch (err) {
      setError('Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      const { data } = await api.post('/auth/login', { email: form.email, password: form.password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('restaurant', JSON.stringify({ name: data.name, email: data.email }));
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card fade-in" style={{ maxWidth: 500 }}>
        <div className="login-header">
          <div className="logo">👨‍🍳</div>
          <h1>Create your dashboard</h1>
          <p>Join to start receiving orders directly</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Sign-up Failed')}
            useOneTap
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-muted)' }}>
          - OR -
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
            <p className="text-muted text-sm" style={{ marginTop: '-8px', marginBottom: '8px' }}>Currently, payments are processed manually via WhatsApp.</p>
            <input
              type="text"
              className="form-input"
              placeholder="+91..."
              value={form.paymentNumber}
              onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment QR Code Image</label>
            <input
              type="file"
              accept="image/*"
              className="form-input"
              style={{ padding: '12px' }}
              onChange={handleFileUpload}
            />
            {form.paymentQrCodeUrl && (
              <div style={{ marginTop: '16px' }}>
                <img src={form.paymentQrCodeUrl} alt="QR Code" style={{ maxWidth: '200px', borderRadius: '12px', border: '1px solid var(--border)' }} />
              </div>
            )}
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
