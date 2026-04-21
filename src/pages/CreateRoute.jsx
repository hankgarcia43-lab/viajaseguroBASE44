import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import {
  MapPin, Clock, Users, ChevronRight, Loader2, CheckCircle,
  AlertCircle, ChevronDown, Info, ArrowRight, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { loadAppConfig } from '@/lib/useAppConfig';
import { getCommissionPct } from '@/lib/commissionCalc';
import {
  ESTADOS, getMunicipiosOAlcaldias, getPuntosReferencia
} from '@/lib/geoData';

const DAYS = [
  { id: 'lun', label: 'Lun' },
  { id: 'mar', label: 'Mar' },
  { id: 'mie', label: 'Mié' },
  { id: 'jue', label: 'Jue' },
  { id: 'vie', label: 'Vie' },
  { id: 'sab', label: 'Sáb' },
  { id: 'dom', label: 'Dom' },
];

const STEPS = [
  { id: 1, label: 'Abordaje', icon: '🚏' },
  { id: 2, label: 'Llegada', icon: '📍' },
  { id: 3, label: 'Operación', icon: '⚙️' },
  { id: 4, label: 'Confirmar', icon: '✅' },
];

function LocationSelector({ title, subtitle, tip, value, onChange }) {
  const municipios = getMunicipiosOAlcaldias(value.estado);
  const puntos = getPuntosReferencia(value.estado, value.municipio);

  const update = (field, val) => {
    const next = { ...value, [field]: val };
    if (field === 'estado') { next.municipio = ''; next.punto = ''; }
    if (field === 'municipio') { next.punto = ''; }
    onChange(next);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>
      </div>

      {tip && (
        <div className="flex gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">{tip}</p>
        </div>
      )}

      {/* Nivel 1: Estado */}
      <div>
        <Label className="text-sm font-semibold text-slate-700 mb-2 block">Estado</Label>
        <div className="grid grid-cols-2 gap-3">
          {ESTADOS.map((e) => (
            <button
              key={e.id}
              onClick={() => update('estado', e.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                value.estado === e.id
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <span className="text-lg block mb-0.5">{e.id === 'edomex' ? '🟢' : '🔵'}</span>
              <span className="font-semibold text-sm">{e.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Nivel 2: Municipio / Alcaldía */}
      {value.estado && (
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2 block">
            {value.estado === 'edomex' ? 'Municipio' : 'Alcaldía'}
          </Label>
          <div className="relative">
            <select
              value={value.municipio}
              onChange={(e) => update('municipio', e.target.value)}
              className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-3 pr-10 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">
                — Selecciona {value.estado === 'edomex' ? 'municipio' : 'alcaldía'} —
              </option>
              {municipios.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Nivel 3: Punto de referencia */}
      {value.municipio && (
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2 block">
            Punto conocido (opcional)
          </Label>
          {puntos.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {puntos.map((p) => (
                <button
                  key={p}
                  onClick={() => update('punto', value.punto === p ? '' : p)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                    value.punto === p
                      ? 'border-blue-400 bg-blue-50 text-blue-800 font-medium'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic px-1">
              No hay puntos predefinidos para este municipio/alcaldía.
            </p>
          )}
        </div>
      )}

      {/* Referencia exacta */}
      {value.municipio && (
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2 block">
            Referencia exacta de {title.toLowerCase()} <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="Ej: Frente a Oxxo, junto a la farmacia del Ahorro, esquina con Av. Principal..."
            value={value.referencia}
            onChange={(e) => update('referencia', e.target.value)}
            className="rounded-xl"
            maxLength={120}
          />
          <p className="text-xs text-slate-400 mt-1">{value.referencia.length}/120 caracteres</p>
        </div>
      )}
    </div>
  );
}

export default function CreateRoute() {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [commissionPct, setCommissionPct] = useState(10);
  const navigate = useNavigate();

  const emptyLocation = { estado: '', municipio: '', punto: '', referencia: '' };

  const [abordaje, setAbordaje] = useState({ ...emptyLocation });
  const [llegada, setLlegada] = useState({ ...emptyLocation });

  const [operacion, setOperacion] = useState({
    days: ['lun', 'mar', 'mie', 'jue', 'vie'],
    departureTime: '07:00',
    totalSeats: 3,
    pricePerSeat: 80,
    descripcion: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
      if (drivers.length === 0) {
        toast.error('Debes registrarte como conductor primero');
        navigate(createPageUrl('DriverOnboarding'));
        return;
      }
      const driverData = drivers[0];
      setDriver(driverData);
      if (driverData.kyc_status !== 'approved') {
        toast.error('Tu verificación KYC debe estar aprobada para crear rutas');
        navigate(createPageUrl('DriverOnboarding'));
        return;
      }

      const appConfig = await loadAppConfig();
      setCommissionPct(getCommissionPct(appConfig, 'recurring'));
    } catch {
      base44.auth.redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  /* ---- Validaciones por paso ---- */
  const validateStep1 = () => {
    if (!abordaje.estado) return 'Selecciona el estado de abordaje.';
    if (!abordaje.municipio) return `Selecciona el ${abordaje.estado === 'edomex' ? 'municipio' : 'alcaldía'} de abordaje.`;
    if (!abordaje.referencia.trim()) return 'Escribe la referencia exacta del punto de abordaje.';
    return null;
  };

  const validateStep2 = () => {
    if (!llegada.estado) return 'Selecciona el estado de llegada.';
    if (!llegada.municipio) return `Selecciona el ${llegada.estado === 'edomex' ? 'municipio' : 'alcaldía'} de llegada.`;
    if (!llegada.referencia.trim()) return 'Escribe la referencia exacta del punto de llegada.';
    if (abordaje.estado === llegada.estado && abordaje.municipio === llegada.municipio && abordaje.referencia === llegada.referencia) {
      return 'El punto de inicio y el de llegada no pueden ser iguales.';
    }
    return null;
  };

  const validateStep3 = () => {
    if (operacion.days.length === 0) return 'Selecciona al menos un día de la semana.';
    if (!operacion.departureTime) return 'Indica la hora de salida.';
    if (operacion.pricePerSeat < 20) return 'El precio mínimo por asiento es $20 MXN.';
    if (operacion.pricePerSeat > 500) return 'El precio máximo por asiento es $500 MXN.';
    if (operacion.totalSeats < 1) return 'Debes ofrecer al menos 1 asiento.';
    return null;
  };

  const goNext = () => {
    let err = null;
    if (step === 1) err = validateStep1();
    if (step === 2) err = validateStep2();
    if (step === 3) err = validateStep3();
    if (err) { toast.error(err); return; }
    setStep((s) => s + 1);
  };

  const buildLocationLabel = (loc) => {
    const estadoLabel = ESTADOS.find((e) => e.id === loc.estado)?.label || '';
    const parts = [estadoLabel, loc.municipio, loc.punto, loc.referencia].filter(Boolean);
    return parts.join(' · ');
  };

  const buildOriginAddress = () => buildLocationLabel(abordaje);
  const buildDestAddress = () => buildLocationLabel(llegada);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await base44.entities.Route.create({
        driver_id: driver.id,
        driver_name: driver.full_name,
        driver_phone: driver.phone,
        driver_photo: driver.profile_photo,
        driver_rating: driver.rating,
        vehicle_plate: driver.vehicle_plate,
        vehicle_model: driver.vehicle_model,
        vehicle_color: driver.vehicle_color,
        // Campos normalizados nuevos
        origin_address: buildOriginAddress(),
        origin_poi_name: abordaje.punto || abordaje.municipio,
        boarding_reference: abordaje.referencia,
        dest_address: buildDestAddress(),
        dest_poi_name: llegada.punto || llegada.municipio,
        // Datos extra para compatibilidad y búsqueda
        origin_zone: abordaje.estado,
        dest_zone: llegada.estado,
        days_of_week: operacion.days,
        departure_time: operacion.departureTime,
        total_seats: operacion.totalSeats,
        price_per_seat: operacion.pricePerSeat,
        suggested_price: operacion.pricePerSeat,
        status: 'active',
        is_recurring: true,
        // Descripción del conductor
        ...(operacion.descripcion ? { description: operacion.descripcion } : {}),
      });
      toast.success('¡Ruta publicada exitosamente!');
      navigate(createPageUrl('MyRoutes'));
    } catch (error) {
      toast.error('Error al publicar la ruta. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Crear ruta</h1>
          <p className="text-slate-500 text-sm">Edomex ↔ CDMX · Guiado paso a paso</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold border-2 transition-all ${
                  step > s.id
                    ? 'bg-green-500 border-green-500 text-white'
                    : step === s.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  {step > s.id ? <CheckCircle className="w-5 h-5" /> : s.icon}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${step === s.id ? 'text-blue-600' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-4 transition-all ${step > s.id ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >

            {/* ── SECCIÓN A: Punto de abordaje ── */}
            {step === 1 && (
              <Card>
                <CardContent className="pt-6 pb-6">
                  <LocationSelector
                    title="Punto de inicio"
                    subtitle="¿Desde dónde salen los pasajeros?"
                    tip="Elige un punto visible y fácil de ubicar. Evita referencias ambiguas o zonas inseguras."
                    value={abordaje}
                    onChange={setAbordaje}
                  />
                </CardContent>
              </Card>
            )}

            {/* ── SECCIÓN B: Punto de llegada ── */}
            {step === 2 && (
              <Card>
                <CardContent className="pt-6 pb-6">
                  <LocationSelector
                    title="Punto de llegada"
                    subtitle="¿A dónde llegan los pasajeros?"
                    tip="Una ruta clara mejora reservas y reduce cancelaciones. Sé preciso."
                    value={llegada}
                    onChange={setLlegada}
                  />
                </CardContent>
              </Card>
            )}

            {/* ── SECCIÓN C: Datos operativos ── */}
            {step === 3 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Horario y capacidad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-6">
                  {/* Días */}
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-2 block">Días de la semana</Label>
                    <div className="flex gap-1.5">
                      {DAYS.map((day) => (
                        <button
                          key={day.id}
                          onClick={() => {
                            const newDays = operacion.days.includes(day.id)
                              ? operacion.days.filter((d) => d !== day.id)
                              : [...operacion.days, day.id];
                            setOperacion({ ...operacion, days: newDays });
                          }}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            operacion.days.includes(day.id)
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hora de salida */}
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-2 block">Hora de salida</Label>
                    <Input
                      type="time"
                      value={operacion.departureTime}
                      onChange={(e) => setOperacion({ ...operacion, departureTime: e.target.value })}
                      className="text-lg rounded-xl"
                    />
                  </div>

                  {/* Asientos */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold text-slate-700">Asientos disponibles</Label>
                      <span className="text-2xl font-bold text-slate-900">{operacion.totalSeats}</span>
                    </div>
                    <Slider
                      value={[operacion.totalSeats]}
                      onValueChange={([v]) => setOperacion({ ...operacion, totalSeats: v })}
                      max={6} min={1} step={1}
                    />
                    <p className="text-xs text-slate-400 mt-1">Deja asientos libres para tus propias necesidades</p>
                  </div>

                  {/* Precio */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold text-slate-700">Precio por asiento</Label>
                      <span className="text-2xl font-bold text-green-600">${operacion.pricePerSeat} MXN</span>
                    </div>
                    <Slider
                      value={[operacion.pricePerSeat]}
                      onValueChange={([v]) => setOperacion({ ...operacion, pricePerSeat: v })}
                      max={500} min={20} step={5}
                    />
                    <p className="text-xs text-slate-400 mt-1">Rango permitido: $20 – $500 MXN por asiento</p>
                  </div>

                  {/* Estimación de ganancias */}
                  {operacion.totalSeats > 0 && operacion.pricePerSeat > 0 && (
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <p className="text-sm text-green-700 font-semibold mb-1">Ganancia potencial por viaje</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${Math.round(operacion.totalSeats * operacion.pricePerSeat * (1 - commissionPct / 100))} MXN
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        Con todos los asientos vendidos, menos {commissionPct}% de comisión de plataforma
                      </p>
                    </div>
                  )}

                  {/* Descripción */}
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-2 block">Descripción breve (opcional)</Label>
                    <Textarea
                      placeholder="Ej: Ruta directa, sin paradas adicionales. Salimos puntual. Música suave en el trayecto."
                      value={operacion.descripcion}
                      onChange={(e) => setOperacion({ ...operacion, descripcion: e.target.value })}
                      className="rounded-xl resize-none"
                      rows={3}
                      maxLength={200}
                    />
                    <p className="text-xs text-slate-400 mt-1">{operacion.descripcion.length}/200 caracteres</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── SECCIÓN D: Confirmación final ── */}
            {step === 4 && (
              <div className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    Revisa los detalles antes de publicar. Una ruta clara mejora reservas y reduce cancelaciones.
                  </AlertDescription>
                </Alert>

                {/* Resumen de ruta */}
                <Card>
                  <CardContent className="pt-5 pb-5 space-y-4">
                    {/* Abordaje */}
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Punto de inicio</p>
                        <p className="font-semibold text-slate-900 text-sm">
                          {ESTADOS.find((e) => e.id === abordaje.estado)?.label} · {abordaje.municipio}
                        </p>
                        {abordaje.punto && <p className="text-xs text-slate-600">{abordaje.punto}</p>}
                        <p className="text-xs text-blue-700 font-medium mt-0.5">📌 {abordaje.referencia}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-4">
                      <div className="w-px h-8 bg-slate-200" />
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                    </div>

                    {/* Llegada */}
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Punto de llegada</p>
                        <p className="font-semibold text-slate-900 text-sm">
                          {ESTADOS.find((e) => e.id === llegada.estado)?.label} · {llegada.municipio}
                        </p>
                        {llegada.punto && <p className="text-xs text-slate-600">{llegada.punto}</p>}
                        <p className="text-xs text-green-700 font-medium mt-0.5">📌 {llegada.referencia}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Operativos */}
                <Card>
                  <CardContent className="pt-5 pb-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Horario</p>
                        <p className="font-semibold text-slate-900 text-sm">
                          {operacion.departureTime} · {operacion.days.map((d) => DAYS.find((x) => x.id === d)?.label).join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Asientos</p>
                        <p className="font-semibold text-slate-900 text-sm">{operacion.totalSeats} lugar{operacion.totalSeats !== 1 ? 'es' : ''} disponibles</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-600 text-base flex-shrink-0">$</span>
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Precio por asiento</p>
                        <p className="font-semibold text-slate-900 text-sm">${operacion.pricePerSeat} MXN</p>
                      </div>
                    </div>
                    {operacion.descripcion && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-slate-400 uppercase mb-1">Descripción</p>
                        <p className="text-sm text-slate-700 italic">"{operacion.descripcion}"</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Conductor */}
                <Card className="border-slate-200">
                  <CardContent className="pt-5 pb-5">
                    <p className="text-xs text-slate-400 uppercase mb-2">Tu vehículo</p>
                    <p className="font-semibold text-slate-900">{driver?.vehicle_model} · {driver?.vehicle_color}</p>
                    <p className="text-sm text-slate-500 font-mono">{driver?.vehicle_plate}</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-slate-200 z-10">
          <div className="max-w-lg mx-auto flex gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 h-12 rounded-xl"
              >
                Atrás
              </Button>
            )}
            {step < 4 ? (
              <Button
                onClick={goNext}
                className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-base font-semibold"
              >
                Continuar
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl text-base font-semibold"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Publicar ruta
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}