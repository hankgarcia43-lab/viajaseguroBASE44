import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  MapPin, Clock, Users, DollarSign, Star,
  Loader2, Calendar, AlertCircle, CheckCircle, X,
  Car, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format, parseISO, differenceInHours, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyBookings() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [routes, setRoutes] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const myBookings = await base44.entities.RouteBooking.filter(
        { passenger_id: userData.id },
        '-trip_date',
        50
      );
      setBookings(myBookings);

      // Load route details
      const routeIds = [...new Set(myBookings.map(b => b.route_id))];
      if (routeIds.length > 0) {
        const allRoutes = await base44.entities.Route.list('-created_date', 200);
        const routeDetails = {};
        allRoutes.forEach(r => {
          if (routeIds.includes(r.id)) routeDetails[r.id] = r;
        });
        setRoutes(routeDetails);
      }

    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    // Compare only date portion (ignore time) to avoid timezone issues
    const today = new Date().toISOString().split('T')[0];
    const isUpcoming = b.trip_date >= today && ['pending', 'confirmed'].includes(b.status);
    const isCompleted = b.status === 'completed';
    const isCancelled = b.status === 'cancelled' || b.status === 'no_show';
    
    if (filter === 'upcoming') return isUpcoming;
    if (filter === 'completed') return isCompleted;
    if (filter === 'cancelled') return isCancelled;
    return true;
  });

  const calculateCancellationFee = (booking) => {
    const tripDate = parseISO(booking.trip_date);
    const hoursUntilTrip = differenceInHours(tripDate, new Date());
    
    if (hoursUntilTrip > 24) return 0; // Free cancellation
    if (hoursUntilTrip > 2) return Math.round(booking.total_price * 0.25); // 25% fee
    return booking.total_price; // 100% fee
  };

  const handleCancel = async () => {
    if (!selectedBooking) return;
    
    setCancelling(true);
    try {
      const cancellationFee = calculateCancellationFee(selectedBooking);
      const refundAmount = selectedBooking.total_price - cancellationFee;

      await base44.entities.RouteBooking.update(selectedBooking.id, {
        status: 'cancelled',
        cancelled_by: 'passenger',
        cancel_reason: 'Cancelado por pasajero',
        cancellation_fee: cancellationFee,
        payment_status: refundAmount > 0 ? 'refunded' : 'cancelled'
      });

      // Create ledger entry for refund/cancellation
      if (refundAmount > 0) {
        await base44.entities.PaymentLedger.create({
          transaction_type: 'refund',
          reference_type: 'route_booking',
          reference_id: selectedBooking.id,
          user_id: user.id,
          user_role: 'passenger',
          amount: refundAmount,
          status: 'completed',
          description: `Reembolso por cancelación de reserva`
        });
      }

      if (cancellationFee > 0) {
        await base44.entities.PaymentLedger.create({
          transaction_type: 'cancellation_fee',
          reference_type: 'route_booking',
          reference_id: selectedBooking.id,
          user_id: user.id,
          user_role: 'passenger',
          amount: cancellationFee,
          status: 'completed',
          description: `Cargo por cancelación tardía`
        });
      }

      // Notify driver
      const route = routes[selectedBooking.route_id];
      if (route) {
        await base44.entities.Notification.create({
          user_id: route.driver_id,
          type: 'ride_cancelled',
          title: 'Reserva cancelada',
          message: `${user.full_name} canceló su reserva para el ${format(parseISO(selectedBooking.trip_date), "d 'de' MMMM", { locale: es })}`,
          data: JSON.stringify({ booking_id: selectedBooking.id })
        });
      }

      setBookings(bookings.map(b => 
        b.id === selectedBooking.id ? { ...b, status: 'cancelled' } : b
      ));
      
      toast.success(refundAmount > 0 
        ? `Reserva cancelada. Se reembolsarán $${refundAmount} MXN` 
        : 'Reserva cancelada');
      
      setShowCancelDialog(false);
      setSelectedBooking(null);

    } catch (error) {
      toast.error('Error al cancelar');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status) => {
    const statuses = {
      pending: { color: 'bg-yellow-100 text-yellow-700', text: 'Pendiente' },
      confirmed: { color: 'bg-green-100 text-green-700', text: 'Confirmada' },
      in_progress: { color: 'bg-blue-100 text-blue-700', text: 'En camino' },
      completed: { color: 'bg-slate-100 text-slate-700', text: 'Completada' },
      cancelled: { color: 'bg-red-100 text-red-700', text: 'Cancelada' },
      no_show: { color: 'bg-orange-100 text-orange-700', text: 'No asistió' }
    };
    const s = statuses[status] || statuses.pending;
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
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Mis reservas</h1>
          <p className="text-slate-500">Viajes en rutas compartidas</p>
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="mb-6">
          <TabsList className="w-full bg-white">
            <TabsTrigger value="upcoming" className="flex-1">
              Próximas ({bookings.filter(b => { const today = new Date().toISOString().split('T')[0]; return b.trip_date >= today && ['pending', 'confirmed'].includes(b.status); }).length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">
              Completadas
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex-1">
              Canceladas
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">Sin reservas</h3>
              <p className="text-slate-500 mb-6">Aún no tienes reservas en esta categoría</p>
              <Link to={createPageUrl('SearchRoutes')}>
                <Button>Buscar rutas</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredBookings.map((booking, index) => {
                const route = routes[booking.route_id];

                const tripDate = parseISO(booking.trip_date);
                const today = new Date().toISOString().split('T')[0];
                const canCancel = booking.trip_date >= today && ['pending', 'confirmed'].includes(booking.status);

                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm text-slate-500">
                              {format(tripDate, "EEEE d 'de' MMMM", { locale: es })}
                            </p>
                            {getStatusBadge(booking.status)}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">${booking.total_price}</p>
                            <p className="text-xs text-slate-500">{booking.seats_booked} asiento(s)</p>
                          </div>
                        </div>

                        {/* Route */}
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

                        {/* Driver */}
                        <div className="flex items-center gap-3 pt-3 border-t">
                          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                            {route?.driver_photo ? (
                              <img src={route.driver_photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Car className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{route?.driver_name || booking.driver_id}</p>
                            <p className="text-sm text-slate-500">{route?.vehicle_model} {route?.vehicle_plate ? `• ${route.vehicle_plate}` : ''}</p>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {booking.payment_status === 'paid' && (
                              <Link to={createPageUrl('PassengerTicket') + `?bookingId=${booking.id}`}>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs h-7 px-2">
                                  Ver boleto
                                </Button>
                              </Link>
                            )}
                            {canCancel && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowCancelDialog(true);
                                }}
                              >
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar reserva</DialogTitle>
            <DialogDescription>
              {selectedBooking && (
                <>
                  {calculateCancellationFee(selectedBooking) === 0 ? (
                    <span className="text-green-600">
                      Cancelación gratuita. Se reembolsará el total de ${selectedBooking.total_price} MXN.
                    </span>
                  ) : calculateCancellationFee(selectedBooking) < selectedBooking.total_price ? (
                    <span className="text-amber-600">
                      Se aplicará un cargo de ${calculateCancellationFee(selectedBooking)} MXN por cancelación tardía. 
                      Se reembolsarán ${selectedBooking.total_price - calculateCancellationFee(selectedBooking)} MXN.
                    </span>
                  ) : (
                    <span className="text-red-600">
                      Cancelación a menos de 2 horas del viaje. No aplica reembolso.
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Volver
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar cancelación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}