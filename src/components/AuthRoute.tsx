import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AuthRouteProps {
  children: ReactNode;
}

/**
 * Guard que aceita qualquer usuário autenticado (interno ou externo).
 * Use em rotas que devem ser acessadas tanto por admin/user quanto por client.
 */
const AuthRoute = ({ children }: AuthRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default AuthRoute;
