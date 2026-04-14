import { Request } from 'express';
import net from 'node:net';

/**
 * Get the real client IP, respecting hints for SOC testing environments.
 * In production, req.ip is trusted because 'trust proxy' is set in index.ts.
 */
/**
 * Normalize an IP address by removing IPv6-mapped IPv4 prefixes (::ffff:).
 */
export function normalizeIp(ip: string): string {
  const trimmed = (ip || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('::ffff:')) return trimmed.substring(7);
  return trimmed;
}

/**
 * Extract a single IP from common header formats:
 * - "1.2.3.4"
 * - "1.2.3.4, 5.6.7.8" (take first)
 * - "[2001:db8::1]" (strip brackets)
 * - "1.2.3.4:12345" (strip port)
 */
export function parseClientIp(value: string | undefined | null): string {
  const raw = normalizeIp(String(value ?? ''));
  if (!raw) return '';

  const first = raw.split(',')[0]?.trim() ?? '';
  if (!first) return '';

  // [IPv6]
  if (first.startsWith('[') && first.endsWith(']')) {
    const inside = first.slice(1, -1).trim();
    return net.isIP(inside) ? inside : '';
  }

  // Try as-is first (covers IPv6 without brackets)
  if (net.isIP(first)) return first;

  // IPv4:port
  const ipv4NoPort = first.replace(/:\d+$/, '');
  if (net.isIP(ipv4NoPort)) return ipv4NoPort;

  return '';
}

/**
 * True for loopback/private/link-local/CGNAT/reserved/documentation ranges.
 * This is used to:
 * - skip geo/VPN enrichment (public IP intel doesn't apply)
 * - avoid false SOC alerts for localhost/dev networks
 */
export function isInternalIp(ip: string): boolean {
  const addr = normalizeIp(ip);
  if (!addr) return true;

  const v = net.isIP(addr);
  if (v === 4) {
    const [a, b] = addr.split('.').map(n => Number(n));
    if ([a, b].some(n => Number.isNaN(n))) return true;

    // 0.0.0.0/8, loopback, link-local
    if (a === 0) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;

    // Private RFC1918
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;

    // CGNAT 100.64.0.0/10
    if (a === 100 && b >= 64 && b <= 127) return true;

    // TEST-NET / documentation + benchmarking + reserved
    if (a === 192 && b === 0) return true; // includes 192.0.0.0/24 and 192.0.2.0/24
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
    if (a === 198 && b === 51) return true; // 198.51.100.0/24
    if (a === 203 && b === 0) return true; // 203.0.113.0/24 (203.0.113.*)

    // Multicast / future / broadcast
    if (a >= 224) return true;

    return false;
  }

  if (v === 6) {
    const lower = addr.toLowerCase();
    if (lower === '::' || lower === '::1') return true;
    if (lower.startsWith('fe80:')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local fc00::/7
    return false;
  }

  return true;
}

/**
 * Get the real client IP, respecting hints for SOC testing environments.
 * Returns a normalized IP.
 */
export function getClientIp(req: Request): string {
  // Prefer common proxy/CDN headers when present. With `trust proxy` enabled,
  // Express typically populates `req.ip` from `x-forwarded-for`, but local/dev
  // setups vary (VPN apps, tunnels, reverse proxies).
  const headerIp =
    parseClientIp(req.headers['cf-connecting-ip'] as string) ||
    parseClientIp(req.headers['x-real-ip'] as string) ||
    parseClientIp(req.headers['x-forwarded-for'] as string);

  const rawIp = req.ip || '';
  const ip = headerIp || parseClientIp(rawIp) || normalizeIp(rawIp);
  
  // ── SOC Dev Override ───────────────────────────────────────────────────────
  // If request comes from a private/Docker network, trust x-client-ip hint IF present.
  const clientIpHint = parseClientIp(req.headers['x-client-ip'] as string);
  if (clientIpHint && isInternalIp(ip)) {
    return clientIpHint;
  }
  
  return ip;
}
