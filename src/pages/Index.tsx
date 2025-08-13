import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { TaquilleraDashboard } from '@/components/taquillera/TaquilleraDashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

const Index = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Cargando...</h1>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthLayout />;
  }

  // Render admin dashboard for admin users
  if (profile.role === 'admin') {
    return <AdminDashboard />;
  }

  // Render taquillera dashboard for other users
  return <TaquilleraDashboard />;
};

export default Index;
