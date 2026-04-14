import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analyticsApi } from '../api/analytics.api';
import { 
  XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, CartesianGrid, AreaChart, Area
} from 'recharts';
import { 
  ArrowLeft, Calendar, Send, CheckCircle2, XCircle, 
  Clock, AlertCircle, Activity,
  Mail, MessageSquare, Bell, Globe, Layout as LayoutIcon
} from 'lucide-react';

export const ApiAnalytics = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatDate(weekAgo),
      endDate: formatDate(now),
      channel: 'all',
      status: 'all'
    };
  });

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await analyticsApi.getApiAnalytics(id, filters);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, filters]);

  if (loading && !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-surface rounded-2xl border border-white/5" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-surface rounded-2xl border border-white/5" />
          <div className="h-80 bg-surface rounded-2xl border border-white/5" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="p-4 rounded-full bg-danger/10 text-danger mb-4">
          <AlertCircle className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Error Loading Analytics</h2>
        <p className="text-textMuted mb-6">{error}</p>
        <button 
          onClick={() => navigate('/keys')}
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to API Keys
        </button>
      </div>
    );
  }

  if (!data) return null;

  const pieData = Object.entries(data.by_channel)
    .map(([name, value]) => ({ name, value: value as number }))
    .filter(d => d.value > 0);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="w-3 h-3" />;
      case 'sms': return <MessageSquare className="w-3 h-3" />;
      case 'push': return <Bell className="w-3 h-3" />;
      case 'webhook': return <Globe className="w-3 h-3" />;
      case 'inapp': return <LayoutIcon className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/keys')}
            className="flex items-center gap-2 text-textMuted hover:text-white transition-colors mb-4 text-sm group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Keys
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{data.api_name}</h1>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              data.api_status === 'ACTIVE' ? 'bg-success/10 text-success border-success/20' :
              data.api_status === 'PAUSED' ? 'bg-warning/10 text-warning border-warning/20' :
              'bg-danger/10 text-danger border-danger/20'
            }`}>
              {data.api_status}
            </span>
          </div>
          <p className="text-textMuted text-sm mt-1">Detailed performance and usage metrics</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-surface p-2 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 px-3 py-1.5 border-r border-white/10">
            <Calendar className="w-4 h-4 text-textMuted" />
            <input 
              type="date" 
              value={filters.startDate}
              onChange={e => setFilters({...filters, startDate: e.target.value})}
              className="bg-transparent text-white text-xs focus:outline-none appearance-none cursor-pointer" 
            />
            <span className="text-white/20">/</span>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={e => setFilters({...filters, endDate: e.target.value})}
              className="bg-transparent text-white text-xs focus:outline-none appearance-none cursor-pointer" 
            />
          </div>
          <select 
            value={filters.channel}
            onChange={e => setFilters({...filters, channel: e.target.value})}
            className="bg-transparent text-white text-xs focus:outline-none px-3 py-1.5 cursor-pointer appearance-none border-r border-white/10"
          >
            <option value="all">All Channels</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="push">Push</option>
            <option value="webhook">Webhook</option>
            <option value="inapp">In-App</option>
          </select>
          <select 
            value={filters.status}
            onChange={e => setFilters({...filters, status: e.target.value})}
            className="bg-transparent text-white text-xs focus:outline-none px-3 py-1.5 cursor-pointer appearance-none"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Requests" 
          value={data.summary.total_notifications} 
          icon={Send} 
          color="text-primary" 
          trend="+12%" 
        />
        <MetricCard 
          title="Success Rate" 
          value={`${data.summary.success_rate}%`} 
          icon={CheckCircle2} 
          color="text-success" 
        />
        <MetricCard 
          title="Failed Requests" 
          value={data.summary.failure_count} 
          icon={XCircle} 
          color="text-danger" 
        />
        <MetricCard 
          title="Avg Latency" 
          value={`${data.summary.avg_latency_ms}ms`} 
          icon={Clock} 
          color="text-blue-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Volume Over Time */}
        <div className="lg:col-span-2 bg-surface p-6 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold text-white">Requests Volume</h3>
            <div className="text-xs text-textMuted flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary/40 block"></span>
              Daily Activity
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.volume_over_time}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2943" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94A3B8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} hide />
                <Tooltip
                  cursor={{ stroke: '#1F2943', strokeWidth: 2 }}
                  contentStyle={{ backgroundColor: '#151A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Channel Distribution */}
        <div className="bg-surface p-6 rounded-2xl border border-white/5 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-8">Channel Split</h3>
          <div className="flex-1 flex items-center justify-center relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-textMuted text-xs uppercase tracking-widest">Share</span>
              <span className="text-2xl font-bold text-white">100%</span>
            </div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie 
                    data={pieData} 
                    innerRadius={75} 
                    outerRadius={95} 
                    paddingAngle={8} 
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#151A2E', border: 'none', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-textMuted text-sm flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 opacity-20" />
                No data for period
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 bg-white/[0.03] p-2 rounded-lg border border-white/5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                <span className="text-[10px] text-textMuted font-medium uppercase">{d.name}</span>
                <span className="text-xs text-white font-bold ml-auto">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Events Table */}
      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          <button className="text-xs text-primary hover:text-primaryHover font-medium transition-colors">
            View All Logs
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.02] text-textMuted">
              <tr>
                <th className="px-6 py-4 font-medium">Event ID</th>
                <th className="px-6 py-4 font-medium">Channel</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.recent_events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-textMuted italic">
                    No matching events found for the selected timeframe.
                  </td>
                </tr>
              ) : (
                data.recent_events.map((event: any) => (
                  <tr key={event.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-mono text-[10px] text-textMuted">
                      {event.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-white">
                        <div className="p-1.5 rounded-lg bg-white/5 text-textMuted">
                          {getChannelIcon(event.channel)}
                        </div>
                        <span className="text-xs capitalize">{event.channel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${
                        event.status === 'success' || event.status === 'delivered' ? 'text-success' : 'text-danger'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          event.status === 'success' || event.status === 'delivered' ? 'bg-success' : 'bg-danger'
                        }`}></span>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-textMuted text-xs">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-xs font-medium ${
                        event.latency_ms > 1000 ? 'text-warning' : 'text-textMuted'
                      }`}>
                        {event.latency_ms}ms
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <div className="bg-surface p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      {trend && (
        <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <div className="space-y-1">
      <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
      <div className="text-xs font-medium text-textMuted uppercase tracking-wider">{title}</div>
    </div>
  </div>
);
