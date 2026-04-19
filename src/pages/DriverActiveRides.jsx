import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  QrCode, CheckCircle, XCircle, Loader2, Car, MapPin,
  Phone, Navigation, User, AlertCircle, Hash
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { loadAppConfig } from '@/lib/useAppConfig';

export default function DriverActiveRides() {
  const [driver, setDriver] = useState(null);
  const [user, setUser] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boardingCode, setBoardingCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [config, setConfig] = useState({ commission_recurring: 10, commission_quick_ride: 20 });

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

      // Load active ride or confirmed booking
      const [rides, bkgs] = await Promise.all([
        base44.entities.Ride.filter({ driver_id: d.id, status: 'in_progress' }, '-created_date', 1),
        base44.entities.RouteBooking.filter({ driver_id: d.id, status: 'confirmed' }, '-created_date', 10),
      ]);
      if (rides.length > 0) setActiveRide(rides[0]);
      setBookings(bkgs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const validateBoarding = async (booking) => {
    const expected = booking.id.slice(-6).toUpperCase();
    const entered = boardingCode.trim().toUpperCase();
    if (entered !== expected) {
      toast.error('Código incorrecto. Solicita el código al pasajero.');
      return;
    }
    setValidating(true);
    try {
      await base44.entities.RouteBooking.update(booking.id, { status: 'in_progress' });
      await base44.entities.Notification.create({
        user_id: booking.passenger_id, type: 'ride_started',
        title: '¡Viaje iniciado!',
        message: `Hola ${booking.passenger_name}, tu viaje ha iniciado. Buen viaje.`,
      });
      toast.success(`✅ Abordaje confirmado — ${booking.passenger_name}`);
      setBoardingCode('');
      await loadData();
    } catch { toast.error('Error al confirmar'); }
    finally { setValidating(false); }
  };

  const completeRide = async (ride) => {
    try {
      const appConfig = await loadAppConfig();
      const isQuick = !ride.route_id; // quick rides don't have route_id from RouteBooking
      const commPct = isQuick ? (appConfig.commission_quick_ride || 20) : (appConfig.commission_recurring || 10);
      const fare = ride.fare_final || ride.fare_estimated || 0;
      const platformFee = Math.round(fare * commPct / 100);
      const driverPayout = fare - platformFee;

      await base44.entities.Ride.update(ride.id, { status: 'completed', completed_at: new Date().toISOString(), fare_final: fare });
      await base44.entities.Driver.update(driver.id, {
        status: 'online',
        total_rides: (driver.total_rides || 0) + 1,
        earnings_balance: (driver.earnings_balance || 0) + driverPayout,
        total_earnings: (driver.total_earnings || 0) + driverPayout,
      });
      await base44.entities.Payment.create({
        ride_id: ride.id, passenger_id: ride.passenger_id, driver_id: driver.id,
        amount: fare, fee_platform: platformFee, fee_percentage: commPct,
        payout_driver: driverPayout, status: 'pending_capture',
        retention_window_ends: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      await base44.entities.Notification.create({
        user_id: ride.passenger_id, type: 'ride_completed',
        title: '¡Viaje completado!',
        message: `Total: $${fare} MXN. Gracias por viajar con nosotros.`,
        ride_id: ride.id,
      });
      toast.success(`Viaje completado. Ganaste $${driverPayout} MXN`);
      setActiveRide(null);
      await loadData();
    } catch (e) { toast.error('Error al completar viaje'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Operación de viaje</h1>
        </div>

        {/* Active on-demand ride */}
        {activeRide && (
          <Card className="mb-5 border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-green-900">Viaje en curso</CardTitle>
                <Badge className="bg-green-100 text-green-700">En progreso</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-800">
                <User className="w-4 h-4" />
                <span className="font-medium">{activeRide.passenger_name}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-700">
                <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>{activeRide.dest_address}</span>
              </div>
              <div className="flex gap-2">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${activeRide.dest_lat},${activeRide.dest_lng}&travelmode=driving`} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Navigation className="w-3.5 h-3.5 mr-1" /> Navegar
                  </Button>
                </a>
                <a href={`tel:${activeRide.passenger_phone}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Phone className="w-3.5 h-3.5 mr-1" /> Llamar
                  </Button>
                </a>
              </div>
              <Button onClick={() => completeRide(activeRide)} className="w-full bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" /> Completar viaje
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Confirmed bookings pending boarding */}
        {bookings.length > 0 && (
          <div>
            <h2 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Pasajeros confirmados — Validar abordaje</h2>
            <div className="space-y-3">
              {bookings.map(b => (
                <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-slate-900">{b.passenger_name}</p>
                          <p className="text-sm text-slate-500">{b.departure_time} · {(b.days_booked || []).join(', ')}</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700">${b.total_price} MXN</Badge>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          placeholder="Código del pasajero (6 dígitos)"
                          value={boardingCode}
                          onChange={e => setBoardingCode(e.target.value.toUpperCase())}
                          maxLength={6}
                          className="font-mono text-center text-lg tracking-widest"
                        />
                      </div>
                      <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                        <Hash className="w-3 h-3" /> Pide el código de 6 caracteres al pasajero
                      </p>
                      <Button
                        onClick={() => validateBoarding(b)}
                        disabled={boardingCode.length < 6 || validating}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {validating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                        Confirmar abordaje
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {!activeRide && bookings.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Car className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">Sin viajes activos</p>
              <p className="text-sm text-slate-400 mt-1">Los viajes confirmados aparecerán aquí</p>
            </CardContent>
          </Card>
        )}

        {/* Emergency */}
        <div className="mt-6">
          <a href="tel:911">
            <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50">
              <Phone className="w-3.5 h-3.5 mr-2" /> Emergencias — 911
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}