import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { KrokyOverview } from './pages/kroky/Overview';
import { KrokyResume } from './pages/kroky/Resume';
import { KrokySignature } from './pages/kroky/Signature';
import { KrokyTracker } from './pages/kroky/Tracker';
import { KrokyEngagement } from './pages/kroky/Engagement';
import { KrokyUsers } from './pages/kroky/Users';
import { KrokyUserDetail } from './pages/kroky/UserDetail';
import { KrokyQR } from './pages/kroky/QR';
import { UrokOverview } from './pages/urok/Overview';

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-text-muted">Loading...</div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="kroky" element={<KrokyOverview />} />
        <Route path="kroky/resume" element={<KrokyResume />} />
        <Route path="kroky/signature" element={<KrokySignature />} />
        <Route path="kroky/tracker" element={<KrokyTracker />} />
        <Route path="kroky/qr" element={<KrokyQR />} />
        <Route path="kroky/engagement" element={<KrokyEngagement />} />
        <Route path="kroky/users" element={<KrokyUsers />} />
        <Route path="kroky/users/:uid" element={<KrokyUserDetail />} />
        <Route path="urok" element={<UrokOverview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ProtectedRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
