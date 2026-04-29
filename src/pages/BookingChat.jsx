import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, Phone, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function BookingChat() {
  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);
  const [route, setRoute] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const bookingId = params.get('bookingId');
      if (!bookingId) { navigate(createPageUrl('MyBookings')); return; }

      const [userData] = await Promise.all([base44.auth.me()]);
      setUser(userData);

      const bookings = await base44.entities.RouteBooking.filter({ id: bookingId });
      if (!bookings.length) { navigate(createPageUrl('MyBookings')); return; }
      const b = bookings[0];

      // Only allow chat if payment is approved
      if (b.payment_status !== 'paid') {
        toast.error('El chat solo está disponible para reservas con pago aprobado.');
        navigate(createPageUrl('MyBookings'));
        return;
      }

      setBooking(b);

      const routes = await base44.entities.Route.filter({ id: b.route_id });
      if (routes.length > 0) setRoute(routes[0]);

      // Load messages (using Incident entity repurposed, or Notification)
      // We'll use Notification filtered by data field containing booking_id and type 'chat'
      const notifs = await base44.entities.Notification.filter({ ride_id: bookingId, type: 'system' }, 'created_date', 100);
      setMessages(notifs.filter(n => n.title === 'chat_message'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!booking?.id) return;
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.data?.ride_id === booking.id && event.data?.title === 'chat_message') {
        setMessages(prev => [...prev, event.data]);
      }
    });
    return () => unsub();
  }, [booking?.id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !booking) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    const isPassenger = user.id === booking.passenger_id;
    const otherUserId = isPassenger ? booking.driver_id : booking.passenger_id;
    const senderName = user.full_name || user.email;

    try {
      await base44.entities.Notification.create({
        user_id: otherUserId,
        type: 'system',
        title: 'chat_message',
        message: text,
        data: JSON.stringify({ sender_id: user.id, sender_name: senderName, is_passenger: isPassenger }),
        ride_id: booking.id,
        read: false,
      });

      // Also store for sender's view
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        user_id: otherUserId,
        type: 'system',
        title: 'chat_message',
        message: text,
        data: JSON.stringify({ sender_id: user.id, sender_name: senderName, is_passenger: isPassenger }),
        ride_id: booking.id,
        created_date: new Date().toISOString(),
      }]);
    } catch (e) {
      toast.error('No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (!booking) return null;

  const isPassenger = user?.id === booking.passenger_id;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-16 z-10">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">
            {isPassenger ? (route?.driver_name || 'Tu conductor') : (booking.passenger_name || 'Pasajero')}
          </p>
          <p className="text-xs text-slate-500 truncate">
            {route?.origin_poi_name || route?.origin_address} → {route?.dest_poi_name || route?.dest_address}
          </p>
        </div>
        {route?.driver_phone && isPassenger && (
          <a href={`tel:${route.driver_phone}`}>
            <Button variant="outline" size="sm" className="gap-1">
              <Phone className="w-4 h-4" />
              Llamar
            </Button>
          </a>
        )}
      </div>

      {/* Safety notice */}
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-2">
        <p className="text-xs text-blue-700 text-center">
          🔒 Chat de Viaja Seguro — Solo comparte información relacionada con tu viaje. No compartas datos bancarios.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm">Inicia la conversación con tu conductor.</p>
            <p className="text-slate-400 text-xs mt-1">Puedes preguntar el punto exacto de abordaje o confirmar hora de salida.</p>
          </div>
        )}

        {messages.map((msg) => {
          let senderData = {};
          try { senderData = JSON.parse(msg.data || '{}'); } catch {}
          const isMine = senderData.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                isMine
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white text-slate-900 shadow-sm rounded-bl-sm border'
              }`}>
                {!isMine && (
                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5">{senderData.sender_name || 'Conductor'}</p>
                )}
                <p className="text-sm leading-relaxed">{msg.message}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                  {new Date(msg.created_date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 z-20" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-xl"
            disabled={sending}
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}