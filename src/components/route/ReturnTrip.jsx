import React from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DestinoCDMX from './DestinoCDMX';

const DAYS = [
  { id: 'lun', label: 'Lun' },
  { id: 'mar', label: 'Mar' },
  { id: 'mie', label: 'Mié' },
  { id: 'jue', label: 'Jue' },
  { id: 'vie', label: 'Vie' },
  { id: 'sab', label: 'Sáb' },
  { id: 'dom', label: 'Dom' },
];

/**
 * value: { destino: {alcaldia,punto,referencia,otro}, returnTime, returnDays, returnNotes }
 */
export default function ReturnTrip({ value, onChange }) {
  const update = (field, val) => onChange({ ...value, [field]: val });

  const toggleDay = (id) => {
    const current = value.returnDays || [];
    const next = current.includes(id) ? current.filter(d => d !== id) : [...current, id];
    update('returnDays', next);
  };

  return (
    <div className="space-y-5">
      <Alert className="border-green-100 bg-green-50 py-3">
        <ArrowLeft className="h-4 w-4 text-green-600 flex-shrink-0" />
        <AlertDescription className="text-green-700 text-sm">
          Indica desde dónde regresarás en CDMX y el horario. El pasajero podrá ver el viaje de vuelta al reservar.
        </AlertDescription>
      </Alert>

      {/* Punto de regreso en CDMX */}
      <div>
        <Label className="text-base font-bold text-slate-800 mb-3 block flex items-center gap-2">
          <ArrowLeft className="w-4 h-4 text-green-600" />
          ¿Desde dónde regresas?
        </Label>
        <DestinoCDMX
          value={value.destino || { alcaldia: '', punto: '', referencia: '', otro: '' }}
          onChange={v => update('destino', v)}
          label="Punto de salida para el regreso"
        />
      </div>

      {/* Horario de regreso */}
      <div>
        <Label className="text-sm font-semibold text-slate-700 mb-2 block">
          Horario de regreso <span className="text-red-500">*</span>
        </Label>
        <Input
          type="time"
          value={value.returnTime || ''}
          onChange={e => update('returnTime', e.target.value)}
          className="rounded-xl text-lg"
        />
      </div>

      {/* Días de regreso */}
      <div>
        <Label className="text-sm font-semibold text-slate-700 mb-2 block">
          Días disponibles para el regreso
        </Label>
        <div className="flex gap-1.5">
          {DAYS.map(day => (
            <button
              key={day.id}
              onClick={() => toggleDay(day.id)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                (value.returnDays || []).includes(day.id)
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notas de regreso */}
      <div>
        <Label className="text-sm font-semibold text-slate-700 mb-1 block">
          Notas para pasajeros <span className="text-slate-400 font-normal">(opcional)</span>
        </Label>
        <Textarea
          placeholder="Ej: Esperar junto a la entrada del Metro, confirmar por WhatsApp..."
          value={value.returnNotes || ''}
          onChange={e => update('returnNotes', e.target.value)}
          className="rounded-xl resize-none"
          rows={3}
          maxLength={200}
        />
      </div>
    </div>
  );
}