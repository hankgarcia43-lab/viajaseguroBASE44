import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import MapView from '../components/map/MapView';
import { 
  MapPin, Navigation, Search, X, Loader2, 
  Clock, DollarSign, Car, ChevronRight, AlertCircle, MessageCircle, CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Pricing config (from AppConfig in production)
const PRICING = {
  baseFare: 12, // MXN
  perKm: 8, // MXN
  perMin: 1.5, // MXN
  minFare: 35, // MXN
};

export default function RequestRide() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('input'); // input, confirming, confirmed, whatsapp_payment, assigned
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [originAddress, setOriginAddress] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [searchingInput, setSearchingInput] = useState(null); // 'origin' or 'dest'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ride, setRide] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    // Real-time ride updates
    if (ride?.id) {
      const unsubscribe = base44.entities.Ride.subscribe((event) => {
        if (event.data.id === ride.id) {
          setRide(event.data);
          if (event.data.status === 'assigned' || event.data.status === 'driver_arriving') {
            setStep('assigned');
          }
        }
      });
      return () => unsubscribe();
    }
  }, [ride?.id]);

  useEffect(() => {
    if (searchTimeout > 0) {
      const timer = setTimeout(() => setSearchTimeout(searchTimeout - 1), 1000);
      return () => clearTimeout(timer);
    } else if (searchTimeout === 0 && step === 'searching') {
      // Timeout - no drivers available
      handleSearchTimeout();
    }
  }, [searchTimeout, step]);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      base44.auth.redirectToLogin();
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setOrigin(loc);
          reverseGeocode(loc, 'origin');
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to CDMX center
          setOrigin({ lat: 19.4326, lng: -99.1332 });
        }
      );
    }
  };

  const reverseGeocode = async (coords, type) => {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Convierte estas coordenadas a una dirección legible en español: lat ${coords.lat}, lng ${coords.lng}. 
        Responde solo con la dirección, colonia y delegación/municipio. Ejemplo: "Av. Reforma 505, Cuauhtémoc, CDMX"`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            address: { type: 'string' }
          }
        }
      });
      
      if (result.address) {
        if (type === 'origin') {
          setOriginAddress(result.address);
        } else {
          setDestAddress(result.address);
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const searchAddress = async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Busca hasta 5 direcciones en Ciudad de México que coincidan con: "${query}". 
        Incluye coordenadas aproximadas para cada resultado.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  address: { type: 'string' },
                  lat: { type: 'number' },
                  lng: { type: 'number' }
                }
              }
            }
          }
        }
      });

      if (result.results) {
        setSearchResults(result.results);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const selectAddress = (result) => {
    const coords = { lat: result.lat, lng: result.lng };
    if (searchingInput === 'origin') {
      setOrigin(coords);
      setOriginAddress(result.address);
    } else {
      setDestination(coords);
      setDestAddress(result.address);
    }
    setSearchingInput(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const calculateEstimate = () => {
    if (!origin || !destination) return null;

    // Calculate distance using Haversine formula
    const R = 6371; // km
    const dLat = (destination.lat - origin.lat) * Math.PI / 180;
    const dLon = (destination.lng - origin.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Estimate time (assuming 20 km/h average in city traffic)
    const duration = (distance / 20) * 60; // minutes

    // Calculate fare
    let fare = PRICING.baseFare + (distance * PRICING.perKm) + (duration * PRICING.perMin);
    fare = Math.max(fare, PRICING.minFare);

    return {
      distance: distance.toFixed(1),
      duration: Math.ceil(duration),
      fare: Math.ceil(fare)
    };
  };

  useEffect(() => {
    if (origin && destination) {
      setEstimate(calculateEstimate());
    }
  }, [origin, destination]);

  const handleRequestRide = async () => {
    if (!origin || !destination || !estimate) {
      toast.error('Selecciona origen y destino');
      return;
    }

    setLoading(true);
    setStep('confirming');
    
    try {
      // Create ride with pending status
      const newRide = await base44.entities.Ride.create({
        passenger_id: user.id,
        passenger_name: user.full_name,
        passenger_phone: user.phone || '',
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        origin_address: originAddress,
        dest_lat: destination.lat,
        dest_lng: destination.lng,
        dest_address: destAddress,
        distance_km: parseFloat(estimate.distance),
        duration_min: estimate.duration,
        fare_estimated: estimate.fare,
        status: 'requested',
        requested_at: new Date().toISOString()
      });

      setRide(newRide);

      // Simulate availability check (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Confirm ride
      const confirmedRide = await base44.entities.Ride.update(newRide.id, {
        status: 'confirmed'
      });

      setRide(confirmedRide);
      setStep('confirmed');
      toast.success('¡Viaje confirmado!');

    } catch (error) {
      toast.error('Error al solicitar viaje');
      console.error(error);
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const findNearbyDrivers = async (rideData) => {
    try {
      // Get active drivers
      const drivers = await base44.entities.Driver.filter({ 
        kyc_status: 'approved',
        status: 'online'
      });

      if (drivers.length === 0) {
        return;
      }

      // Calculate distance and filter by radius
      const nearbyDrivers = drivers
        .map(driver => {
          if (!driver.current_location_lat || !driver.current_location_lng) return null;
          
          const R = 6371;
          const dLat = (driver.current_location_lat - rideData.origin_lat) * Math.PI / 180;
          const dLon = (driver.current_location_lng - rideData.origin_lng) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(rideData.origin_lat * Math.PI / 180) * Math.cos(driver.current_location_lat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;

          return { ...driver, distance };
        })
        .filter(d => d && d.distance <= (rideData.search_radius_km || 3))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);

      if (nearbyDrivers.length === 0) {
        return;
      }

      // Create driver requests
      for (const driver of nearbyDrivers) {
        await base44.entities.DriverRequest.create({
          ride_id: rideData.id,
          driver_id: driver.id,
          status: 'pending',
          notified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 15000).toISOString(), // 15s timeout
          distance_to_pickup: driver.distance
        });

        // Create notification for driver
        await base44.entities.Notification.create({
          user_id: driver.user_id,
          type: 'ride_request',
          title: '¡Nueva solicitud de viaje!',
          message: `${rideData.origin_address} → ${rideData.dest_address}`,
          ride_id: rideData.id,
          data: JSON.stringify({
            fare: rideData.fare_estimated,
            distance: rideData.distance_km
          })
        });
      }

      // Update ride with notified drivers
      await base44.entities.Ride.update(rideData.id, {
        notified_drivers: nearbyDrivers.map(d => d.id)
      });

    } catch (error) {
      console.error('Error finding drivers:', error);
    }
  };

  const handleSearchTimeout = async () => {
    if (!ride) return;

    // Expand search radius
    const currentRadius = ride.search_radius_km || 3;
    if (currentRadius < 15) {
      const newRadius = Math.min(currentRadius + 5, 15);
      await base44.entities.Ride.update(ride.id, { search_radius_km: newRadius });
      setRide({ ...ride, search_radius_km: newRadius });
      setSearchTimeout(45);
      toast.info(`Expandiendo búsqueda a ${newRadius} km...`);
      await findNearbyDrivers({ ...ride, search_radius_km: newRadius });
    } else {
      // No drivers available
      await base44.entities.Ride.update(ride.id, { status: 'cancelled', cancel_reason: 'No hay conductores disponibles' });
      toast.error('No hay conductores disponibles en este momento');
      setStep('input');
      setRide(null);
    }
  };

  const handleCancelSearch = async () => {
    if (ride) {
      await base44.entities.Ride.update(ride.id, { 
        status: 'cancelled',
        cancelled_by: 'passenger',
        cancel_reason: 'Cancelado por pasajero'
      });
    }
    setStep('input');
    setRide(null);
    setSearchTimeout(0);
  };

  const openGoogleMapsNavigation = () => {
    if (ride) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${ride.dest_lat},${ride.dest_lng}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Map */}
      <div className="h-[50vh] relative">
        <MapView
          origin={origin}
          destination={destination}
          setOrigin={step === 'input' ? setOrigin : null}
          setDestination={step === 'input' ? setDestination : null}
          driverLocation={ride?.driver_id ? { lat: ride.origin_lat, lng: ride.origin_lng } : null}
          center={origin}
          interactive={step === 'input'}
          className="h-full"
        />

        {/* My Location Button */}
        <button
          onClick={getCurrentLocation}
          className="absolute bottom-4 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center z-[1000]"
        >
          <Navigation className="w-5 h-5 text-blue-600" />
        </button>
      </div>

      {/* Bottom Sheet */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 min-h-[50vh] shadow-2xl">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3" />

        <AnimatePresence mode="wait">
          {/* Input Step */}
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">¿A dónde vas?</h2>
                <p className="text-sm text-slate-500">Precio claro desde el inicio</p>
              </div>

              {/* Origin Input */}
              <div 
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl mb-3 cursor-pointer"
                onClick={() => setSearchingInput('origin')}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Origen</p>
                  <p className="font-medium text-slate-900 truncate">
                    {originAddress || 'Selecciona punto de recogida'}
                  </p>
                </div>
              </div>

              {/* Destination Input */}
              <div 
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer"
                onClick={() => setSearchingInput('dest')}
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Destino</p>
                  <p className="font-medium text-slate-900 truncate">
                    {destAddress || 'Selecciona tu destino'}
                  </p>
                </div>
              </div>

              {/* Estimate */}
              {estimate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6"
                >
                  <Card className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-xs text-slate-500">Distancia</p>
                            <p className="font-bold text-slate-900">{estimate.distance} km</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-slate-500">Tiempo</p>
                            <p className="font-bold text-slate-900">{estimate.duration} min</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Precio final</p>
                          <p className="text-2xl font-bold text-blue-600">${estimate.fare} MXN</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                    <p className="text-sm font-medium text-amber-800 text-center">
                      💳 El pago es previo para confirmar el viaje
                    </p>
                  </div>

                  <Button
                    onClick={handleRequestRide}
                    disabled={loading || !origin || !destination}
                    className="w-full mt-3 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-lg"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Solicitar viaje
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Confirming Step */}
          {step === 'confirming' && (
            <motion.div
              key="confirming"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
                <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
              </div>
              
              <h2 className="text-xl font-bold text-slate-900 mb-2">Confirmando viaje...</h2>
              <p className="text-slate-500 mb-4">Verificando disponibilidad</p>
              
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Origen</span>
                  <span className="text-slate-900 font-medium truncate ml-2">{originAddress?.substring(0, 30)}...</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Destino</span>
                  <span className="text-slate-900 font-medium truncate ml-2">{destAddress?.substring(0, 30)}...</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span className="text-slate-600">Precio</span>
                  <span className="text-blue-600 font-bold text-lg">${estimate?.fare} MXN</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Confirmed Step */}
          {step === 'confirmed' && (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">¡Viaje confirmado!</h2>
              <p className="text-slate-600 text-center mb-6">
                Tu viaje ha sido aceptado en la app
              </p>

              <Card className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-0">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Origen</span>
                      <span className="text-sm font-medium text-slate-900 text-right truncate ml-2">{originAddress}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Destino</span>
                      <span className="text-sm font-medium text-slate-900 text-right truncate ml-2">{destAddress}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-blue-200">
                      <span className="text-slate-700 font-medium">Precio total</span>
                      <span className="font-bold text-2xl text-blue-600">${estimate?.fare} MXN</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-amber-900 font-medium mb-1">💳 Siguiente paso: Pago</p>
                <p className="text-xs text-amber-800">
                  Continúa por WhatsApp para recibir los datos de pago y coordinar con el operador.
                </p>
              </div>

              <a
                href={`https://wa.me/5215574510969?text=${encodeURIComponent(
                  `Hola, mi viaje ya fue aceptado en la app y quiero continuar con el proceso de pago.\n\n` +
                  `📍 Origen: ${originAddress}\n` +
                  `📍 Destino: ${destAddress}\n` +
                  `💰 Precio confirmado: $${estimate?.fare} MXN\n` +
                  `🆔 ID de viaje: ${ride?.id}\n\n` +
                  `Nombre: ${user?.full_name}\n` +
                  `Teléfono: ${user?.phone || 'No proporcionado'}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button className="w-full h-14 bg-green-600 hover:bg-green-700 rounded-xl text-lg">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Continuar por WhatsApp
                </Button>
              </a>

              <Button
                variant="outline"
                onClick={() => {
                  setStep('input');
                  setRide(null);
                }}
                className="w-full mt-3 h-12 rounded-xl"
              >
                Cancelar viaje
              </Button>
            </motion.div>
          )}

          {/* Searching Step */}
          {step === 'searching' && (
            <motion.div
              key="searching"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
                <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
              </div>
              
              <h2 className="text-xl font-bold text-slate-900 mb-2">Buscando conductor...</h2>
              <p className="text-slate-500 mb-6">
                Radio de búsqueda: {ride?.search_radius_km || 3} km
              </p>

              <div className="flex items-center justify-center gap-2 text-slate-600 mb-8">
                <Clock className="w-5 h-5" />
                <span className="text-lg font-medium">{searchTimeout}s</span>
              </div>

              <Button
                variant="outline"
                onClick={handleCancelSearch}
                className="w-full h-12 rounded-xl"
              >
                <X className="w-5 h-5 mr-2" />
                Cancelar búsqueda
              </Button>
            </motion.div>
          )}

          {/* Assigned Step */}
          {step === 'assigned' && ride && (
            <motion.div
              key="assigned"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden">
                  {ride.driver_photo ? (
                    <img src={ride.driver_photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">{ride.driver_name}</h3>
                  <p className="text-slate-500">{ride.vehicle_model} • {ride.vehicle_color}</p>
                  <p className="text-lg font-bold text-slate-900">{ride.vehicle_plate}</p>
                </div>
              </div>

              <Card className="mb-4 bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700">Tu conductor va en camino</p>
                      <p className="text-2xl font-bold text-green-800">
                        {ride.status === 'in_progress' ? 'En viaje' : 'Llegando...'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-700">Tarifa</p>
                      <p className="text-xl font-bold text-green-800">${ride.fare_estimated} MXN</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Origen</p>
                    <p className="font-medium text-slate-900 truncate">{ride.origin_address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">Destino</p>
                    <p className="font-medium text-slate-900 truncate">{ride.dest_address}</p>
                  </div>
                </div>
              </div>

              {ride.status === 'completed' && (
                <Button
                  onClick={() => navigate(createPageUrl('RateRide') + `?rideId=${ride.id}`)}
                  className="w-full mt-6 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-lg"
                >
                  Calificar viaje
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Address Search Sheet */}
      <Sheet open={!!searchingInput} onOpenChange={() => setSearchingInput(null)}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>
              {searchingInput === 'origin' ? 'Punto de recogida' : 'Tu destino'}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar dirección..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchAddress(e.target.value);
                }}
                className="pl-12 h-12 rounded-xl"
                autoFocus
              />
            </div>

            <div className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto">
              {/* Current location option */}
              {searchingInput === 'origin' && (
                <button
                  onClick={() => {
                    getCurrentLocation();
                    setSearchingInput(null);
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Navigation className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-slate-900">Usar mi ubicación actual</span>
                </button>
              )}

              {/* Search results */}
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => selectAddress(result)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-slate-500" />
                  </div>
                  <span className="font-medium text-slate-900">{result.address}</span>
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}