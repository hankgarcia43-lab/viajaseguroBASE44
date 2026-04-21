import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Zap, MapPin, User, Clock, Loader2, RefreshCw,
  ChevronRight, CheckCircle, XCircle, Navigation, Phone
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Cálculo de distancia Haversine entre dos coordenadas (km)
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DriverQuickRequests() {
  const [driver, setDriver] = useState(null);
  const [user, setUser] = useState(null);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(10);
  const [processing, setProcessing] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      const drivers = await base44.entities.Driver.filter({ user_id: userData.id, kyc_status: 'approved' });
      if (!drivers.length) return;
      const d = drivers[0];
      setDriver(d);
      await fetchNearbyRides(d, radius);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchNearbyRides = async (d, r) => {
    try {
      const allRides = await base44.entities.Ride.filter({ status: 'searching' }, '-created_date', 50);
      // Filtrar: no asignados
      const unassigned = allRides.filter(ride => !ride.driver_id || ride.driver_id === '');

      // Filtrar por distancia Haversine si el conductor tiene lat/lng válidos
      const driverLat = d?.current_location_lat;
      const driverLng = d?.current_location_lng;
      const hasLocation = typeof driverLat === 'number' && typeof driverLng === 'number';

      const nearby = unassigned
        .map(ride => {
          if (!hasLocation || typeof ride.origin_lat !== 'number' || typeof ride.origin_lng !== 'number') {
            return { ...ride, _distKm: null }; // sin coords: incluir con distancia desconocida
          }
          const dist = haversineKm(driverLat, driverLng, ride.origin_lat, ride.origin_lng);
          return { ...ride, _distKm: dist };
        })
        .filter(ride => ride._distKm === null || ride._distKm <= r)
        .sort((a, b) => {
          if (a._distKm === null && b._distKm === null) return 0;
          if (a._distKm === null) return 1;
          if (b._distKm === null) return -1;
          return a._distKm - b._distKm;
        });

      setRides(nearby);
    } catch { setRides([]); }
  };

  const handleAccept = async (ride) => {
    setProcessing(ride.id);
    try {
      await base44.entities.Ride.update(ride.id, {
        status: 'assigned',
        driver_id: driver.id,
        driver_name: driver.full_name,
        driver_phone: driver.phone,
        driver_photo: driver.profile_photo,
        vehicle_plate: driver.vehicle_plate,
        vehicle_model: driver.vehicle_model,
        vehicle_color: driver.vehicle_color,
        accepted_at: new Date().toISOString(),
      });
      await base44.entities.Driver.update(driver.id, { status: 'busy' });
      await base44.entities.Notification.create({
        user_id: ride.passenger_id,
        type: 'ride_assigned',
        title: '¡Conductor asignado!',
        message: `${driver.full_name} aceptó tu viaje. ${driver.vehicle_model} — ${driver.vehicle_plate}`,
        ride_id: ride.id,
      });
      toast.success('¡Viaje aceptado!');
      setRides(prev => prev.filter(r => r.id !== ride.id));
    } catch { toast.error('Error al aceptar'); }
    finally { setProcessing(null); }
  };

  const handleReject = async (ride) => {
    setProcessing(ride.id);
    try {
      // Just remove from local list; leave the ride for other drivers
      setRides(prev => prev.filter(r => r.id !== ride.id));
      toast.info('Viaje descartado');
    } finally { setProcessing(null); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Viajes rápidos</h1>
              <p className="text-sm text-slate-500">Solicitudes cercanas disponibles</p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => { setLoading(true); fetchNearbyRides(driver, radius).finally(() => setLoading(false)); }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Radius control */}
        <Card className="mb-5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Radio de búsqueda</span>
              <Badge className="bg-blue-100 text-blue-700">{radius} km</Badge>
            </div>
            <Slider
              value={[radius]}
              onValueChange={([v]) => setRadius(v)}
              min={5} max={50} step={5}
              className="mb-2"
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-1"
              onClick={() => { setLoading(true); fetchNearbyRides(driver, radius).finally(() => setLoading(false)); }}
            >
              Buscar en {radius} km
            </Button>
          </CardContent>
        </Card>

        {/* Rides list */}
        {rides.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Zap className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">Sin viajes rápidos ahora</p>
              <p className="text-sm text-slate-400 mt-1 mb-4">No hay solicitudes en {radius} km. Amplía el radio o vuelve a intentarlo.</p>
              <Button variant="outline" size="sm" onClick={() => setRadius(r => Math.min(50, r + 10))}>
                Ampliar a {Math.min(50, radius + 10)} km
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{rides.length} solicitud(es) disponibles</p>
            <AnimatePresence>
              {rides.map(ride => (
                <motion.div key={ride.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-slate-900 text-lg">${ride.fare_estimated} MXN</p>
                          <p className="text-slate-500 text-sm">
                            {ride._distKm !== null && ride._distKm !== undefined
                              ? `${ride._distKm.toFixed(1)} km de ti`
                              : ride.distance_km ? `${ride.distance_km} km de ruta` : 'Distancia desconocida'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(ride.created_date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                          <span className="text-slate-700 truncate">{ride.origin_address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          <span className="text-slate-700 truncate">{ride.dest_address}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                        <User className="w-3.5 h-3.5" />
                        <span>{ride.passenger_name || 'Pasajero'}</span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleReject(ride)}
                          disabled={processing === ride.id}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Pasar
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleAccept(ride)}
                          disabled={processing === ride.id}
                        >
                          {processing === ride.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                          Aceptar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}