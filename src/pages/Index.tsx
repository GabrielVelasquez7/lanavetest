import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { TaquilleraDashboard } from '@/components/taquillera/TaquilleraDashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { EncargadaDashboard } from '@/components/encargada/EncargadaDashboard';

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
  if (profile.role === 'administrador') {
    return <AdminDashboard />;
  }

  // Render encargada dashboard for encargada users
  if (profile.role === 'encargada') {
    return <EncargadaDashboard />;
  }

  // Render taquillera dashboard for other users
  return <TaquilleraDashboard />;
};

export default Index;
