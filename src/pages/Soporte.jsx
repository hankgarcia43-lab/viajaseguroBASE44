import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  MessageSquare, AlertTriangle, Info, Send, 
  Loader2, CheckCircle, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'safety', label: '🚨 Seguridad', color: 'bg-red-100 text-red-700' },
  { value: 'payment', label: '💳 Pago', color: 'bg-blue-100 text-blue-700' },
  { value: 'behavior', label: '😤 Conducta', color: 'bg-orange-100 text-orange-700' },
  { value: 'vehicle', label: '🚗 Vehículo', color: 'bg-purple-100 text-purple-700' },
  { value: 'route', label: '📍 Ruta', color: 'bg-green-100 text-green-700' },
  { value: 'cancellation', label: '❌ Cancelación', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'other', label: '💬 Otro', color: 'bg-slate-100 text-slate-700' },
];

export default function Soporte() {
  const [user, setUser] = useState(null);
  const [myIncidents, setMyIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '', description: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      const incidents = await base44.entities.Incident.filter(
        { reporter_id: userData.id },
        '-created_date',
        20
      );
      setMyIncidents(incidents);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.category) return toast.error('Selecciona una categoría');
    if (!form.description || form.description.length < 10) return toast.error('Describe el problema (mínimo 10 caracteres)');

    setSending(true);
    try {
      const newIncident = await base44.entities.Incident.create({
        reporter_id: user.id,
        reporter_name: user.full_name,
        category: form.category,
        description: form.description,
        status: 'open',
        priority: form.category === 'safety' ? 'high' : 'medium',
        reported_in_window: true,
        ride_id: 'soporte-directo'
      });

      setMyIncidents([newIncident, ...myIncidents]);
      setForm({ category: '', description: '' });
      setShowForm(false);
      toast.success('Reporte enviado. Nuestro equipo lo revisará pronto.');
    } catch (e) {
      toast.error('Error al enviar el reporte');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      open: { label: 'Abierto', color: 'bg-yellow-100 text-yellow-700' },
      in_review: { label: 'En revisión', color: 'bg-blue-100 text-blue-700' },
      resolved: { label: 'Resuelto', color: 'bg-green-100 text-green-700' },
      closed: { label: 'Cerrado', color: 'bg-slate-100 text-slate-700' },
    };
    const s = map[status] || map.open;
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const getCategoryLabel = (val) => CATEGORIES.find(c => c.value === val)?.label || val;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Soporte</h1>
          <p className="text-slate-500">Reporta un problema o envía un comentario</p>
        </div>

        {/* Info card */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Respondemos en máximo 24 horas hábiles</p>
              <p className="text-xs text-blue-700 mt-0.5">Para problemas de seguridad activa, elige la categoría 🚨 Seguridad. Se atiende con prioridad alta.</p>
            </div>
          </CardContent>
        </Card>

        {/* New report button */}
        <Button
          onClick={() => setShowForm(!showForm)}
          className="w-full mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl h-12"
        >
          <MessageSquare className="w-5 h-5 mr-2" />
          Nuevo reporte o comentario
        </Button>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">¿Qué pasó?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Category */}
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-3">Categoría</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setForm({ ...form, category: cat.value })}
                          className={`p-3 rounded-xl text-left text-sm font-medium border-2 transition-all ${
                            form.category === cat.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Descripción</p>
                    <Textarea
                      placeholder="Cuéntanos qué sucedió con el mayor detalle posible..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="min-h-[120px] rounded-xl"
                    />
                    <p className="text-xs text-slate-400 mt-1">{form.description.length} caracteres</p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={sending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <><Send className="w-4 h-4 mr-2" />Enviar</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My incidents */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-4">Mis reportes anteriores</h2>
          {myIncidents.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Sin reportes anteriores</p>
                <p className="text-sm text-slate-400 mt-1">¡Todo tranquilo por aquí!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myIncidents.map((incident) => (
                <Card key={incident.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-medium text-slate-900 text-sm">{getCategoryLabel(incident.category)}</p>
                      {getStatusBadge(incident.status)}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{incident.description}</p>
                    {incident.resolution && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <p className="text-xs font-medium text-green-800">Respuesta del equipo:</p>
                        <p className="text-sm text-green-700 mt-1">{incident.resolution}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}