// Vazio em desenvolvimento: o Vite encaminha /api e /ws para o backend local.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/$/, '');

export const apiUrl = (path) => `${BACKEND_URL}${path}`;

export function wsUrl() {
  if (BACKEND_URL) return `${BACKEND_URL.replace(/^http/, 'ws')}/ws`;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}
