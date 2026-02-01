import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  MapPin, Clock, Users, DollarSign, Star, Car,
  ChevronRight, Loader2, Calendar, Phone, MessageCircle,
  CheckCircle, AlertCircle, Minus, Plus, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function RouteDetails() {
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState(null);
  const [existingBookings, setExistingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [seats, setSeats] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const params = new URLSearchParams(window.location.search);
      const routeId = params.get('routeId');
      const date = params.get('date') || format(new Date(), 'yyyy-MM-dd');
      setSelectedDate(date);

      if (!routeId) {
        navigate(createPageUrl('SearchRoutes'));
        return;
      }

      // Load route
      const routes = await base44.entities.Route.filter({ id: routeId });
      if (routes.length === 0) {
        toast.error('Ruta no encontrada');
        navigate(createPageUrl('SearchRoutes'));
        return;
      }
      setRoute(routes[0]);

      // Load existing bookings for this date
      const bookings = await base44.entities.RouteBooking.filter({
        route_id: routeId,
        trip_date: date,
        status: 'confirmed'
      });
      setExistingBookings(bookings);

    } catch (error) {
      console.error('Error loading route:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSeats = () => {
    if (!route) return 0;
    const bookedSeats = existingBookings.reduce((sum, b) => sum + (b.seats_booked || 1), 0);
    return route.total_seats - bookedSeats;
  };

  const handleBooking = async () => {
    const available = getAvailableSeats();
    if (seats > available) {
      toast.error(`Solo hay ${available} asientos disponibles`);
      return;
    }

    if (!user.phone) {
      toast.error('Necesitas un número de teléfono registrado');
      navigate(createPageUrl('Profile'));
      return;
    }

    setBooking(true);
    try {
      const totalPrice = seats * route.price_per_seat;

      // Create booking with pending status
      const newBooking = await base44.entities.RouteBooking.create({
        route_id: route.id,
        passenger_id: user.id,
        passenger_name: user.full_name,
        passenger_phone: user.phone,
        driver_id: route.driver_id,
        trip_date: selectedDate,
        departure_time: route.departure_time,
        seats_booked: seats,
        total_price: totalPrice,
        status: 'pending',
        payment_status: 'pending_capture'
      });

      // Notify driver
      await base44.entities.Notification.create({
        user_id: route.driver_id,
        type: 'ride_request',
        title: '¡Nueva solicitud de reserva!',
        message: `${user.full_name} solicita ${seats} asiento(s) para el ${format(parseISO(selectedDate), "d 'de' MMMM", { locale: es })}`,
        data: JSON.stringify({ booking_id: newBooking.id, route_id: route.id })
      });

      // Open WhatsApp
      const whatsappMessage = encodeURIComponent(
        `Hola, realicé una solicitud de viaje desde la app y deseo confirmar disponibilidad y el proceso de pago.\n\n` +
        `🚗 Ruta: ${route.origin_poi_name || route.origin_address} → ${route.dest_poi_name || route.dest_address}\n` +
        `📅 Fecha: ${format(parseISO(selectedDate), "d 'de' MMMM", { locale: es })}\n` +
        `🕐 Hora: ${route.departure_time}\n` +
        `👥 Asientos: ${seats}\n` +
        `💰 Total: $${totalPrice} MXN\n` +
        `🆔 ID: ${newBooking.id}\n\n` +
        `Nombre: ${user.full_name}\n` +
        `Teléfono: ${user.phone}`
      );
      
      window.open(`https://wa.me/5215574510969?text=${whatsappMessage}`, '_blank');
      
      toast.success('Solicitud creada - Confirma por WhatsApp');
      setTimeout(() => navigate(createPageUrl('MyBookings')), 2000);

    } catch (error) {
      toast.error('Error al crear solicitud');
      console.error(error);
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!route) {
    return null;
  }

  const availableSeats = getAvailableSeats();
  const totalPrice = seats * route.price_per_seat;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Driver Card */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden">
                {route.driver_photo ? (
                  <img src={route.driver_photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Car className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{route.driver_name}</h2>
                  <div className="flex items-center gap-1 bg-yellow-100 px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-700">
                      {route.driver_rating?.toFixed(1) || '5.0'}
                    </span>
                  </div>
                </div>
                <p className="text-slate-500">{route.vehicle_model} • {route.vehicle_color}</p>
                <p className="text-sm font-medium text-slate-700">{route.vehicle_plate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Route Info */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Detalles de la ruta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Origin */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 uppercase">Salida</p>
                <p className="font-medium text-slate-900">{route.origin_poi_name || route.origin_address}</p>
                <p className="text-lg font-bold text-blue-600">{route.departure_time}</p>
              </div>
            </div>

            {/* Destination */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 uppercase">Llegada</p>
                <p className="font-medium text-slate-900">{route.dest_poi_name || route.dest_address}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-around pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{route.distance_km}</p>
                <p className="text-xs text-slate-500">km</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">~{route.duration_min}</p>
                <p className="text-xs text-slate-500">minutos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">${route.price_per_seat}</p>
                <p className="text-xs text-slate-500">por asiento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-slate-900">Fecha seleccionada</span>
            </div>
            <p className="text-lg font-bold text-slate-900">
              {format(parseISO(selectedDate), "EEEE d 'de' MMMM, yyyy", { locale: es })}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {route.days_of_week?.map(day => (
                <Badge key={day} variant="outline">{day}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-slate-900">Asientos disponibles</span>
              </div>
              <Badge className={availableSeats > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {availableSeats} de {route.total_seats}
              </Badge>
            </div>

            {availableSeats > 0 ? (
              <div>
                <p className="text-sm text-slate-600 mb-3">¿Cuántos asientos necesitas?</p>
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => setSeats(Math.max(1, seats - 1))}
                    disabled={seats <= 1}
                    className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center disabled:opacity-50"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-4xl font-bold text-slate-900">{seats}</span>
                  <button
                    onClick={() => setSeats(Math.min(availableSeats, seats + 1))}
                    disabled={seats >= availableSeats}
                    className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  No hay asientos disponibles para esta fecha
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 font-medium">
            💳 El pago es previo para confirmar el viaje. Recibirás instrucciones por WhatsApp.
          </AlertDescription>
        </Alert>
      </div>

      {/* Fixed Bottom Bar */}
      {availableSeats > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 z-50"
        >
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">{seats} asiento(s)</p>
              <p className="text-2xl font-bold text-slate-900">${totalPrice} MXN</p>
            </div>
            <Button
              onClick={handleBooking}
              disabled={booking}
              className="flex-1 h-14 bg-green-600 hover:bg-green-700 rounded-xl text-lg"
            >
              {booking ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Confirmar por WhatsApp
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}