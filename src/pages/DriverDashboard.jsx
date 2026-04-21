import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import MapView from '../components/map/MapView';
import { 
  Power, MapPin, Navigation, Clock, DollarSign, 
  Star, ChevronRight, AlertCircle, CheckCircle, X,
  Phone, MessageCircle, Loader2, Car, Shield, Route, Plus, Zap
} from 'lucide-react';
import { loadAppConfig } from '@/lib/useAppConfig';
import { calcCommission, getCommissionPct } from '@/lib/commissionCalc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function DriverDashboard() {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [todayStats, setTodayStats] = useState({ rides: 0, earnings: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Watch location when online
    if (isOnline && driver) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(loc);
          updateDriverLocation(loc);
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isOnline, driver]);

  useEffect(() => {
    // Listen for ride requests
    if (driver && isOnline) {
      const unsubscribe = base44.entities.DriverRequest.subscribe((event) => {
        if (event.data.driver_id === driver.id && event.data.status === 'pending') {
          loadPendingRequests();
        }
      });
      return () => unsubscribe();
    }
  }, [driver, isOnline]);

  useEffect(() => {
    // Listen for ride updates
    if (activeRide) {
      const unsubscribe = base44.entities.Ride.subscribe((event) => {
        if (event.data.id === activeRide.id) {
          setActiveRide(event.data);
        }
      });
      return () => unsubscribe();
    }
  }, [activeRide?.id]);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
      if (drivers.length === 0) {
        navigate(createPageUrl('DriverOnboarding'));
        return;
      }

      const driverData = drivers[0];
      setDriver(driverData);

      if (driverData.kyc_status !== 'approved') {
        navigate(createPageUrl('DriverOnboarding'));
        return;
      }

      setIsOnline(driverData.status === 'online');

      // Load active ride if any
      const rides = await base44.entities.Ride.filter(
        { driver_id: driverData.id, status: 'assigned' },
        '-created_date',
        1
      );
      if (rides.length > 0) {
        setActiveRide(rides[0]);
      }

      const inProgressRides = await base44.entities.Ride.filter(
        { driver_id: driverData.id, status: 'in_progress' },
        '-created_date',
        1
      );
      if (inProgressRides.length > 0) {
        setActiveRide(inProgressRides[0]);
      }

      // Load pending requests
      await loadPendingRequests(driverData.id);

      // Load today's stats
      await loadTodayStats(driverData.id);

      // Get current location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        }
      );

    } catch (error) {
      console.error('Error loading data:', error);
      base44.auth.redirectToLogin(createPageUrl('WelcomeChofer'));
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async (driverId = driver?.id) => {
    if (!driverId) return;
    
    const requests = await base44.entities.DriverRequest.filter(
      { driver_id: driverId, status: 'pending' },
      '-created_date',
      5
    );

    // Load ride details for each request
    const allRideIds = [...new Set(requests.map(r => r.ride_id))];
    const allRidesRaw = await base44.entities.Ride.list('-created_date', 100);
    const ridesMap = {};
    allRidesRaw.forEach(r => { ridesMap[r.id] = r; });

    const requestsWithRides = requests.map(req => ({
      ...req,
      ride: ridesMap[req.ride_id]
    }));

    setPendingRequests(requestsWithRides.filter(r => r.ride && r.ride.status === 'searching'));
  };

  const loadTodayStats = async (driverId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rides = await base44.entities.Ride.filter(
      { driver_id: driverId, status: 'completed' },
      '-completed_at',
      100
    );

    const todayRides = rides.filter(r => new Date(r.completed_at) >= today);
    const earnings = todayRides.reduce((sum, r) => sum + (r.fare_final || r.fare_estimated || 0), 0);

    setTodayStats({
      rides: todayRides.length,
      earnings: earnings
    });
  };

  const updateDriverLocation = async (location) => {
    if (!driver) return;
    
    await base44.entities.Driver.update(driver.id, {
      current_location_lat: location.lat,
      current_location_lng: location.lng,
      last_location_update: new Date().toISOString()
    });
  };

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);

    try {
      await base44.entities.Driver.update(driver.id, {
        status: newStatus ? 'online' : 'offline'
      });
      toast.success(newStatus ? '¡Estás en línea!' : 'Ahora estás desconectado');
    } catch (error) {
      setIsOnline(!newStatus);
      toast.error('Error al cambiar estado');
    }
  };

  const handleAcceptRide = async (request) => {
    try {
      // Update request status
      await base44.entities.DriverRequest.update(request.id, {
        status: 'accepted',
        responded_at: new Date().toISOString()
      });

      // Update ride with driver info
      await base44.entities.Ride.update(request.ride.id, {
        status: 'assigned',
        driver_id: driver.id,
        driver_name: driver.full_name,
        driver_phone: driver.phone,
        driver_photo: driver.profile_photo,
        vehicle_plate: driver.vehicle_plate,
        vehicle_model: driver.vehicle_model,
        vehicle_color: driver.vehicle_color,
        assigned_at: new Date().toISOString()
      });

      // Update driver status to busy
      await base44.entities.Driver.update(driver.id, { status: 'busy' });
      setIsOnline(false);

      // Reject other pending requests for this ride
      const otherRequests = await base44.entities.DriverRequest.filter({
        ride_id: request.ride.id,
        status: 'pending'
      });
      for (const req of otherRequests) {
        await base44.entities.DriverRequest.update(req.id, { status: 'cancelled' });
      }

      // Create notification for passenger
      await base44.entities.Notification.create({
        user_id: request.ride.passenger_id,
        type: 'ride_assigned',
        title: '¡Conductor asignado!',
        message: `${driver.full_name} va en camino. ${driver.vehicle_model} - ${driver.vehicle_plate}`,
        ride_id: request.ride.id
      });

      setActiveRide({ ...request.ride, status: 'assigned' });
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      toast.success('¡Viaje aceptado!');

    } catch (error) {
      toast.error('Error al aceptar viaje');
      console.error(error);
    }
  };

  const handleRejectRide = async (request) => {
    try {
      await base44.entities.DriverRequest.update(request.id, {
        status: 'rejected',
        responded_at: new Date().toISOString()
      });
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      toast.info('Viaje rechazado');
    } catch (error) {
      toast.error('Error al rechazar viaje');
    }
  };

  const handleStartRide = async () => {
    if (!activeRide) return;

    try {
      await base44.entities.Ride.update(activeRide.id, {
        status: 'in_progress',
        started_at: new Date().toISOString()
      });

      await base44.entities.Notification.create({
        user_id: activeRide.passenger_id,
        type: 'ride_started',
        title: 'Viaje iniciado',
        message: 'Tu viaje ha comenzado',
        ride_id: activeRide.id
      });

      setActiveRide({ ...activeRide, status: 'in_progress' });
      toast.success('Viaje iniciado');
    } catch (error) {
      toast.error('Error al iniciar viaje');
    }
  };

  const handleCompleteRide = async () => {
    if (!activeRide) return;

    try {
      const appConfig = await loadAppConfig();
      const commPct = getCommissionPct(appConfig, 'quick_ride');
      const retentionMins = typeof appConfig.retention_window_minutes === 'number' ? appConfig.retention_window_minutes : 10;

      const fareFinal = activeRide.fare_estimated;
      const { platformFee, driverNet: driverPayout } = calcCommission(fareFinal, commPct);
      const retentionEnds = new Date(Date.now() + retentionMins * 60 * 1000).toISOString();

      await base44.entities.Ride.update(activeRide.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        fare_final: fareFinal
      });

      await base44.entities.Payment.create({
        ride_id: activeRide.id,
        passenger_id: activeRide.passenger_id,
        driver_id: driver.id,
        amount: fareFinal,
        fee_platform: platformFee,
        fee_percentage: commPct,
        payout_driver: driverPayout,
        status: 'pending_capture',
        retention_window_ends: retentionEnds
      });

      await base44.entities.Driver.update(driver.id, {
        status: 'online',
        total_rides: (driver.total_rides || 0) + 1,
        earnings_balance: (driver.earnings_balance || 0) + driverPayout,
        total_earnings: (driver.total_earnings || 0) + driverPayout,
      });

      await base44.entities.Notification.create({
        user_id: activeRide.passenger_id,
        type: 'ride_completed',
        title: 'Viaje completado',
        message: `Total: $${fareFinal} MXN. Gracias por viajar con Viaja Seguro.`,
        ride_id: activeRide.id
      });

      setActiveRide(null);
      setIsOnline(true);
      loadTodayStats(driver.id);
      toast.success(`¡Viaje completado! Ganaste $${driverPayout} MXN`);

    } catch (error) {
      toast.error('Error al completar viaje');
      console.error(error);
    }
  };

  const openNavigation = () => {
    if (!activeRide) return;
    
    const dest = activeRide.status === 'assigned' 
      ? { lat: activeRide.origin_lat, lng: activeRide.origin_lng }
      : { lat: activeRide.dest_lat, lng: activeRide.dest_lng };
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Map */}
      <div className="h-[40vh] relative">
        <MapView
          origin={activeRide ? { lat: activeRide.origin_lat, lng: activeRide.origin_lng } : null}
          destination={activeRide ? { lat: activeRide.dest_lat, lng: activeRide.dest_lng } : null}
          driverLocation={currentLocation}
          center={currentLocation || { lat: 19.4326, lng: -99.1332 }}
          interactive={false}
          className="h-full"
        />

        {/* Online Status Toggle */}
        <div className="absolute top-4 left-4 z-[1000]">
          <Card className={`border-0 shadow-lg ${isOnline ? 'bg-green-500' : 'bg-slate-800'}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <Switch
                checked={isOnline}
                onCheckedChange={toggleOnlineStatus}
                disabled={!!activeRide}
              />
              <span className="font-medium text-white">
                {isOnline ? 'En línea' : 'Desconectado'}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 min-h-[60vh] shadow-2xl">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3" />

        <AnimatePresence mode="wait">
          {/* No Active Ride */}
          {!activeRide && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              {/* Today Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0">
                  <CardContent className="p-4 text-center">
                    <Car className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{todayStats.rides}</p>
                    <p className="text-sm text-slate-500">Viajes hoy</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">${todayStats.earnings}</p>
                    <p className="text-sm text-slate-500">Ganado hoy</p>
                  </CardContent>
                </Card>
              </div>

              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900">Solicitudes de viaje</h3>
                  {pendingRequests.map((request) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-4 text-white"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-lg">${request.ride?.fare_estimated} MXN</p>
                          <p className="text-white/80 text-sm">
                            {request.ride?.distance_km} km • {request.ride?.duration_min} min
                          </p>
                        </div>
                        <Badge className="bg-white/20 text-white">
                          {request.distance_to_pickup?.toFixed(1)} km de ti
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-300" />
                          <span className="text-sm truncate">{request.ride?.origin_address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-red-300" />
                          <span className="text-sm truncate">{request.ride?.dest_address}</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleRejectRide(request)}
                          variant="outline"
                          className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Rechazar
                        </Button>
                        <Button
                          onClick={() => handleAcceptRide(request)}
                          className="flex-1 bg-white text-blue-600 hover:bg-white/90"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Aceptar
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Quick Actions - Routes */}
              {driver?.kyc_status === 'approved' && (
                <div className="mb-6">
                  <h3 className="font-bold text-slate-900 mb-3">Rutas compartidas</h3>
                  <Link to={createPageUrl('CreateRoute')}>
                    <Card className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                          <Plus className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold">Crear ruta rápida</p>
                          <p className="text-white/80 text-sm">Publica tu ruta en menos de 1 minuto</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/60" />
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to={createPageUrl('MyRoutes')} className="block mt-2">
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Route className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">Ver mis rutas</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to={createPageUrl('DriverQuickRequests')} className="block mt-2">
                    <Card className="hover:shadow-md transition-shadow border-orange-100">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">Viajes rápidos cercanos</p>
                          <p className="text-xs text-slate-500">Ver solicitudes disponibles</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              )}

              {/* No requests */}
              {pendingRequests.length === 0 && isOnline && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                    <Car className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">En espera de solicitudes</h3>
                  <p className="text-slate-500 text-sm">Te avisaremos en cuanto llegue una solicitud de viaje.</p>
                </div>
              )}

              {/* Offline message */}
              {!isOnline && !activeRide && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Power className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Estás desconectado</h3>
                  <p className="text-slate-500">Activa el interruptor de arriba para recibir solicitudes de viaje.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Active Ride */}
          {activeRide && (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Badge className={
                    activeRide.status === 'assigned' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }>
                    {activeRide.status === 'assigned' ? 'Ir a recoger' : 'En viaje'}
                  </Badge>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    {activeRide.passenger_name}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">${activeRide.fare_estimated}</p>
                  <p className="text-sm text-slate-500">MXN</p>
                </div>
              </div>

              {/* Route info */}
              <Card className="mb-4">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">RECOGER EN</p>
                      <p className="font-medium text-slate-900">{activeRide.origin_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">DESTINO</p>
                      <p className="font-medium text-slate-900">{activeRide.dest_address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="space-y-3">
                <Button
                  onClick={openNavigation}
                  variant="outline"
                  className="w-full h-12 rounded-xl"
                >
                  <Navigation className="w-5 h-5 mr-2" />
                  Abrir navegación
                </Button>

                {activeRide.status === 'assigned' && (
                  <Button
                    onClick={handleStartRide}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-lg"
                  >
                    <Car className="w-5 h-5 mr-2" />
                    Iniciar viaje
                  </Button>
                )}

                {activeRide.status === 'in_progress' && (
                  <Button
                    onClick={handleCompleteRide}
                    className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl text-lg"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Completar viaje
                  </Button>
                )}
              </div>

              {/* Contact buttons */}
              <div className="flex gap-3 mt-4">
                <a
                  href={`tel:${activeRide.passenger_phone}`}
                  className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-100 rounded-xl text-slate-700"
                >
                  <Phone className="w-5 h-5" />
                  Llamar
                </a>
                <a
                  href={`sms:${activeRide.passenger_phone}`}
                  className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-100 rounded-xl text-slate-700"
                >
                  <MessageCircle className="w-5 h-5" />
                  Mensaje
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}