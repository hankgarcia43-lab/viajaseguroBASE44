import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, Car, MapPin, Clock, User, 
  Phone, Loader2, Shield, Copy, AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getBoardingCode } from '@/lib/boardingCode';

export default function PassengerTicket() {
  const [booking, setBooking] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const bookingId = params.get('bookingId');
      if (!bookingId) { navigate(createPageUrl('MyBookings')); return; }

      const bookings = await base44.entities.RouteBooking.filter({ id: bookingId });
      if (!bookings.length) { navigate(createPageUrl('MyBookings')); return; }
      const b = bookings[0];
      setBooking(b);

      const routes = await base44.entities.Route.filter({ id: b.route_id });
      if (routes.length > 0) setRoute(routes[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getBoardingCode(booking));
    toast.success('Código copiado');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!booking) return null;

  const dayLabels = { lun: 'Lun', mar: 'Mar', mie: 'Mié', jue: 'Jue', vie: 'Vie', sab: 'Sáb', dom: 'Dom' };
  const isPaid = booking.payment_status === 'paid';
  const isRejected = booking.payment_status === 'cancelled';
  // Usar boarding_code persistido en DB; fallback para bookings legacy sin el campo
  const boardingCode = getBoardingCode(booking);

  if (isRejected) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="font-bold text-red-900 text-lg mb-2">Pago rechazado</h2>
            <p className="text-red-700 text-sm mb-2">Revisa el motivo y vuelve a subir comprobante.</p>
            {booking.cancel_reason && (
              <p className="text-xs bg-red-100 text-red-800 rounded-lg px-3 py-2 mb-4">Motivo: {booking.cancel_reason}</p>
            )}
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate(createPageUrl('PaymentInstructions') + `?bookingId=${booking.id}`)}>Volver a pagar</Button>
              <Button variant="outline" className="w-full" onClick={() => navigate(createPageUrl('MyBookings'))}>Ver mis reservas</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isPaid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full border-amber-200 bg-amber-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="font-bold text-amber-900 text-lg mb-2">Pago en revisión</h2>
            <p className="text-amber-700 text-sm mb-4">Tu pago está en revisión por administración. Tu boleto estará disponible una vez que sea aprobado.</p>
            <Button variant="outline" onClick={() => navigate(createPageUrl('MyBookings'))}>Ver mis reservas</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      <div className="max-w-sm mx-auto px-4 pt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Boleto confirmado</h1>
            <p className="text-slate-500 text-sm">Pago validado · Listo para abordar</p>
          </div>

          {/* Main ticket */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-4">
            {/* Route header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
              <p className="text-xs text-white/70 uppercase tracking-wide mb-1">Ruta confirmada</p>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold text-sm">{route?.origin_poi_name || route?.origin_address}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4 flex-shrink-0 text-white/60" />
                <span className="text-white/80 text-sm">{route?.dest_poi_name || route?.dest_address}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Clock className="w-4 h-4" />
                <span className="font-bold">{booking.departure_time}</span>
                <span className="text-white/60 text-xs ml-2">
                  {(booking.days_booked || []).map(d => dayLabels[d] || d).join(' · ')}
                </span>
              </div>
            </div>

            {/* Boarding reference */}
            {route?.boarding_reference && (
              <div className="bg-amber-50 border-b border-amber-100 p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Punto de abordaje</p>
                <p className="font-bold text-amber-900 text-sm">📍 {route.boarding_reference}</p>
              </div>
            )}

            {/* Driver info */}
            {route && (
              <div className="p-5 border-b">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Tu conductor</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                    {route.driver_photo
                      ? <img src={route.driver_photo} alt="" className="w-full h-full object-cover" />
                      : <User className="w-8 h-8 text-slate-300 m-3" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{route.driver_name}</p>
                    <p className="text-sm text-slate-500">{route.driver_phone}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle info */}
            {route && (
              <div className="p-5 border-b">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Vehículo</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                    {route.vehicle_photo
                      ? <img src={route.vehicle_photo} alt="" className="w-full h-full object-cover" />
                      : <Car className="w-7 h-7 text-slate-300 m-3.5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{route.vehicle_model || '—'}</p>
                    <p className="text-sm text-slate-500">{route.vehicle_color || ''}</p>
                    <Badge className="bg-slate-100 text-slate-700 mt-1 font-mono text-xs">{route.vehicle_plate || '—'}</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Boarding code */}
            <div className="p-5 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Código de abordaje</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-mono font-bold tracking-[0.3em] text-slate-900">{boardingCode}</span>
                <button onClick={copyCode} className="text-slate-400 hover:text-slate-600">
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">Muéstraselo a tu conductor al abordar</p>
            </div>
          </div>

          {/* Safety */}
          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm mb-4">
            <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-xs text-slate-600">Conductor verificado por Viaja Seguro. Si tienes una emergencia, llama al <strong>911</strong>.</p>
          </div>

          {/* Emergency call */}
          <a href="tel:911">
            <Button variant="outline" className="w-full rounded-xl text-red-600 border-red-200 hover:bg-red-50">
              <Phone className="w-4 h-4 mr-2" />
              Emergencias — Llamar al 911
            </Button>
          </a>
        </motion.div>
      </div>
    </div>
  );
}