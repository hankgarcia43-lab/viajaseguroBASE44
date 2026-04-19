import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Plus, MapPin, ChevronRight, Loader2, 
  Pencil, Trash2, CheckCircle, XCircle, Route
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const ORIGIN_OPTIONS = [
  // EdoMex
  { label: '🏙️ Ecatepec Centro', zone: 'edomex' },
  { label: '🏙️ Nezahualcóyotl (Ciudad Lago)', zone: 'edomex' },
  { label: '🏙️ Tlalnepantla Centro', zone: 'edomex' },
  { label: '🏙️ Naucalpan Centro', zone: 'edomex' },
  { label: '🏙️ Texcoco Centro', zone: 'edomex' },
  { label: '🏙️ Tultitlán', zone: 'edomex' },
  { label: '🏙️ Cuautitlán Izcalli', zone: 'edomex' },
  { label: '🏙️ Chimalhuacán', zone: 'edomex' },
  { label: '🏙️ Los Reyes La Paz', zone: 'edomex' },
  { label: '🏙️ Ixtapaluca', zone: 'edomex' },
];

const DEST_OPTIONS = [
  // Terminales/Metro CDMX
  { label: '🚉 Metro Indios Verdes', zone: 'cdmx' },
  { label: '🚉 Metro Pantitlán', zone: 'cdmx' },
  { label: '🚉 Metro Oceanía', zone: 'cdmx' },
  { label: '🚉 Metro Politécnico', zone: 'cdmx' },
  { label: '🚉 Metro Rosario', zone: 'cdmx' },
  { label: '🚉 Metro Cuatro Caminos', zone: 'cdmx' },
  { label: '🚉 Metro Barranca del Muerto', zone: 'cdmx' },
  { label: '🚉 Metro Taxqueña', zone: 'cdmx' },
  { label: '✈️ Aeropuerto AICM T1', zone: 'cdmx' },
  { label: '✈️ Aeropuerto AIFA', zone: 'cdmx' },
  { label: '🏥 Hospital General de México', zone: 'cdmx' },
  { label: '🏥 Hospital 20 de Noviembre', zone: 'cdmx' },
  { label: '🏥 Hospital Juárez', zone: 'cdmx' },
  { label: '🏛️ Centro Médico Nacional Siglo XXI', zone: 'cdmx' },
  { label: '🏫 IPN Zacatenco', zone: 'cdmx' },
  { label: '🏫 UNAM CU', zone: 'cdmx' },
  { label: '🏢 Santa Fe Centro', zone: 'cdmx' },
  { label: '🏢 Periferico Sur (Pedregal)', zone: 'cdmx' },
];

const DEFAULT_FORM = {
  name: '',
  origin_name: '',
  origin_zone: 'edomex',
  origin_address: '',
  dest_name: '',
  dest_zone: 'cdmx',
  dest_address: '',
  distance_km: '',
  duration_min: '',
  suggested_price: '',
  description: '',
  active: true,
};

export default function AdminRoutes() {
  const [baseRoutes, setBaseRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const routes = await base44.entities.BaseRoute.list('-created_date', 50);
      setBaseRoutes(routes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowDialog(true);
  };

  const openEdit = (route) => {
    setEditing(route);
    setForm({
      name: route.name || '',
      origin_name: route.origin_name || '',
      origin_zone: route.origin_zone || 'edomex',
      origin_address: route.origin_address || '',
      dest_name: route.dest_name || '',
      dest_zone: route.dest_zone || 'cdmx',
      dest_address: route.dest_address || '',
      distance_km: route.distance_km || '',
      duration_min: route.duration_min || '',
      suggested_price: route.suggested_price || '',
      description: route.description || '',
      active: route.active !== false,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error('Agrega un nombre para la ruta');
    if (!form.origin_name) return toast.error('Selecciona el origen');
    if (!form.dest_name) return toast.error('Selecciona el destino');
    if (form.suggested_price && Number(form.suggested_price) > 500) {
      return toast.error('El precio sugerido no puede superar $500 MXN');
    }

    setSaving(true);
    try {
      const data = {
        ...form,
        distance_km: Number(form.distance_km) || 0,
        duration_min: Number(form.duration_min) || 0,
        suggested_price: Number(form.suggested_price) || 80,
      };

      if (editing) {
        await base44.entities.BaseRoute.update(editing.id, data);
        setBaseRoutes(baseRoutes.map(r => r.id === editing.id ? { ...r, ...data } : r));
        toast.success('Ruta actualizada');
      } else {
        const created = await base44.entities.BaseRoute.create(data);
        setBaseRoutes([created, ...baseRoutes]);
        toast.success('Ruta base creada');
      }
      setShowDialog(false);
    } catch (e) {
      toast.error('Error al guardar la ruta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (route) => {
    if (!confirm(`¿Eliminar la ruta "${route.name}"?`)) return;
    try {
      await base44.entities.BaseRoute.delete(route.id);
      setBaseRoutes(baseRoutes.filter(r => r.id !== route.id));
      toast.success('Ruta eliminada');
    } catch (e) {
      toast.error('Error al eliminar');
    }
  };

  const toggleActive = async (route) => {
    try {
      await base44.entities.BaseRoute.update(route.id, { active: !route.active });
      setBaseRoutes(baseRoutes.map(r => r.id === route.id ? { ...r, active: !r.active } : r));
    } catch (e) {
      toast.error('Error al actualizar');
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
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Rutas Base</h1>
            <p className="text-slate-500">Administra el catálogo de rutas disponibles para conductores</p>
          </div>
          <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Nueva ruta
          </Button>
        </div>

        {baseRoutes.length === 0 ? (
          <Card>
            <CardContent className="p-16 text-center">
              <Route className="w-14 h-14 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">No hay rutas base aún</h3>
              <p className="text-slate-500 mb-6">Crea la primera ruta para que los conductores puedan tomarla.</p>
              <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Crear primera ruta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {baseRoutes.map((route) => (
              <Card key={route.id} className={!route.active ? 'opacity-60' : ''}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-slate-900">{route.name}</h3>
                        <Badge className={route.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                          {route.active ? 'Activa' : 'Inactiva'}
                        </Badge>
                        {route.times_taken > 0 && (
                          <Badge className="bg-blue-100 text-blue-700">{route.times_taken} conductores</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <span>{route.origin_name}</span>
                        <ChevronRight className="w-3 h-3" />
                        <span>{route.dest_name}</span>
                      </div>
                      {route.suggested_price && (
                        <p className="text-sm text-slate-500">
                          Precio sugerido: <span className="font-semibold text-green-600">${route.suggested_price} MXN</span>
                          {route.distance_km > 0 && ` • ${route.distance_km} km`}
                          {route.duration_min > 0 && ` • ~${route.duration_min} min`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(route)}>
                        {route.active ? <XCircle className="w-4 h-4 text-slate-400" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(route)}>
                        <Pencil className="w-4 h-4 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(route)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar ruta base' : 'Nueva ruta base'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre de la ruta *</Label>
              <Input
                placeholder="Ej: Ecatepec → Metro Indios Verdes"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Origen *</Label>
                <Select value={form.origin_name} onValueChange={(v) => setForm({ ...form, origin_name: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar origen" />
                  </SelectTrigger>
                  <SelectContent>
                    <p className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase">Estado de México</p>
                    {ORIGIN_OPTIONS.map(o => (
                      <SelectItem key={o.label} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Destino *</Label>
                <Select value={form.dest_name} onValueChange={(v) => setForm({ ...form, dest_name: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <p className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase">CDMX</p>
                    {DEST_OPTIONS.map(o => (
                      <SelectItem key={o.label} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Dirección de referencia del destino</Label>
              <Input
                placeholder="Ej: Acceso principal Metro Indios Verdes, L3"
                value={form.dest_address}
                onChange={(e) => setForm({ ...form, dest_address: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Distancia (km)</Label>
                <Input
                  type="number"
                  placeholder="25"
                  value={form.distance_km}
                  onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Duración (min)</Label>
                <Input
                  type="number"
                  placeholder="40"
                  value={form.duration_min}
                  onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Precio sugerido ($)</Label>
                <Input
                  type="number"
                  placeholder="80"
                  max={500}
                  value={form.suggested_price}
                  onChange={(e) => setForm({ ...form, suggested_price: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Descripción / notas</Label>
              <Textarea
                placeholder="Describe puntos clave de la ruta, referencias útiles..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Actualizar' : 'Crear ruta')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}