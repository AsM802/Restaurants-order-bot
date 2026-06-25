'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', icon: '📊', label: 'Dashboard' },
  { href: '/menu', icon: '🍽️', label: 'Menu Manager' },
  { href: '/orders', icon: '📋', label: 'Orders' },
  { href: '/cook', icon: '👨‍🍳', label: 'Cook Screen' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('restaurant');
    router.push('/login');
  };

  const restaurantName =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('restaurant') || '{}').name || 'My Restaurant'
      : 'My Restaurant';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>🍴 {restaurantName}</h2>
        <p>Owner Dashboard</p>
      </div>

      <nav style={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div style={{ padding: '0 16px' }}>
        <button className="btn btn-secondary w-full" style={{ justifyContent: 'center' }} onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
