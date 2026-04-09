import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Key, FileCode2, Send, History, ScrollText, LogOut, Zap, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Layout = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/keys', label: 'API Keys', icon: Key },
    { to: '/templates', label: 'Templates', icon: FileCode2 },
    { to: '/send', label: 'Send Notification', icon: Send },
    { to: '/logs', label: 'Logs', icon: History },
    { to: '/docs', label: 'Documentation', icon: ScrollText },
  ];

  if (user?.isAdmin) {
    navItems.push({ to: '/soc', label: 'Security Center', icon: Shield });
  }

  return (
    <div className="flex bg-background min-h-screen text-textMain">
      {/* Sidebar */}
      <div className="w-64 bg-surface border-r border-white/5 flex flex-col">
        <div className="h-16 flex items-center px-6 gap-2 border-b border-white/5">
          <Zap className="text-primary w-6 h-6" />
          <span className="font-bold text-lg text-white">NotifyFlow</span>
        </div>
        
        <div className="flex-1 py-6 px-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-textMuted hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="px-3 pb-3">
            <div className="text-sm font-medium text-white line-clamp-1">{user?.name}</div>
            <div className="text-xs text-textMuted truncate">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-textMuted hover:text-white hover:bg-danger/10 hover:text-danger transition-colors font-medium text-sm"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};
