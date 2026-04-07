import { useEffect, useState } from 'react';
import { logsApi } from '../api/logs.api';


export const Logs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  const [filters, setFilters] = useState({
    channel: '',
    status: '',
    limit: 50,
    offset: 0
  });

  const fetchLogs = () => {
    setLoading(true);
    const params: any = {};
    if (filters.channel) params.channel = filters.channel;
    if (filters.status) params.status = filters.status;
    params.limit = filters.limit;
    params.offset = filters.offset;

    logsApi.getLogs(params).then(res => {
      setLogs(res.logs);
      setTotal(res.total);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const StatusBadge = ({ status }: any) => {
    const colors: any = {
      pending: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      delivered: 'bg-success/20 text-success border-success/30',
      failed: 'bg-danger/20 text-danger border-danger/30'
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${colors[status]}`}>{status}</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Notification Logs</h1>
          <p className="text-textMuted">History of all dispatched notifications.</p>
        </div>
        <div className="text-sm text-textMuted">Showing {logs.length} of {total} total records</div>
      </header>

      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden flex flex-col h-[calc(100vh-220px)]">
        <div className="p-4 border-b border-white/5 flex gap-4 bg-white/[0.01]">
          <div className="flex-1 flex gap-4">
            <select
              value={filters.channel}
              onChange={e => setFilters({ ...filters, channel: e.target.value, offset: 0 })}
              className="px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain text-sm min-w-32"
            >
              <option value="">All Channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="inapp">In-App</option>
            </select>
            <select
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value, offset: 0 })}
              className="px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain text-sm min-w-32"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {loading && logs.length === 0 ? (
           <div className="p-8 text-center text-textMuted animate-pulse">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-textMuted text-sm">No notification logs found for the selected filters.</div>
          ) : (
            <table className="w-full text-left text-sm relative">
              <thead className="bg-[#151A2E] text-textMuted sticky top-0 border-b border-white/5 shadow-2xl z-10">
                <tr>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">ID</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Time</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Recipient</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Channel</th>
                  <th className="px-6 py-4 font-medium min-w-[200px]">Content snippet</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-mono text-[11px] text-textMuted opacity-60">{log.id.slice(0, 10)}</td>
                    <td className="px-6 py-4 text-textMuted whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-textMain font-medium">{log.recipient}</td>
                    <td className="px-6 py-4 text-textMuted uppercase text-xs tracking-wider">{log.channel}</td>
                    <td className="px-6 py-4 text-textMuted truncate max-w-xs">{log.subject || log.body}</td>
                    <td className="px-6 py-4 text-center"><StatusBadge status={log.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {total > filters.limit && (
          <div className="p-4 border-t border-white/5 flex justify-between items-center bg-white/[0.01]">
            <button
              disabled={filters.offset === 0}
              onClick={() => setFilters({ ...filters, offset: filters.offset - filters.limit })}
              className="px-4 py-2 bg-background border border-white/10 hover:bg-white/5 rounded-lg text-sm text-white disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-textMuted text-sm">Page {Math.floor(filters.offset / filters.limit) + 1}</span>
            <button
              disabled={filters.offset + filters.limit >= total}
              onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
              className="px-4 py-2 bg-background border border-white/10 hover:bg-white/5 rounded-lg text-sm text-white disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
