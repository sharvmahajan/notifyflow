import { useState } from 'react';
import { Copy, Terminal, Key, Send, FileCode2, Check } from 'lucide-react';

export const Docs = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const CodeSnippet = ({ title, code, section }: any) => (
    <div className="bg-[#0B0F1A] rounded-xl border border-white/5 mt-4 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 border-b border-white/5 bg-white/[0.02]">
        <span className="text-xs font-medium text-textMuted flex items-center gap-2"><Terminal className="w-3.5 h-3.5" /> {title}</span>
        <button 
          onClick={() => handleCopy(code, section)}
          className="text-textMuted hover:text-white p-1 rounded transition-colors"
        >
          {copiedSection === section ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-xs font-mono text-green-400">
        <pre className="whitespace-pre">{code}</pre>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      <header>
        <h1 className="text-3xl font-bold text-white mb-4">API Documentation</h1>
        <p className="text-textMuted text-lg">Integrate NotifyFlow into your application using our REST APIs.</p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-2">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-white">Authentication</h2>
        </div>
        <p className="text-textMuted">
          Almost all endpoints under the `/api/v1` path require an API key to be passed in the headers. You can pass it as a Bearer token or via the `x-api-key` header.
        </p>
        <div className="bg-surface p-4 rounded-xl border border-white/5">
          <code className="text-sm text-primary bg-primary/10 px-2 py-1 rounded">Authorization: Bearer nf_live_abcdef123456</code>
          <br /><br />
          <code className="text-sm text-primary bg-primary/10 px-2 py-1 rounded">x-api-key: nf_live_abcdef123456</code>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-2">
          <Send className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-white">Send Notification</h2>
        </div>
        <p className="text-textMuted">Send a synchronous notification to a single recipient.</p>
        <div className="flex gap-2">
          <span className="bg-success/20 text-success px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">POST</span>
          <span className="font-mono text-sm text-white">/api/v1/send</span>
        </div>
        
        <CodeSnippet 
          title="cURL Example" 
          section="send"
          code={`curl -X POST https://api.notifyflow.dev/api/v1/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "email",
    "to": "user@example.com",
    "subject": "Welcome!",
    "body": "Hello World"
  }'`} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-2">
          <Send className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-white">Batch Send</h2>
        </div>
        <p className="text-textMuted">Send a template or static content to multiple recipients (up to 500 per request). This is processed concurrently.</p>
        <div className="flex gap-2">
          <span className="bg-success/20 text-success px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">POST</span>
          <span className="font-mono text-sm text-white">/api/v1/send/batch</span>
        </div>
        
        <CodeSnippet 
          title="cURL Example" 
          section="batch_send"
          code={`curl -X POST https://api.notifyflow.dev/api/v1/send/batch \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "sms",
    "recipients": ["+15550100", "+15550101"],
    "templateId": "clt_example123",
    "variables": { "code": "654321" }
  }'`} />
      </section>
      
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-2">
          <FileCode2 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-white">Using Templates</h2>
        </div>
        <p className="text-textMuted">You can map `templateId` in your `send` request instead of passing `body` and `subject`. Template variables denoted by `{'{{variable}}'}` will be replaced by the `variables` key-value object passed in your request.</p>
      </section>

    </div>
  );
};
