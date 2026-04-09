import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';

export const SocDashboard = () => {
  const [data, setData] = useState<{ alerts: any[], stats: any } | null>(null);

  const fetchSOC = async () => {
    try {
      const resp = await apiClient.get('/soc/alerts');
      setData(resp.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSOC();
    const interval = setInterval(fetchSOC, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return <div className="p-8 text-textMuted">Loading Security Logs...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8 text-white">
        <ShieldAlert className="w-10 h-10 text-danger" />
        <div>
          <h1 className="text-3xl font-bold">Security Operations Center</h1>
          <p className="text-textMuted">Admin view for raw intrusion and anomaly detection alerts</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-surface p-6 rounded-xl border border-danger/20 flex flex-col items-center shadow-lg">
          <AlertTriangle className="w-8 h-8 text-danger mb-2" />
          <div className="text-4xl font-bold text-danger">{data.stats.critical}</div>
          <div className="text-textMuted mt-1">Open Critical Alerts</div>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-warning/20 flex flex-col items-center shadow-lg">
          <ShieldAlert className="w-8 h-8 text-warning mb-2" />
          <div className="text-4xl font-bold text-warning">{data.stats.high}</div>
          <div className="text-textMuted mt-1">Open High/Med Alerts</div>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-primary/20 flex flex-col items-center shadow-lg">
          <ShieldCheck className="w-8 h-8 text-primary mb-2" />
          <div className="text-4xl font-bold text-primary">{data.stats.total}</div>
          <div className="text-textMuted mt-1">Total Active Threats</div>
        </div>
      </div>

      <div className="bg-surface border border-white/5 rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-lg text-white">Live Threat Stream</h3>
          <span className="text-xs px-2 py-1 bg-white/5 rounded-full text-textMuted animate-pulse">Auto-updating (5s)</span>
        </div>
        <table className="w-full text-left bg-surface/50">
          <thead className="bg-white/5 text-textMuted text-xs uppercase">
            <tr>
              <th className="px-6 py-3 font-medium">Severity</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Description</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Time (UTC)</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.alerts.map((alert: any) => (
              <tr key={alert.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded-md uppercase ${
                    alert.severity === 'CRITICAL' ? 'bg-danger/20 text-danger' : 
                    alert.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                    alert.severity === 'MEDIUM' ? 'bg-warning/20 text-warning' :
                    'bg-white/10 text-textMuted'
                  }`}>
                    {alert.severity}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-white/90">{alert.type}</td>
                <td className="px-6 py-4 text-sm text-textMuted">{alert.description}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded border ${
                    alert.status === 'OPEN' ? 'border-danger/40 text-danger bg-danger/10' : 'border-success/40 text-success bg-success/10'
                  }`}>
                    {alert.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-mono text-textMuted">
                  {new Date(alert.createdAt).toISOString().replace('T', ' ').substring(0, 19)}
                </td>
                <td className="px-6 py-4 text-right">
                  {alert.status === 'OPEN' && (
                    <button 
                      onClick={async () => {
                        try {
                          await apiClient.delete(`/soc/alerts/${alert.id}`);
                          fetchSOC();
                        } catch (err) {
                          console.error('Failed to dismiss alert:', err);
                        }
                      }}
                      className="text-primary hover:text-white transition-colors text-sm font-medium"
                    >
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data.alerts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-textMuted text-sm">
                  No security alerts completely secure and idle.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
