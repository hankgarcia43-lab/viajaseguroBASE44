import React from 'react';
import { MapPin, Zap, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ALCALDIAS_CDMX, DESTINOS_CDMX, DESTINOS_RAPIDOS } from '@/lib/geoData';

/**
 * value: { alcaldia, punto, referencia, otro }
 */
export default function DestinoCDMX({ value, onChange, label = 'Destino en CDMX' }) {
  const update = (field, val) => {
    const next = { ...value, [field]: val };
    if (field === 'alcaldia') next.punto = '';
    onChange(next);
  };

  const puntos = value.alcaldia ? (DESTINOS_CDMX[value.alcaldia] || []) : [];

  const selectRapido = (d) => {
    onChange({ ...value, alcaldia: d.alcaldia, punto: d.nombre, referencia: value.referencia || '', otro: '' });
  };

  return (
    <div className="space-y-5">
      <Alert className="border-blue-100 bg-blue-50 py-3">
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <AlertDescription className="text-blue-700 text-sm">
          Usa destinos conocidos como Metro, terminales, hospitales o puntos principales de CDMX.
        </AlertDescription>
      </Alert>

      {/* Accesos rápidos */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <Label className="text-sm font-semibold text-slate-700">Destinos más usados</Label>
        </div>
        <div className="flex flex-wrap gap-2">
          {DESTINOS_RAPIDOS.map(d => (
            <button
              key={d.nombre}
              onClick={() => selectRapido(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                value.punto === d.nombre && value.alcaldia === d.alcaldia
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {d.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Selector de alcaldía */}
      <div>
        <Label className="text-sm font-semibold text-slate-700 mb-2 block">
          Alcaldía <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
          {ALCALDIAS_CDMX.map(a => (
            <button
              key={a}
              onClick={() => update('alcaldia', value.alcaldia === a ? '' : a)}
              className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                value.alcaldia === a
                  ? 'border-blue-500 bg-blue-50 text-blue-800 font-semibold'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de punto principal */}
      {value.alcaldia && puntos.length > 0 && (
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2 block">
            Estación / terminal / punto <span className="text-red-500">*</span>
          </Label>
          <div className="space-y-1.5">
            {puntos.map(p => (
              <button
                key={p}
                onClick={() => update('punto', value.punto === p ? '' : p)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex items-center gap-2 ${
                  value.punto === p
                    ? 'border-blue-500 bg-blue-50 text-blue-800 font-semibold'
                    : 'border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-blue-50'
                }`}
              >
                <MapPin className={`w-4 h-4 flex-shrink-0 ${value.punto === p ? 'text-blue-500' : 'text-slate-300'}`} />
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Referencia adicional */}
      {(value.alcaldia || value.punto) && (
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2 block">
            Referencia de destino <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="Ej: Frente al paradero principal, salida sur del metro..."
            value={value.referencia}
            onChange={e => update('referencia', e.target.value)}
            className="rounded-xl"
            maxLength={120}
          />
          <p className="text-xs text-slate-400 mt-1">{(value.referencia||'').length}/120</p>
        </div>
      )}

      {/* Otro destino libre */}
      <div>
        <Label className="text-sm font-semibold text-slate-700 mb-1 block">
          Otro destino dentro de CDMX <span className="text-slate-400 font-normal">(si no está en la lista)</span>
        </Label>
        <Input
          placeholder="Escribe el nombre del destino o colonia..."
          value={value.otro}
          onChange={e => update('otro', e.target.value)}
          className="rounded-xl"
        />
      </div>
    </div>
  );
}