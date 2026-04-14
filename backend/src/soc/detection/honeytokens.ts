/**
 * Honeytoken System
 * Seeds fake API key prefixes and fake endpoints at startup.
 * Any access to these triggers an immediate CRITICAL alert + SOAR auto-response.
 */

import prisma from '../../lib/prisma';
import { AlertSeverity, createAlert } from '../alerts/alertService';
import { addRiskScore } from './riskScoring';

// Predefined honeytoken prefixes — these will never be real keys
const HONEYTOKEN_PREFIXES = [
  { prefix: 'nf_honey_001_', label: 'Honeytoken Alpha — Internal Canary' },
  { prefix: 'nf_honey_002_', label: 'Honeytoken Beta — Leaked Key Trap' },
  { prefix: 'nf_honey_003_', label: 'Honeytoken Gamma — External Monitor' },
];

// Fake endpoints that should never be legitimately accessed
export const HONEY_ENDPOINTS = [
  '/api/internal/debug',
  '/api/v0/legacy',
  '/api/admin/backup',
];

// In-memory set for fast O(1) prefix checks (avoids DB query per request)
let honeytokenPrefixCache = new Set<string>();

/** Seed honeytokens into DB on application startup (idempotent) */
export async function seedHoneytokens(): Promise<void> {
  for (const ht of HONEYTOKEN_PREFIXES) {
    await prisma.honeytoken.upsert({
      where:  { prefix: ht.prefix },
      update: {},
      create: { prefix: ht.prefix, label: ht.label },
    });
  }

  // Populate in-memory cache
  const all = await prisma.honeytoken.findMany({ select: { prefix: true } });
  honeytokenPrefixCache = new Set(all.map(h => h.prefix));

  console.log(`[SOC] Honeytokens seeded: ${honeytokenPrefixCache.size} active traps.`);
}

/** Check if an API key prefix matches any honeytoken — called before bcrypt */
export async function checkHoneytoken(
  keyPrefix: string,
  ip: string,
  userId?: string
): Promise<boolean> {
  if (!keyPrefix) return false;

  // O(1) cache lookup — no DB call on every request
  const isHoney = [...honeytokenPrefixCache].some(p => keyPrefix.startsWith(p));
  if (!isHoney) return false;

  const score = addRiskScore(ip, 'HONEYTOKEN_TRIGGERED');
  const alert = await createAlert(
    'HONEYTOKEN_TRIGGERED',
    AlertSeverity.CRITICAL,
    `⚠️ HONEYTOKEN ACCESSED: API key prefix "${keyPrefix}" is a canary trap. ` +
      `This indicates credential theft or insider threat. IP: ${ip}.`,
    {
      ip,
      userId,
      keyPrefix,
      riskScore: score,
      autoBlock: true,
    },
    score
  );

  // Immediately trigger SOAR auto-response (imported lazily to avoid circular deps)
  const { autoRespond } = await import('../soar/autoResponse');
  if (alert) await autoRespond(alert, ip);

  return true; // Signal to middleware to reject the request immediately
}

/** Check if an accessed endpoint is a honeypot endpoint */
export async function checkHoneyEndpoint(
  endpoint: string,
  ip: string,
  userId?: string
): Promise<boolean> {
  const isHoney = HONEY_ENDPOINTS.some(h => endpoint.startsWith(h));
  if (!isHoney) return false;

  const score = addRiskScore(ip, 'HONEYTOKEN_TRIGGERED');
  const alert = await createAlert(
    'HONEY_ENDPOINT_ACCESSED',
    AlertSeverity.CRITICAL,
    `⚠️ HONEY ENDPOINT HIT: "${endpoint}" is a decoy endpoint. ` +
      `This indicates active reconnaissance or internal threat. IP: ${ip}.`,
    { ip, userId, endpoint, riskScore: score, autoBlock: true },
    score
  );

  const { autoRespond } = await import('../soar/autoResponse');
  if (alert) await autoRespond(alert, ip);

  return true;
}
