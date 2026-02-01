import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  Bell, Car, CreditCard, Shield, AlertCircle, 
  CheckCircle, Clock, Loader2, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const user = await base44.auth.me();
      const notifs = await base44.entities.Notification.filter(
        { user_id: user.id },
        '-created_date',
        50
      );
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notif) => {
    if (notif.read) return;
    
    await base44.entities.Notification.update(notif.id, { read: true });
    setNotifications(notifications.map(n => 
      n.id === notif.id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(
      unread.map(n => base44.entities.Notification.update(n.id, { read: true }))
    );
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type) => {
    const icons = {
      ride_request: Car,
      ride_assigned: Car,
      ride_started: Car,
      ride_completed: CheckCircle,
      ride_cancelled: AlertCircle,
      payment: CreditCard,
      kyc_update: Shield,
      incident: AlertCircle,
      system: Bell
    };
    return icons[type] || Bell;
  };

  const getIconColor = (type) => {
    const colors = {
      ride_request: 'bg-blue-100 text-blue-600',
      ride_assigned: 'bg-green-100 text-green-600',
      ride_started: 'bg-blue-100 text-blue-600',
      ride_completed: 'bg-green-100 text-green-600',
      ride_cancelled: 'bg-red-100 text-red-600',
      payment: 'bg-purple-100 text-purple-600',
      kyc_update: 'bg-indigo-100 text-indigo-600',
      incident: 'bg-orange-100 text-orange-600',
      system: 'bg-slate-100 text-slate-600'
    };
    return colors[type] || 'bg-slate-100 text-slate-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Notificaciones</h1>
          {notifications.some(n => !n.read) && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Marcar todo como leído
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Sin notificaciones</h3>
            <p className="text-slate-500">Aquí aparecerán tus notificaciones</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {notifications.map((notif) => {
                const Icon = getIcon(notif.type);
                
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-colors ${
                        !notif.read ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => markAsRead(notif)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(notif.type)}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-slate-900">{notif.title}</h3>
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2" />
                              )}
                            </div>
                            <p className="text-slate-600 text-sm mt-1">{notif.message}</p>
                            <p className="text-slate-400 text-xs mt-2 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(notif.created_date), "d MMM HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}