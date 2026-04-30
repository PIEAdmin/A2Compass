/**
 * Capacitor native bridge initialization
 * Import this in main.tsx to enable native features
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';

export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return;

  // Hide splash screen after app loads
  await SplashScreen.hide();

  // Configure status bar
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1e3a5f' });
  } catch {
    // StatusBar not available on all platforms
  }

  // Handle keyboard events (iOS)
  try {
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-visible');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-visible');
    });
  } catch {
    // Keyboard plugin not available
  }

  // Handle Android back button
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  // Handle deep links (e.g., returning from Stripe checkout)
  App.addListener('appUrlOpen', ({ url }) => {
    // Handle URLs like aaacademy.app/parent/enroll?session_id=...
    const slug = url.split('aaacademy.app').pop();
    if (slug) {
      window.location.href = slug;
    }
  });
}

/** Check if running as native app */
export const isNative = Capacitor.isNativePlatform();

/** Get the current platform */
export const platform = Capacitor.getPlatform(); // 'web' | 'ios' | 'android'
