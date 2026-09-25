// Anonymous visit and action counts through GoatCounter (no cookies, no personal data).
// Off unless the build sets VITE_GOATCOUNTER_URL, which only the deploy workflow does,
// so local development and builds never load the script or send anything.

declare global {
  interface ImportMetaEnv {
    readonly VITE_GOATCOUNTER_URL?: string;
  }
  interface Window {
    goatcounter?: { count: (vars: { path: string; title?: string; event?: boolean }) => void };
  }
}

const endpoint = import.meta.env.VITE_GOATCOUNTER_URL;

export function initAnalytics() {
  if (!endpoint) return;
  const script = document.createElement('script');
  script.async = true;
  script.dataset.goatcounter = endpoint;
  script.src = 'https://gc.zgo.at/count.js';
  document.head.append(script);
}

// Events sent before the script finishes loading are dropped; counts are approximate anyway.
export function trackEvent(name: string, title?: string) {
  if (!endpoint) return;
  try { window.goatcounter?.count({ path: name, title, event: true }); } catch {}
}
