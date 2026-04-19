import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../../utils';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Clock, Users, DollarSign, AlertTriangle, 
  ChevronRight, Loader2, ArrowLeftRight, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

const DAYS = [
  { key: 'lun', label: 'L' },
  { key: 'mar', label: 'M' },
  { key: 'mie', label: 'X' },
  { key: 'jue', label: 'J' },
  { key: 'vie', label: 'V' },
  { key: 'sab', label: 'S' },
  { key: 'dom', label: 'D' },
];

export default function TakeRouteSheet({ open, onClose, baseRoute, driver, user }) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    boarding_reference: '',
    origin_address: baseRoute?.origin_address || '',
    days_of_week: ['lun', 'mar', 'mie', 'jue', 'vie'],
    departure_time: '07:00',
    return_trip: false,
    return_time: '19:00',
    return_boarding_reference: '',
    return_boarding_address: '',
    total_seats: 3,
    price_per_seat: baseRoute?.suggested_price || 80,
  });

  const toggleDay = (day) => {
    setForm(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  const handleSave = async () => {
    if (!form.boarding_reference) return toast.error('Agrega la referencia de abordaje');
    if (!form.origin_address) return toast.error('Agrega la dirección exacta de salida');
    if (form.days_of_week.length === 0) return toast.error('Selecciona al menos un día');
    if (form.price_per_seat > 500) return toast.error('El precio máximo es $500 MXN');
    if (form.price_per_seat < 20) return toast.error('El precio mínimo es $20 MXN');

    setSaving(true);
    try {
      await base44.entities.Route.create({
        base_route_id: baseRoute.id,
        driver_id: user.id,
        driver_name: driver.full_name,
        driver_phone: driver.phone,
        driver_photo: driver.profile_photo || '',
        driver_rating: driver.rating || 5,
        vehicle_plate: driver.vehicle_plate,
        vehicle_model: driver.vehicle_model,
        vehicle_color: driver.vehicle_color,
        origin_poi_name: baseRoute.origin_name,
        origin_address: form.origin_address,
        boarding_reference: form.boarding_reference,
        dest_poi_name: baseRoute.dest_name,
        dest_address: baseRoute.dest_address,
        distance_km: baseRoute.distance_km || 0,
        duration_min: baseRoute.duration_min || 0,
        days_of_week: form.days_of_week,
        departure_time: form.departure_time,
        return_trip: form.return_trip,
        return_time: form.return_trip ? form.return_time : '',
        return_boarding_reference: form.return_trip ? form.return_boarding_reference : '',
        return_boarding_address: form.return_trip ? form.return_boarding_address : '',
        total_seats: form.total_seats,
        price_per_seat: form.price_per_seat,
        suggested_price: baseRoute.suggested_price || form.price_per_seat,
        status: 'active',
        is_recurring: true,
      });

      // Update base route times taken
      await base44.entities.BaseRoute.update(baseRoute.id, {
        times_taken: (baseRoute.times_taken || 0) + 1
      });

      toast.success('¡Ruta publicada! Los pasajeros ya pueden reservar.');
      onClose();
      navigate(createPageUrl('MyRoutes'));
    } catch (e) {
      toast.error('Error al publicar la ruta');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Personalizar ruta</SheetTitle>
          {baseRoute && (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="font-medium">{baseRoute.origin_name}</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-medium">{baseRoute.dest_name}</span>
            </div>
          )}
        </SheetHeader>

        {/* Safety alert */}
        <Alert className="mb-5 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            Usa puntos públicos y visibles para abordaje. Evita zonas aisladas o poco iluminadas.
          </AlertDescription>
        </Alert>

        <div className="space-y-6 pb-8">
          {/* Boarding reference */}
          <div>
            <Label className="text-base font-semibold">Referencia de abordaje *</Label>
            <p className="text-xs text-slate-500 mb-2">Punto público fácil de ubicar (ej: "Frente al Oxxo Av. Insurgentes")</p>
            <Input
              placeholder="Ej: Frente a la farmacia del ahorro, Av. Central"
              value={form.boarding_reference}
              onChange={(e) => setForm({ ...form, boarding_reference: e.target.value })}
              className="rounded-xl"
            />
          </div>

          {/* Exact address */}
          <div>
            <Label className="text-base font-semibold">Dirección exacta de salida *</Label>
            <Input
              placeholder="Ej: Av. Central 123, Ecatepec"
              value={form.origin_address}
              onChange={(e) => setForm({ ...form, origin_address: e.target.value })}
              className="rounded-xl mt-2"
            />
          </div>

          {/* Days of week */}
          <div>
            <Label className="text-base font-semibold">Días disponibles</Label>
            <div className="flex gap-2 mt-3">
              {DAYS.map((day) => (
                <button
                  key={day.key}
                  onClick={() => toggleDay(day.key)}
                  className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${
                    form.days_of_week.includes(day.key)
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <Label className="text-base font-semibold">Hora de salida</Label>
            <Input
              type="time"
              value={form.departure_time}
              onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
              className="rounded-xl mt-2 max-w-[160px]"
            />
          </div>

          {/* Return trip */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="font-semibold text-slate-900">Ida y vuelta</p>
                <p className="text-xs text-slate-500">Ofrecer también viaje de regreso</p>
              </div>
            </div>
            <Switch
              checked={form.return_trip}
              onCheckedChange={(v) => setForm({ ...form, return_trip: v })}
            />
          </div>

          {form.return_trip && (
            <div className="pl-4 border-l-2 border-indigo-200 space-y-4">
              <div>
                <Label>Hora de regreso</Label>
                <Input
                  type="time"
                  value={form.return_time}
                  onChange={(e) => setForm({ ...form, return_time: e.target.value })}
                  className="rounded-xl mt-2 max-w-[160px]"
                />
              </div>
              <div>
                <Label>Referencia de abordaje (regreso)</Label>
                <Input
                  placeholder="Ej: Salida del metro Taxqueña"
                  value={form.return_boarding_reference}
                  onChange={(e) => setForm({ ...form, return_boarding_reference: e.target.value })}
                  className="rounded-xl mt-2"
                />
              </div>
              <div>
                <Label>Dirección de abordaje (regreso)</Label>
                <Input
                  placeholder="Ej: Av. Taxqueña 1200, CDMX"
                  value={form.return_boarding_address}
                  onChange={(e) => setForm({ ...form, return_boarding_address: e.target.value })}
                  className="rounded-xl mt-2"
                />
              </div>
            </div>
          )}

          {/* Seats */}
          <div>
            <Label className="text-base font-semibold">Asientos disponibles: <span className="text-blue-600">{form.total_seats}</span></Label>
            <Slider
              value={[form.total_seats]}
              onValueChange={([v]) => setForm({ ...form, total_seats: v })}
              min={1}
              max={8}
              step={1}
              className="mt-4"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1</span><span>8</span>
            </div>
          </div>

          {/* Price */}
          <div>
            <Label className="text-base font-semibold">
              Precio por asiento: <span className="text-green-600">${form.price_per_seat} MXN</span>
            </Label>
            <Slider
              value={[form.price_per_seat]}
              onValueChange={([v]) => setForm({ ...form, price_per_seat: v })}
              min={20}
              max={500}
              step={5}
              className="mt-4"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>$20</span><span>$500 (máx)</span>
            </div>
          </div>

          {/* Payout reminder */}
          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <p className="text-sm text-green-800">
              <strong>💰 Recuerda:</strong> El pago se libera al finalizar los viajes de la semana. Solo 20% de comisión de plataforma.
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-lg"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '🚀 Publicar ruta'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}