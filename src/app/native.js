import { App } from '@capacitor/app';
import { navigateBack } from './index.js';

/** Installed Android wrapper only; the ordinary web/PWA path never loads this. */
export async function setupNative() {
  await App.addListener('backButton', () => {
    if (!navigateBack()) void App.minimizeApp();
  });
}
