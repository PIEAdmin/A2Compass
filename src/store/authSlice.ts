import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { authService, type AuthUser } from '../services/auth'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  loading: true,
  error: null,
}

export const initAuth = createAsyncThunk('auth/init', async () => {
  return await authService.getCurrentUser()
})

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }) => {
    await authService.signIn(email, password)
    return await authService.getCurrentUser()
  }
)

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await authService.signOut()
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser | null>) => {
      state.user = action.payload
      state.loading = false
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAuth.pending, (state) => { state.loading = true })
      .addCase(initAuth.fulfilled, (state, action) => {
        state.user = action.payload
        state.loading = false
      })
      .addCase(initAuth.rejected, (state) => { state.user = null; state.loading = false })
      .addCase(signIn.pending, (state) => { state.loading = true; state.error = null })
      .addCase(signIn.fulfilled, (state, action) => {
        state.user = action.payload
        state.loading = false
      })
      .addCase(signIn.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Sign in failed'
      })
      .addCase(signOut.fulfilled, (state) => { state.user = null; state.loading = false })
  },
})

export const { setUser, clearError } = authSlice.actions
export default authSlice.reducer
