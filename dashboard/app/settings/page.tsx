'use client';
import { useState, useEffect, FormEvent } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { useToast } from '@/components/ToastContext';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    logoUrl: '',
    paymentNumber: '',
    paymentQrCodeUrl: '',
    lat: '',
    lng: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const r = res.data;
        setFormData({
          name: r.name || '',
          phone: r.phone || '',
          address: r.address || '',
          logoUrl: r.logoUrl || '',
          paymentNumber: r.paymentNumber || '',
          paymentQrCodeUrl: r.paymentQrCodeUrl || '',
          lat: r.location?.lat ? String(r.location.lat) : '',
          lng: r.location?.lng ? String(r.location.lng) : ''
        });
      } catch (err: any) {
        addToast('Failed to load profile', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [addToast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      addToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude)
        }));
        addToast('Location fetched successfully!', 'success');
      },
      () => {
        addToast('Unable to retrieve your location', 'error');
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    addToast('Uploading image...', 'info');
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: data });
      const json = await res.json();
      if (res.ok) {
        setFormData(prev => ({ ...prev, paymentQrCodeUrl: json.url }));
        addToast('Image uploaded successfully!', 'success');
      } else {
        addToast(json.msg || 'Upload failed', 'error');
      }
    } catch (err) {
      addToast('Error uploading file', 'error');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: any = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        logoUrl: formData.logoUrl,
        paymentNumber: formData.paymentNumber,
        paymentQrCodeUrl: formData.paymentQrCodeUrl,
      };

      if (formData.lat && formData.lng) {
        payload.location = {
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng)
        };
      }

      const res = await api.put('/auth/me', payload);
      localStorage.setItem('restaurant', JSON.stringify(res.data));
      addToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.msg || 'Error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="loading-wrap">
          <div className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Update your restaurant profile, location, and payment details.</p>
        </div>
      </div>

      <div className="page-body fade-in">
        <div className="card" style={{ maxWidth: 800 }}>
          <form onSubmit={handleSubmit} className="form-group-wrap">
            <h3 style={{ marginBottom: 24, fontSize: '20px', fontWeight: 800 }}>General Information</h3>
            <div className="form-group">
              <label className="form-label">Restaurant Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} className="form-input" rows={3} />
            </div>
            <div className="form-group">
              <label className="form-label">Logo URL</label>
              <input type="url" name="logoUrl" value={formData.logoUrl} onChange={handleChange} className="form-input" placeholder="https://example.com/logo.png" />
            </div>

            <hr style={{ margin: '32px 0', borderColor: 'var(--border)' }} />

            <h3 style={{ marginBottom: 24, fontSize: '20px', fontWeight: 800 }}>Location <span className="text-muted text-sm">(for nearby recommendations)</span></h3>
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input type="number" step="any" name="lat" value={formData.lat} onChange={handleChange} className="form-input" placeholder="e.g. 28.6139" />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input type="number" step="any" name="lng" value={formData.lng} onChange={handleChange} className="form-input" placeholder="e.g. 77.2090" />
              </div>
            </div>
            <button type="button" onClick={handleGetLocation} className="btn btn-secondary mb-16">
              📍 Use Current Location
            </button>

            <hr style={{ margin: '32px 0', borderColor: 'var(--border)' }} />

            <h3 style={{ marginBottom: 24, fontSize: '20px', fontWeight: 800 }}>WhatsApp Payment Information</h3>
            <p className="text-muted text-sm mb-24">Currently, orders are processed manually. Add your payment details so customers can pay you via WhatsApp.</p>
            <div className="form-group">
              <label className="form-label">Payment Number (UPI/M-Pesa/etc.)</label>
              <input type="text" name="paymentNumber" value={formData.paymentNumber} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Payment QR Code Image</label>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="form-input" style={{ padding: '12px' }} />
              {formData.paymentQrCodeUrl && (
                <div style={{ marginTop: '16px' }}>
                  <img src={formData.paymentQrCodeUrl} alt="QR Code" style={{ maxWidth: '200px', borderRadius: '12px', border: '1px solid var(--border)' }} />
                </div>
              )}
            </div>

            <div style={{ marginTop: 40, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '200px' }}>
                {saving ? '⏳ Saving...' : '✅ Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
