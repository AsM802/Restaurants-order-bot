'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
  displayNumber: number;
}

const EMPTY_ITEM = { name: '', description: '', price: '', category: 'Main Course', imageUrl: '', available: true };
const CATEGORIES = ['Starters', 'Main Course', 'Breads', 'Rice & Biryani', 'Desserts', 'Beverages', 'Snacks', 'Combos'];
import { useToast } from '@/components/ToastContext';

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';
  const { addToast } = useToast();

  const fetchMenu = async () => {
    try {
      const { data } = await api.get('/menu');
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch menu');
      addToast('Failed to fetch menu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenu(); }, []);

  const openAdd = () => { setEditItem(null); setForm(EMPTY_ITEM); setShowModal(true); };
  const openEdit = (item: MenuItem) => { setEditItem(item); setForm({ ...item, price: String(item.price) }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) return;
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) };
      if (editItem) {
        await api.put(`/menu/${editItem._id}`, payload);
        addToast('Item updated successfully', 'success');
      } else {
        await api.post('/menu', payload);
        addToast('Item added successfully', 'success');
      }
      setShowModal(false);
      fetchMenu();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will renumber the menu.`)) return;
    try {
      await api.delete(`/menu/${id}`);
      addToast('Item deleted', 'success');
      fetchMenu();
    } catch {
      addToast('Delete failed', 'error');
    }
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    try {
      await api.put(`/menu/${item._id}`, { available: !item.available });
      addToast(`Item ${!item.available ? 'shown' : 'hidden'}`, 'success');
      fetchMenu();
    } catch {
      addToast('Update failed', 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>Menu Manager</h1>
            <p>Add, edit, and manage your restaurant&apos;s menu items</p>
          </div>
          <button id="add-menu-item-btn" className="btn btn-primary" onClick={openAdd}>
            ➕ Add Item
          </button>
        </div>
      </div>

      <div className="page-body fade-in">
        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🍽️</div>
            <p>No menu items yet. Add your first item!</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Description</th>
                  <th>Available</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td className="bold" style={{ color: 'var(--accent)', width: 48 }}>{item.displayNumber}</td>
                    <td className="bold">{item.name}</td>
                    <td><span className="badge" style={{ background: 'var(--bg-secondary)' }}>{item.category}</span></td>
                    <td className="bold">{currency}{item.price}</td>
                    <td className="text-muted text-sm" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description || '—'}
                    </td>
                    <td>
                      <button
                        className={`toggle ${item.available ? 'on' : ''}`}
                        onClick={() => handleToggleAvailable(item)}
                        title={item.available ? 'Click to hide' : 'Click to show'}
                      />
                    </td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item._id, item.name)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal fade-in">
            <h2>{editItem ? '✏️ Edit Item' : '➕ Add Menu Item'}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Item Name *</label>
                  <input id="item-name" className="form-input" placeholder="Butter Chicken" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Price ({currency}) *</label>
                  <input id="item-price" className="form-input" type="number" placeholder="220" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <select id="item-category" className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input id="item-description" className="form-input" placeholder="Tender chicken in rich tomato sauce..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Image URL (optional)</label>
                <input id="item-image" className="form-input" placeholder="https://..." value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} />
              </div>

              <div className="flex gap-12" style={{ alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Available on menu</label>
                <button className={`toggle ${form.available ? 'on' : ''}`} onClick={() => setForm({...form, available: !form.available})} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="save-item-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Saving...' : editItem ? '✅ Save Changes' : '➕ Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
