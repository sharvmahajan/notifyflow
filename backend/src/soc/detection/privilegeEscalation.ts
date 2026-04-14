/**
 * Privilege Escalation Monitoring
 * - Detects non-admin access to admin endpoints
 * - Detects role changes on user accounts
 * - Alerts on unusual access to sensitive endpoints
 */

import { addRiskScore } from './riskScoring';
import { AlertSeverity, createAlert } from '../alerts/alertService';

const SENSITIVE_ENDPOINTS = [
  '/api/soc',
  '/api/admin',
  '/api/keys/admin',
  '/api/users',
];

const SENSITIVE_PATTERNS = [
  /\/soc\//,
  /\/admin\//,
  /\/users\/.*\/role/,
];

/** Check if a non-admin user is accessing admin/SOC endpoints */
export async function checkAdminEndpointAccess(
  userId: string,
  endpoint: string,
  isAdmin: boolean
): Promise<void> {
  if (!userId || isAdmin) return;

  console.log(`[SOC] Privilege check: User=${userId}, Endpoint=${endpoint}, isAdmin=${isAdmin}`);

  const isSensitive =
    SENSITIVE_ENDPOINTS.some(e => endpoint.startsWith(e)) ||
    SENSITIVE_PATTERNS.some(p => p.test(endpoint));

  if (isSensitive) {
    console.log(`[SOC] Privilege escalation detected for endpoint: ${endpoint}`);
    const score = addRiskScore(userId, 'PRIVILEGE_ESCALATION');
    await createAlert(
      'PRIVILEGE_ESCALATION',
      AlertSeverity.CRITICAL,
      `Non-admin user ${userId} attempted to access privileged endpoint: ${endpoint}. Risk score: ${score}.`,
      { userId, endpoint, isAdmin, riskScore: score },
      score
    );
  }
}

/** Alert when a user's role/admin status is changed */
export async function checkRoleChange(
  targetUserId: string,
  changedByUserId: string,
  oldRole: { isAdmin: boolean; plan: string },
  newRole: { isAdmin: boolean; plan: string }
): Promise<void> {
  const escalated = !oldRole.isAdmin && newRole.isAdmin;
  const planChange = oldRole.plan !== newRole.plan;

  if (!escalated && !planChange) return;

  const key = changedByUserId;
  const score = addRiskScore(key, 'PRIVILEGE_ESCALATION');
  const severity = escalated ? AlertSeverity.CRITICAL : AlertSeverity.HIGH;

  await createAlert(
    'ROLE_CHANGE',
    severity,
    escalated
      ? `User ${targetUserId} was PROMOTED to admin by ${changedByUserId}. Immediate review required.`
      : `User ${targetUserId} plan changed from ${oldRole.plan} to ${newRole.plan} by ${changedByUserId}.`,
    {
      targetUserId,
      changedByUserId,
      oldRole,
      newRole,
      escalated,
      riskScore: score,
    },
    score
  );
}
