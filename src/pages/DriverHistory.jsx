import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  MapPin, Clock, DollarSign, Star, ChevronRight, 
  Loader2, Car, User
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DriverHistory() {
  const [driver, setDriver] = useState(null);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
      
      if (drivers.length === 0) return;
      
      setDriver(drivers[0]);

      const allRides = await base44.entities.Ride.filter(
        { driver_id: drivers[0].id },
        '-created_date',
        50
      );
      setRides(allRides);
    } catch (error) {
      console.error('Error loading rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRides = rides.filter(ride => {
    if (filter === 'all') return true;
    if (filter === 'completed') return ride.status === 'completed';
    if (filter === 'cancelled') return ride.status === 'cancelled';
    return true;
  });

  const getStatusBadge = (status) => {
    const statuses = {
      completed: { color: 'bg-green-100 text-green-700', text: 'Completado' },
      cancelled: { color: 'bg-red-100 text-red-700', text: 'Cancelado' },
      in_progress: { color: 'bg-blue-100 text-blue-700', text: 'En progreso' },
      assigned: { color: 'bg-yellow-100 text-yellow-700', text: 'Asignado' }
    };
    const s = statuses[status] || { color: 'bg-slate-100 text-slate-700', text: status };
    return <Badge className={s.color}>{s.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Historial de viajes</h1>

        {/* Filters */}
        <Tabs value={filter} onValueChange={setFilter} className="mb-6">
          <TabsList className="w-full bg-white">
            <TabsTrigger value="all" className="flex-1">Todos</TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">Completados</TabsTrigger>
            <TabsTrigger value="cancelled" className="flex-1">Cancelados</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Rides List */}
        {filteredRides.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Sin viajes</h3>
            <p className="text-slate-500">Aún no tienes viajes completados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRides.map((ride) => (
              <Card key={ride.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-slate-500">
                        {format(new Date(ride.created_date), "d MMM yyyy • HH:mm", { locale: es })}
                      </p>
                      {getStatusBadge(ride.status)}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        +${Math.round((ride.fare_final || ride.fare_estimated) * 0.8)} MXN
                      </p>
                      <p className="text-xs text-slate-500">Tu ganancia</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm text-slate-600 truncate flex-1">
                        {ride.origin_address}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm text-slate-600 truncate flex-1">
                        {ride.dest_address}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{ride.passenger_name}</p>
                      <p className="text-sm text-slate-500">{ride.distance_km} km • {ride.duration_min} min</p>
                    </div>
                    {ride.passenger_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{ride.passenger_rating}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}