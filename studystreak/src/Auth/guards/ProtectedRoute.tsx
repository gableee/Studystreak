// ProtectedRoute - route guard for authenticated users only
import { useAuth } from '@/Auth/hooks/useAuth';
import { Navigate } from 'react-router-dom';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/signin" />;
  return <>{children}</>;
};

export default ProtectedRoute;