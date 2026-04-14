import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import {
  ShieldAlert, AlertTriangle, ShieldCheck, Ban, Zap,
  RefreshCw, Trash2, Lock, KeyRound, LogOut, RotateCcw,
  ChevronDown, ChevronUp, Activity
} from 'lucide-react';

type Tab = 'alerts' | 'blocked' | 'risk';

const severityStyle = (s: string) => {
  switch (s) {
    case 'CRITICAL': return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'HIGH':     return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    case 'MEDIUM':   return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    default:         return 'bg-white/10 text-white/50 border border-white/10';
  }
};

export const SocDashboard = () => {
  const [tab, setTab] = useState<Tab>('alerts');
  const [data, setData] = useState<{ alerts: any[]; stats: any } | null>(null);
  const [blockedIps, setBlockedIps] = useState<any[]>([]);
  const [riskScores, setRiskScores] = useState<Record<string, any>>({});
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const resp = await apiClient.get('/soc/alerts');
      setData(resp.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchBlockedIps = useCallback(async () => {
    try {
      const resp = await apiClient.get('/soc/alerts/blocked-ips');
      setBlockedIps(resp.data.blocked);
    } catch (e) { console.error(e); }
  }, []);

  const fetchRiskScores = useCallback(async () => {
    try {
      const resp = await apiClient.get('/soc/alerts/risk-scores');
      setRiskScores(resp.data.scores);
    } catch (e) { console.error(e); }
  }, []);

  const refreshAll = useCallback(() => {
    fetchAlerts();
    fetchBlockedIps();
    fetchRiskScores();
  }, [fetchAlerts, fetchBlockedIps, fetchRiskScores]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 5000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const dismissAlert = async (id: string) => {
    await apiClient.delete(`/soc/alerts/${id}`).catch(console.error);
    fetchAlerts();
  };

  const soarAction = async (action: string, body: any) => {
    try {
      await apiClient.post(`/soc/alerts/actions/${action}`, body);
      refreshAll();
    } catch (e) { console.error(e); }
  };

  const unblockIp = async (ip: string) => {
    await apiClient.delete(`/soc/alerts/blocked-ips/${encodeURIComponent(ip)}`);
    fetchBlockedIps();
  };

  if (!data) {
    return (
      <div className="p-8 flex items-center gap-3 text-white/50">
        <RefreshCw className="w-5 h-5 animate-spin" />
        Loading Security Center...
      </div>
    );
  }

  const tabClass = (t: Tab) =>
    `px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
      tab === t
        ? 'bg-white/10 text-white'
        : 'text-white/40 hover:text-white/70 hover:bg-white/5'
    }`;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-white">
          <ShieldAlert className="w-10 h-10 text-red-400" />
          <div>
            <h1 className="text-3xl font-bold">Security Operations Center</h1>
            <p className="text-white/40 text-sm mt-0.5">
              Behavioral anomaly detection · Real-time threat correlation · SOAR auto-response
            </p>
          </div>
        </div>
        <button
          onClick={refreshAll}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: 'Critical Alerts', value: data.stats.critical, icon: AlertTriangle, color: 'text-red-400', border: 'border-red-500/20' },
          { label: 'High Alerts',     value: data.stats.high,     icon: ShieldAlert,   color: 'text-orange-400', border: 'border-orange-500/20' },
          { label: 'Medium Alerts',   value: data.stats.medium,   icon: Zap,           color: 'text-yellow-400', border: 'border-yellow-500/20' },
          { label: 'Total Open',      value: data.stats.total,    icon: ShieldCheck,   color: 'text-blue-400',   border: 'border-blue-500/20' },
        ].map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className={`bg-white/[0.03] p-5 rounded-xl border ${border} flex flex-col items-center gap-2 shadow-lg`}>
            <Icon className={`w-7 h-7 ${color}`} />
            <div className={`text-4xl font-bold ${color}`}>{value}</div>
            <div className="text-white/40 text-xs text-center">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/[0.03] p-1.5 rounded-xl border border-white/5 w-fit">
        <button id="soc-tab-alerts"  className={tabClass('alerts')}  onClick={() => setTab('alerts')}>
          <span className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Live Alerts</span>
        </button>
        <button id="soc-tab-blocked" className={tabClass('blocked')} onClick={() => setTab('blocked')}>
          <span className="flex items-center gap-2"><Ban className="w-4 h-4" /> Blocked IPs ({blockedIps.length})</span>
        </button>
        <button id="soc-tab-risk"    className={tabClass('risk')}    onClick={() => setTab('risk')}>
          <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> Risk Scores</span>
        </button>
      </div>

      {/* ── ALERTS TAB ── */}
      {tab === 'alerts' && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-semibold text-white">Live Threat Stream</h3>
            <span className="text-xs px-2 py-1 bg-white/5 rounded-full text-white/40 animate-pulse">Auto-updating (5s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-white/40 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Severity</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium text-center">Risk</th>
                  <th className="px-6 py-3 font-medium">Time</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.alerts.map((alert: any) => (
                  <>
                    <tr key={alert.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-bold rounded-md uppercase ${severityStyle(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-white/90">{alert.type}</td>
                      <td className="px-6 py-4 text-sm text-white/50 max-w-xs truncate">{alert.description}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-bold tabular-nums ${
                          alert.riskScore >= 80 ? 'text-red-400' :
                          alert.riskScore >= 40 ? 'text-orange-400' : 'text-white/40'
                        }`}>{Math.round(alert.riskScore ?? 0)}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-white/40">
                        {new Date(alert.createdAt).toISOString().replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                            className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                            title="Show metadata"
                          >
                            {expandedAlert === alert.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {/* SOAR Quick Actions */}
                          {(alert.metadata?.ip) && (
                            <button
                              onClick={() => soarAction('block-ip', { ip: alert.metadata.ip, reason: `Alert: ${alert.type}` })}
                              className="p-1.5 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                              title={`Block IP ${alert.metadata.ip}`}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          {(alert.metadata?.userId) && (
                            <>
                              <button
                                onClick={() => soarAction('invalidate-sessions', { userId: alert.metadata.userId, reason: `Alert: ${alert.type}` })}
                                className="p-1.5 rounded hover:bg-orange-500/20 text-white/30 hover:text-orange-400 transition-colors"
                                title="Invalidate sessions"
                              >
                                <LogOut className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => soarAction('force-reset', { userId: alert.metadata.userId, reason: `Alert: ${alert.type}` })}
                                className="p-1.5 rounded hover:bg-yellow-500/20 text-white/30 hover:text-yellow-400 transition-colors"
                                title="Force password reset"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {(alert.metadata?.apiKeyId) && (
                            <button
                              onClick={() => soarAction('revoke-key', { keyId: alert.metadata.apiKeyId, reason: `Alert: ${alert.type}` })}
                              className="p-1.5 rounded hover:bg-purple-500/20 text-white/30 hover:text-purple-400 transition-colors"
                              title="Revoke API key"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          )}
                          {alert.status === 'OPEN' && (
                            <button
                              onClick={() => dismissAlert(alert.id)}
                              className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                              title="Dismiss alert"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedAlert === alert.id && (
                      <tr key={`${alert.id}-meta`} className="bg-white/[0.01]">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="bg-black/30 rounded-lg p-4 font-mono text-xs text-white/60 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(alert.metadata, null, 2)}
                          </div>
                          {alert.correlatedWith?.length > 0 && (
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-white/30">Correlated alerts:</span>
                              {alert.correlatedWith.map((id: string) => (
                                <span key={id} className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded font-mono">{id.substring(0, 8)}…</span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {data.alerts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-white/30 text-sm">
                      <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-white/10" />
                      No active threats — system is secure.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BLOCKED IPs TAB ── */}
      {tab === 'blocked' && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-semibold text-white">Blocked IP Addresses</h3>
            <span className="text-xs text-white/30">{blockedIps.length} blocked</span>
          </div>
          {blockedIps.length === 0 ? (
            <div className="px-6 py-12 text-center text-white/30 text-sm">
              <Ban className="w-10 h-10 mx-auto mb-3 text-white/10" />
              No IPs are currently blocked.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-white/5 text-white/40 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">IP Address</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Blocked At</th>
                  <th className="px-6 py-3">Expires At</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {blockedIps.map((b: any) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-mono text-sm text-red-400">{b.ip}</td>
                    <td className="px-6 py-4 text-sm text-white/50">{b.reason}</td>
                    <td className="px-6 py-4 text-xs font-mono text-white/40">
                      {new Date(b.blockedAt).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-white/40">
                      {b.expiresAt ? new Date(b.expiresAt).toISOString().replace('T', ' ').substring(0, 19) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => unblockIp(b.ip)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-green-500/20 text-white/40 hover:text-green-400 transition-all"
                      >
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── RISK SCORES TAB ── */}
      {tab === 'risk' && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-semibold text-white">Live Risk Score Registry</h3>
            <span className="text-xs text-white/30">15-min sliding window · In-memory</span>
          </div>
          {Object.keys(riskScores).length === 0 ? (
            <div className="px-6 py-12 text-center text-white/30 text-sm">
              <Activity className="w-10 h-10 mx-auto mb-3 text-white/10" />
              No active risk scores — all clear.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-white/5 text-white/40 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">Entity (User/IP)</th>
                  <th className="px-6 py-3 text-center">Score</th>
                  <th className="px-6 py-3">Contributing Events</th>
                  <th className="px-6 py-3 text-right">SOAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {Object.entries(riskScores)
                  .sort(([, a]: any, [, b]: any) => b.score - a.score)
                  .map(([key, val]: any) => (
                    <tr key={key} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono text-sm text-white/80">{key}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-2xl font-bold tabular-nums ${
                            val.score >= 120 ? 'text-red-400' :
                            val.score >= 80  ? 'text-orange-400' :
                            val.score >= 40  ? 'text-yellow-400' : 'text-white/50'
                          }`}>{Math.round(val.score)}</span>
                          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                val.score >= 120 ? 'bg-red-500' :
                                val.score >= 80  ? 'bg-orange-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${Math.min((val.score / 150) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {val.events?.slice(-5).map((e: any, i: number) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-white/5 text-white/40 rounded font-mono">
                              +{e.score} {e.type}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {key.includes('.') || key.includes(':') ? (
                          <button
                            onClick={() => soarAction('block-ip', { ip: key, reason: 'High risk score' })}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all flex items-center gap-1 ml-auto"
                          >
                            <Ban className="w-3 h-3" /> Block IP
                          </button>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => soarAction('invalidate-sessions', { userId: key, reason: 'High risk score' })}
                              className="text-xs px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-all flex items-center gap-1"
                            >
                              <LogOut className="w-3 h-3" /> Kill Sessions
                            </button>
                            <button
                              onClick={() => soarAction('force-reset', { userId: key, reason: 'High risk score' })}
                              className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition-all flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" /> Force Reset
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
