import { supabase } from './supabase'
import type { UserRole } from '../types'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  fullName: string
}

async function resolveUserFromProfile(userId: string, email: string, fallbackRole?: string): Promise<AuthUser> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', userId)
    .single()

  return {
    id: userId,
    email,
    role: (profile?.role as UserRole) || (fallbackRole as UserRole) || 'student',
    fullName: profile ? `${profile.first_name} ${profile.last_name || ''}`.trim() : '',
  }
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
    return resolveUserFromProfile(user.id, user.email!, user.user_metadata.role)
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const authUser = await resolveUserFromProfile(
          session.user.id,
          session.user.email!,
          session.user.user_metadata.role
        )
        callback(authUser)
      } else {
        callback(null)
      }
    })
  },
}
