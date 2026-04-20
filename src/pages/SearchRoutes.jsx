import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  MapPin, Clock, Users, DollarSign, Star, Search,
  ChevronRight, Loader2, Calendar, Filter, Car,
  Train, Building, GraduationCap, Plane, Factory, Hospital
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import PullToRefresh from '../components/PullToRefresh';

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

export default function SearchRoutes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [pois, setPois] = useState([]);
  const [selectingFor, setSelectingFor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filters, setFilters] = useState({
    origin: null,
    destination: null,
    date: format(new Date(), 'yyyy-MM-dd'),
    time: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Load POIs
      const poisData = await base44.entities.POI.filter({ active: true }, '-priority', 50);
      setPois(poisData);

      // Load all active routes initially
      await searchRoutes();

    } catch (error) {
      console.error('Error loading data:', error);
      base44.auth.redirectToLogin(createPageUrl('WelcomePasajero'));
    } finally {
      setLoading(false);
    }
  };

  const searchRoutes = async () => {
    setSearching(true);
    try {
      let allRoutes = await base44.entities.Route.filter({ status: 'active' }, '-created_date', 50);

      // Filter by origin POI if selected
      if (filters.origin) {
        allRoutes = allRoutes.filter(r => r.origin_poi_id === filters.origin.id);
      }

      // Filter by destination POI if selected
      if (filters.destination) {
        allRoutes = allRoutes.filter(r => r.dest_poi_id === filters.destination.id);
      }

      // Filter by day of week — parse date parts directly to avoid timezone issues
      if (filters.date) {
        const [year, month, day] = filters.date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayMap = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
        const dayOfWeek = dayMap[date.getDay()];
        allRoutes = allRoutes.filter(r => r.days_of_week?.includes(dayOfWeek));
      }

      // Sort by match score, rating, price
      allRoutes.sort((a, b) => {
        // Prioritize routes with higher ratings
        if ((b.driver_rating || 5) !== (a.driver_rating || 5)) {
          return (b.driver_rating || 5) - (a.driver_rating || 5);
        }
        // Then by price
        return a.price_per_seat - b.price_per_seat;
      });

      setRoutes(allRoutes);
    } catch (error) {
      console.error('Error searching routes:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectPOI = (poi) => {
    if (selectingFor === 'origin') {
      setFilters({ ...filters, origin: poi });
    } else {
      setFilters({ ...filters, destination: poi });
    }
    setSelectingFor(null);
    setSearchQuery('');
  };

  const clearFilter = (type) => {
    setFilters({ ...filters, [type]: null });
  };

  const filteredPois = pois.filter(poi => 
    poi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    poi.short_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPoiIcon = (poi) => {
    const tag = poi?.tags?.[0] || 'default';
    return POI_ICONS[tag] || POI_ICONS.default;
  };

  useEffect(() => {
    if (!loading) {
      searchRoutes();
    }
  }, [filters.origin, filters.destination, filters.date]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={searchRoutes}>
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Buscar rutas</h1>
          <p className="text-slate-500">Encuentra viajes compartidos a tu destino</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            {/* Origin */}
            <div
              onClick={() => setSelectingFor('origin')}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Desde</p>
                <p className="font-medium text-slate-900">
                  {filters.origin?.short_name || filters.origin?.name || 'Cualquier origen'}
                </p>
              </div>
              {filters.origin && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearFilter('origin'); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>

            {/* Destination */}
            <div
              onClick={() => setSelectingFor('destination')}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Hacia</p>
                <p className="font-medium text-slate-900">
                  {filters.destination?.short_name || filters.destination?.name || 'Cualquier destino'}
                </p>
              </div>
              {filters.destination && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearFilter('destination'); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>

            {/* Date */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Fecha</p>
                <Input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="border-0 p-0 h-auto font-medium bg-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-600">
            {searching ? 'Buscando...' : `${routes.length} rutas encontradas`}
          </p>
        </div>

        {searching ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : routes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">No hay rutas disponibles</h3>
              <p className="text-slate-500">Intenta con otros filtros o fechas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {routes.map((route, index) => (
                <motion.div
                  key={route.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={createPageUrl('RouteDetails') + `?routeId=${route.id}&date=${filters.date}`}>
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        {/* Route info */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                            {route.driver_photo ? (
                              <img src={route.driver_photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Car className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900">{route.driver_name}</h3>
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{route.driver_rating?.toFixed(1) || '5.0'}</span>
                              </div>
                            </div>
                            <p className="text-sm text-slate-500">{route.vehicle_model} • {route.vehicle_color}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">${route.price_per_seat}</p>
                            <p className="text-xs text-slate-500">por asiento</p>
                          </div>
                        </div>

                        {/* Route path */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-slate-700 truncate block">
                                {route.origin_poi_name || route.origin_address}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-slate-900">{route.departure_time}</span>
                          </div>
                          <div className="ml-1 border-l-2 border-dashed border-slate-300 h-3" />
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-slate-700 truncate block">
                                {route.dest_poi_name || route.dest_address}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex items-center justify-between pt-3 border-t gap-2">
                          <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {route.total_seats}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {route.duration_min}m
                            </span>
                            {route.distance_km >= 15 && (
                              <Badge variant="outline" className="text-[10px] py-0 px-2 border-purple-300 text-purple-700 bg-purple-50">
                                EdoMex → CDMX
                              </Badge>
                            )}
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 whitespace-nowrap">
                            {route.days_of_week?.length === 7 ? 'Diario' : 
                             route.days_of_week?.length === 5 ? 'L-V' :
                             route.days_of_week?.slice(0, 2).join(', ')}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

        {/* POI Selection Sheet */}
        <Sheet open={!!selectingFor} onOpenChange={() => setSelectingFor(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>
              {selectingFor === 'origin' ? 'Seleccionar origen' : 'Seleccionar destino'}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar punto clave..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-xl"
              />
            </div>

            {/* Category Headers */}
            {selectingFor === 'origin' && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                <p className="text-xs font-medium text-slate-600 uppercase">Orígenes principales</p>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-300 via-transparent to-transparent" />
              </div>
            )}
            {selectingFor === 'destination' && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
                <p className="text-xs font-medium text-blue-600 uppercase">Destinos frecuentes</p>
                <div className="flex-1 h-px bg-gradient-to-r from-blue-300 via-transparent to-transparent" />
              </div>
            )}

            <div className="space-y-2 max-h-[55vh] overflow-y-auto">
              {filteredPois
                .filter(poi => {
                  if (selectingFor === 'origin') return poi.zone === 'edomex' || poi.priority >= 90;
                  if (selectingFor === 'destination') return poi.zone === 'cdmx' || poi.priority >= 85;
                  return true;
                })
                .map((poi) => {
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-500 truncate">{poi.name}</p>
                        {poi.zone === 'edomex' && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-green-300 text-green-700">EdoMex</Badge>
                        )}
                        {poi.zone === 'cdmx' && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-300 text-blue-700">CDMX</Badge>
                        )}
                      </div>
                    </div>
                    {poi.priority >= 95 && (
                      <Badge className="bg-amber-100 text-amber-700">⭐</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
        </Sheet>
    </PullToRefresh>
  );
}