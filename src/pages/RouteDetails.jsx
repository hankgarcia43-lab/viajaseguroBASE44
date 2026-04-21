import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  MapPin, Clock, Users, DollarSign, Star, Car, ArrowLeftRight,
  ChevronLeft, Loader2, AlertCircle, CheckCircle, Info, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { generateBoardingCode } from '@/lib/boardingCode';

const ALL_DAYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
const DAY_LABELS = { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo' };

const WEEKLY_DISCOUNT_RATE = 0.0666; // 6.66%

export default function RouteDetails() {
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [seats, setSeats] = useState(1);
  const [selectedDays, setSelectedDays] = useState([]);
  const [availableSeats, setAvailableSeats] = useState(null);
  const [hasExistingBooking, setHasExistingBooking] = useState(false);
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
      if (!routeId) { navigate(createPageUrl('SearchRoutes')); return; }

      const allRoutes = await base44.entities.Route.list('-created_date', 200);
      const r = allRoutes.find(r => r.id === routeId);
      if (!r) {
        toast.error('Ruta no encontrada');
        navigate(createPageUrl('SearchRoutes'));
        return;
      }
      setRoute(r);
      setSelectedDays(r.days_of_week || []);

      // Calculate available seats (total - booked)
      const bookings = await base44.entities.RouteBooking.filter({ route_id: routeId });
      const activeBookings = bookings.filter(b => ['pending','confirmed','in_progress'].includes(b.status));
      const bookedSeats = activeBookings.reduce((sum, b) => sum + (b.seats_booked || 1), 0);
      setAvailableSeats(Math.max(0, r.total_seats - bookedSeats));

      // Check if user already has an active booking on this route
      const myBooking = activeBookings.find(b => b.passenger_id === userData.id);
      setHasExistingBooking(!!myBooking);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const isWeeklyDiscount = () => selectedDays.length >= 5;

  const calcPricing = () => {
    const days = selectedDays.length;
    const subtotal = seats * (route?.price_per_seat || 0) * days;
    const weekly = isWeeklyDiscount();
    const discountAmt = weekly ? Math.round(subtotal * WEEKLY_DISCOUNT_RATE) : 0;
    const total = subtotal - discountAmt;
    return { subtotal, discountAmt, total, days, weekly };
  };

  const handleBooking = async () => {
    if (selectedDays.length === 0) return toast.error('Selecciona al menos un día');

    const { total, subtotal, discountAmt, weekly } = calcPricing();

    setBooking(true);
    try {
      const newBooking = await base44.entities.RouteBooking.create({
        route_id: route.id,
        passenger_id: user.id,
        passenger_name: user.full_name || user.email,
        passenger_phone: user.phone || '',
        driver_id: route.driver_id,
        days_booked: selectedDays,
        trip_date: new URLSearchParams(window.location.search).get('date') || new Date().toISOString().split('T')[0],
        departure_time: route.departure_time,
        seats_booked: seats,
        price_per_seat: route.price_per_seat,
        subtotal,
        weekly_discount: weekly,
        discount_amount: discountAmt,
        total_price: total,
        status: 'pending',
        payment_status: 'pending',
        boarding_code: generateBoardingCode(),
      });

      await base44.entities.Notification.create({
        user_id: route.driver_id,
        type: 'ride_request',
        title: '¡Nueva reserva solicitada!',
        message: `${user.full_name || 'Un pasajero'} reservó ${seats} asiento(s) para ${selectedDays.join(', ')}`,
        data: JSON.stringify({ booking_id: newBooking.id }),
      });

      toast.success('Reserva creada. Ahora realiza el pago para confirmar tu lugar.');
      navigate(createPageUrl('PaymentInstructions') + `?bookingId=${newBooking.id}`);
    } catch (e) {
      toast.error('Error al crear la reserva');
      console.error(e);
    } finally {
      setBooking(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (!route) return null;

  const { subtotal, discountAmt, total, days, weekly } = calcPricing();
  const seatsLeft = availableSeats ?? route.total_seats;
  const availableDays = route.days_of_week || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-36">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 mb-5 hover:text-slate-700">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">Volver</span>
        </button>

        {/* Driver Card */}
        <Card className="mb-4">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
              {route.driver_photo ? (
                <img src={route.driver_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Car className="w-8 h-8 text-slate-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-bold text-slate-900">{route.driver_name}</h2>
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  <span className="text-sm font-semibold text-yellow-700">{route.driver_rating?.toFixed(1) || '5.0'}</span>
                </div>
              </div>
              <p className="text-sm text-slate-500">{route.vehicle_model} • {route.vehicle_color}</p>
              <p className="text-sm font-medium text-slate-700">{route.vehicle_plate}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">${route.price_per_seat}</p>
              <p className="text-xs text-slate-500">por asiento / día</p>
            </div>
          </CardContent>
        </Card>

        {/* Route Info */}
        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Origen</p>
                <p className="font-semibold text-slate-900">{route.origin_poi_name || route.origin_address}</p>
                {route.boarding_reference && (
                  <p className="text-sm text-slate-600 mt-0.5">📍 {route.boarding_reference}</p>
                )}
                <p className="text-lg font-bold text-blue-600 mt-1">{route.departure_time}</p>
              </div>
            </div>
            <div className="ml-4 border-l-2 border-dashed border-slate-200 h-4" />
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium">Destino</p>
                <p className="font-semibold text-slate-900">{route.dest_poi_name || route.dest_address}</p>
              </div>
            </div>

            {route.return_trip && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                  <ArrowLeftRight className="w-4 h-4" />
                  <span className="font-semibold text-sm">Servicio de regreso disponible</span>
                </div>
                <p className="text-sm text-slate-600">Salida: <strong>{route.return_time}</strong> desde {route.return_boarding_reference || route.dest_poi_name}</p>
              </div>
            )}

            <div className="flex items-center gap-4 pt-3 border-t text-sm text-slate-500">
              {route.distance_km > 0 && <span>{route.distance_km} km</span>}
              {route.duration_min > 0 && <span>~{route.duration_min} min</span>}
              <Badge className="bg-green-100 text-green-700">{route.total_seats} asientos</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Day selector */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">¿Qué días viajas?</CardTitle>
            <p className="text-xs text-slate-500">Selecciona los días de la semana. 5+ días = descuento semanal aplicado.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {ALL_DAYS.map((day) => {
                const available = availableDays.includes(day);
                const selected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => available && toggleDay(day)}
                    disabled={!available}
                    className={`flex flex-col items-center py-2 rounded-xl transition-all text-xs font-bold ${
                      !available ? 'opacity-30 cursor-not-allowed bg-slate-50' :
                      selected ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' :
                      'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{day.slice(0, 1).toUpperCase()}</span>
                    <span className="text-[9px] mt-0.5 font-normal">
                      {day.slice(0, 3)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Seats */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Asientos</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSeats(Math.max(1, seats - 1))}
                  className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-lg"
                >−</button>
                <span className="text-2xl font-bold text-slate-900 w-8 text-center">{seats}</span>
                <button
                  onClick={() => setSeats(Math.min(route.total_seats, seats + 1))}
                  className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-lg"
                >+</button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing summary */}
        {selectedDays.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>${route.price_per_seat} × {seats} asiento(s) × {days} día(s)</span>
                <span>${subtotal}</span>
              </div>
              {weekly && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    Descuento semanal aplicado
                  </span>
                  <span>−${discountAmt}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t">
                <span>Total a pagar</span>
                <span className="text-green-600">${total} MXN</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seats available */}
        <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-xl text-sm font-medium ${
          seatsLeft === 0 ? 'bg-red-50 text-red-700' :
          seatsLeft <= 2 ? 'bg-amber-50 text-amber-700' :
          'bg-green-50 text-green-700'
        }`}>
          <Users className="w-4 h-4" />
          {seatsLeft === 0 ? 'Sin lugares disponibles' :
           seatsLeft === 1 ? '¡Solo queda 1 lugar!' :
           `${seatsLeft} lugares disponibles`}
        </div>

        {hasExistingBooking && (
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              Ya tienes una reserva activa en esta ruta.
            </AlertDescription>
          </Alert>
        )}

        {/* Payment notice */}
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            Al reservar recibirás el enlace de pago de Mercado Pago. Tu lugar se confirma tras validar el pago con el equipo de soporte.
          </AlertDescription>
        </Alert>
      </div>

      {/* Fixed bottom bar */}
      {selectedDays.length > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 z-50"
        >
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div>
              <p className="text-xs text-slate-500">{selectedDays.length} día(s) • {seats} asiento(s)</p>
              <p className="text-xl font-bold text-slate-900">${total} MXN</p>
            </div>
            <Button
              onClick={handleBooking}
              disabled={booking || seatsLeft === 0}
              className="flex-1 h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl text-base font-bold disabled:opacity-60"
            >
              {booking ? <Loader2 className="w-5 h-5 animate-spin" /> : seatsLeft === 0 ? 'Sin lugares' : '✅ Reservar y pagar'}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}