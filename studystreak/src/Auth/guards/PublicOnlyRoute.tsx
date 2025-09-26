// PublicOnlyRoute - route guard for unauthenticated users only (redirects logged in users)

import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
export default PublicOnlyRoute;