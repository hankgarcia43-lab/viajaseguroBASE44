import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  DollarSign, CreditCard, AlertCircle, CheckCircle, 
  Clock, Loader2, RefreshCw, Download, Ban
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [action, setAction] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({
    totalGMV: 0,
    pendingCapture: 0,
    captured: 0,
    disputed: 0
  });

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const allPayments = await base44.entities.Payment.list('-created_date', 200);
      setPayments(allPayments);

      // Calculate stats
      const totalGMV = allPayments
        .filter(p => p.status === 'captured')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const pendingCapture = allPayments
        .filter(p => ['preauthorized', 'pending_capture'].includes(p.status))
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const captured = allPayments
        .filter(p => p.status === 'captured')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const disputed = allPayments
        .filter(p => p.dispute_flag)
        .length;

      setStats({ totalGMV, pendingCapture, captured, disputed });

    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => {
    if (filter === 'pending') return ['preauthorized', 'pending_capture'].includes(p.status);
    if (filter === 'captured') return p.status === 'captured';
    if (filter === 'disputed') return p.dispute_flag;
    if (filter === 'refunded') return p.status === 'refunded';
    return true;
  });

  const handleAction = async () => {
    if (!selectedPayment) return;

    setProcessing(true);
    try {
      const user = await base44.auth.me();

      if (action === 'capture') {
        await base44.entities.Payment.update(selectedPayment.id, {
          status: 'captured',
          captured_at: new Date().toISOString(),
          dispute_flag: false
        });

        // Update driver balance
        if (selectedPayment.driver_id) {
          const drivers = await base44.entities.Driver.filter({ id: selectedPayment.driver_id });
          if (drivers.length > 0) {
            await base44.entities.Driver.update(drivers[0].id, {
              earnings_balance: (drivers[0].earnings_balance || 0) + selectedPayment.payout_driver
            });
          }
        }

        toast.success('Pago capturado');

      } else if (action === 'refund') {
        const amount = parseFloat(refundAmount) || selectedPayment.amount;
        
        await base44.entities.Payment.update(selectedPayment.id, {
          status: 'refunded',
          refund_amount: amount,
          refund_reason: reason
        });

        toast.success('Reembolso procesado');

      } else if (action === 'cancel') {
        await base44.entities.Payment.update(selectedPayment.id, {
          status: 'cancelled'
        });

        toast.success('Pago cancelado');
      }

      // Log action
      await base44.entities.AuditLog.create({
        user_id: user.id,
        user_email: user.email,
        action: action === 'capture' ? 'payment_capture' : 'payment_refund',
        entity_type: 'Payment',
        entity_id: selectedPayment.id,
        details: JSON.stringify({ action, amount: refundAmount, reason })
      });

      await loadPayments();
      setShowDialog(false);
      setSelectedPayment(null);
      setRefundAmount('');
      setReason('');

    } catch (error) {
      toast.error('Error al procesar');
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (payment, actionType) => {
    setSelectedPayment(payment);
    setAction(actionType);
    setRefundAmount(payment.amount?.toString() || '');
    setReason('');
    setShowDialog(true);
  };

  const getStatusBadge = (payment) => {
    if (payment.dispute_flag) {
      return <Badge className="bg-red-100 text-red-700">Disputado</Badge>;
    }
    
    const statuses = {
      preauthorized: { color: 'bg-blue-100 text-blue-700', text: 'Pre-autorizado' },
      pending_capture: { color: 'bg-yellow-100 text-yellow-700', text: 'Pendiente' },
      captured: { color: 'bg-green-100 text-green-700', text: 'Capturado' },
      refunded: { color: 'bg-purple-100 text-purple-700', text: 'Reembolsado' },
      cancelled: { color: 'bg-slate-100 text-slate-700', text: 'Cancelado' },
      failed: { color: 'bg-red-100 text-red-700', text: 'Fallido' }
    };
    const s = statuses[payment.status] || statuses.pending_capture;
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de pagos</h1>
            <p className="text-slate-500">Capturas, reembolsos y disputas</p>
          </div>
          <Button variant="outline" onClick={loadPayments}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">${stats.captured.toLocaleString()}</p>
                  <p className="text-sm text-slate-500">Capturado total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">${stats.pendingCapture.toLocaleString()}</p>
                  <p className="text-sm text-slate-500">Pendiente captura</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.disputed}</p>
                  <p className="text-sm text-slate-500">Disputas activas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{payments.length}</p>
                  <p className="text-sm text-slate-500">Total transacciones</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="mb-6">
          <TabsList className="bg-white">
            <TabsTrigger value="pending">
              Pendientes ({payments.filter(p => ['preauthorized', 'pending_capture'].includes(p.status)).length})
            </TabsTrigger>
            <TabsTrigger value="disputed">
              Disputados ({payments.filter(p => p.dispute_flag).length})
            </TabsTrigger>
            <TabsTrigger value="captured">
              Capturados ({payments.filter(p => p.status === 'captured').length})
            </TabsTrigger>
            <TabsTrigger value="refunded">
              Reembolsados ({payments.filter(p => p.status === 'refunded').length})
            </TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Payments Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">ID Viaje</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Monto</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Comisión</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Conductor</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Estado</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Fecha</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-mono text-sm text-slate-700">
                          {payment.ride_id?.slice(0, 8)}...
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">${payment.amount}</p>
                        <p className="text-xs text-slate-500">
                          {payment.payment_method_brand} •••• {payment.payment_method_last4}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">${payment.fee_platform}</p>
                        <p className="text-xs text-slate-500">{payment.fee_percentage}%</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-green-600 font-medium">${payment.payout_driver}</p>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(payment)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {format(new Date(payment.created_date), "d MMM HH:mm", { locale: es })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {['preauthorized', 'pending_capture'].includes(payment.status) && !payment.dispute_flag && (
                            <Button
                              size="sm"
                              onClick={() => openActionDialog(payment, 'capture')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Capturar
                            </Button>
                          )}
                          {payment.dispute_flag && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => openActionDialog(payment, 'capture')}
                              >
                                Liberar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openActionDialog(payment, 'refund')}
                              >
                                Reembolsar
                              </Button>
                            </>
                          )}
                          {payment.status === 'captured' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openActionDialog(payment, 'refund')}
                            >
                              Reembolsar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredPayments.length === 0 && (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No hay pagos en esta categoría</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {action === 'capture' && 'Capturar pago'}
                {action === 'refund' && 'Procesar reembolso'}
                {action === 'cancel' && 'Cancelar pago'}
              </DialogTitle>
              <DialogDescription>
                {action === 'capture' && 'Se procesará el cargo en la tarjeta del pasajero y se acreditará al conductor.'}
                {action === 'refund' && 'Se devolverá el monto al pasajero.'}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {action === 'refund' && (
                <div>
                  <Label>Monto a reembolsar (MXN)</Label>
                  <Input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    max={selectedPayment?.amount}
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Máximo: ${selectedPayment?.amount}
                  </p>
                </div>
              )}

              <div>
                <Label>Razón / Notas</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motivo de la acción..."
                  className="mt-2"
                />
              </div>

              {selectedPayment && (
                <div className="p-3 bg-slate-50 rounded-lg text-sm">
                  <p><strong>Monto:</strong> ${selectedPayment.amount}</p>
                  <p><strong>Comisión plataforma:</strong> ${selectedPayment.fee_platform}</p>
                  <p><strong>Pago conductor:</strong> ${selectedPayment.payout_driver}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAction}
                disabled={processing}
                className={action === 'refund' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Confirmar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}