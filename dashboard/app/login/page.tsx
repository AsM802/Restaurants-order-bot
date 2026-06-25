'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LoginPage() {
  const [step, setStep] = useState(1);
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('token')) router.push('/');
  }, [router]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return setError('Please enter your mobile number');
    setError('');
    setLoading(true);
    try {
      const fullPhone = `${countryCode}${phone.replace(/^0+/, '')}`; // remove leading zeros from phone if any
      const { data } = await api.post('/auth/send-otp', { phone: fullPhone });
      setStep(2);
      
      if (data.devOtp) {
        alert(`FOR TESTING: Your OTP is ${data.devOtp}`);
        setOtp(data.devOtp);
      }
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return setError('Please enter the OTP');
    setError('');
    setLoading(true);
    try {
      const fullPhone = `${countryCode}${phone.replace(/^0+/, '')}`;
      const { data } = await api.post('/auth/verify-otp', { phone: fullPhone, otp });
      localStorage.setItem('token', data.token);
      localStorage.setItem('restaurant', JSON.stringify({ phone: data.restaurant.phone, name: data.restaurant.name }));
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Invalid OTP.');
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

        {step === 1 ? (
          <form className="login-form" onSubmit={handleSendOtp}>
            {error && <div className="login-error" style={{ animation: 'slideUp 0.3s' }}>⚠️ {error}</div>}
            
            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label" style={{ color: '#fff' }}>Mobile Number</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="form-input"
                  style={{ width: '100px', background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer' }}
                >
                  <option value="+1">+1 (US/CA)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+91">+91 (IN)</option>
                  <option value="+61">+61 (AU)</option>
                  <option value="+971">+971 (AE)</option>
                  <option value="+254">+254 (KE)</option>
                  {/* Add more as needed */}
                </select>
                <input
                  id="login-phone"
                  type="tel"
                  className="form-input"
                  placeholder="1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  required
                  style={{ flex: 1, background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              {loading ? '⏳ Sending OTP...' : 'Send OTP 🚀'}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleVerifyOtp}>
            {error && <div className="login-error" style={{ animation: 'slideUp 0.3s' }}>⚠️ {error}</div>}
            
            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label" style={{ color: '#fff' }}>Enter OTP</label>
              <input
                id="login-otp"
                type="text"
                className="form-input"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                style={{ background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff', letterSpacing: '0.5em', textAlign: 'center' }}
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              {loading ? '⏳ Verifying...' : 'Secure Login 🚀'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Use a different number
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
