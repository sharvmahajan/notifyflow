import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keysApi } from '../api/keys.api';
import { Plus, Copy, Check, Trash2, Eye, EyeOff, AlertTriangle, BarChart2, Pause, Play } from 'lucide-react';

export const Keys = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', environment: 'live' });
  const [newKey, setNewKey] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Lifecycle Modal State
  const [lifecycleModal, setLifecycleModal] = useState<{ type: 'pause' | 'resume' | 'delete', key: any } | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  const executeLifecycleAction = async () => {
    if (!lifecycleModal) return;
    const { type, key } = lifecycleModal;
    
    if (type === 'delete' && deleteConfirmName !== key.name) return;

    setActionLoading(true);
    try {
      if (type === 'pause') await keysApi.pause(key.id);
      if (type === 'resume') await keysApi.resume(key.id);
      if (type === 'delete') await keysApi.delete(key.id);
      
      setLifecycleModal(null);
      setDeleteConfirmName('');
      fetchKeys();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
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
          <p className="text-textMuted">Manage your API keys and monitor usage.</p>
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
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Environment</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium">Last Used</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-white font-medium mb-1">{key.name}</div>
                    <div className="font-mono text-[10px] text-textMuted flex items-center gap-1.5">
                      {key.prefix}••••••••
                      <button onClick={() => copyToClipboard(key.prefix)} className="hover:text-white" title="Copy Prefix">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      key.status === 'ACTIVE' ? 'bg-success/10 text-success border-success/20' :
                      key.status === 'PAUSED' ? 'bg-warning/10 text-warning border-warning/20' :
                      'bg-danger/10 text-danger border-danger/20'
                    }`}>
                      {key.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      key.environment === 'live' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {key.environment}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-textMuted text-xs">{new Date(key.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-textMuted text-xs">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => navigate(`/keys/${key.id}/analytics`)}
                        className="p-2 text-textMuted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        title="Analytics"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </button>
                      {key.status === 'ACTIVE' ? (
                        <button
                          onClick={() => setLifecycleModal({ type: 'pause', key })}
                          className="p-2 text-textMuted hover:text-warning hover:bg-warning/10 rounded-lg transition-colors"
                          title="Pause"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setLifecycleModal({ type: 'resume', key })}
                          className="p-2 text-textMuted hover:text-success hover:bg-success/10 rounded-lg transition-colors"
                          title="Resume"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setLifecycleModal({ type: 'delete', key })}
                        className="p-2 text-textMuted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Key Modal */}
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
                  className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain transition-colors"
                  placeholder="e.g. Production Web App"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textMuted mb-1">Environment</label>
                <select
                  value={formData.environment}
                  onChange={e => setFormData({ ...formData, environment: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain appearance-none cursor-pointer"
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
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lifecycle Modal */}
      {lifecycleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className={`p-3 rounded-xl w-fit mb-4 ${
              lifecycleModal.type === 'delete' ? 'bg-danger/10 text-danger' :
              lifecycleModal.type === 'pause' ? 'bg-warning/10 text-warning' :
              'bg-success/10 text-success'
            }`}>
              {lifecycleModal.type === 'delete' ? <Trash2 className="w-6 h-6" /> :
               lifecycleModal.type === 'pause' ? <Pause className="w-6 h-6" /> :
               <Play className="w-6 h-6" />}
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">
              {lifecycleModal.type === 'delete' ? 'Delete API' :
               lifecycleModal.type === 'pause' ? 'Pause API' :
               'Resume API'}
            </h3>
            
            <p className="text-textMuted text-sm mb-6 leading-relaxed">
              {lifecycleModal.type === 'delete' ? 
                `This action is irreversible. All notifications using this key will fail immediately. Please type the API name "${lifecycleModal.key.name}" to confirm.` :
               lifecycleModal.type === 'pause' ?
                'Pausing this API will temporarily disable and block all notifications sent through this key. You can resume it at any time.' :
                'Resuming this API will allow it to start sending notifications again.'}
            </p>

            {lifecycleModal.type === 'delete' && (
              <input
                autoFocus
                value={deleteConfirmName}
                onChange={e => setDeleteConfirmName(e.target.value)}
                placeholder="Type API name to confirm"
                className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-danger text-textMain mb-6"
              />
            )}

            <div className="flex justify-end gap-3">
              <button 
                disabled={actionLoading}
                onClick={() => { setLifecycleModal(null); setDeleteConfirmName(''); }} 
                className="px-4 py-2 text-textMuted hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                disabled={actionLoading || (lifecycleModal.type === 'delete' && deleteConfirmName !== lifecycleModal.key.name)}
                onClick={executeLifecycleAction}
                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  lifecycleModal.type === 'delete' ? 'bg-danger hover:bg-danger/80 text-white' :
                  lifecycleModal.type === 'pause' ? 'bg-warning hover:bg-warning/80 text-white' :
                  'bg-success hover:bg-success/80 text-white'
                } disabled:opacity-50 disabled:grayscale`}
              >
                {actionLoading ? 'Processing...' : 
                 lifecycleModal.type === 'delete' ? 'Delete Permanently' :
                 lifecycleModal.type === 'pause' ? 'Pause Now' :
                 'Resume Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
