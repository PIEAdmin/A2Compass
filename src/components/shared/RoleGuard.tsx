/* ═══════════════════════════════════════════════════════════
   🛡️  ROLE GUARD — A² Compass
   Protects routes by user role; redirects unauthorized users
   ═══════════════════════════════════════════════════════════ */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import type { UserRole } from '../../types';

interface RoleGuardProps {
  /** One or more allowed roles */
  allowed: UserRole[];
  children: React.ReactNode;
}

const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  teacher: '/teacher',
  parent: '/parent',
  student: '/student',
};

/**
 * Wraps route content and checks role.
 * If user's role is not in the `allowed` list, redirects to their own dashboard.
 */
export default function RoleGuard({ allowed, children }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowed.includes(user.role)) {
    // Send them to their own dashboard
    return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  }

  return <>{children}</>;
}
