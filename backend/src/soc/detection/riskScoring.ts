/**
 * Risk Scoring Engine
 * Pure in-memory accumulator — no DB writes per event.
 * Keys: userId, ip, or session token hash.
 * Scores decay after 15 minutes of inactivity.
 */

export const RISK_WEIGHTS = {
  BRUTE_FORCE:           40,
  CREDENTIAL_STUFFING:   50,
  IMPOSSIBLE_TRAVEL:     60,
  SUSPICIOUS_UA_BOT:     30,
  SUSPICIOUS_UA_NEW:     15,
  VPN_TOR_DETECTED:      35,
  API_SPIKE:             20,
  API_KEY_LEAKAGE:       45,
  MULTI_IP_LOGIN:        25,
  UNUSUAL_GEO:           20,
  TOKEN_MULTI_IP:        40,
  TOKEN_REUSE:           70,
  RAPID_IP_SWITCH:       35,
  BULK_DATA_READ:        30,
  DATA_EXFIL_SPIKE:      40,
  PRIVILEGE_ESCALATION:  45,
  HONEYTOKEN_TRIGGERED: 100,
} as const;

export type RiskEventType = keyof typeof RISK_WEIGHTS;

interface RiskEntry {
  score: number;
  events: Array<{ type: string; score: number; ts: number }>;
  lastUpdated: number;
}

const DECAY_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Keyed by userId or IP
const riskStore = new Map<string, RiskEntry>();

/** Remove stale events outside the 15-min window and recalculate score */
function evict(entry: RiskEntry): void {
  const cutoff = Date.now() - DECAY_WINDOW_MS;
  entry.events = entry.events.filter(e => e.ts > cutoff);
  entry.score = entry.events.reduce((sum, e) => sum + e.score, 0);
  entry.lastUpdated = Date.now();
}

/** Add a risk score for a key (userId or ip) */
export function addRiskScore(key: string, type: RiskEventType): number {
  const weight = RISK_WEIGHTS[type];
  let entry = riskStore.get(key);
  if (!entry) {
    entry = { score: 0, events: [], lastUpdated: Date.now() };
    riskStore.set(key, entry);
  }
  evict(entry);
  entry.events.push({ type, score: weight, ts: Date.now() });
  entry.score += weight;
  entry.lastUpdated = Date.now();
  return entry.score;
}

/** Get current aggregated risk score for a key */
export function getRiskScore(key: string): number {
  const entry = riskStore.get(key);
  if (!entry) return 0;
  evict(entry);
  return entry.score;
}

/** Get recent risk events for enriching alert metadata */
export function getRiskEvents(key: string): Array<{ type: string; score: number; ts: number }> {
  const entry = riskStore.get(key);
  if (!entry) return [];
  evict(entry);
  return entry.events;
}

/** Clear risk score for a key (e.g. after SOAR block) */
export function clearRiskScore(key: string): void {
  riskStore.delete(key);
}

/** Dump all current scores (for admin risk dashboard) */
export function getAllRiskScores(): Record<string, { score: number; events: any[] }> {
  const result: Record<string, { score: number; events: any[] }> = {};
  for (const [key, entry] of riskStore.entries()) {
    evict(entry);
    if (entry.score > 0) {
      result[key] = { score: entry.score, events: entry.events };
    }
  }
  return result;
}
