import React, { useEffect, useState } from 'react';
import { templatesApi } from '../api/templates.api';
import { Plus, Edit2, Trash2, Mail, MessageSquare, Bell } from 'lucide-react';

export const Templates = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    channel: 'email',
    subject: '',
    body: '',
    variables: ''
  });

  const fetchTemplates = () => {
    setLoading(true);
    templatesApi.list().then(setTemplates).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setFormData({ name: '', channel: 'email', subject: '', body: '', variables: '' });
    setShowModal(true);
  };

  const openEdit = (t: any) => {
    setEditId(t.id);
    setFormData({
      name: t.name,
      channel: t.channel,
      subject: t.subject || '',
      body: t.body,
      variables: Array.isArray(t.variables) ? t.variables.join(', ') : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      await templatesApi.delete(id);
      fetchTemplates();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      variables: formData.variables.split(',').map(s => s.trim()).filter(Boolean)
    };
    if (formData.channel !== 'email') delete (payload as any).subject;

    if (editId) {
      await templatesApi.update(editId, payload);
    } else {
      await templatesApi.create(payload);
    }
    setShowModal(false);
    fetchTemplates();
  };

  const ChannelIcon = ({ channel, className = "w-4 h-4" }: any) => {
    if (channel === 'email') return <Mail className={className} />;
    if (channel === 'sms') return <MessageSquare className={className} />;
    return <Bell className={className} />;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <header>
          <h1 className="text-3xl font-bold text-white mb-2">Templates</h1>
          <p className="text-textMuted">Design reusable notification content with logic and variables.</p>
        </header>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Template
        </button>
      </div>

      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-textMuted">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-textMuted text-sm">No templates found. Create one.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-textMuted">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Channel</th>
                <th className="px-6 py-4 font-medium">Variables</th>
                <th className="px-6 py-4 font-medium">Usage</th>
                <th className="px-6 py-4 font-medium">Last Updated</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {templates.map((tpl) => (
                <tr key={tpl.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{tpl.name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-white/5 border-white/10 text-white capitalize">
                      <ChannelIcon channel={tpl.channel} />
                      {tpl.channel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-textMuted">
                    {tpl.variables?.length ? (
                      <div className="flex gap-1 flex-wrap">
                        {tpl.variables.map((v: string) => (
                          <span key={v} className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-xs">{v}</span>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-textMuted">{tpl.usageCount}</td>
                  <td className="px-6 py-4 text-textMuted">{new Date(tpl.updatedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(tpl)} className="text-textMuted hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(tpl.id)} className="text-textMuted hover:text-danger p-2 rounded-lg hover:bg-danger/10 transition-colors">
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

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden w-full max-w-4xl shadow-2xl flex max-h-[90vh]">
            {/* Form Side */}
            <div className="w-1/2 p-6 overflow-y-auto border-r border-white/5">
              <h3 className="text-xl font-bold text-white mb-6">{editId ? 'Edit Template' : 'Create Template'}</h3>
              <form id="template-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1">Name</label>
                  <input
                    required autoFocus
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1">Channel</label>
                  <select
                    value={formData.channel}
                    onChange={e => setFormData({ ...formData, channel: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain appearance-none"
                    disabled={!!editId}
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="inapp">In-App</option>
                  </select>
                </div>
                
                {formData.channel === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-textMuted mb-1">Subject</label>
                    <input
                      required
                      value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain"
                      placeholder="Welcome {{name}}!"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1">Variables (comma separated)</label>
                  <input
                    value={formData.variables}
                    onChange={e => setFormData({ ...formData, variables: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain"
                    placeholder="name, code, link"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMuted mb-1">Body</label>
                  <textarea
                    required
                    rows={8}
                    value={formData.body}
                    onChange={e => setFormData({ ...formData, body: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:border-primary text-textMain font-mono text-sm leading-relaxed"
                    placeholder="Hi {{name}}, your code is {{code}}."
                  />
                </div>
              </form>
            </div>

            {/* Preview Side */}
            <div className="w-1/2 p-6 bg-background/50 flex flex-col items-center justify-center">
              <div className="w-full max-w-sm">
                <h4 className="text-textMuted text-sm font-medium mb-4 uppercase tracking-wider">Live Preview</h4>
                <div className="bg-white text-black rounded-lg shadow-xl overflow-hidden border border-gray-200">
                  {formData.channel === 'email' && (
                    <div className="border-b border-gray-100 p-4 bg-gray-50">
                      <div className="text-xs text-gray-500 mb-1">Subject</div>
                      <div className="font-medium text-sm">{formData.subject || 'No subject'}</div>
                    </div>
                  )}
                  <div className="p-4 whitespace-pre-wrap text-sm text-gray-700 min-h-[100px]">
                    {formData.body || 'Type something to preview...'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-12 w-full pt-6 border-t border-white/5">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-textMuted hover:text-white transition-colors">
                  Cancel
                </button>
                <button form="template-form" type="submit" className="px-6 py-2 bg-primary hover:bg-primaryHover text-white font-medium rounded-lg transition-colors shadow-lg">
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
