'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * The `beforeinstallprompt` event isn't in the DOM lib types yet. It carries
 * the deferred prompt we stash and fire from our own button.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'sdt-install-dismissed';

interface InstallPromptState {
  /** A custom install affordance can be shown. */
  canInstall: boolean;
  /** Fire the browser's native install prompt. */
  install: () => Promise<void>;
  /** Hide the affordance and remember the choice. */
  dismiss: () => void;
}

/**
 * Captures the deferred `beforeinstallprompt` event (Chromium only) so the app
 * can offer installation through its own UI instead of relying on the browser's
 * mini-infobar. No-ops on browsers that never fire the event (Safari/Firefox)
 * and when the app is already running standalone.
 */
export function useInstallPrompt(): InstallPromptState {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === '1') return;
    // Already installed — nothing to offer.
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    function handleBeforeInstall(e: Event) {
      // Stop the browser's default mini-infobar; we show our own banner.
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    }
    function handleInstalled() {
      setPromptEvent(null);
      setCanInstall(false);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    // The prompt can only be used once; drop it regardless of the outcome.
    setPromptEvent(null);
    setCanInstall(false);
    if (outcome === 'dismissed') {
      // Don't pester on every visit if they declined.
      localStorage.setItem(DISMISSED_KEY, '1');
    }
  }, [promptEvent]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setCanInstall(false);
  }, []);

  return { canInstall, install, dismiss };
}
