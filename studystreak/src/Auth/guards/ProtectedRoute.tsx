// ProtectedRoute - route guard for authenticated users only
import { useAuth } from '@/Auth/hooks/useAuth';
import ErrorUnauthenticated from '@/Application/components/ErrorUnauthenticated';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <ErrorUnauthenticated />; // Show error page if not authenticated
  return <>{children}</>;
};

export default ProtectedRoute;