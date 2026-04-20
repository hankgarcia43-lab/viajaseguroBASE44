import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useNavigate, Link } from 'react-router-dom';
import { 
  CheckCircle, CreditCard, Clock, Loader2, Copy, 
  AlertCircle, Upload, Image, X, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const BANK_DEFAULTS = {
  bank_name: 'BBVA',
  bank_account_holder: 'Viaja Seguro S.A. de C.V.',
  bank_clabe: '012345678901234567',
  bank_account_number: '1234567890',
};

export default function PaymentInstructions() {
  const [booking, setBooking] = useState(null);
  const [route, setRoute] = useState(null);
  const [bankInfo, setBankInfo] = useState(BANK_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const bookingId = params.get('bookingId');
      if (!bookingId) { navigate(createPageUrl('MyBookings')); return; }

      const [bookingsData, configs] = await Promise.all([
        base44.entities.RouteBooking.filter({ id: bookingId }),
        base44.entities.AppConfig.list()
      ]);

      if (bookingsData.length === 0) { navigate(createPageUrl('MyBookings')); return; }
      const b = bookingsData[0];
      setBooking(b);
      if (b.receipt_url) setReceiptUrl(b.receipt_url);

      // Load bank info from config
      const loaded = { ...BANK_DEFAULTS };
      configs.forEach(c => {
        if (c.config_key.startsWith('bank_')) loaded[c.config_key] = c.config_value;
      });
      setBankInfo(loaded);

      const routes = await base44.entities.Route.filter({ id: b.route_id });
      if (routes.length > 0) setRoute(routes[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('El archivo no debe superar 8 MB');
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.RouteBooking.update(booking.id, { receipt_url: file_url });
      setReceiptUrl(file_url);
      toast.success('Comprobante subido. El admin lo revisará pronto.');
    } catch (e) {
      toast.error('Error al subir comprobante');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (!booking) return null;

  const dayLabels = { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo' };
  const isApproved = booking.payment_status === 'paid';

  if (isApproved) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h2 className="font-bold text-green-900 text-lg mb-2">Pago aprobado</h2>
            <p className="text-green-700 text-sm mb-4">Tu boleto ya está disponible.</p>
            <Link to={createPageUrl('PassengerTicket') + `?bookingId=${booking.id}`}>
              <Button className="bg-green-600 hover:bg-green-700 w-full">Ver mi boleto</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const referenceCode = booking.id.slice(-8).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Reserva creada!</h1>
          <p className="text-slate-600">Realiza el depósito para confirmar tu lugar</p>
        </motion.div>

        {/* Booking summary */}
        <Card className="mb-5">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-900">Resumen de tu reserva</h3>
            {route && (
              <div className="text-sm text-slate-600 space-y-1">
                <p><span className="font-medium">Ruta:</span> {route.origin_poi_name || route.origin_address} → {route.dest_poi_name || route.dest_address}</p>
                <p><span className="font-medium">Horario:</span> {booking.departure_time}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {(booking.days_booked || []).map(day => (
                <Badge key={day} variant="outline" className="text-xs">{dayLabels[day] || day}</Badge>
              ))}
            </div>
            <div className="pt-3 border-t space-y-1 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>${booking.subtotal} MXN</span>
              </div>
              {booking.weekly_discount && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Descuento semanal</span>
                  <span>−${booking.discount_amount} MXN</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-base pt-1 border-t">
                <span>Total a pagar</span>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-xl">${booking.total_price} MXN</span>
                  <button onClick={() => copyText(`${booking.total_price}`, 'Monto')} className="text-slate-400 hover:text-slate-600">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank data */}
        <Card className="mb-5 border-blue-200">
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Datos para depósito / transferencia
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Banco', value: bankInfo.bank_name, canCopy: false },
                { label: 'Titular', value: bankInfo.bank_account_holder, canCopy: true },
                { label: 'CLABE interbancaria', value: bankInfo.bank_clabe, canCopy: true, mono: true },
                { label: 'Número de cuenta', value: bankInfo.bank_account_number, canCopy: true, mono: true },
              ].map(({ label, value, canCopy, mono }) => (
                <div key={label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                    <p className={`font-semibold text-slate-900 truncate ${mono ? 'font-mono tracking-wide' : ''}`}>{value || '—'}</p>
                  </div>
                  {canCopy && value && (
                    <button
                      onClick={() => copyText(value, label)}
                      className="ml-3 text-slate-400 hover:text-blue-600 flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Reference */}
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex-1">
                  <p className="text-xs text-amber-700 mb-0.5 font-medium">Referencia / Concepto de pago</p>
                  <p className="font-mono font-bold text-amber-900 tracking-widest text-lg">{referenceCode}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Escribe este código en el concepto de tu transferencia</p>
                </div>
                <button
                  onClick={() => copyText(referenceCode, 'Referencia')}
                  className="ml-3 text-amber-500 hover:text-amber-700 flex-shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mb-5">
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Instrucciones
            </h3>
            <div className="space-y-4">
              {[
                { num: '1', title: 'Deposita el monto exacto', desc: `Transfiere $${booking.total_price} MXN a la cuenta indicada.` },
                { num: '2', title: 'Incluye la referencia', desc: `Escribe el código "${referenceCode}" en el concepto del pago.` },
                { num: '3', title: 'Sube tu comprobante', desc: 'Toma foto o sube el comprobante de transferencia aquí abajo.' },
                { num: '4', title: 'Espera validación', desc: 'El admin revisará tu pago. Recibirás notificación de confirmación.' },
              ].map((step) => (
                <div key={step.num} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{step.title}</p>
                    <p className="text-sm text-slate-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Receipt upload */}
        <Card className={`mb-5 ${receiptUrl ? 'border-green-200 bg-green-50' : 'border-dashed border-slate-300'}`}>
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5 text-slate-600" />
              Comprobante de pago
            </h3>
            {receiptUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium text-sm">Comprobante subido correctamente</span>
                </div>
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                  <img src={receiptUrl} alt="Comprobante" className="w-full max-h-48 object-contain rounded-xl border bg-white" />
                </a>
                <button
                  onClick={() => document.getElementById('receipt-input').click()}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Cambiar comprobante
                </button>
              </div>
            ) : (
              <button
                onClick={() => document.getElementById('receipt-input').click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center gap-3 hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                ) : (
                  <Image className="w-8 h-8 text-slate-400" />
                )}
                <p className="text-sm font-medium text-slate-700">
                  {uploading ? 'Subiendo...' : 'Toca para subir comprobante'}
                </p>
                <p className="text-xs text-slate-400">JPG, PNG o PDF · Máx 8 MB</p>
              </button>
            )}
            <input
              id="receipt-input"
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleReceiptUpload}
            />
          </CardContent>
        </Card>

        {/* Status alert */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            Tu pago está en revisión por administración. Recibirás una notificación cuando sea aprobado y tu boleto estará disponible.
          </AlertDescription>
        </Alert>

        <Link to={createPageUrl('MyBookings')}>
          <Button variant="outline" className="w-full rounded-xl">
            Ver mis reservas
          </Button>
        </Link>
      </div>
    </div>
  );
}