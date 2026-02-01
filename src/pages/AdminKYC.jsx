import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Shield, User, Car, FileText, CheckCircle, XCircle, 
  Clock, AlertCircle, Eye, ChevronDown, Loader2,
  Image, Download, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function AdminKYC() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      const allDrivers = await base44.entities.Driver.list('-created_date', 100);
      setDrivers(allDrivers);
    } catch (error) {
      console.error('Error loading drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(d => {
    if (filter === 'pending') {
      return ['pending', 'documents_uploaded', 'automated_check', 'manual_review'].includes(d.kyc_status);
    }
    if (filter === 'approved') return d.kyc_status === 'approved';
    if (filter === 'rejected') return d.kyc_status === 'rejected';
    return true;
  });

  const handleAction = async () => {
    if (!selectedDriver) return;

    setProcessing(true);
    try {
      const user = await base44.auth.me();
      let updateData = {};

      if (action === 'approve') {
        updateData = {
          kyc_status: 'approved',
          kyc_notes: notes
        };
        toast.success('Conductor aprobado');
      } else if (action === 'reject') {
        updateData = {
          kyc_status: 'rejected',
          kyc_rejection_reason: notes,
          kyc_notes: notes
        };
        toast.success('Conductor rechazado');
      } else if (action === 'request_info') {
        updateData = {
          kyc_status: 'manual_review',
          kyc_notes: notes
        };
        toast.success('Información solicitada');
      }

      await base44.entities.Driver.update(selectedDriver.id, updateData);

      // Create audit log
      await base44.entities.AuditLog.create({
        user_id: user.id,
        user_email: user.email,
        action: action === 'approve' ? 'kyc_approve' : action === 'reject' ? 'kyc_reject' : 'kyc_request_info',
        entity_type: 'Driver',
        entity_id: selectedDriver.id,
        details: JSON.stringify({ notes, previous_status: selectedDriver.kyc_status })
      });

      // Reload drivers
      await loadDrivers();
      setShowDialog(false);
      setSelectedDriver(null);
      setNotes('');

    } catch (error) {
      toast.error('Error al procesar');
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (driver, actionType) => {
    setSelectedDriver(driver);
    setAction(actionType);
    setNotes('');
    setShowDialog(true);
  };

  const getStatusBadge = (status) => {
    const statuses = {
      pending: { color: 'bg-slate-100 text-slate-700', text: 'Pendiente' },
      documents_uploaded: { color: 'bg-blue-100 text-blue-700', text: 'Docs subidos' },
      automated_check: { color: 'bg-yellow-100 text-yellow-700', text: 'Verificando' },
      manual_review: { color: 'bg-orange-100 text-orange-700', text: 'Rev. manual' },
      approved: { color: 'bg-green-100 text-green-700', text: 'Aprobado' },
      rejected: { color: 'bg-red-100 text-red-700', text: 'Rechazado' }
    };
    const s = statuses[status] || statuses.pending;
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
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Verificación KYC</h1>
            <p className="text-slate-500">Gestión de documentos de conductores</p>
          </div>
          <Badge className="bg-yellow-100 text-yellow-700 py-1 px-3">
            {filteredDrivers.filter(d => ['pending', 'documents_uploaded', 'automated_check', 'manual_review'].includes(d.kyc_status)).length} pendientes
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="mb-6">
          <TabsList className="bg-white">
            <TabsTrigger value="pending">
              Pendientes ({drivers.filter(d => ['pending', 'documents_uploaded', 'automated_check', 'manual_review'].includes(d.kyc_status)).length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Aprobados ({drivers.filter(d => d.kyc_status === 'approved').length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rechazados ({drivers.filter(d => d.kyc_status === 'rejected').length})
            </TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Drivers List */}
        {filteredDrivers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">Sin conductores</h3>
              <p className="text-slate-500">No hay conductores en esta categoría</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDrivers.map((driver) => (
              <Card key={driver.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="w-6 h-6 text-slate-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{driver.full_name}</h3>
                        <p className="text-sm text-slate-500">{driver.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(driver.kyc_status)}
                      {driver.ocr_confidence && (
                        <Badge variant="outline">
                          OCR: {driver.ocr_confidence}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Documents Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {/* INE */}
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">INE Frente</Label>
                        {driver.ine_front ? (
                          <a href={driver.ine_front} target="_blank" rel="noopener noreferrer">
                            <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative group">
                              <img src={driver.ine_front} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </a>
                        ) : (
                          <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                            <Image className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">INE Reverso</Label>
                        {driver.ine_back ? (
                          <a href={driver.ine_back} target="_blank" rel="noopener noreferrer">
                            <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative group">
                              <img src={driver.ine_back} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </a>
                        ) : (
                          <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                            <Image className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                      </div>

                      {/* Selfie */}
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Selfie</Label>
                        {driver.selfie ? (
                          <a href={driver.selfie} target="_blank" rel="noopener noreferrer">
                            <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative group">
                              <img src={driver.selfie} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </a>
                        ) : (
                          <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                            <Image className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                      </div>

                      {/* License */}
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Licencia</Label>
                        {driver.license_front ? (
                          <a href={driver.license_front} target="_blank" rel="noopener noreferrer">
                            <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative group">
                              <img src={driver.license_front} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </a>
                        ) : (
                          <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                            <Image className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional docs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Tarjeta Circulación</Label>
                        {driver.circulation_card ? (
                          <a href={driver.circulation_card} target="_blank" rel="noopener noreferrer">
                            <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative group">
                              <img src={driver.circulation_card} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </a>
                        ) : (
                          <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                            <Image className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Foto Vehículo</Label>
                        {driver.vehicle_photo ? (
                          <a href={driver.vehicle_photo} target="_blank" rel="noopener noreferrer">
                            <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative group">
                              <img src={driver.vehicle_photo} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </a>
                        ) : (
                          <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                            <Image className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                      </div>

                      {driver.requires_owner_letter && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Carta Responsiva</Label>
                            {driver.owner_letter ? (
                              <a href={driver.owner_letter} target="_blank" rel="noopener noreferrer">
                                <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative group">
                                  <img src={driver.owner_letter} alt="" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye className="w-6 h-6 text-white" />
                                  </div>
                                </div>
                              </a>
                            ) : (
                              <div className="aspect-video bg-red-50 rounded-lg flex items-center justify-center border border-red-200">
                                <AlertCircle className="w-6 h-6 text-red-400" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs text-slate-500">INE Propietario</Label>
                            {driver.owner_ine ? (
                              <a href={driver.owner_ine} target="_blank" rel="noopener noreferrer">
                                <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative group">
                                  <img src={driver.owner_ine} alt="" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye className="w-6 h-6 text-white" />
                                  </div>
                                </div>
                              </a>
                            ) : (
                              <div className="aspect-video bg-red-50 rounded-lg flex items-center justify-center border border-red-200">
                                <AlertCircle className="w-6 h-6 text-red-400" />
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Extracted Data */}
                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-slate-700 mb-3">Datos extraídos</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Nombre INE</p>
                          <p className="font-medium">{driver.ine_name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">CURP</p>
                          <p className="font-medium">{driver.ine_curp || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">No. INE</p>
                          <p className="font-medium">{driver.ine_number || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Propietario T.C.</p>
                          <p className="font-medium">{driver.circulation_owner_name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Placas</p>
                          <p className="font-medium">{driver.vehicle_plate || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Vehículo</p>
                          <p className="font-medium">{driver.vehicle_model || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Match propietario</p>
                          <p className={`font-medium ${driver.owner_match ? 'text-green-600' : 'text-red-600'}`}>
                            {driver.owner_match ? 'Sí' : 'No'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Carta req.</p>
                          <p className={`font-medium ${driver.requires_owner_letter ? 'text-amber-600' : 'text-slate-600'}`}>
                            {driver.requires_owner_letter ? 'Sí' : 'No'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {['pending', 'documents_uploaded', 'automated_check', 'manual_review'].includes(driver.kyc_status) && (
                      <div className="flex gap-3 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => openActionDialog(driver, 'request_info')}
                        >
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Solicitar info
                        </Button>
                        <Button
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => openActionDialog(driver, 'reject')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Rechazar
                        </Button>
                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => openActionDialog(driver, 'approve')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Aprobar
                        </Button>
                      </div>
                    )}

                    {driver.kyc_notes && (
                      <div className="mt-4 p-3 bg-slate-100 rounded-lg">
                        <p className="text-sm text-slate-600">
                          <strong>Notas:</strong> {driver.kyc_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Action Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {action === 'approve' && 'Aprobar conductor'}
                {action === 'reject' && 'Rechazar conductor'}
                {action === 'request_info' && 'Solicitar información'}
              </DialogTitle>
              <DialogDescription>
                {action === 'approve' && 'El conductor podrá comenzar a recibir viajes.'}
                {action === 'reject' && 'El conductor no podrá operar en la plataforma.'}
                {action === 'request_info' && 'Se notificará al conductor que debe proporcionar información adicional.'}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Label>Notas / Razón</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  action === 'approve' ? 'Notas adicionales (opcional)' :
                  action === 'reject' ? 'Razón del rechazo (obligatorio)' :
                  'Qué información se necesita'
                }
                className="mt-2"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAction}
                disabled={processing || (action !== 'approve' && !notes.trim())}
                className={
                  action === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  action === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  ''
                }
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