import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  AlertCircle, Shield, CreditCard, User, Route, 
  X, Package, HelpCircle, CheckCircle, Clock,
  Loader2, Eye, MessageCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const CATEGORY_ICONS = {
  safety: Shield,
  payment: CreditCard,
  behavior: User,
  route: Route,
  cancellation: X,
  lost_item: Package,
  other: HelpCircle
};

const CATEGORY_LABELS = {
  safety: 'Seguridad',
  payment: 'Pago',
  behavior: 'Comportamiento',
  route: 'Ruta',
  cancellation: 'Cancelación',
  lost_item: 'Objeto perdido',
  other: 'Otro'
};

export default function AdminIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [resolution, setResolution] = useState('');
  const [status, setStatus] = useState('resolved');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const allIncidents = await base44.entities.Incident.list('-created_date', 100);
      setIncidents(allIncidents);
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidents = incidents.filter(i => {
    if (filter === 'open') return ['open', 'in_review'].includes(i.status);
    if (filter === 'resolved') return i.status === 'resolved';
    if (filter === 'escalated') return i.status === 'escalated';
    return true;
  });

  const handleResolve = async () => {
    if (!selectedIncident || !resolution.trim()) return;

    setProcessing(true);
    try {
      const user = await base44.auth.me();

      await base44.entities.Incident.update(selectedIncident.id, {
        status,
        resolution,
        resolved_by: user.email,
        resolved_at: new Date().toISOString()
      });

      // If incident affected payment and is resolved, capture or refund
      if (selectedIncident.payment_affected && selectedIncident.ride_id) {
        const payments = await base44.entities.Payment.filter({ ride_id: selectedIncident.ride_id });
        if (payments.length > 0) {
          const payment = payments[0];
          
          if (status === 'resolved') {
            // Release payment
            await base44.entities.Payment.update(payment.id, {
              dispute_flag: false,
              status: 'captured'
            });
          }
        }
      }

      // Log action
      await base44.entities.AuditLog.create({
        user_id: user.id,
        user_email: user.email,
        action: 'incident_resolve',
        entity_type: 'Incident',
        entity_id: selectedIncident.id,
        details: JSON.stringify({ resolution, status })
      });

      toast.success('Incidente actualizado');
      await loadIncidents();
      setShowDialog(false);
      setSelectedIncident(null);
      setResolution('');

    } catch (error) {
      toast.error('Error al resolver');
    } finally {
      setProcessing(false);
    }
  };

  const getPriorityBadge = (priority) => {
    const priorities = {
      critical: { color: 'bg-red-100 text-red-700', text: 'Crítico' },
      high: { color: 'bg-orange-100 text-orange-700', text: 'Alto' },
      medium: { color: 'bg-yellow-100 text-yellow-700', text: 'Medio' },
      low: { color: 'bg-slate-100 text-slate-700', text: 'Bajo' }
    };
    const p = priorities[priority] || priorities.medium;
    return <Badge className={p.color}>{p.text}</Badge>;
  };

  const getStatusBadge = (status) => {
    const statuses = {
      open: { color: 'bg-blue-100 text-blue-700', text: 'Abierto' },
      in_review: { color: 'bg-yellow-100 text-yellow-700', text: 'En revisión' },
      resolved: { color: 'bg-green-100 text-green-700', text: 'Resuelto' },
      closed: { color: 'bg-slate-100 text-slate-700', text: 'Cerrado' },
      escalated: { color: 'bg-red-100 text-red-700', text: 'Escalado' }
    };
    const s = statuses[status] || statuses.open;
    return <Badge className={s.color}>{s.text}</Badge>;
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Incidentes</h1>
            <p className="text-slate-500">Gestión de reportes y disputas</p>
          </div>
          <Badge className="bg-red-100 text-red-700 py-1 px-3">
            {incidents.filter(i => ['open', 'in_review'].includes(i.status)).length} abiertos
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="mb-6">
          <TabsList className="bg-white">
            <TabsTrigger value="open">
              Abiertos ({incidents.filter(i => ['open', 'in_review'].includes(i.status)).length})
            </TabsTrigger>
            <TabsTrigger value="escalated">
              Escalados ({incidents.filter(i => i.status === 'escalated').length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resueltos ({incidents.filter(i => i.status === 'resolved').length})
            </TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Incidents List */}
        {filteredIncidents.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">Sin incidentes</h3>
              <p className="text-slate-500">No hay incidentes en esta categoría</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredIncidents.map((incident) => {
              const CategoryIcon = CATEGORY_ICONS[incident.category] || AlertCircle;
              
              return (
                <Card key={incident.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        incident.priority === 'critical' ? 'bg-red-100' :
                        incident.priority === 'high' ? 'bg-orange-100' :
                        'bg-slate-100'
                      }`}>
                        <CategoryIcon className={`w-6 h-6 ${
                          incident.priority === 'critical' ? 'text-red-600' :
                          incident.priority === 'high' ? 'text-orange-600' :
                          'text-slate-600'
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getPriorityBadge(incident.priority)}
                          {getStatusBadge(incident.status)}
                          {incident.reported_in_window && (
                            <Badge variant="outline" className="text-xs">
                              En ventana de 10min
                            </Badge>
                          )}
                          {incident.payment_affected && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                              Pago retenido
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-semibold text-slate-900 mb-1">
                          {CATEGORY_LABELS[incident.category]}
                        </h3>

                        <p className="text-slate-600 text-sm mb-2">{incident.description}</p>

                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span>
                            <strong>Reportado por:</strong> {incident.reporter_name} ({incident.reporter_role})
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(incident.created_date), "d MMM HH:mm", { locale: es })}
                          </span>
                        </div>

                        {/* Attachments */}
                        {incident.attachments && incident.attachments.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {incident.attachments.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden"
                              >
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Resolution */}
                        {incident.resolution && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-800">
                              <strong>Resolución:</strong> {incident.resolution}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              Por {incident.resolved_by} el {format(new Date(incident.resolved_at), "d MMM HH:mm", { locale: es })}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {['open', 'in_review'].includes(incident.status) && (
                          <Button
                            onClick={() => {
                              setSelectedIncident(incident);
                              setShowDialog(true);
                            }}
                          >
                            Resolver
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Resolve Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolver incidente</DialogTitle>
              <DialogDescription>
                Proporciona una resolución para este incidente.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div>
                <Label>Estado final</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolved">Resuelto</SelectItem>
                    <SelectItem value="closed">Cerrado (sin acción)</SelectItem>
                    <SelectItem value="escalated">Escalar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Resolución / Notas</Label>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Describe la resolución del incidente..."
                  className="mt-2 min-h-[100px]"
                />
              </div>

              {selectedIncident?.payment_affected && (
                <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Este incidente tiene un pago retenido. Al marcar como "Resuelto", el pago se liberará.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleResolve}
                disabled={processing || !resolution.trim()}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Confirmar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}