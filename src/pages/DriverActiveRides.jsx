import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  QrCode, CheckCircle, Loader2, Car, MapPin,
  Phone, Navigation, User, Hash, Shield, Clock,
  DollarSign, Play, Flag, MessageCircle, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { loadAppConfig } from '@/lib/useAppConfig';
import { getBoardingCode } from '@/lib/boardingCode';
import { calcCommission } from '@/lib/commissionCalc';

export default function DriverActiveRides() {
  const [driver, setDriver] = useState(null);
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boardingCodes, setBoardingCodes] = useState({});
  const [validating, setValidating] = useState(null);
  const [starting, setStarting] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [config, setConfig] = useState({});

  useEffect(() => {
    loadData();
    loadAppConfig().then(setConfig);
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
      if (!drivers.length) return;
      const d = drivers[0];
      setDriver(d);

      // Only confirmed (payment_status=paid) bookings
      const bkgs = await base44.entities.RouteBooking.filter(
        { driver_id: d.id, status: 'confirmed' },
        '-created_date',
        30
      );
      // Filter: only paid bookings
      setBookings(bkgs.filter(b => b.payment_status === 'paid'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleStartTrip = async (booking) => {
    setStarting(booking.id);
    try {
      await base44.entities.RouteBooking.update(booking.id, { status: 'in_progress' });

      // Notify passenger
      await base44.entities.Notification.create({
        user_id: booking.passenger_id,
        type: 'ride_started',
        title: '¡Tu conductor está listo!',
        message: `${driver.full_name} ya está en la zona de abordaje esperándote. Recuerda llevar tu código de abordaje.`,
        data: JSON.stringify({ booking_id: booking.id }),
      });

      toast.success(`Viaje iniciado — ${booking.passenger_name} fue notificado`);
      await loadData();
    } catch { toast.error('Error al iniciar viaje'); }
    finally { setStarting(null); }
  };

  const validateBoarding = async (booking) => {
    const expected = getBoardingCode(booking);
    const entered = (boardingCodes[booking.id] || '').trim().toUpperCase();
    if (entered.length < 6) { toast.error('Ingresa el código de 6 caracteres del pasajero.'); return; }
    if (entered !== expected) { toast.error(`Código incorrecto. Pide el código correcto a ${booking.passenger_name}.`); return; }

    setValidating(booking.id);
    try {
      await base44.entities.RouteBooking.update(booking.id, { status: 'in_progress' });
      await base44.entities.Notification.create({
        user_id: booking.passenger_id, type: 'ride_started',
        title: '¡Abordaje confirmado!',
        message: `Tu abordaje fue verificado. ¡Buen viaje, ${booking.passenger_name}!`,
        data: JSON.stringify({ booking_id: booking.id }),
      });
      toast.success(`Abordaje confirmado — ${booking.passenger_name}`);
      setBoardingCodes(prev => { const n = { ...prev }; delete n[booking.id]; return n; });
      await loadData();
    } catch { toast.error('Error al confirmar abordaje. Intenta de nuevo.'); }
    finally { setValidating(null); }
  };

  const completeBookingTrip = async (booking) => {
    setCompleting(booking.id);
    try {
      const commPct = config.commission_recurring || 10;
      const { platformFee, driverNet } = calcCommission(booking.total_price || 0, commPct);

      await base44.entities.RouteBooking.update(booking.id, { status: 'completed' });

      // Update driver balance
      await base44.entities.Driver.update(driver.id, {
        total_rides: (driver.total_rides || 0) + 1,
        earnings_balance: (driver.earnings_balance || 0) + driverNet,
        total_earnings: (driver.total_earnings || 0) + driverNet,
      });

      // Ledger entry
      await base44.entities.PaymentLedger.create({
        transaction_type: 'payout',
        reference_type: 'route_booking',
        reference_id: booking.id,
        user_id: driver.id,
        user_role: 'driver',
        amount: driverNet,
        status: 'pending',
        description: `Ganancia por viaje completado — ${booking.passenger_name}`,
      });

      await base44.entities.Notification.create({
        user_id: booking.passenger_id,
        type: 'ride_completed',
        title: '¡Viaje completado!',
        message: 'Gracias por viajar con Viaja Seguro. Tu viaje fue completado exitosamente.',
        data: JSON.stringify({ booking_id: booking.id }),
      });

      toast.success(`Viaje completado — Ganaste $${driverNet} MXN`);
      setDriver(prev => ({
        ...prev,
        earnings_balance: (prev.earnings_balance || 0) + driverNet,
        total_earnings: (prev.total_earnings || 0) + driverNet,
        total_rides: (prev.total_rides || 0) + 1,
      }));
      await loadData();
    } catch (e) { toast.error('Error al completar viaje'); console.error(e); }
    finally { setCompleting(null); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  const confirmedPending = bookings.filter(b => b.status === 'confirmed');
  const inProgress = bookings.filter(b => b.status === 'in_progress');

  return (
    <div className="min-h-screen bg-slate-50 pb-24 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Operación de viaje</h1>
            <p className="text-sm text-slate-500">Solo pasajeros con pago validado</p>
          </div>
        </div>

        {/* In-progress bookings — validate boarding */}
        {inProgress.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">Viaje en curso — Validar abordaje</p>
            <div className="space-y-3">
              {inProgress.map(b => (
                <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-slate-900">{b.passenger_name}</p>
                          {b.passenger_phone && (
                            <a href={`tel:${b.passenger_phone}`} className="text-sm text-blue-600 flex items-center gap-1">
                              <Phone className="w-3 h-3" />{b.passenger_phone}
                            </a>
                          )}
                          <p className="text-xs text-slate-500 mt-1">{b.departure_time} · {(b.days_booked || []).join(', ')}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-600 text-white">${b.total_price} MXN</Badge>
                          <p className="text-xs text-green-700 mt-1 font-medium">✓ Pago validado</p>
                        </div>
                      </div>

                      {b.pickup_point && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-3 bg-white rounded-lg px-3 py-2">
                          <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span>{b.pickup_point}</span>
                        </div>
                      )}

                      {/* Boarding code validation */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Hash className="w-3 h-3" /> Pide el código de 6 caracteres al pasajero
                        </p>
                        <Input
                          placeholder="Código del pasajero"
                          value={boardingCodes[b.id] || ''}
                          onChange={e => setBoardingCodes(prev => ({ ...prev, [b.id]: e.target.value.toUpperCase() }))}
                          maxLength={6}
                          className="font-mono text-center text-xl tracking-[0.4em] h-12"
                        />
                        <Button
                          onClick={() => validateBoarding(b)}
                          disabled={(boardingCodes[b.id] || '').length < 6 || validating === b.id}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          {validating === b.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                          Confirmar abordaje
                        </Button>
                      </div>

                      <Button
                        onClick={() => completeBookingTrip(b)}
                        disabled={completing === b.id}
                        variant="outline"
                        className="w-full mt-2 border-green-300 text-green-700 hover:bg-green-100"
                      >
                        {completing === b.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flag className="w-4 h-4 mr-2" />}
                        Marcar viaje completado
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmed bookings — ready to start */}
        {confirmedPending.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Pasajeros confirmados — Pago aprobado</p>
            <div className="space-y-3">
              <AnimatePresence>
                {confirmedPending.map(b => (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card className="border-blue-200">
                      <CardContent className="p-4">
                        {/* Payment validated badge */}
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                          <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <p className="text-xs font-semibold text-green-800">
                            Este asiento ya fue pagado y validado por administración.
                          </p>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-bold text-slate-900">{b.passenger_name}</p>
                            {b.passenger_phone && (
                              <a href={`tel:${b.passenger_phone}`} className="text-sm text-blue-600 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />{b.passenger_phone}
                              </a>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">${b.total_price}</p>
                            <Badge className="bg-blue-100 text-blue-700 text-[10px]">{b.seats_booked || 1} asiento(s)</Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span>{b.departure_time}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Car className="w-3 h-3 text-blue-500" />
                            <span>{(b.days_booked || []).join(', ')}</span>
                          </div>
                          {b.trip_date && (
                            <div className="flex items-center gap-1.5 col-span-2">
                              <DollarSign className="w-3 h-3 text-green-500" />
                              <span className="font-medium text-green-700">Fecha: {b.trip_date}</span>
                            </div>
                          )}
                          {b.pickup_point && (
                            <div className="flex items-center gap-1.5 col-span-2">
                              <MapPin className="w-3 h-3 text-blue-500" />
                              <span>{b.pickup_point}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleStartTrip(b)}
                            disabled={starting === b.id}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            {starting === b.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                            Iniciar viaje
                          </Button>
                          {b.passenger_phone && (
                            <a href={`tel:${b.passenger_phone}`}>
                              <Button variant="outline" size="icon">
                                <Phone className="w-4 h-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {bookings.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Car className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No hay viajes activos</p>
              <p className="text-sm text-slate-400 mt-1">Aquí aparecerán los pasajeros con pago aprobado por administración.</p>
            </CardContent>
          </Card>
        )}

        {/* Safety tips */}
        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs font-semibold text-amber-800 mb-2">🛡️ Recuerda antes de salir</p>
          <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
            <li>Usa puntos de abordaje visibles y públicos.</li>
            <li>Verifica que el pasajero coincida con los datos de la reserva.</li>
            <li>Comparte tu ruta con un contacto de confianza.</li>
          </ul>
        </div>

        <div className="mt-3 flex gap-2">
          <a href="tel:911" className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50">
              <Phone className="w-3.5 h-3.5 mr-2" /> Emergencias — 911
            </Button>
          </a>
          <Link to={createPageUrl('DriverEarnings')} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-green-700 border-green-200 hover:bg-green-50">
              <DollarSign className="w-3.5 h-3.5 mr-2" /> Mis ganancias
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}