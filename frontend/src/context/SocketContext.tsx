import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Bell } from 'lucide-react';

interface SocketContextValue {
  socket: Socket | null;
  notifications: any[];
}

const SocketContext = createContext<SocketContextValue>({ socket: null, notifications: [] });

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [toast, setToast] = useState<any>(null);

  useEffect(() => {
    let s: Socket;

    // We assume access token is in cookie, but our socket server expects it in handshake.auth.token
    // In a real app we'd need to extract it or pass it. 
    // Wait, since we mapped to use cookies instead of localStorage for the JWT, we'll need to rely on the cookie internally.
    // Our backend server io.use middleware looks at socket.handshake.auth.token.
    // To simplify since we are using cookies: socket.io automatically sends cookies if withCredentials: true.
    // Let's rely on standard cookies. The server can parse cookies, but we set it up to look at auth.token.
    // For now, let's just assume we'll mock auth token or update our backend, or just intercept.
    // Since backend expects auth.token, we need to pass a valid token. However, our cookies are httpOnly.
    // This is an integration challenge! Let's update backend socket middleware to use cookies if possible on server side, 
    // but in this frontend code, let's just connect.

    if (user) {
      s = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
        withCredentials: true,
      });

      s.on('connect', () => console.log('Socket connected'));
      
      s.on('notification', (payload) => {
        setNotifications((prev) => [payload, ...prev]);
        setToast(payload);
        setTimeout(() => setToast(null), 5000);
      });

      setSocket(s);
    }

    return () => {
      if (s) s.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, notifications }}>
      {children}
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-primary text-white p-4 rounded-xl shadow-2xl flex items-start gap-4 max-w-sm border border-white/10">
            <div className="bg-white/20 p-2 rounded-lg mt-0.5">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">{toast.subject || 'New In-App Notification'}</h4>
              <p className="text-sm opacity-90 mt-1">{toast.body}</p>
            </div>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
