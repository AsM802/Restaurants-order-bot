'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import PageLoader from '@/components/PageLoader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  if (!authChecked || showLoader) {
    return <PageLoader onLoadComplete={() => setShowLoader(false)} />;
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="top-bar fade-in">
          <div className="flex gap-16" style={{ alignItems: 'center' }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
              🟢 Live Services Active
            </span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
