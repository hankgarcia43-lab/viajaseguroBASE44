import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Settings, DollarSign, Clock, Percent, MapPin,
  Save, Loader2, RefreshCw, Zap, Route, Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

const DEFAULTS = {
  bank_name: 'BBVA',
  bank_account_holder: 'Viaja Seguro S.A. de C.V.',
  bank_clabe: '',
  bank_account_number: '',
  commission_recurring: 10,
  commission_quick_ride: 20,
  base_fare: 12,
  per_km_rate: 8,
  per_min_rate: 1.5,
  min_fare: 35,
  retention_window_minutes: 10,
  initial_search_radius_km: 10,
  max_search_radius_km: 30,
  driver_accept_timeout_seconds: 15,
  max_drivers_to_notify: 3,
  ocr_confidence_threshold: 85,
  allow_owner_letter_exception: true,
  free_cancel_window_minutes: 3,
  cancel_fee: 30,
};

export default function AdminConfig() {
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const configs = await base44.entities.AppConfig.list();
      const loaded = { ...DEFAULTS };
      configs.forEach(c => {
        if (c.config_type === 'number') loaded[c.config_key] = parseFloat(c.config_value);
        else if (c.config_type === 'boolean') loaded[c.config_key] = c.config_value === 'true';
        else loaded[c.config_key] = c.config_value;
      });
      setConfig(loaded);
    } catch { /* use defaults */ }
    finally { setLoading(false); }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const existing = await base44.entities.AppConfig.list();
      for (const c of existing) await base44.entities.AppConfig.delete(c.id);
      for (const [key, value] of Object.entries(config)) {
        const configType = typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string';
        const category = key.includes('fare') || key.includes('rate') || key.includes('fee') ? 'pricing' :
                        key.includes('kyc') || key.includes('ocr') ? 'kyc' :
                        key.includes('search') || key.includes('driver') || key.includes('radius') ? 'matching' :
                        key.includes('commission') || key.includes('retention') ? 'payments' : 'general';
        await base44.entities.AppConfig.create({ config_key: key, config_value: String(value), config_type: configType, category });
      }
      await base44.entities.AuditLog.create({
        user_id: user.id, user_email: user.email, action: 'config_change',
        entity_type: 'AppConfig', details: JSON.stringify(config)
      });
      toast.success('Configuración guardada');
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  const set = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Configuración del sistema</h1>
            <p className="text-slate-500">Tarifas, comisiones y reglas de negocio</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadConfig}><RefreshCw className="w-4 h-4 mr-2" />Recargar</Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Datos bancarios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-600" />Datos bancarios (visibles al pasajero)</CardTitle>
              <CardDescription>Estos datos aparecerán en la pantalla de pago del pasajero para que realice su depósito.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              {[
                { key: 'bank_name', label: 'Banco', placeholder: 'Ej: BBVA, Banorte, HSBC' },
                { key: 'bank_account_holder', label: 'Titular de la cuenta', placeholder: 'Nombre completo o razón social' },
                { key: 'bank_clabe', label: 'CLABE interbancaria (18 dígitos)', placeholder: '012345678901234567' },
                { key: 'bank_account_number', label: 'Número de cuenta', placeholder: '1234567890' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    value={config[key] || ''}
                    onChange={e => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="mt-2 font-mono"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Comisiones por tipo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Percent className="w-5 h-5 text-indigo-600" />Comisiones por tipo de viaje</CardTitle>
              <CardDescription>La comisión se descuenta del total cobrado al pasajero antes de liquidar al conductor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Route className="w-4 h-4 text-blue-600" />
                    <Label>Viaje recurrente (ruta fija)</Label>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{config.commission_recurring}%</span>
                </div>
                <Slider value={[config.commission_recurring]} onValueChange={([v]) => set('commission_recurring', v)} max={30} min={5} step={1} />
                <p className="text-xs text-slate-500 mt-1">El conductor recibe el {100 - config.commission_recurring}%</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <Label>Viaje rápido / único</Label>
                  </div>
                  <span className="text-2xl font-bold text-orange-500">{config.commission_quick_ride}%</span>
                </div>
                <Slider value={[config.commission_quick_ride]} onValueChange={([v]) => set('commission_quick_ride', v)} max={35} min={10} step={1} />
                <p className="text-xs text-slate-500 mt-1">El conductor recibe el {100 - config.commission_quick_ride}%</p>
              </div>
            </CardContent>
          </Card>

          {/* Tarifas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" />Tarifas (MXN)</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              {[
                { key: 'base_fare', label: 'Tarifa base', suffix: 'MXN' },
                { key: 'per_km_rate', label: 'Por kilómetro', suffix: '/km', step: 0.5 },
                { key: 'per_min_rate', label: 'Por minuto', suffix: '/min', step: 0.5 },
                { key: 'min_fare', label: 'Tarifa mínima', suffix: 'MXN' },
              ].map(({ key, label, suffix, step }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-slate-400">$</span>
                    <Input type="number" step={step || 1} value={config[key]} onChange={e => set(key, parseFloat(e.target.value))} />
                    <span className="text-slate-400 text-sm whitespace-nowrap">{suffix}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Matching */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" />Matching de conductores</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              {[
                { key: 'initial_search_radius_km', label: 'Radio inicial búsqueda', suffix: 'km' },
                { key: 'max_search_radius_km', label: 'Radio máximo', suffix: 'km' },
                { key: 'driver_accept_timeout_seconds', label: 'Tiempo para aceptar', suffix: 'seg' },
                { key: 'max_drivers_to_notify', label: 'Conductores a notificar', suffix: 'máx' },
              ].map(({ key, label, suffix }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input type="number" value={config[key]} onChange={e => set(key, parseInt(e.target.value))} />
                    <span className="text-slate-400 text-sm">{suffix}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* KYC */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-amber-600" />Verificación KYC</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Umbral de confianza OCR</Label>
                  <span className="font-bold">{config.ocr_confidence_threshold}%</span>
                </div>
                <Slider value={[config.ocr_confidence_threshold]} onValueChange={([v]) => set('ocr_confidence_threshold', v)} max={100} min={50} step={5} />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label>Permitir carta responsiva</Label>
                  <p className="text-sm text-slate-500 mt-1">Vehículos a nombre de terceros con carta responsiva</p>
                </div>
                <Switch checked={config.allow_owner_letter_exception} onCheckedChange={v => set('allow_owner_letter_exception', v)} />
              </div>
            </CardContent>
          </Card>

          {/* Cancelaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-red-600" />Cancelaciones</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Ventana gratis</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input type="number" value={config.free_cancel_window_minutes} onChange={e => set('free_cancel_window_minutes', parseInt(e.target.value))} />
                  <span className="text-slate-400 text-sm">min</span>
                </div>
              </div>
              <div>
                <Label>Cargo por cancelación</Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-slate-400">$</span>
                  <Input type="number" value={config.cancel_fee} onChange={e => set('cancel_fee', parseFloat(e.target.value))} />
                  <span className="text-slate-400 text-sm">MXN</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="sticky bottom-4 mt-6 flex justify-end">
          <Button onClick={saveConfig} disabled={saving} size="lg" className="shadow-lg">
            {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            Guardar todos los cambios
          </Button>
        </div>
      </div>
    </div>
  );
}