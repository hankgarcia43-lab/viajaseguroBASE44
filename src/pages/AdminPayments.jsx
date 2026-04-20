import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  DollarSign, CreditCard, AlertCircle, CheckCircle, 
  Clock, Loader2, RefreshCw, X, Eye, Image, Users,
  MapPin, Ban
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function AdminPayments() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [routesMap, setRoutesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(''); // 'approve' | 'reject'
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const userData = await base44.auth.me();
      if (userData?.role !== 'admin') {
        toast.error('Acceso restringido a administradores');
        return;
      }
      setUser(userData);

      const allBookings = await base44.entities.RouteBooking.list('-created_date', 200);
      setBookings(allBookings);

      const routeIds = [...new Set(allBookings.map(b => b.route_id).filter(Boolean))];
      if (routeIds.length > 0) {
        const allRoutes = await base44.entities.Route.list('-created_date', 200);
        const rMap = {};
        allRoutes.forEach(r => { rMap[r.id] = r; });
        setRoutesMap(rMap);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'pending') return b.payment_status === 'pending' && b.status !== 'cancelled';
    if (filter === 'paid') return b.payment_status === 'paid';
    if (filter === 'rejected') return b.payment_status === 'cancelled';
    return true;
  });

  const pendingWithReceipt = bookings.filter(b => b.payment_status === 'pending' && b.receipt_url && b.status !== 'cancelled');

  const openApprove = (booking) => {
    setSelected(booking);
    setAction('approve');
    setRejectReason('');
    setShowActionDialog(true);
  };

  const openReject = (booking) => {
    setSelected(booking);
    setAction('reject');
    setRejectReason('');
    setShowActionDialog(true);
  };

  const handleAction = async () => {
    if (!selected || !user) return;
    if (action === 'reject' && !rejectReason.trim()) {
      toast.error('Escribe el motivo del rechazo');
      return;
    }

    setProcessing(true);
    try {
      const route = routesMap[selected.route_id];

      if (action === 'approve') {
        // Guard: already paid
        if (selected.payment_status === 'paid') {
          toast.error('Este pago ya fue aprobado anteriormente');
          return;
        }

        // Guard: check seat availability
        if (route) {
          const activeBookings = await base44.entities.RouteBooking.filter({ route_id: selected.route_id });
          const alreadyBooked = activeBookings.filter(b => 
            b.id !== selected.id && ['confirmed', 'in_progress'].includes(b.status)
          ).reduce((sum, b) => sum + (b.seats_booked || 1), 0);
          const available = (route.total_seats || 0) - alreadyBooked;
          if (available < (selected.seats_booked || 1)) {
            toast.error(`Sin lugares disponibles. Solo quedan ${available} asiento(s).`);
            return;
          }
        }

        // Approve: update booking
        await base44.entities.RouteBooking.update(selected.id, {
          status: 'confirmed',
          payment_status: 'paid',
        });

        // Notify passenger
        await base44.entities.Notification.create({
          user_id: selected.passenger_id,
          type: 'payment',
          title: '¡Pago aprobado!',
          message: 'Pago aprobado. Tu boleto ya está disponible.',
          data: JSON.stringify({ booking_id: selected.id }),
          ride_id: selected.route_id,
        });

        // Notify driver
        if (route) {
          const activeBookingsAfter = await base44.entities.RouteBooking.filter({ route_id: selected.route_id });
          const bookedSeats = activeBookingsAfter.filter(b => 
            ['confirmed', 'in_progress'].includes(b.status)
          ).reduce((sum, b) => sum + (b.seats_booked || 1), 0);
          const remaining = Math.max(0, (route.total_seats || 0) - bookedSeats);

          await base44.entities.Notification.create({
            user_id: route.driver_id,
            type: 'payment',
            title: '¡Nueva reserva confirmada!',
            message: `Se reservó y pagó ${selected.seats_booked || 1} asiento(s) en tu ruta ${route.origin_poi_name || route.origin_address} → ${route.dest_poi_name || route.dest_address}. Quedan ${remaining} lugar(es) disponibles.`,
            data: JSON.stringify({ booking_id: selected.id, route_id: selected.route_id }),
          });
        }

        // Audit log
        await base44.entities.AuditLog.create({
          user_id: user.id,
          user_email: user.email,
          action: 'payment_capture',
          entity_type: 'RouteBooking',
          entity_id: selected.id,
          details: JSON.stringify({ approved_by: user.email, booking_id: selected.id, amount: selected.total_price }),
        });

        toast.success('Pago aprobado. El conductor fue notificado de la reserva confirmada.');

      } else if (action === 'reject') {
        await base44.entities.RouteBooking.update(selected.id, {
          payment_status: 'cancelled',
          cancel_reason: rejectReason,
        });

        // Notify passenger
        await base44.entities.Notification.create({
          user_id: selected.passenger_id,
          type: 'payment',
          title: 'Pago rechazado',
          message: `Pago rechazado. Revisa el motivo y vuelve a subir comprobante. Motivo: ${rejectReason}`,
          data: JSON.stringify({ booking_id: selected.id }),
        });

        // Audit log
        await base44.entities.AuditLog.create({
          user_id: user.id,
          user_email: user.email,
          action: 'payment_refund',
          entity_type: 'RouteBooking',
          entity_id: selected.id,
          details: JSON.stringify({ rejected_by: user.email, reason: rejectReason }),
        });

        toast.success('Pago rechazado. El pasajero fue notificado.');
      }

      await loadData();
      setShowActionDialog(false);
      setSelected(null);

    } catch (e) {
      toast.error('Error al procesar la acción');
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const getPaymentBadge = (b) => {
    if (b.payment_status === 'paid') return <Badge className="bg-green-100 text-green-700">Pagado</Badge>;
    if (b.payment_status === 'cancelled') return <Badge className="bg-red-100 text-red-700">Rechazado</Badge>;
    if (b.receipt_url) return <Badge className="bg-amber-100 text-amber-700">Comprobante subido</Badge>;
    return <Badge className="bg-slate-100 text-slate-600">Sin comprobante</Badge>;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de pagos</h1>
            <p className="text-slate-500">Aprobación de reservas y comprobantes</p>
          </div>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{pendingWithReceipt.length}</p>
                <p className="text-sm text-slate-500">Listos para revisar</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {bookings.filter(b => b.payment_status === 'pending' && !b.receipt_url && b.status !== 'cancelled').length}
                </p>
                <p className="text-sm text-slate-500">Sin comprobante</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {bookings.filter(b => b.payment_status === 'paid').length}
                </p>
                <p className="text-sm text-slate-500">Aprobados</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  ${bookings.filter(b => b.payment_status === 'paid').reduce((s, b) => s + (b.total_price || 0), 0).toLocaleString()}
                </p>
                <p className="text-sm text-slate-500">Total aprobado</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="mb-4">
          <TabsList className="bg-white">
            <TabsTrigger value="pending">
              Pendientes ({bookings.filter(b => b.payment_status === 'pending' && b.status !== 'cancelled').length})
            </TabsTrigger>
            <TabsTrigger value="paid">
              Aprobados ({bookings.filter(b => b.payment_status === 'paid').length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rechazados ({bookings.filter(b => b.payment_status === 'cancelled').length})
            </TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Bookings list */}
        <div className="space-y-3">
          {filteredBookings.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No hay pagos en esta categoría</p>
              </CardContent>
            </Card>
          )}

          {filteredBookings.map((booking) => {
            const route = routesMap[booking.route_id];
            const referenceCode = booking.id.slice(-8).toUpperCase();
            return (
              <Card key={booking.id} className={`${booking.receipt_url && booking.payment_status === 'pending' ? 'border-amber-300 bg-amber-50/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {getPaymentBadge(booking)}
                        <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">REF: {referenceCode}</span>
                        <span className="text-xs text-slate-400">
                          {format(parseISO(booking.created_date || new Date().toISOString()), "d MMM yyyy HH:mm", { locale: es })}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          {route ? (
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {route.origin_poi_name || route.origin_address} → {route.dest_poi_name || route.dest_address}
                            </p>
                          ) : (
                            <p className="text-sm text-slate-400">Ruta no disponible</p>
                          )}
                          <p className="text-xs text-slate-500">
                            Pasajero: {booking.passenger_name || booking.passenger_id?.slice(0, 8)} · {booking.seats_booked || 1} asiento(s) · {(booking.days_booked || []).join(', ')}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-slate-900">${booking.total_price}</p>
                          <p className="text-xs text-slate-400">MXN</p>
                        </div>
                      </div>

                      {booking.cancel_reason && (
                        <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                          Motivo rechazo: {booking.cancel_reason}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {booking.receipt_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelected(booking); setShowReceiptDialog(true); }}
                          className="gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Comprobante
                        </Button>
                      )}

                      {booking.payment_status === 'pending' && booking.status !== 'cancelled' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openApprove(booking)}
                            className="bg-green-600 hover:bg-green-700 gap-1"
                            disabled={!booking.receipt_url}
                            title={!booking.receipt_url ? 'El pasajero aún no subió comprobante' : ''}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openReject(booking)}
                            className="gap-1"
                          >
                            <X className="w-4 h-4" />
                            Rechazar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Receipt viewer */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Comprobante de pago</DialogTitle>
            <DialogDescription>
              Pasajero: {selected?.passenger_name} · ${selected?.total_price} MXN · REF: {selected?.id?.slice(-8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          {selected?.receipt_url && (
            <div className="mt-2">
              {selected.receipt_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img
                  src={selected.receipt_url}
                  alt="Comprobante"
                  className="w-full rounded-xl border object-contain max-h-[60vh]"
                />
              ) : (
                <a href={selected.receipt_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver comprobante (PDF u otro formato)
                  </Button>
                </a>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {selected?.payment_status === 'pending' && selected?.status !== 'cancelled' && (
              <>
                <Button
                  onClick={() => { setShowReceiptDialog(false); openApprove(selected); }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprobar pago
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => { setShowReceiptDialog(false); openReject(selected); }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve / Reject dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={action === 'approve' ? 'text-green-700' : 'text-red-700'}>
              {action === 'approve' ? '✅ Aprobar pago' : '❌ Rechazar pago'}
            </DialogTitle>
            <DialogDescription>
              {selected && (
                <span>
                  Reserva de <strong>{selected.passenger_name}</strong> · <strong>${selected.total_price} MXN</strong>
                  {' '}· REF: <code>{selected?.id?.slice(-8).toUpperCase()}</code>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4">
            {action === 'approve' && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-200 space-y-1 text-sm">
                <p className="font-semibold text-green-800">Al aprobar:</p>
                <ul className="text-green-700 space-y-0.5 list-disc list-inside">
                  <li>La reserva cambiará a "Confirmada"</li>
                  <li>El pasajero podrá ver su boleto inmediatamente</li>
                  <li>El conductor recibirá notificación de la reserva confirmada</li>
                  <li>Se descontará 1 asiento del viaje</li>
                </ul>
              </div>
            )}

            {action === 'reject' && (
              <div>
                <Label>Motivo del rechazo <span className="text-red-500">*</span></Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ej: Comprobante ilegible, monto incorrecto, referencia no encontrada..."
                  className="mt-2"
                  rows={3}
                />
                <p className="text-xs text-slate-500 mt-1">Este mensaje se enviará al pasajero.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)} disabled={processing}>
              Cancelar
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing || (action === 'reject' && !rejectReason.trim())}
              className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : action === 'approve' ? (
                <><CheckCircle className="w-4 h-4 mr-2" />Confirmar aprobación</>
              ) : (
                <><X className="w-4 h-4 mr-2" />Confirmar rechazo</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}