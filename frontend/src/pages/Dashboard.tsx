import { useEffect, useState } from 'react';
import { analyticsApi } from '../api/analytics.api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Zap, Send, CheckCircle2, XCircle } from 'lucide-react';

export const Dashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getSummary().then(res => {
      setData(res);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-textMuted animate-pulse">Loading dashboard...</div>;
  }

  if (!data) return null;

  const pieData = [
    { name: 'Email', value: data.byChannel.email.sent, color: '#3B82F6' },
    { name: 'SMS', value: data.byChannel.sms.sent, color: '#10B981' },
    { name: 'In-App', value: data.byChannel.inapp.sent, color: '#8B5CF6' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
        <p className="text-textMuted">Analytics and usage statistics for your workspace.</p>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Total Sent" value={data.totalSent} icon={Send} color="text-primary" />
        <MetricCard title="Delivered" value={data.delivered} icon={CheckCircle2} color="text-success" />
        <MetricCard title="Failed" value={data.failed} icon={XCircle} color="text-danger" />
        <MetricCard title="Delivery Rate" value={`${data.deliveryRate.toFixed(1)}%`} icon={Zap} color="text-blue-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="col-span-2 bg-surface p-6 rounded-2xl border border-white/5">
          <h3 className="text-lg font-semibold text-white mb-6">Last 30 Days Volume</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyVolume.slice(-7)}>
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#1F2943' }}
                  contentStyle={{ backgroundColor: '#151A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="sent" fill="#8B5CF6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-surface p-6 rounded-2xl border border-white/5 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6">Channel Breakdown</h3>
          <div className="flex-1 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#151A2E', border: 'none', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-textMuted text-sm">No data</div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-textMuted">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                {d.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-surface p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
    <div className="flex justify-between items-start mb-4">
      <div className="text-textMuted font-medium text-sm">{title}</div>
      <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <div className="text-3xl font-bold text-white">{value}</div>
  </div>
);
