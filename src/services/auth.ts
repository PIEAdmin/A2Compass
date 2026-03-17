import { supabase } from './supabase'
import type { UserRole } from '../types'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  fullName: string
}

export const authService = {
  async signUp(email: string, password: string, metadata: { full_name: string; role: UserRole }) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: metadata.full_name, role: metadata.role } },
    })
    if (error) throw error
    return data
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    return {
      id: user.id,
      email: user.email!,
      role: (user.user_metadata.role as UserRole) || 'student',
      fullName: user.user_metadata.full_name || '',
    }
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email!,
          role: (session.user.user_metadata.role as UserRole) || 'student',
          fullName: session.user.user_metadata.full_name || '',
        })
      } else {
        callback(null)
      }
    })
  },
}
