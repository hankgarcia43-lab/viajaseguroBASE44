import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Clock, Users, DollarSign, RotateCcw, Check } from 'lucide-react';

const DIAS = [
  { key: 'lun', label: 'L' },
  { key: 'mar', label: 'M' },
  { key: 'mie', label: 'X' },
  { key: 'jue', label: 'J' },
  { key: 'vie', label: 'V' },
  { key: 'sab', label: 'S' },
  { key: 'dom', label: 'D' },
];

export default function CreateRoute() {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    origin_address: '',
    boarding_reference: '',
    dest_address: '',
    days_of_week: [],
    departure_time: '',
    total_seats: 4,
    price_per_seat: '',
    return_trip: false,
    return_time: '',
    return_boarding_reference: '',
    return_boarding_address: '',
    notes: '',
  });

  useEffect(() => {
    loadDriver();
  }, []);

  const loadDriver = async () => {
    try {
      const user = await base44.auth.me();
      const drivers = await base44.entities.Driver.filter({ user_id: user.id });
      if (drivers.length > 0) {
        setDriver(drivers[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter(d => d !== day)
        : [...f.days_of_week, day]
    }));
  };

  const handleSubmit = async () => {
    if (!driver) return;
    setLoading(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.Route.create({
        driver_id: driver.id,
        driver_name: driver.full_name,
        driver_phone: driver.phone,
        driver_photo: driver.profile_photo,
        driver_rating: driver.rating,
        vehicle_plate: driver.vehicle_plate,
        vehicle_model: driver.vehicle_model,
        vehicle_color: driver.vehicle_color,
        origin_address: form.origin_address,
        boarding_reference: form.boarding_reference,
        dest_address: form.dest_address,
        days_of_week: form.days_of_week,
        departure_time: form.departure_time,
        total_seats: Number(form.total_seats),
        price_per_seat: Number(form.price_per_seat),
        return_trip: form.return_trip,
        return_time: form.return_trip ? form.return_time : '',
        return_boarding_reference: form.return_trip ? form.return_boarding_reference : '',
        return_boarding_address: form.return_trip ? form.return_boarding_address : '',
        status: 'active',
        is_recurring: true,
      });
      navigate('/MyRoutes');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const canNext1 = form.origin_address && form.dest_address;
  const canNext2 = form.days_of_week.length > 0 && form.departure_time;
  const canNext3 = form.total_seats >= 1 && form.price_per_seat && Number(form.price_per_seat) <= 500;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
          ))}
        </div>

        {/* Step 1: Origen y Destino */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
                Origen y destino
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Dirección de origen *</Label>
                <Input
                  placeholder="Ej. Av. López Portillo #123, Ecatepec"
                  value={form.origin_address}
                  onChange={e => setForm(f => ({ ...f, origin_address: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Punto de referencia para abordaje</Label>
                <Input
                  placeholder="Ej. Frente a la farmacia, junto al semáforo"
                  value={form.boarding_reference}
                  onChange={e => setForm(f => ({ ...f, boarding_reference: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Dirección de destino *</Label>
                <Input
                  placeholder="Ej. Metro Politécnico, CDMX"
                  value={form.dest_address}
                  onChange={e => setForm(f => ({ ...f, dest_address: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <Button
                className="w-full"
                disabled={!canNext1}
                onClick={() => setStep(2)}
              >
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Horario */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-blue-600" />
                Horario y días
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Días disponibles *</Label>
                <div className="flex gap-2">
                  {DIAS.map(d => (
                    <button
                      key={d.key}
                      onClick={() => toggleDay(d.key)}
                      className={`w-10 h-10 rounded-full text-sm font-semibold transition-all ${
                        form.days_of_week.includes(d.key)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Hora de salida *</Label>
                <Input
                  type="time"
                  value={form.departure_time}
                  onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    ¿Ofreces viaje de regreso?
                  </Label>
                  <button
                    onClick={() => setForm(f => ({ ...f, return_trip: !f.return_trip }))}
                    className={`w-12 h-6 rounded-full transition-all ${form.return_trip ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-all ${form.return_trip ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                {form.return_trip && (
                  <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                    <div>
                      <Label>Hora de regreso</Label>
                      <Input
                        type="time"
                        value={form.return_time}
                        onChange={e => setForm(f => ({ ...f, return_time: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Punto de abordaje para regreso</Label>
                      <Input
                        placeholder="Ej. Metro Politécnico, salida norte"
                        value={form.return_boarding_reference}
                        onChange={e => setForm(f => ({ ...f, return_boarding_reference: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Atrás</Button>
                <Button className="flex-1" disabled={!canNext2} onClick={() => setStep(3)}>Continuar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Capacidad y precio */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-blue-600" />
                Asientos y precio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Asientos disponibles *</Label>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setForm(f => ({ ...f, total_seats: Math.max(1, f.total_seats - 1) }))}
                    className="w-10 h-10 rounded-full bg-slate-100 text-lg font-bold hover:bg-slate-200"
                  >-</button>
                  <span className="text-2xl font-bold w-8 text-center">{form.total_seats}</span>
                  <button
                    onClick={() => setForm(f => ({ ...f, total_seats: Math.min(8, f.total_seats + 1) }))}
                    className="w-10 h-10 rounded-full bg-slate-100 text-lg font-bold hover:bg-slate-200"
                  >+</button>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Precio por asiento (máx. $500 MXN) *
                </Label>
                <Input
                  type="number"
                  placeholder="Ej. 50"
                  min={10}
                  max={500}
                  value={form.price_per_seat}
                  onChange={e => setForm(f => ({ ...f, price_per_seat: e.target.value }))}
                  className="mt-1"
                />
                {form.price_per_seat && Number(form.price_per_seat) > 500 && (
                  <p className="text-red-500 text-xs mt-1">El precio máximo permitido es $500 MXN</p>
                )}
              </div>

              {/* Resumen */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-semibold text-blue-900">Resumen de tu ruta</p>
                <p className="text-slate-600">📍 {form.origin_address} → {form.dest_address}</p>
                <div className="flex gap-2 flex-wrap">
                  {form.days_of_week.map(d => (
                    <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                  ))}
                </div>
                <p className="text-slate-600">🕐 {form.departure_time}{form.return_trip && form.return_time ? ` · Regreso: ${form.return_time}` : ''}</p>
                <p className="text-slate-600">👥 {form.total_seats} asientos · ${form.price_per_seat || '—'} MXN c/u</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Atrás</Button>
                <Button
                  className="flex-1"
                  disabled={!canNext3 || loading}
                  onClick={handleSubmit}
                >
                  {loading ? 'Creando...' : (
                    <span className="flex items-center gap-2"><Check className="w-4 h-4" />Publicar ruta</span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}