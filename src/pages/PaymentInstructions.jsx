import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useNavigate, Link } from 'react-router-dom';
import { 
  CheckCircle, CreditCard, Clock, ExternalLink, 
  Loader2, Copy, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Link fijo de Mercado Pago (configurable)
const MP_LINK = 'https://link.mercadopago.com.mx/viajaseguro';

export default function PaymentInstructions() {
  const [booking, setBooking] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const bookingId = params.get('bookingId');
      if (!bookingId) { navigate(createPageUrl('MyBookings')); return; }

      const bookings = await base44.entities.RouteBooking.filter({ id: bookingId });
      if (bookings.length === 0) { navigate(createPageUrl('MyBookings')); return; }
      const b = bookings[0];
      setBooking(b);

      const routes = await base44.entities.Route.filter({ id: b.route_id });
      if (routes.length > 0) setRoute(routes[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyAmount = () => {
    if (!booking) return;
    navigator.clipboard.writeText(`${booking.total_price}`);
    toast.success('Monto copiado');
  };

  const copyId = () => {
    if (!booking) return;
    navigator.clipboard.writeText(booking.id);
    toast.success('ID copiado');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (!booking) return null;

  const dayLabels = { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo' };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* Success header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Reserva creada!</h1>
          <p className="text-slate-600">Completa el pago para confirmar tu lugar</p>
        </motion.div>

        {/* Booking summary */}
        <Card className="mb-5">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-900">Resumen de tu reserva</h3>
            {route && (
              <div className="text-sm text-slate-600">
                <p><span className="font-medium">Ruta:</span> {route.origin_poi_name || route.origin_address} → {route.dest_poi_name || route.dest_address}</p>
                <p><span className="font-medium">Horario:</span> {booking.departure_time}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {(booking.days_booked || []).map(day => (
                <Badge key={day} variant="outline" className="text-xs">{dayLabels[day] || day}</Badge>
              ))}
            </div>

            <div className="pt-3 border-t space-y-1 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>${booking.subtotal} MXN</span>
              </div>
              {booking.weekly_discount && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Descuento semanal aplicado</span>
                  <span>−${booking.discount_amount} MXN</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-base pt-1">
                <span>Total a pagar</span>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">${booking.total_price} MXN</span>
                  <button onClick={copyAmount} className="text-slate-400 hover:text-slate-600">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment steps */}
        <Card className="mb-5">
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Instrucciones de pago
            </h3>
            <div className="space-y-4">
              {[
                {
                  num: '1',
                  title: 'Entra al enlace de pago',
                  desc: 'Accede a nuestro enlace seguro de Mercado Pago'
                },
                {
                  num: '2',
                  title: 'Paga el monto exacto',
                  desc: `Indica exactamente $${booking.total_price} MXN. No más, no menos.`
                },
                {
                  num: '3',
                  title: 'Espera validación',
                  desc: 'Soporte revisará tu pago y liberará tu reserva en máximo 12 horas hábiles.'
                }
              ].map((step) => (
                <div key={step.num} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{step.title}</p>
                    <p className="text-sm text-slate-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reference ID */}
        <Card className="mb-5 border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">ID de reserva (incluye en tu pago como referencia)</p>
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
              <code className="text-sm font-mono text-slate-700">{booking.id.slice(0, 16)}...</code>
              <button onClick={copyId} className="text-slate-400 hover:text-slate-600">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Alert */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            Tu reserva está pendiente hasta que soporte valide el pago. Recibirás una notificación de confirmación.
          </AlertDescription>
        </Alert>

        {/* Payment button */}
        <a href={MP_LINK} target="_blank" rel="noopener noreferrer">
          <Button className="w-full h-14 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl text-base font-bold mb-4">
            <ExternalLink className="w-5 h-5 mr-2" />
            Ir al enlace de pago
          </Button>
        </a>

        <Link to={createPageUrl('MyBookings')}>
          <Button variant="outline" className="w-full rounded-xl">
            Ver mis reservas
          </Button>
        </Link>
      </div>
    </div>
  );
}