'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
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
        setError(data.msg || 'Google Login failed');
      }
    } catch (err) {
      setError('Error connecting to server');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('restaurant', JSON.stringify({ name: data.name, email: data.email }));
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Decorative Orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }} />
      
      <div className="login-card fade-in" style={{ zIndex: 10, border: '1px solid rgba(249,115,22,0.3)', boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 40px rgba(249,115,22,0.1)' }}>
        <div className="login-header">
          <div className="logo" style={{ animation: 'none', filter: 'drop-shadow(0 0 20px var(--accent))' }}>🔥</div>
          <h1 style={{ background: 'linear-gradient(135deg, #fff, var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Restaurant OS
          </h1>
          <p style={{ letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '12px', marginTop: '12px', fontWeight: 800 }}>Welcome Back, Owner</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Login Failed')}
            useOneTap
            shape="pill"
            theme="filled_black"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', color: 'var(--border)' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ padding: '0 16px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em' }}>OR CONTINUE WITH EMAIL</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error" style={{ animation: 'slideUp 0.3s' }}>⚠️ {error}</div>}
          
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ color: '#fff' }}>Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="owner@restaurant.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              style={{ background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label" style={{ color: '#fff' }}>Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              style={{ background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff', letterSpacing: '0.2em' }}
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}
          >
            {loading ? '⏳ Authenticating...' : 'Secure Login 🚀'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <p className="text-muted text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 800, textDecoration: 'none' }}>
              Create your restaurant
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
