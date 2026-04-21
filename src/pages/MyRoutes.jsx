import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  MapPin, Clock, Users, DollarSign, Plus, 
  Loader2, Calendar, MoreVertical, Pause, Play,
  Trash2, Edit, TrendingUp, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyRoutes() {
  const [driver, setDriver] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [bookingsMap, setBookingsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      
      const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
      if (drivers.length === 0) return;
      
      setDriver(drivers[0]);

      const myRoutes = await base44.entities.Route.filter(
        { driver_id: drivers[0].id },
        '-created_date',
        50
      );
      setRoutes(myRoutes);

      // Load pending bookings for each route
      if (myRoutes.length > 0) {
        const allBookings = await base44.entities.RouteBooking.filter(
          { driver_id: drivers[0].id },
          '-created_date',
          200
        );
        const bMap = {};
        myRoutes.forEach(r => {
          bMap[r.id] = allBookings.filter(b => b.route_id === r.id && ['pending','confirmed'].includes(b.status));
        });
        setBookingsMap(bMap);
      }

    } catch (error) {
      console.error('Error loading routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRouteStatus = async (route) => {
    const newStatus = route.status === 'active' ? 'paused' : 'active';
    try {
      await base44.entities.Route.update(route.id, { status: newStatus });
      setRoutes(routes.map(r => r.id === route.id ? { ...r, status: newStatus } : r));
      toast.success(newStatus === 'active' ? 'Ruta activada' : 'Ruta pausada');
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const handleDelete = async () => {
    if (!selectedRoute) return;
    
    setDeleting(true);
    try {
      // Check for pending bookings
      const bookings = await base44.entities.RouteBooking.filter({
        route_id: selectedRoute.id,
        status: 'confirmed'
      });

      if (bookings.length > 0) {
        toast.error('No puedes eliminar una ruta con reservas pendientes');
        return;
      }

      await base44.entities.Route.delete(selectedRoute.id);
      setRoutes(routes.filter(r => r.id !== selectedRoute.id));
      toast.success('Ruta eliminada');
      setShowDeleteDialog(false);
      setSelectedRoute(null);
    } catch (error) {
      toast.error('Error al eliminar');
    } finally {
      setDeleting(false);
    }
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
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mis rutas</h1>
            <p className="text-slate-500">{routes.length} rutas publicadas</p>
          </div>
          <Link to={createPageUrl('CreateRoute')}>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <Plus className="w-4 h-4 mr-2" />
              Nueva ruta
            </Button>
          </Link>
        </div>

        {/* Stats */}
        {routes.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{routes.filter(r => r.status === 'active').length}</p>
                <p className="text-xs text-slate-500">Activas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {routes.reduce((sum, r) => sum + (r.total_passengers || 0), 0)}
                </p>
                <p className="text-xs text-slate-500">Pasajeros</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  ${routes.reduce((sum, r) => sum + (r.total_earnings || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">Ganado</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Routes List */}
        {routes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">Aún no has publicado rutas</h3>
              <p className="text-slate-500 mb-2">Publica tu primera ruta en minutos y empieza a recibir pasajeros.</p>
              <p className="text-xs text-slate-400 mb-6">Solo necesitas definir origen, destino, horario y precio.</p>
              <Link to={createPageUrl('CreateRoute')}>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear mi primera ruta
                </Button>
              </Link>
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
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={route.status === 'paused' ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={
                            route.status === 'active' ? 'bg-green-100 text-green-700' :
                            route.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-700'
                          }>
                            {route.status === 'active' ? 'Activa' : 
                             route.status === 'paused' ? 'Pausada' : route.status}
                          </Badge>
                          {route.avg_rating && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              {route.avg_rating.toFixed(1)}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleRouteStatus(route)}>
                              {route.status === 'active' ? (
                                <>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Pausar
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => {
                                setSelectedRoute(route);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Route path */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-sm text-slate-700 flex-1 truncate">
                            {route.origin_poi_name || route.origin_address}
                          </span>
                          <span className="text-sm font-medium text-slate-900">{route.departure_time}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm text-slate-700 flex-1 truncate">
                            {route.dest_poi_name || route.dest_address}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {route.total_seats}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            ${route.price_per_seat}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {route.total_trips || 0} viajes
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {(bookingsMap[route.id]?.length || 0) > 0 && (
                            <Badge className="bg-blue-100 text-blue-700">
                              {bookingsMap[route.id].length} reserva{bookingsMap[route.id].length > 1 ? 's' : ''}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {route.days_of_week?.length === 7 ? 'Diario' : 
                             route.days_of_week?.length === 5 ? 'L-V' :
                             route.days_of_week?.join(', ')}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar ruta</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta ruta? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}