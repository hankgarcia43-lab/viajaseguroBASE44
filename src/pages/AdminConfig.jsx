import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Settings, DollarSign, Clock, Percent, MapPin,
  Save, Loader2, AlertCircle, CheckCircle, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

const DEFAULT_CONFIG = {
  // Pricing
  base_fare: 12,
  per_km_rate: 8,
  per_min_rate: 1.5,
  min_fare: 35,
  
  // Platform
  commission_percentage: 10,
  retention_window_minutes: 10,
  
  // Matching
  initial_search_radius_km: 3,
  max_search_radius_km: 15,
  driver_accept_timeout_seconds: 15,
  max_drivers_to_notify: 3,
  
  // KYC
  ocr_confidence_threshold: 85,
  allow_owner_letter_exception: true,
  
  // Cancellation
  free_cancel_window_minutes: 3,
  cancel_fee: 30
};

export default function AdminConfig() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const configs = await base44.entities.AppConfig.list();
      
      const loadedConfig = { ...DEFAULT_CONFIG };
      configs.forEach(c => {
        if (c.config_type === 'number') {
          loadedConfig[c.config_key] = parseFloat(c.config_value);
        } else if (c.config_type === 'boolean') {
          loadedConfig[c.config_key] = c.config_value === 'true';
        } else {
          loadedConfig[c.config_key] = c.config_value;
        }
      });
      
      setConfig(loadedConfig);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      
      // Delete existing configs and recreate
      const existing = await base44.entities.AppConfig.list();
      for (const c of existing) {
        await base44.entities.AppConfig.delete(c.id);
      }

      // Create new configs
      for (const [key, value] of Object.entries(config)) {
        const configType = typeof value === 'boolean' ? 'boolean' : 
                          typeof value === 'number' ? 'number' : 'string';
        
        await base44.entities.AppConfig.create({
          config_key: key,
          config_value: String(value),
          config_type: configType,
          category: key.includes('fare') || key.includes('rate') || key.includes('fee') ? 'pricing' :
                   key.includes('kyc') || key.includes('ocr') ? 'kyc' :
                   key.includes('search') || key.includes('driver') ? 'matching' :
                   key.includes('commission') || key.includes('retention') ? 'payments' : 'general'
        });
      }

      // Log change
      await base44.entities.AuditLog.create({
        user_id: user.id,
        user_email: user.email,
        action: 'config_change',
        entity_type: 'AppConfig',
        details: JSON.stringify(config)
      });

      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Configuración del sistema</h1>
            <p className="text-slate-500">Ajustes de tarifas, comisiones y reglas de negocio</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadConfig}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Recargar
            </Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar cambios
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Tarifas
              </CardTitle>
              <CardDescription>
                Configuración de precios por viaje (MXN)
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Tarifa base</Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-slate-500">$</span>
                  <Input
                    type="number"
                    value={config.base_fare}
                    onChange={(e) => updateConfig('base_fare', parseFloat(e.target.value))}
                  />
                  <span className="text-slate-500">MXN</span>
                </div>
              </div>

              <div>
                <Label>Tarifa por kilómetro</Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-slate-500">$</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={config.per_km_rate}
                    onChange={(e) => updateConfig('per_km_rate', parseFloat(e.target.value))}
                  />
                  <span className="text-slate-500">/km</span>
                </div>
              </div>

              <div>
                <Label>Tarifa por minuto</Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-slate-500">$</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={config.per_min_rate}
                    onChange={(e) => updateConfig('per_min_rate', parseFloat(e.target.value))}
                  />
                  <span className="text-slate-500">/min</span>
                </div>
              </div>

              <div>
                <Label>Tarifa mínima</Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-slate-500">$</span>
                  <Input
                    type="number"
                    value={config.min_fare}
                    onChange={(e) => updateConfig('min_fare', parseFloat(e.target.value))}
                  />
                  <span className="text-slate-500">MXN</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-indigo-600" />
                Comisiones y pagos
              </CardTitle>
              <CardDescription>
                Configuración de comisión de plataforma y ventana de retención
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Comisión de plataforma</Label>
                  <span className="text-2xl font-bold text-indigo-600">{config.commission_percentage}%</span>
                </div>
                <Slider
                  value={[config.commission_percentage]}
                  onValueChange={([value]) => updateConfig('commission_percentage', value)}
                  max={50}
                  min={5}
                  step={1}
                />
                <p className="text-xs text-slate-500 mt-2">
                  El conductor recibirá el {100 - config.commission_percentage}% del total del viaje
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label>Ventana de retención de pago</Label>
                  <p className="text-sm text-slate-500 mt-1">
                    Tiempo para que el pasajero reporte problemas antes de capturar el pago
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={config.retention_window_minutes}
                    onChange={(e) => updateConfig('retention_window_minutes', parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-slate-500">min</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Matching */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Matching de conductores
              </CardTitle>
              <CardDescription>
                Configuración de búsqueda y asignación de viajes
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Radio inicial de búsqueda</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={config.initial_search_radius_km}
                    onChange={(e) => updateConfig('initial_search_radius_km', parseInt(e.target.value))}
                  />
                  <span className="text-slate-500">km</span>
                </div>
              </div>

              <div>
                <Label>Radio máximo de búsqueda</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={config.max_search_radius_km}
                    onChange={(e) => updateConfig('max_search_radius_km', parseInt(e.target.value))}
                  />
                  <span className="text-slate-500">km</span>
                </div>
              </div>

              <div>
                <Label>Tiempo para aceptar viaje</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={config.driver_accept_timeout_seconds}
                    onChange={(e) => updateConfig('driver_accept_timeout_seconds', parseInt(e.target.value))}
                  />
                  <span className="text-slate-500">seg</span>
                </div>
              </div>

              <div>
                <Label>Conductores a notificar</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={config.max_drivers_to_notify}
                    onChange={(e) => updateConfig('max_drivers_to_notify', parseInt(e.target.value))}
                  />
                  <span className="text-slate-500">máx</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KYC */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-600" />
                Verificación KYC
              </CardTitle>
              <CardDescription>
                Configuración de verificación de identidad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Umbral de confianza OCR</Label>
                  <span className="text-lg font-bold">{config.ocr_confidence_threshold}%</span>
                </div>
                <Slider
                  value={[config.ocr_confidence_threshold]}
                  onValueChange={([value]) => updateConfig('ocr_confidence_threshold', value)}
                  max={100}
                  min={50}
                  step={5}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Si el OCR tiene menor confianza, se enviará a revisión manual
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label>Permitir carta responsiva</Label>
                  <p className="text-sm text-slate-500 mt-1">
                    Permitir vehículos a nombre de terceros con carta responsiva
                  </p>
                </div>
                <Switch
                  checked={config.allow_owner_letter_exception}
                  onCheckedChange={(checked) => updateConfig('allow_owner_letter_exception', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cancellation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                Cancelaciones
              </CardTitle>
              <CardDescription>
                Reglas de cancelación de viajes
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Ventana de cancelación gratis</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={config.free_cancel_window_minutes}
                    onChange={(e) => updateConfig('free_cancel_window_minutes', parseInt(e.target.value))}
                  />
                  <span className="text-slate-500">min</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Tiempo sin cargo después de solicitar
                </p>
              </div>

              <div>
                <Label>Cargo por cancelación</Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-slate-500">$</span>
                  <Input
                    type="number"
                    value={config.cancel_fee}
                    onChange={(e) => updateConfig('cancel_fee', parseFloat(e.target.value))}
                  />
                  <span className="text-slate-500">MXN</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Si cancela después de la ventana gratis
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button (sticky) */}
        <div className="sticky bottom-4 mt-6 flex justify-end">
          <Button 
            onClick={saveConfig} 
            disabled={saving}
            size="lg"
            className="shadow-lg"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            Guardar todos los cambios
          </Button>
        </div>
      </div>
    </div>
  );
}