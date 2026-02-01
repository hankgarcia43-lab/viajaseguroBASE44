import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  MapPin, Users, DollarSign, Star, TrendingUp,
  Loader2, Calendar, Eye, Pause, Play, BarChart2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminRoutes() {
  const [routes, setRoutes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [stats, setStats] = useState({
    totalRoutes: 0,
    activeRoutes: 0,
    totalBookings: 0,
    totalRevenue: 0,
    avgOccupancy: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allRoutes, allBookings] = await Promise.all([
        base44.entities.Route.list('-created_date', 100),
        base44.entities.RouteBooking.list('-created_date', 200)
      ]);

      setRoutes(allRoutes);
      setBookings(allBookings);

      // Calculate stats
      const activeRoutes = allRoutes.filter(r => r.status === 'active');
      const confirmedBookings = allBookings.filter(b => ['confirmed', 'completed'].includes(b.status));
      const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const avgOccupancy = allRoutes.length > 0 
        ? Math.round(allRoutes.reduce((sum, r) => sum + (r.total_passengers || 0), 0) / allRoutes.length)
        : 0;

      setStats({
        totalRoutes: allRoutes.length,
        activeRoutes: activeRoutes.length,
        totalBookings: confirmedBookings.length,
        totalRevenue,
        avgOccupancy
      });

    } catch (error) {
      console.error('Error loading routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoutes = routes.filter(r => {
    if (filter === 'active') return r.status === 'active';
    if (filter === 'paused') return r.status === 'paused';
    return true;
  });

  const getChartData = () => {
    // Group bookings by day for last 7 days
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayBookings = bookings.filter(b => 
        b.trip_date === dateStr && ['confirmed', 'completed'].includes(b.status)
      );
      
      data.push({
        day: format(date, 'EEE', { locale: es }),
        reservas: dayBookings.length,
        ingresos: dayBookings.reduce((sum, b) => sum + (b.total_price || 0), 0)
      });
    }
    return data;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Rutas</h1>
            <p className="text-slate-500">Rutas compartidas y métricas</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <MapPin className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">{stats.totalRoutes}</p>
              <p className="text-xs text-slate-500">Rutas totales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Play className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">{stats.activeRoutes}</p>
              <p className="text-xs text-slate-500">Activas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">{stats.totalBookings}</p>
              <p className="text-xs text-slate-500">Reservas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">${stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Ingresos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-900">{stats.avgOccupancy}</p>
              <p className="text-xs text-slate-500">Prom. pasajeros</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              Reservas últimos 7 días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChartData()}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="reservas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="mb-6">
          <TabsList className="bg-white">
            <TabsTrigger value="active">
              Activas ({routes.filter(r => r.status === 'active').length})
            </TabsTrigger>
            <TabsTrigger value="paused">
              Pausadas ({routes.filter(r => r.status === 'paused').length})
            </TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Routes Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Ruta</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Conductor</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Horario</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Precio</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Métricas</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRoutes.map((route) => (
                    <tr key={route.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900 text-sm">
                            {route.origin_poi_name || route.origin_address?.split(',')[0]}
                          </p>
                          <p className="text-xs text-slate-500">
                            → {route.dest_poi_name || route.dest_address?.split(',')[0]}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{route.driver_name}</p>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {route.driver_rating?.toFixed(1) || '5.0'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{route.departure_time}</p>
                        <p className="text-xs text-slate-500">
                          {route.days_of_week?.join(', ')}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-green-600">${route.price_per_seat}</p>
                        <p className="text-xs text-slate-500">{route.total_seats} asientos</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p>{route.total_trips || 0} viajes</p>
                          <p className="text-slate-500">{route.total_passengers || 0} pasajeros</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={
                          route.status === 'active' ? 'bg-green-100 text-green-700' :
                          route.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {route.status === 'active' ? 'Activa' : 
                           route.status === 'paused' ? 'Pausada' : route.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRoutes.length === 0 && (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No hay rutas en esta categoría</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}