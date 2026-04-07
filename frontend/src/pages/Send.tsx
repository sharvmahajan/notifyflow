import React, { useState, useEffect, useMemo } from 'react';
import { notificationsApi } from '../api/notifications.api';
import { templatesApi } from '../api/templates.api';
import { Send as SendIcon, Terminal, LayoutList } from 'lucide-react';

export const Send = () => {
  const [tab, setTab] = useState<'single' | 'batch'>('single');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [channel, setChannel] = useState('email');
  const [templateId, setTemplateId] = useState('');
  const [to, setTo] = useState('');
  const [batchRecipients, setBatchRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    templatesApi.list().then(setTemplates);
  }, []);

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    if (!id) return;
    const t = templates.find(t => t.id === id);
    if (t) {
      setChannel(t.channel);
      setSubject(t.subject || '');
      setBody(t.body || '');
      const vars: Record<string, string> = {};
      t.variables?.forEach((v: string) => vars[v] = '');
      setVariables(vars);
    }
  };

  const previewBody = useMemo(() => {
    let str = body;
    Object.entries(variables).forEach(([k, v]) => {
      str = str.replace(new RegExp(`{{${k}}}`, 'g'), v || `{{${k}}}`);
    });
    return str;
  }, [body, variables]);

  const curlCommand = useMemo(() => {
    const payload: any = { channel };
    if (tab === 'single') payload.to = to || 'recipient@example.com';
    else payload.recipients = batchRecipients.split('\n').map(r => r.trim()).filter(Boolean);
    
    if (templateId) payload.templateId = templateId;
    else {
      if (subject) payload.subject = subject;
      payload.body = body;
    }
    
    if (Object.keys(variables).length > 0) payload.variables = variables;

    return `curl -X POST https://api.notifyflow.dev/api/v1/send${tab === 'batch' ? '/batch' : ''} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
  }, [tab, channel, to, batchRecipients, templateId, subject, body, variables]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const payload: any = { channel };
    if (templateId) payload.templateId = templateId;
    else {
      if (subject) payload.subject = subject;
      payload.body = body;
    }
    if (Object.keys(variables).length > 0) payload.variables = variables;

    try {
      if (tab === 'single') {
        payload.to = to;
        const res = await notificationsApi.send(payload);
        setResult(res);
      } else {
        payload.recipients = batchRecipients.split('\n').map(r => r.trim()).filter(Boolean);
        const res = await notificationsApi.sendBatch(payload);
        setResult(res);
      }
    } catch (err: any) {
      setResult({ error: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">Send Notification</h1>
        <p className="text-textMuted">Test the API manually or send batch blasts.</p>
      </header>

      <div className="flex gap-4 border-b border-white/5 pb-4">
        <button onClick={() => setTab('single')} className={`px-4 py-2 font-medium rounded-lg transition-colors ${tab === 'single' ? 'bg-primary/20 text-primary' : 'text-textMuted hover:bg-white/5 hover:text-white'}`}>Single Send</button>
        <button onClick={() => setTab('batch')} className={`px-4 py-2 font-medium rounded-lg transition-colors ${tab === 'batch' ? 'bg-primary/20 text-primary' : 'text-textMuted hover:bg-white/5 hover:text-white'}`}>Batch Send</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface p-6 rounded-2xl border border-white/5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Channel</label>
                <select value={channel} onChange={e => setChannel(e.target.value)} disabled={!!templateId} className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain appearance-none">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="inapp">In-App</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Template</label>
                <select value={templateId} onChange={e => handleTemplateSelect(e.target.value)} className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain appearance-none">
                  <option value="">-- No Template --</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            {tab === 'single' ? (
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Recipient {channel === 'email' ? '(Email)' : channel === 'sms' ? '(Phone)' : '(User ID)'}</label>
                <input required value={to} onChange={e => setTo(e.target.value)} className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain" placeholder={`e.g. ${channel === 'sms' ? '+15550100' : 'user@example.com'}`} />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Recipients (One per line)</label>
                <textarea required rows={4} value={batchRecipients} onChange={e => setBatchRecipients(e.target.value)} className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain font-mono text-sm leading-relaxed" placeholder="user1@example.com&#10;user2@example.com" />
              </div>
            )}

            {!templateId && channel === 'email' && (
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Subject</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain" />
              </div>
            )}

            {!templateId && (
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Body</label>
                <textarea rows={4} required value={body} onChange={e => setBody(e.target.value)} className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain font-mono text-sm" />
              </div>
            )}

            {Object.keys(variables).length > 0 && (
              <div className="p-4 bg-background border border-white/5 rounded-lg space-y-3">
                <h4 className="text-sm font-medium text-white flex items-center gap-2"><LayoutList className="w-4 h-4 text-primary" /> Variables</h4>
                {Object.keys(variables).map(key => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-24 text-sm font-mono text-textMuted text-right">{key}</span>
                    <input required value={variables[key]} onChange={e => setVariables({...variables, [key]: e.target.value})} className="flex-1 px-3 py-1.5 bg-surface border border-white/10 rounded-md focus:outline-none focus:border-primary text-sm text-textMain" placeholder="Value..." />
                  </div>
                ))}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-2.5 px-4 bg-primary hover:bg-primaryHover text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50">
              <SendIcon className="w-5 h-5" />
              {loading ? 'Sending...' : 'Send Notification'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-surface p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-semibold text-textMuted mb-4 flex items-center gap-2 uppercase tracking-wide"><Terminal className="w-4 h-4" /> cURL Request</h3>
            <pre className="bg-[#0B0F1A] p-4 rounded-xl text-xs font-mono text-green-400 overflow-x-auto border border-white/5 leading-relaxed">{curlCommand}</pre>
          </div>

          <div className="bg-surface p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-semibold text-textMuted mb-4 uppercase tracking-wide">Live Preview</h3>
            <div className="bg-background border border-white/5 rounded-xl p-4 text-sm text-textMain whitespace-pre-wrap min-h-[100px]">
              {previewBody || 'No content to preview.'}
            </div>
          </div>

          {result && (
            <div className={`p-4 rounded-xl border ${result.error ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-success/10 border-success/20 text-success'}`}>
              <h3 className="font-semibold text-sm mb-2 uppercase tracking-wide">Response</h3>
              <pre className="text-xs whitespace-pre-wrap overflow-x-auto font-mono opacity-80">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
