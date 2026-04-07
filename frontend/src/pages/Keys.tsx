import React, { useEffect, useState } from 'react';
import { keysApi } from '../api/keys.api';
import { Plus, Copy, Check, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export const Keys = () => {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', environment: 'live' });
  const [newKey, setNewKey] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const fetchKeys = () => {
    setLoading(true);
    keysApi.list().then(setKeys).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await keysApi.create(formData);
      setNewKey(res.plainTextKey);
      setShowModal(false);
      fetchKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevoke = async (id: string) => {
    if (confirm('Are you sure you want to revoke this key?')) {
      await keysApi.revoke(id);
      fetchKeys();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <header>
          <h1 className="text-3xl font-bold text-white mb-2">API Keys</h1>
          <p className="text-textMuted">Manage your API keys for different environments.</p>
        </header>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Key
        </button>
      </div>

      {newKey && (
        <div className="bg-success/10 border border-success/30 rounded-2xl p-6 relative">
          <div className="flex gap-4">
            <AlertTriangle className="w-6 h-6 text-success shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-success mb-2">Key Created Successfully</h3>
              <p className="text-success/80 text-sm mb-4">
                Please copy this key immediately. For security reasons, you will <strong>not be able to see it again</strong> after leaving this page!
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-surface font-mono text-sm p-3 rounded-lg border border-white/10 flex items-center justify-between">
                  <span className="text-white break-all">
                    {showKey ? newKey : '•'.repeat(newKey.length)}
                  </span>
                  <button onClick={() => setShowKey(!showKey)} className="text-textMuted hover:text-white transition-colors p-1">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => copyToClipboard(newKey)}
                  className="flex items-center gap-2 bg-surface hover:bg-white/10 text-white px-4 py-3 rounded-lg border border-white/10 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => setNewKey(null)} className="absolute top-4 right-4 text-textMuted hover:text-white">✕</button>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-textMuted">Loading keys...</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-textMuted text-sm">No API keys found. Create one to get started.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-textMuted">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Prefix</th>
                <th className="px-6 py-4 font-medium">Environment</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium">Last Used</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{key.name}</td>
                  <td className="px-6 py-4 font-mono text-textMuted flex items-center gap-2">
                    {key.prefix}••••••••
                    <button onClick={() => copyToClipboard(key.prefix)} className="hover:text-white" title="Copy Prefix">
                      <Copy className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      key.environment === 'live' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {key.environment.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-textMuted">{new Date(key.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-textMuted">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleRevoke(key.id)} className="text-textMuted hover:text-danger p-2 rounded-lg hover:bg-danger/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Create New API Key</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Key Name</label>
                <input
                  required autoFocus
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain"
                  placeholder="e.g. Production Web App"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Environment</label>
                <select
                  value={formData.environment}
                  onChange={e => setFormData({ ...formData, environment: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain appearance-none"
                >
                  <option value="test">Test</option>
                  <option value="live">Live</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-textMuted hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary hover:bg-primaryHover text-white font-medium rounded-lg transition-colors">
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
