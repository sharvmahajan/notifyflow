import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-danger/10 text-danger mb-4">
          <AlertTriangle className="w-10 h-10" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">404 - Not Found</h1>
          <p className="text-lg text-textMuted">
            The page you are looking for doesn't exist or may have been restricted.
          </p>
        </div>

        <div className="p-4 bg-surface rounded-xl border border-white/5 text-sm text-textMuted text-left">
          <p>
            <strong>Security Note:</strong> Accessing unknown or restricted administrative endpoints triggers an automated security alert. 
            If you are trapped in a security block, please contact your administrator.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Home className="w-5 h-5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};
