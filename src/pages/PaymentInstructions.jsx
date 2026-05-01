import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { useNavigate, Link } from 'react-router-dom';
import { 
  CheckCircle, CreditCard, Clock, Loader2, Copy, 
  AlertCircle, Upload, Image, ExternalLink, AlertTriangle,
  Ban, Ticket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const MERCADOPAGO_LINK = 'https://link.mercadopago.com.mx/viajaseguro2026';

const BANK_DEFAULTS = {
  bank_name: 'BBVA',
  bank_account_holder: 'Viaja Seguro',
  bank_clabe: '',
  bank_account_number: '',
  mercadopago_link: MERCADOPAGO_LINK,
};

// Status definitions
const PAYMENT_STATUS = {
  pending_no_receipt: {
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
    label: 'Pendiente de pago',
    desc: 'Realiza tu pago y sube el comprobante.',
  },
  pending_with_receipt: {
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Clock,
    label: 'Pago en revisión',
    desc: 'Tu comprobante está siendo revisado por el equipo (máx. 12 hrs).',
  },
  paid: {
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    label: 'Pago aprobado ✓',
    desc: 'Tu pago fue validado. Tu boleto está disponible.',
  },
  cancelled: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: Ban,
    label: 'Pago rechazado',
    desc: 'El comprobante no fue aceptado. Sube uno nuevo.',
  },
};

function getStatusKey(booking) {
  if (booking.payment_status === 'paid') return 'paid';
  if (booking.payment_status === 'cancelled') return 'cancelled';
  if (booking.receipt_url) return 'pending_with_receipt';
  return 'pending_no_receipt';
}

export default function PaymentInstructions() {
  const [booking, setBooking] = useState(null);
  const [route, setRoute] = useState(null);
  const [bankInfo, setBankInfo] = useState(BANK_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  // Poll every 8s waiting for admin approval
  useEffect(() => {
    if (!booking || booking.payment_status === 'paid') return;
    const interval = setInterval(async () => {
      try {
        const fresh = await base44.entities.RouteBooking.filter({ id: booking.id });
        if (fresh.length > 0 && fresh[0].payment_status === 'paid') {
          clearInterval(interval);
          setBooking(fresh[0]);
          toast.success('¡Pago aprobado! Tu boleto ya está disponible.');
        } else if (fresh.length > 0) {
          setBooking(fresh[0]);
          if (fresh[0].receipt_url) setReceiptUrl(fresh[0].receipt_url);
        }
      } catch { /* silencioso */ }
    }, 8000);
    return () => clearInterval(interval);
  }, [booking?.id, booking?.payment_status]);

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

      const loaded = { ...BANK_DEFAULTS };
      configs.forEach(c => {
        if (c.config_key.startsWith('bank_') || c.config_key === 'mercadopago_link') loaded[c.config_key] = c.config_value;
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
    if (file.size > 8 * 1024 * 1024) { toast.error('El archivo no debe superar 8 MB'); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.RouteBooking.update(booking.id, { receipt_url: file_url });
      setReceiptUrl(file_url);
      setBooking(prev => ({ ...prev, receipt_url: file_url }));
      toast.success('Comprobante enviado. El equipo lo revisará en breve.');
    } catch {
      toast.error('Error al subir comprobante. Intenta de nuevo.');
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

  const statusKey = getStatusKey(booking);
  const status = PAYMENT_STATUS[statusKey];
  const StatusIcon = status.icon;
  const referenceCode = booking.id.slice(-8).toUpperCase();
  const mpLink = bankInfo.mercadopago_link || MERCADOPAGO_LINK;
  const dayLabels = { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo' };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* ── Payment status banner ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-3 p-4 rounded-2xl border mb-6 ${status.color}`}
        >
          <StatusIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">{status.label}</p>
            <p className="text-xs mt-0.5 opacity-80">{status.desc}</p>
          </div>
        </motion.div>

        {/* ── APPROVED: show ticket button ── */}
        {statusKey === 'paid' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6">
            <Card className="border-green-300 bg-green-50">
              <CardContent className="p-5 text-center">
                <Ticket className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h2 className="font-bold text-green-900 text-lg mb-1">¡Tu boleto está listo!</h2>
                <p className="text-green-700 text-sm mb-4">El pago fue validado por el equipo.</p>
                <Link to={createPageUrl('PassengerTicket') + `?bookingId=${booking.id}`}>
                  <Button className="bg-green-600 hover:bg-green-700 w-full rounded-xl">
                    <Ticket className="w-4 h-4 mr-2" />
                    Ver mi boleto de abordaje
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── REJECTED: show re-upload prompt ── */}
        {statusKey === 'cancelled' && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-800 text-sm">Pago rechazado</p>
                {booking.cancel_reason && (
                  <p className="text-xs text-red-700 mt-1">Motivo: {booking.cancel_reason}</p>
                )}
                <p className="text-xs text-red-600 mt-1">Vuelve a realizar el pago y sube un nuevo comprobante.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Booking summary ── */}
        <Card className="mb-5">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-900">Tu reserva</h3>
            {route && (
              <p className="text-sm text-slate-600">
                <span className="font-medium">{route.origin_poi_name || route.origin_address}</span>
                {' → '}
                <span className="font-medium">{route.dest_poi_name || route.dest_address}</span>
                {' · '}{booking.departure_time}
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {(booking.days_booked || []).map(day => (
                <Badge key={day} variant="outline" className="text-xs">{dayLabels[day] || day}</Badge>
              ))}
            </div>
            <div className="pt-3 border-t space-y-1 text-sm">
              {booking.subtotal !== booking.total_price && (
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span><span>${booking.subtotal} MXN</span>
                </div>
              )}
              {booking.weekly_discount && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Descuento semanal</span><span>−${booking.discount_amount} MXN</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-base pt-1 border-t">
                <span>Total exacto a pagar</span>
                <div className="flex items-center gap-2">
                  <span className="text-green-700 text-xl">${booking.total_price} MXN</span>
                  <button onClick={() => copyText(`${booking.total_price}`, 'Monto')} className="text-slate-400 hover:text-slate-600">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Only show payment options if not yet paid ── */}
        {statusKey !== 'paid' && (
          <>
            {/* ── Mercado Pago CTA ── */}
            <Card className="mb-5 border-[#009ee3] bg-[#f0f9ff]">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-[#009ee3] flex items-center justify-center">
                    <span className="text-white font-bold text-xs">MP</span>
                  </div>
                  <p className="font-bold text-[#003087] text-sm">Pagar con Mercado Pago</p>
                  <Badge className="bg-[#009ee3]/20 text-[#003087] border-0 text-[10px] ml-auto">Recomendado</Badge>
                </div>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Haz clic en el botón, ingresa al link y paga el monto exacto de{' '}
                  <strong className="text-slate-900">${booking.total_price} MXN</strong>.{' '}
                  <span className="text-red-600 font-medium">No redondees ni cambies la cantidad.</span>
                </p>
                <a href={mpLink} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-[#009ee3] hover:bg-[#0082c8] text-white rounded-xl h-12 text-base font-semibold gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Pagar ${booking.total_price} MXN con Mercado Pago
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* ── Instructions ── */}
            <Card className="mb-5">
              <CardContent className="p-5">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  Instrucciones de pago
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      num: '1',
                      title: 'Paga el monto exacto',
                      desc: `$${booking.total_price} MXN. No redondees ni cambies la cantidad. El admin verifica el monto exacto.`,
                      warn: true,
                    },
                    {
                      num: '2',
                      title: 'Usa el botón de arriba',
                      desc: 'Haz clic en "Pagar con Mercado Pago" y completa el pago en la página de Mercado Pago.',
                    },
                    {
                      num: '3',
                      title: 'Sube tu comprobante',
                      desc: 'Toma captura de pantalla del comprobante y súbela en el campo de abajo.',
                    },
                    {
                      num: '4',
                      title: 'Espera validación (máx. 12 hrs)',
                      desc: 'El equipo revisará tu pago y recibirás tu boleto digital en cuanto sea aprobado.',
                    },
                  ].map((step) => (
                    <div key={step.num} className="flex gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${step.warn ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>
                        {step.num}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{step.title}</p>
                        <p className={`text-sm ${step.warn ? 'text-red-600 font-medium' : 'text-slate-600'}`}>{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Reference code ── */}
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200 mb-5">
              <div className="flex-1">
                <p className="text-xs text-amber-700 font-medium mb-0.5">Referencia de tu reserva</p>
                <p className="font-mono font-bold text-amber-900 tracking-widest text-lg">{referenceCode}</p>
                <p className="text-xs text-amber-600 mt-0.5">Incluye este código si pagas por transferencia bancaria</p>
              </div>
              <button onClick={() => copyText(referenceCode, 'Referencia')} className="ml-3 text-amber-500 hover:text-amber-700">
                <Copy className="w-5 h-5" />
              </button>
            </div>

            {/* ── Receipt upload ── */}
            <Card className={`mb-5 ${receiptUrl ? 'border-green-300 bg-green-50' : statusKey === 'cancelled' ? 'border-red-200' : 'border-dashed border-slate-300'}`}>
              <CardContent className="p-5">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-slate-600" />
                  {receiptUrl ? 'Comprobante enviado' : 'Sube tu comprobante de pago'}
                </h3>

                {receiptUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium text-sm">Comprobante recibido · pendiente de revisión</span>
                    </div>
                    <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                      <img src={receiptUrl} alt="Comprobante" className="w-full max-h-48 object-contain rounded-xl border bg-white" />
                    </a>
                    <button
                      onClick={() => document.getElementById('receipt-input').click()}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      ¿Pago incorrecto? Cambiar comprobante
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => document.getElementById('receipt-input').click()}
                    disabled={uploading}
                    className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-blue-400 hover:bg-blue-50 transition-all"
                  >
                    {uploading ? (
                      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    ) : (
                      <Upload className="w-10 h-10 text-slate-400" />
                    )}
                    <p className="text-sm font-semibold text-slate-700">
                      {uploading ? 'Subiendo comprobante...' : 'Toca aquí para subir tu comprobante'}
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

            {/* ── Waiting alert ── */}
            {statusKey === 'pending_with_receipt' && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5 text-sm text-amber-800">
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                <span>Verificando pago automáticamente... Serás notificado cuando sea aprobado.</span>
              </div>
            )}
          </>
        )}

        <Link to={createPageUrl('MyBookings')}>
          <Button variant="outline" className="w-full rounded-xl">Ver mis reservas</Button>
        </Link>
      </div>
    </div>
  );
}