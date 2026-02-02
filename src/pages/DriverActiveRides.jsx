import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Navigation, Clock, DollarSign, 
  CheckCircle, X, AlertCircle, QrCode, Phone
} from 'lucide-react';
import { toast } from 'sonner';

export default function DriverActiveRides() {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingRides, setPendingRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Real-time subscription for new rides
    const unsubscribe = base44.entities.Ride.subscribe((event) => {
      if (event.type === 'create' && event.data.status === 'requested') {
        loadPendingRides();
      }
    });
    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
      if (drivers.length === 0 || drivers[0].kyc_status !== 'approved') {
        navigate(createPageUrl('DriverOnboarding'));
        return;
      }

      setDriver(drivers[0]);

      // Check for active rides
      const active = await base44.entities.Ride.filter({
        driver_id: drivers[0].id,
        status: { $in: ['accepted', 'payment_confirmed', 'in_progress'] }
      });

      if (active.length > 0) {
        setActiveRide(active[0]);
      } else {
        // Load pending rides if no active ride
        await loadPendingRides();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRides = async () => {
    try {
      const rides = await base44.entities.Ride.filter(
        { status: 'requested' },
        '-requested_at',
        10
      );
      setPendingRides(rides);
    } catch (error) {
      console.error('Error loading rides:', error);
    }
  };

  const handleAcceptRide = async (ride) => {
    try {
      // Generate unique QR code
      const qrCode = `RIDE-${ride.id}-${Date.now()}`;

      // Accept the ride
      await base44.entities.Ride.update(ride.id, {
        status: 'accepted',
        driver_id: driver.id,
        driver_name: driver.full_name,
        driver_phone: driver.phone,
        driver_photo: driver.profile_photo,
        vehicle_plate: driver.vehicle_plate,
        vehicle_model: driver.vehicle_model,
        vehicle_color: driver.vehicle_color,
        qr_code: qrCode,
        qr_active: false,
        accepted_at: new Date().toISOString()
      });

      toast.success('Viaje aceptado');
      setActiveRide({ ...ride, status: 'accepted', qr_code: qrCode });
      setPendingRides([]);
    } catch (error) {
      toast.error('Error al aceptar viaje');
    }
  };

  const handleRejectRide = (ride) => {
    setPendingRides(prev => prev.filter(r => r.id !== ride.id));
    toast.info('Viaje rechazado');
  };

  const handleStartRide = async () => {
    if (!activeRide.qr_active) {
      toast.error('El pasajero debe confirmar el pago primero');
      return;
    }

    try {
      await base44.entities.Ride.update(activeRide.id, {
        status: 'in_progress',
        started_at: new Date().toISOString()
      });
      toast.success('Viaje iniciado');
      setActiveRide({ ...activeRide, status: 'in_progress' });
    } catch (error) {
      toast.error('Error al iniciar viaje');
    }
  };

  const handleCompleteRide = async () => {
    try {
      await base44.entities.Ride.update(activeRide.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        fare_final: activeRide.fare_estimated
      });

      // Update driver earnings
      await base44.entities.Driver.update(driver.id, {
        earnings_balance: (driver.earnings_balance || 0) + activeRide.fare_estimated,
        total_earnings: (driver.total_earnings || 0) + activeRide.fare_estimated,
        total_rides: (driver.total_rides || 0) + 1
      });

      toast.success('Viaje completado');
      setActiveRide(null);
      loadPendingRides();
    } catch (error) {
      toast.error('Error al completar viaje');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          {activeRide ? 'Viaje Activo' : 'Solicitudes de Viaje'}
        </h1>

        {/* Active Ride */}
        {activeRide && (
          <Card className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-green-600 text-white">
                  {activeRide.status === 'accepted' && 'Aceptado'}
                  {activeRide.status === 'payment_confirmed' && 'Pago confirmado'}
                  {activeRide.status === 'in_progress' && 'En curso'}
                </Badge>
                <span className="text-2xl font-bold text-green-700">
                  ${activeRide.fare_estimated} MXN
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Origen</p>
                    <p className="text-sm font-medium text-slate-900">{activeRide.origin_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Navigation className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Destino</p>
                    <p className="text-sm font-medium text-slate-900">{activeRide.dest_address}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-slate-900 mb-2">Pasajero</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{activeRide.passenger_name}</p>
                    <p className="text-sm text-slate-500">{activeRide.passenger_phone}</p>
                  </div>
                  <a href={`tel:${activeRide.passenger_phone}`}>
                    <Button size="icon" variant="outline">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>

              {activeRide.qr_code && (
                <div className="bg-white rounded-lg p-4 mb-4 text-center">
                  <QrCode className={`w-16 h-16 mx-auto mb-2 ${activeRide.qr_active ? 'text-green-600' : 'text-slate-400'}`} />
                  <p className="text-xs font-mono text-slate-600">{activeRide.qr_code}</p>
                  {activeRide.qr_active ? (
                    <Badge className="mt-2 bg-green-600">QR Activo - Pago confirmado</Badge>
                  ) : (
                    <Badge className="mt-2 bg-amber-500">Esperando confirmación de pago</Badge>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {activeRide.status === 'accepted' && !activeRide.qr_active && (
                  <Button disabled className="w-full" variant="outline">
                    Esperando pago del pasajero
                  </Button>
                )}
                {activeRide.status === 'accepted' && activeRide.qr_active && (
                  <Button onClick={handleStartRide} className="w-full bg-blue-600 hover:bg-blue-700">
                    Iniciar viaje
                  </Button>
                )}
                {activeRide.status === 'in_progress' && (
                  <Button onClick={handleCompleteRide} className="w-full bg-green-600 hover:bg-green-700">
                    Completar viaje
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Rides */}
        {!activeRide && pendingRides.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No hay solicitudes pendientes</p>
            </CardContent>
          </Card>
        )}

        {!activeRide && pendingRides.map(ride => (
          <Card key={ride.id} className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline">Nueva solicitud</Badge>
                <span className="text-xl font-bold text-blue-600">${ride.fare_estimated} MXN</span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700 truncate">{ride.origin_address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Navigation className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700 truncate">{ride.dest_address}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ride.duration_min} min
                  </span>
                  <span>{ride.distance_km} km</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleAcceptRide(ride)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aceptar
                </Button>
                <Button
                  onClick={() => handleRejectRide(ride)}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}