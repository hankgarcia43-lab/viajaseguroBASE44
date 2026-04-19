import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Search, Loader2, Car, Star, Clock,
  ChevronRight, Navigation, Zap, AlertCircle, Phone
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { loadAppConfig } from '@/lib/useAppConfig';

const POIS = [
  { name: 'Metro Cuatro Caminos', zone: 'cdmx', icon: '🚇' },
  { name: 'Metro Politécnico', zone: 'cdmx', icon: '🚇' },
  { name: 'Metro Indios Verdes', zone: 'cdmx', icon: '🚇' },
  { name: 'AICM Terminal 1', zone: 'cdmx', icon: '✈️' },
  { name: 'Hospital La Raza', zone: 'cdmx', icon: '🏥' },
  { name: 'Hospital 20 de Noviembre', zone: 'cdmx', icon: '🏥' },
  { name: 'Santa Fe', zone: 'cdmx', icon: '🏢' },
  { name: 'Centro Histórico CDMX', zone: 'cdmx', icon: '🏛️' },
  { name: 'Ecatepec Centro', zone: 'edomex', icon: '🏙️' },
  { name: 'Tlalnepantla Centro', zone: 'edomex', icon: '🏙️' },
];

export default function QuickRide() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('origin'); // origin | dest | results | confirm
  const [origin, setOrigin] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [selectedDest, setSelectedDest] = useState(null);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [booking, setBooking] = useState(false);
  const [config, setConfig] = useState({ commission_quick_ride: 20, base_fare: 12, per_km_rate: 8, min_fare: 35 });
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => base44.auth.redirectToLogin());
    loadAppConfig().then(setConfig);
  }, []);

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setLocating(false);
        setStep('dest');
        toast.success('Ubicación detectada');
      },
      () => {
        setLocating(false);
        toast.error('No se pudo obtener la ubicación. Escríbela manualmente.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const filteredPois = destSearch
    ? POIS.filter(p => p.name.toLowerCase().includes(destSearch.toLowerCase()))
    : POIS;

  const searchDrivers = async () => {
    if (!selectedDest) { toast.error('Selecciona un destino'); return; }
    setLoading(true);
    try {
      const drivers = await base44.entities.Driver.filter({ status: 'online', kyc_status: 'approved' });
      setAvailableDrivers(drivers.slice(0, 5));
      setStep('results');
    } catch { toast.error('Error al buscar conductores'); }
    finally { setLoading(false); }
  };

  const estimateFare = () => {
    const km = 15; // estimated avg distance
    const fare = Math.max(config.min_fare, config.base_fare + (km * (config.per_km_rate || 8)));
    return Math.round(fare);
  };

  const handleBook = async () => {
    if (!selectedDriver || !user) return;
    setBooking(true);
    try {
      const fare = estimateFare();
      const commission = Math.round(fare * (config.commission_quick_ride / 100));
      const driverPayout = fare - commission;

      const ride = await base44.entities.Ride.create({
        passenger_id: user.id,
        passenger_name: user.full_name || user.email,
        passenger_phone: user.phone || '',
        driver_id: selectedDriver.id,
        driver_name: selectedDriver.full_name,
        driver_phone: selectedDriver.phone,
        driver_photo: selectedDriver.profile_photo,
        vehicle_plate: selectedDriver.vehicle_plate,
        vehicle_model: selectedDriver.vehicle_model,
        vehicle_color: selectedDriver.vehicle_color,
        origin_address: origin,
        dest_address: selectedDest.name,
        fare_estimated: fare,
        status: 'confirmed',
        requested_at: new Date().toISOString(),
      });

      await base44.entities.Notification.create({
        user_id: selectedDriver.user_id || selectedDriver.id,
        type: 'ride_request',
        title: '¡Viaje rápido solicitado!',
        message: `${user.full_name || 'Pasajero'} solicita ir a ${selectedDest.name}. Tarifa estimada: $${fare} MXN`,
        ride_id: ride.id,
      });

      toast.success('Viaje solicitado. El conductor recibirá tu solicitud.');
      navigate(createPageUrl('MyBookings'));
    } catch { toast.error('Error al solicitar viaje'); }
    finally { setBooking(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Viaje rápido</h1>
            <p className="text-sm text-slate-500">Para cuando necesitas ir ya</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step: Origin */}
          {step === 'origin' && (
            <motion.div key="origin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="mb-4">
                <CardContent className="p-5">
                  <p className="font-semibold text-slate-900 mb-3">¿Dónde estás ahora?</p>
                  <Button onClick={getLocation} disabled={locating} className="w-full mb-3 bg-blue-600 hover:bg-blue-700">
                    {locating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Navigation className="w-4 h-4 mr-2" />}
                    Usar mi ubicación actual
                  </Button>
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span>o escribe la dirección</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <Input
                    placeholder="Calle, colonia, referencia..."
                    value={origin}
                    onChange={e => setOrigin(e.target.value)}
                    className="mb-3"
                  />
                  <Button
                    onClick={() => { if (origin.trim()) setStep('dest'); else toast.error('Ingresa tu origen'); }}
                    className="w-full"
                    variant="outline"
                    disabled={!origin.trim()}
                  >
                    Continuar
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              <a href="tel:911">
                <Button variant="ghost" size="sm" className="w-full text-slate-400 hover:text-red-600">
                  <Phone className="w-3 h-3 mr-1" /> Emergencias 911
                </Button>
              </a>
            </motion.div>
          )}

          {/* Step: Destination */}
          {step === 'dest' && (
            <motion.div key="dest" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-800 font-medium">{origin}</span>
              </div>
              <Card className="mb-4">
                <CardContent className="p-4">
                  <p className="font-semibold text-slate-900 mb-3">¿A dónde vas?</p>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Buscar destino..."
                      value={destSearch}
                      onChange={e => setDestSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredPois.map(poi => (
                      <button
                        key={poi.name}
                        onClick={() => { setSelectedDest(poi); setDestSearch(poi.name); }}
                        className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${
                          selectedDest?.name === poi.name ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <span className="text-xl">{poi.icon}</span>
                        <span className="font-medium text-slate-800 text-sm">{poi.name}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Button onClick={searchDrivers} disabled={!selectedDest || loading} className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Buscar conductores
              </Button>
            </motion.div>
          )}

          {/* Step: Results */}
          {step === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-slate-900">{availableDrivers.length} conductor(es) disponibles</p>
                  <p className="text-sm text-slate-500">Hacia {selectedDest?.name}</p>
                </div>
                <Badge className="bg-orange-100 text-orange-700">
                  ~${estimateFare()} MXN
                </Badge>
              </div>

              {availableDrivers.length === 0 ? (
                <Alert className="border-amber-200 bg-amber-50 mb-4">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    No hay conductores disponibles cerca. Intenta en unos minutos o busca rutas recurrentes.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3 mb-4">
                  {availableDrivers.map(d => (
                    <Card
                      key={d.id}
                      className={`cursor-pointer transition-all ${selectedDriver?.id === d.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
                      onClick={() => setSelectedDriver(d)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                          {d.profile_photo
                            ? <img src={d.profile_photo} alt="" className="w-full h-full object-cover" />
                            : <Car className="w-6 h-6 text-slate-300 m-3" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{d.full_name}</p>
                          <p className="text-sm text-slate-500">{d.vehicle_model} · {d.vehicle_plate}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-slate-600">{d.rating?.toFixed(1) || '5.0'}</span>
                          </div>
                        </div>
                        {selectedDriver?.id === d.id && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {selectedDriver && (
                <Button onClick={handleBook} disabled={booking} className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-base font-bold">
                  {booking ? <Loader2 className="w-5 h-5 animate-spin" /> : `Solicitar viaje · $${estimateFare()} MXN`}
                </Button>
              )}
              <Button variant="ghost" size="sm" className="w-full mt-2 text-slate-500" onClick={() => setStep('dest')}>
                ← Cambiar destino
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}