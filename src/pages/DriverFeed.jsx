import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Route, MapPin, ChevronRight, Loader2, Plus, 
  Zap, AlertTriangle, Clock, Users, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import TakeRouteSheet from '../components/driver/TakeRouteSheet';
import { toast } from 'sonner';
import PullToRefresh from '../components/PullToRefresh';

export default function DriverFeed() {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [baseRoutes, setBaseRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

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

      const routes = await base44.entities.BaseRoute.filter({ active: true }, '-created_date', 30);
      setBaseRoutes(routes);
    } catch (e) {
      console.error(e);
      base44.auth.redirectToLogin(createPageUrl('WelcomeChofer'));
    } finally {
      setLoading(false);
    }
  };

  const handleTakeRoute = (route) => {
    setSelectedRoute(route);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">Rutas disponibles</h1>
          <p className="text-slate-500">Elige una ruta base y personaliza tu viaje</p>
        </div>

        {/* Safety reminder */}
        <Alert className="mb-5 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            Usa puntos públicos para abordaje. Inicia el viaje solo cuando el pasajero esté listo.
          </AlertDescription>
        </Alert>

        {/* Quick route button */}
        <Link to={createPageUrl('CreateRoute')}>
          <Card className="mb-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold">Crear ruta propia</p>
                <p className="text-white/80 text-sm">Modo rápido: define origen, destino y precio</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </CardContent>
          </Card>
        </Link>

        {/* Base routes feed */}
        {baseRoutes.length === 0 ? (
          <Card>
            <CardContent className="p-14 text-center">
              <Route className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">Aún no hay rutas en tu zona.</h3>
              <p className="text-slate-500 mb-4">Puedes crear una ruta propia para activar el flujo.</p>
              <Link to={createPageUrl('CreateRoute')}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear mi primera ruta
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-500">{baseRoutes.length} rutas disponibles</p>
            {baseRoutes.map((route, index) => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    {/* Route path */}
                    <div className="mb-4">
                      <h3 className="font-bold text-slate-900 mb-2">{route.name}</h3>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                          <span>{route.origin_name}</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-green-300 text-green-700">EdoMex</Badge>
                        </div>
                        <div className="ml-1 border-l-2 border-dashed border-slate-200 h-3" />
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          <span>{route.dest_name}</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-300 text-blue-700">CDMX</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                      {route.distance_km > 0 && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {route.distance_km} km
                        </span>
                      )}
                      {route.duration_min > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          ~{route.duration_min} min
                        </span>
                      )}
                      {route.suggested_price > 0 && (
                        <span className="flex items-center gap-1 font-medium text-green-600">
                          <DollarSign className="w-3.5 h-3.5" />
                          Sugerido: ${route.suggested_price}
                        </span>
                      )}
                      {route.times_taken > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {route.times_taken} conductores
                        </span>
                      )}
                    </div>

                    {route.description && (
                      <p className="text-xs text-slate-500 mb-4 bg-slate-50 rounded-lg p-2">{route.description}</p>
                    )}

                    <Button
                      onClick={() => handleTakeRoute(route)}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl"
                    >
                      Tomar esta ruta
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Take Route Sheet */}
      {selectedRoute && (
        <TakeRouteSheet
          open={sheetOpen}
          onClose={() => { setSheetOpen(false); setSelectedRoute(null); }}
          baseRoute={selectedRoute}
          driver={driver}
          user={user}
        />
      )}
    </div>
    </PullToRefresh>
  );
}