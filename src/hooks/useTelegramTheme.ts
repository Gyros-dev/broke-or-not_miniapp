import { useEffect, useRef, useState } from 'react';
import { tg } from '../telegram/webapp';

export type ColorScheme = 'light' | 'dark';

function applyThemeParams(accentColor?: string): ColorScheme {
  const root = document.documentElement;
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const scheme: ColorScheme =
    tg?.colorScheme === 'dark' || (!tg && prefersDark) ? 'dark' : 'light';
  root.classList.toggle('theme-dark', scheme === 'dark');

  root.style.removeProperty('--tg-button');
  root.style.removeProperty('--tg-link');

  const params = tg?.themeParams;
  if (params) {
    if (params.bg_color) root.style.setProperty('--tg-bg', params.bg_color);
    if (params.secondary_bg_color)
      root.style.setProperty('--tg-secondary-bg', params.secondary_bg_color);
    if (params.text_color)
      root.style.setProperty('--tg-text', params.text_color);
    if (params.hint_color)
      root.style.setProperty('--tg-hint', params.hint_color);
    if (params.link_color)
      root.style.setProperty('--tg-link', params.link_color);
    if (params.button_color)
      root.style.setProperty('--tg-button', params.button_color);
    if (params.button_text_color)
      root.style.setProperty('--tg-button-text', params.button_text_color);
  }

  if (accentColor) {
    root.style.setProperty('--tg-button', accentColor);
    root.style.setProperty('--tg-link', accentColor);
  }

  return scheme;
}

export function useTelegramTheme(accentColor?: string): ColorScheme {
  const accentRef = useRef(accentColor);
  accentRef.current = accentColor;
  const [scheme, setScheme] = useState<ColorScheme>(() =>
    applyThemeParams(accentRef.current),
  );

  useEffect(() => {
    applyThemeParams(accentColor);
  }, [accentColor]);

  useEffect(() => {
    const webApp = tg;
    if (webApp && typeof webApp.onEvent === 'function') {
      const onThemeChanged = () => setScheme(applyThemeParams(accentRef.current));
      webApp.onEvent('themeChanged', onThemeChanged);
      return () => webApp.offEvent?.('themeChanged', onThemeChanged);
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaChange = () => setScheme(applyThemeParams(accentRef.current));
    media.addEventListener('change', onMediaChange);
    return () => media.removeEventListener('change', onMediaChange);
  }, []);

  return scheme;
}
