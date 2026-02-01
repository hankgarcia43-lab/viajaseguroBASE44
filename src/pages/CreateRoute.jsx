import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  MapPin, Clock, Users, DollarSign, Calendar, 
  ChevronRight, Loader2, CheckCircle, AlertCircle,
  Search, Train, Building, GraduationCap, Plane, Factory, Hospital
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const DAYS = [
  { id: 'lun', label: 'Lun' },
  { id: 'mar', label: 'Mar' },
  { id: 'mie', label: 'Mié' },
  { id: 'jue', label: 'Jue' },
  { id: 'vie', label: 'Vie' },
  { id: 'sab', label: 'Sáb' },
  { id: 'dom', label: 'Dom' },
];

const POI_ICONS = {
  metro: Train,
  terminal: Train,
  hospital: Hospital,
  universidad: GraduationCap,
  aeropuerto: Plane,
  industrial: Factory,
  centro: Building,
  default: MapPin
};

export default function CreateRoute() {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pois, setPois] = useState([]);
  const [step, setStep] = useState(1);
  
  const [selectingFor, setSelectingFor] = useState(null); // 'origin' or 'destination'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [routeData, setRouteData] = useState({
    origin: null,
    destination: null,
    originAddress: '',
    destAddress: '',
    days: ['lun', 'mar', 'mie', 'jue', 'vie'],
    departureTime: '07:00',
    totalSeats: 3,
    pricePerSeat: 0
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Check driver status
      const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
      if (drivers.length === 0) {
        toast.error('Debes registrarte como conductor primero');
        navigate(createPageUrl('DriverOnboarding'));
        return;
      }

      const driverData = drivers[0];
      setDriver(driverData);

      if (driverData.kyc_status !== 'approved') {
        toast.error('Tu verificación KYC debe estar aprobada para crear rutas');
        navigate(createPageUrl('DriverOnboarding'));
        return;
      }

      // Load POIs
      const poisData = await base44.entities.POI.filter({ active: true }, '-priority', 50);
      setPois(poisData);

    } catch (error) {
      console.error('Error loading data:', error);
      base44.auth.redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  const calculateSuggestedPrice = () => {
    if (!routeData.origin || !routeData.destination) return 0;
    
    // Calculate distance
    const R = 6371;
    const dLat = (routeData.destination.lat - routeData.origin.lat) * Math.PI / 180;
    const dLon = (routeData.destination.lng - routeData.origin.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(routeData.origin.lat * Math.PI / 180) * Math.cos(routeData.destination.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Suggested price: base + per km (for shared rides, lower than individual)
    const suggestedPrice = Math.round(15 + (distance * 4)); // Lower rate for shared
    return Math.max(25, Math.min(suggestedPrice, 150)); // Min 25, Max 150
  };

  const calculateDistance = () => {
    if (!routeData.origin || !routeData.destination) return 0;
    
    const R = 6371;
    const dLat = (routeData.destination.lat - routeData.origin.lat) * Math.PI / 180;
    const dLon = (routeData.destination.lng - routeData.origin.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(routeData.origin.lat * Math.PI / 180) * Math.cos(routeData.destination.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  const selectPOI = (poi) => {
    if (selectingFor === 'origin') {
      setRouteData({
        ...routeData,
        origin: { lat: poi.lat, lng: poi.lng, poiId: poi.id, poiName: poi.name },
        originAddress: poi.name
      });
    } else {
      setRouteData({
        ...routeData,
        destination: { lat: poi.lat, lng: poi.lng, poiId: poi.id, poiName: poi.name },
        destAddress: poi.name
      });
    }
    setSelectingFor(null);
    setSearchQuery('');
  };

  const filteredPois = pois.filter(poi => 
    poi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    poi.short_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    poi.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getPoiIcon = (poi) => {
    const tag = poi.tags?.[0] || 'default';
    const Icon = POI_ICONS[tag] || POI_ICONS.default;
    return Icon;
  };

  const handleSubmit = async () => {
    if (!routeData.origin || !routeData.destination) {
      toast.error('Selecciona origen y destino');
      return;
    }
    if (routeData.days.length === 0) {
      toast.error('Selecciona al menos un día');
      return;
    }
    if (routeData.pricePerSeat < 20) {
      toast.error('El precio mínimo es $20 MXN');
      return;
    }

    setSubmitting(true);
    try {
      const distance = calculateDistance();
      const duration = Math.round(parseFloat(distance) * 3); // ~3 min per km in traffic

      await base44.entities.Route.create({
        driver_id: driver.id,
        driver_name: driver.full_name,
        driver_phone: driver.phone,
        driver_photo: driver.profile_photo,
        driver_rating: driver.rating,
        vehicle_plate: driver.vehicle_plate,
        vehicle_model: driver.vehicle_model,
        vehicle_color: driver.vehicle_color,
        origin_poi_id: routeData.origin.poiId,
        origin_poi_name: routeData.origin.poiName,
        origin_lat: routeData.origin.lat,
        origin_lng: routeData.origin.lng,
        origin_address: routeData.originAddress,
        dest_poi_id: routeData.destination.poiId,
        dest_poi_name: routeData.destination.poiName,
        dest_lat: routeData.destination.lat,
        dest_lng: routeData.destination.lng,
        dest_address: routeData.destAddress,
        distance_km: parseFloat(distance),
        duration_min: duration,
        days_of_week: routeData.days,
        departure_time: routeData.departureTime,
        total_seats: routeData.totalSeats,
        price_per_seat: routeData.pricePerSeat,
        suggested_price: calculateSuggestedPrice(),
        status: 'active',
        is_recurring: true
      });

      toast.success('¡Ruta creada exitosamente!');
      navigate(createPageUrl('MyRoutes'));

    } catch (error) {
      toast.error('Error al crear la ruta');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (routeData.origin && routeData.destination && routeData.pricePerSeat === 0) {
      setRouteData(prev => ({ ...prev, pricePerSeat: calculateSuggestedPrice() }));
    }
  }, [routeData.origin, routeData.destination]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Crear ruta rápida</h1>
          <p className="text-slate-500">Publica tu ruta en menos de 1 minuto</p>
        </div>

        {/* KYC Status Alert */}
        {driver?.kyc_status !== 'approved' && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Tu verificación KYC debe estar aprobada para crear rutas.
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Origin & Destination */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Ruta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Origin */}
            <div
              onClick={() => setSelectingFor('origin')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                routeData.origin 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  routeData.origin ? 'bg-green-500' : 'bg-blue-100'
                }`}>
                  <MapPin className={`w-5 h-5 ${routeData.origin ? 'text-white' : 'text-blue-600'}`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 uppercase">Origen</p>
                  <p className="font-medium text-slate-900">
                    {routeData.originAddress || 'Seleccionar punto de salida'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>

            {/* Destination */}
            <div
              onClick={() => setSelectingFor('destination')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                routeData.destination 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  routeData.destination ? 'bg-green-500' : 'bg-green-100'
                }`}>
                  <MapPin className={`w-5 h-5 ${routeData.destination ? 'text-white' : 'text-green-600'}`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 uppercase">Destino</p>
                  <p className="font-medium text-slate-900">
                    {routeData.destAddress || 'Seleccionar destino'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>

            {/* Distance info */}
            {routeData.origin && routeData.destination && (
              <div className="flex items-center justify-center gap-4 py-2 text-sm text-slate-600">
                <span>📍 {calculateDistance()} km</span>
                <span>⏱️ ~{Math.round(parseFloat(calculateDistance()) * 3)} min</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Schedule */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Horario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Days */}
            <div>
              <Label className="text-sm text-slate-600 mb-2 block">Días de la semana</Label>
              <div className="flex gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.id}
                    onClick={() => {
                      const newDays = routeData.days.includes(day.id)
                        ? routeData.days.filter(d => d !== day.id)
                        : [...routeData.days, day.id];
                      setRouteData({ ...routeData, days: newDays });
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      routeData.days.includes(day.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div>
              <Label className="text-sm text-slate-600 mb-2 block">Hora de salida</Label>
              <Input
                type="time"
                value={routeData.departureTime}
                onChange={(e) => setRouteData({ ...routeData, departureTime: e.target.value })}
                className="text-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Capacity & Price */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Asientos y precio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seats */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm text-slate-600">Asientos disponibles</Label>
                <span className="text-2xl font-bold text-slate-900">{routeData.totalSeats}</span>
              </div>
              <Slider
                value={[routeData.totalSeats]}
                onValueChange={([value]) => setRouteData({ ...routeData, totalSeats: value })}
                max={6}
                min={1}
                step={1}
              />
              <p className="text-xs text-slate-500 mt-1">
                Deja asientos vacíos para tus propias necesidades
              </p>
            </div>

            {/* Price */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm text-slate-600">Precio por asiento</Label>
                <span className="text-2xl font-bold text-green-600">${routeData.pricePerSeat} MXN</span>
              </div>
              <Slider
                value={[routeData.pricePerSeat]}
                onValueChange={([value]) => setRouteData({ ...routeData, pricePerSeat: value })}
                max={200}
                min={20}
                step={5}
              />
              {calculateSuggestedPrice() > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  💡 Precio sugerido: ${calculateSuggestedPrice()} MXN basado en distancia
                </p>
              )}
            </div>

            {/* Earnings estimate */}
            {routeData.totalSeats > 0 && routeData.pricePerSeat > 0 && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <p className="text-sm text-green-700">
                  <strong>Ganancia potencial por viaje:</strong>
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ${Math.round(routeData.totalSeats * routeData.pricePerSeat * 0.8)} MXN
                </p>
                <p className="text-xs text-green-600">
                  (con todos los asientos vendidos, menos 20% comisión)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !routeData.origin || !routeData.destination || routeData.days.length === 0}
          className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-lg"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Publicar ruta
            </>
          )}
        </Button>
      </div>

      {/* POI Selection Sheet */}
      <Sheet open={!!selectingFor} onOpenChange={() => setSelectingFor(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>
              {selectingFor === 'origin' ? 'Punto de salida' : 'Destino'}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar punto clave..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-xl"
              />
            </div>

            {/* Popular POIs */}
            <p className="text-sm text-slate-500 mb-3">Puntos clave populares</p>
            
            <div className="space-y-2 max-h-[55vh] overflow-y-auto">
              {filteredPois.map((poi) => {
                const Icon = getPoiIcon(poi);
                return (
                  <button
                    key={poi.id}
                    onClick={() => selectPOI(poi)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      poi.tags?.includes('metro') ? 'bg-orange-100' :
                      poi.tags?.includes('hospital') ? 'bg-red-100' :
                      poi.tags?.includes('universidad') ? 'bg-blue-100' :
                      poi.tags?.includes('aeropuerto') ? 'bg-sky-100' :
                      poi.tags?.includes('industrial') ? 'bg-slate-100' :
                      'bg-purple-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        poi.tags?.includes('metro') ? 'text-orange-600' :
                        poi.tags?.includes('hospital') ? 'text-red-600' :
                        poi.tags?.includes('universidad') ? 'text-blue-600' :
                        poi.tags?.includes('aeropuerto') ? 'text-sky-600' :
                        poi.tags?.includes('industrial') ? 'text-slate-600' :
                        'text-purple-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{poi.short_name || poi.name}</p>
                      <p className="text-sm text-slate-500">{poi.name}</p>
                    </div>
                    {poi.priority >= 90 && (
                      <Badge className="bg-amber-100 text-amber-700">Popular</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}