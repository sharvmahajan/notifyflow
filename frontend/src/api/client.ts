import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const SOC_AUTO_IP =
  (import.meta.env.VITE_SOC_AUTO_IP || '').toString().toLowerCase() === 'true' ||
  import.meta.env.DEV;

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

// ── Automatic IP Detection (Dev / Docker local) ───────────────────────────────
// In Docker, the backend usually sees a bridge IP (172.*). To make SOC geo/VPN
// checks meaningful, we attach a public-IP hint (`x-client-ip`) from the browser.
const SOC_IP_TS_KEY = 'soc_test_ip_ts';
const SOC_IP_MANUAL_KEY = 'soc_test_ip_manual';
let inFlightRefresh: Promise<string | null> | null = null;

export function getSocHintIp(): string | null {
  return localStorage.getItem('soc_test_ip');
}

export function setSocHintIpManual(ip: string | null): void {
  if (!ip) {
    localStorage.removeItem('soc_test_ip');
    localStorage.removeItem(SOC_IP_MANUAL_KEY);
    return;
  }
  localStorage.setItem('soc_test_ip', ip);
  localStorage.setItem(SOC_IP_MANUAL_KEY, 'true');
  localStorage.setItem(SOC_IP_TS_KEY, String(Date.now()));
}

export async function ensureSocHintIpFresh(force = false): Promise<string | null> {
  if (!SOC_AUTO_IP) return getSocHintIp();
  if (localStorage.getItem(SOC_IP_MANUAL_KEY) === 'true') return getSocHintIp();

  const lastTs = Number(localStorage.getItem(SOC_IP_TS_KEY) || '0');
  const now = Date.now();
  if (!force && now - lastTs < 30 * 1000) return getSocHintIp(); // refresh at most every 30s

  if (!inFlightRefresh) {
    inFlightRefresh = (async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
        const json = (await res.json()) as { ip?: string };
        if (!json?.ip) return null;
        localStorage.setItem('soc_test_ip', json.ip);
        localStorage.setItem(SOC_IP_TS_KEY, String(Date.now()));
        // eslint-disable-next-line no-console
        console.log(`[SOC] Public IP hint updated: ${json.ip}`);
        return json.ip;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[SOC] Failed to refresh public IP hint:', e);
        return getSocHintIp();
      } finally {
        inFlightRefresh = null;
      }
    })();
  }

  return await inFlightRefresh;
}

async function refreshSocIpIfStale(): Promise<void> {
  await ensureSocHintIpFresh(false);
}

// Best-effort refresh on load and when returning to the tab (VPN may have changed)
refreshSocIpIfStale();
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshSocIpIfStale();
});

// Also refresh right before requests, but without blocking them.
apiClient.interceptors.request.use((config) => {
  refreshSocIpIfStale();
  const testIp = getSocHintIp();
  if (testIp) config.headers['x-client-ip'] = testIp;
  return config;
});
// ──────────────────────────────────────────────────────────────────────────────

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login') && !originalRequest.url?.includes('/auth/refresh')) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
        processQueue(null);
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        // Dispatch custom event to trigger logout in React tree
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
