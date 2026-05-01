import React, { useState } from 'react';
import { MapPin, Navigation, Search, ChevronDown, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MUNICIPIOS_EDOMEX, PUNTOS_EDOMEX } from '@/lib/geoData';

/**
 * value: { municipio, zona, puntoAbordaje, referencia, notas, lat, lng }
 */
export default function OriginSelector({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [locating, setLocating] = useState(false);

  const update = (field, val) => {
    const next = { ...value, [field]: val };
    if (field === 'municipio') { next.zona = ''; next.puntoAbordaje = ''; }
    onChange(next);
  };

  const filtered = search.trim()
    ? MUNICIPIOS_EDOMEX.filter(m => m.toLowerCase().includes(search.toLowerCase()))
    : MUNICIPIOS_EDOMEX;

  const sugerencias = PUNTOS_EDOMEX[value.municipio] || [];

  const useGPS = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ ...value, lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  return (
    <div className="space-y-5">
      <Alert className="border-blue-100 bg-blue-50 py-3">
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <AlertDescription className="text-blue-700 text-sm">
          Selecciona el municipio desde donde sales y escribe una referencia fácil para que el pasajero te encuentre.
        </AlertDescription>
      </Alert>

      {/* Municipio */}
      <div>
        <Label className="text-sm font-semibold text-slate-700 mb-2 block">
          ¿Desde qué municipio sales? <span className="text-red-500">*</span>
        </Label>

        {/* Buscador */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar municipio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>

        {/* Selected chip */}
        {value.municipio && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-semibold text-blue-800 text-sm flex-1">{value.municipio}</span>
            <button onClick={() => update('municipio', '')} className="text-blue-400 hover:text-blue-600 text-lg leading-none">×</button>
          </div>
        )}

        {/* List */}
        {(!value.municipio || search) && (
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto shadow-sm">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">Sin resultados</p>
            ) : filtered.map(m => (
              <button
                key={m}
                onClick={() => { update('municipio', m); setSearch(''); }}
                className={`w-full text-left px-4 py-2.5 text-sm border-b last:border-0 transition-colors ${
                  value.municipio === m
                    ? 'bg-blue-50 text-blue-800 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zona / Colonia */}
      {value.municipio && (
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2 block">
            Colonia, pueblo o zona <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="Ej: San Cristóbal, Jardines, Centro..."
            value={value.zona}
            onChange={e => update('zona', e.target.value)}
            className="rounded-xl"
          />
        </div>
      )}

      {/* Punto de abordaje / sugerencias */}
      {value.municipio && (
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2 block">
            Lugar exacto de abordaje <span className="text-red-500">*</span>
          </Label>
          {sugerencias.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {sugerencias.map(s => (
                <button
                  key={s}
                  onClick={() => update('puntoAbordaje', s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    value.puntoAbordaje === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <Input
            placeholder="Ej: Frente a Plaza Las Américas, Parada del camión..."
            value={value.puntoAbordaje}
            onChange={e => update('puntoAbordaje', e.target.value)}
            className="rounded-xl"
          />
        </div>
      )}

      {/* Referencia exacta */}
      {value.municipio && (
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2 block">
            Referencia para encontrarte <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="Ej: Sobre Av. Principal, junto al Oxxo, frente a la farmacia..."
            value={value.referencia}
            onChange={e => update('referencia', e.target.value)}
            className="rounded-xl"
            maxLength={120}
          />
          <p className="text-xs text-slate-400 mt-1">{(value.referencia||'').length}/120</p>
        </div>
      )}

      {/* Notas */}
      {value.municipio && (
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-1 block">
            Notas para el pasajero <span className="text-slate-400 font-normal">(opcional)</span>
          </Label>
          <Textarea
            placeholder="Ej: Llega 5 min antes, avísame por WhatsApp al llegar..."
            value={value.notas}
            onChange={e => update('notas', e.target.value)}
            className="rounded-xl resize-none"
            rows={2}
            maxLength={200}
          />
        </div>
      )}

      {/* GPS */}
      {value.municipio && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={useGPS}
            disabled={locating}
            className="rounded-xl text-slate-600"
          >
            <Navigation className="w-4 h-4 mr-2" />
            {locating ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual (GPS)'}
          </Button>
          {value.lat && value.lng && (
            <p className="text-xs text-green-600 mt-1 ml-1">
              📍 Ubicación GPS guardada ({value.lat.toFixed(5)}, {value.lng.toFixed(5)})
            </p>
          )}
        </div>
      )}
    </div>
  );
}