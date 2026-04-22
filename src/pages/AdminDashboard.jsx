import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  Car, Users, DollarSign, AlertCircle, Shield, 
  TrendingUp, Clock, CheckCircle, XCircle, Loader2,
  ChevronRight, Activity, Route
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRides: 0,
    todayRides: 0,
    activeRides: 0,
    totalDrivers: 0,
    pendingKYC: 0,
    activeIncidents: 0,
    gmv: 0,
    todayGMV: 0
  });
  const [recentRides, setRecentRides] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load all data in parallel
      const [rides, drivers, incidents, payments] = await Promise.all([
        base44.entities.Ride.list('-created_date', 100),
        base44.entities.Driver.list('-created_date', 100),
        base44.entities.Incident.filter({ status: 'open' }),
        base44.entities.Payment.list('-created_date', 100)
      ]);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayRides = rides.filter(r => new Date(r.created_date) >= today);
      const activeRides = rides.filter(r => ['searching', 'assigned', 'in_progress'].includes(r.status));
      const pendingKYC = drivers.filter(d => ['pending', 'documents_uploaded', 'automated_check', 'manual_review'].includes(d.kyc_status));
      
      const completedRides = rides.filter(r => r.status === 'completed');
      const gmv = completedRides.reduce((sum, r) => sum + (r.fare_final || r.fare_estimated || 0), 0);
      const todayGMV = todayRides.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.fare_final || r.fare_estimated || 0), 0);

      setStats({
        totalRides: rides.length,
        todayRides: todayRides.length,
        activeRides: activeRides.length,
        totalDrivers: drivers.length,
        pendingKYC: pendingKYC.length,
        activeIncidents: incidents.length,
        gmv,
        todayGMV
      });

      setRecentRides(rides.slice(0, 10));

      // Generate chart data for last 7 days
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        const dayRides = rides.filter(r => {
          const created = new Date(r.created_date);
          return created >= dayStart && created <= dayEnd;
        });

        const dayGMV = dayRides
          .filter(r => r.status === 'completed')
          .reduce((sum, r) => sum + (r.fare_final || r.fare_estimated || 0), 0);

        chartData.push({
          date: format(date, 'EEE', { locale: es }),
          rides: dayRides.length,
          gmv: dayGMV
        });
      }
      setChartData(chartData);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_LABELS = {
    completed: 'Completado',
    cancelled: 'Cancelado',
    in_progress: 'En curso',
    assigned: 'Asignado',
    searching: 'Buscando',
    disputed: 'Disputado',
    pending: 'Pendiente',
    confirmed: 'Confirmado',
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      in_progress: 'bg-blue-100 text-blue-700',
      assigned: 'bg-yellow-100 text-yellow-700',
      searching: 'bg-purple-100 text-purple-700',
      disputed: 'bg-orange-100 text-orange-700',
      pending: 'bg-slate-100 text-slate-600',
      confirmed: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
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
            <h1 className="text-2xl font-bold text-slate-900">Panel de administración</h1>
            <p className="text-slate-500">Vista general del sistema</p>
          </div>
          <Badge className="bg-green-100 text-green-700 py-1 px-3 text-xs">
            <Activity className="w-3.5 h-3.5 mr-1 inline" />
            Sistema activo
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Car className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.todayRides}</p>
                  <p className="text-sm text-slate-500">Viajes hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">${stats.todayGMV.toLocaleString()}</p>
                  <p className="text-sm text-slate-500">GMV hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalDrivers}</p>
                  <p className="text-sm text-slate-500">Conductores</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.activeIncidents}</p>
                  <p className="text-sm text-slate-500">Incidentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {stats.pendingKYC > 0 && (
            <Link to={createPageUrl('AdminKYC')}>
              <Card className="border-yellow-200 bg-yellow-50 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-yellow-600" />
                    <div>
                      <p className="font-semibold text-yellow-900">{stats.pendingKYC} verificaciones pendientes</p>
                      <p className="text-sm text-yellow-700">Requieren revisión</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-yellow-600" />
                </CardContent>
              </Card>
            </Link>
          )}

          {stats.activeIncidents > 0 && (
            <Link to={createPageUrl('AdminIncidents')}>
              <Card className="border-red-200 bg-red-50 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-900">{stats.activeIncidents} incidentes abiertos</p>
                      <p className="text-sm text-red-700">Requieren atención</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-red-600" />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Viajes últimos 7 días</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="rides" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">GMV últimos 7 días</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={(value) => [`$${value}`, 'GMV']} />
                    <Line 
                      type="monotone" 
                      dataKey="gmv" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ fill: '#10B981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Rides */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Viajes recientes</CardTitle>
            <Link to={createPageUrl('AdminRides')}>
              <Button variant="ghost" size="sm">
                Ver todos
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-y">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Pasajero</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Conductor</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Ruta</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Tarifa</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Estado</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentRides.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        Sin viajes registrados todavía. Los viajes aparecerán aquí cuando los conductores inicien operaciones.
                      </td>
                    </tr>
                  )}
                  {recentRides.map((ride) => (
                    <tr key={ride.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{ride.passenger_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{ride.driver_name || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-600 truncate max-w-[200px]">
                          {ride.origin_address?.split(',')[0]}
                        </p>
                        <p className="text-xs text-slate-400">→ {ride.dest_address?.split(',')[0]}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">${ride.fare_final || ride.fare_estimated}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(ride.status)}>
                          {STATUS_LABELS[ride.status] || ride.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {format(new Date(ride.created_date), 'HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <Link to={createPageUrl('AdminKYC')}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <Shield className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <p className="font-medium text-sm">Verificación</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('AdminRoutes')}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <Route className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="font-medium text-sm">Rutas</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('AdminIncidents')}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <AlertCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="font-medium text-sm">Incidentes</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('AdminPayments')}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-sm">Pagos</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('AdminConfig')}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="font-medium text-sm">Configuración</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}