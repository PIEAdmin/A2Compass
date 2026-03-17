import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../store'
import { signIn, signOut, clearError } from '../store/authSlice'

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>()
  const { user, loading, error } = useSelector((state: RootState) => state.auth)

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    role: user?.role ?? null,
    signIn: (email: string, password: string) => dispatch(signIn({ email, password })),
    signOut: () => dispatch(signOut()),
    clearError: () => dispatch(clearError()),
  }
}
