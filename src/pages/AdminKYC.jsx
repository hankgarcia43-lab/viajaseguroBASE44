import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Shield, User, Car, FileText, CheckCircle, XCircle, Clock,
  AlertTriangle, Eye, Loader2, RefreshCw, ChevronDown, ChevronUp,
  Image as ImageIcon
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

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:          { label: 'Pendiente',           color: 'bg-yellow-100 text-yellow-700' },
  documents_uploaded:{ label: 'Docs subidos',       color: 'bg-blue-100 text-blue-700' },
  automated_check:  { label: 'Verificando',         color: 'bg-yellow-100 text-yellow-700' },
  manual_review:    { label: 'Rev. manual',         color: 'bg-orange-100 text-orange-700' },
  approved:         { label: 'Aprobado',            color: 'bg-green-100 text-green-700' },
  rejected:         { label: 'Rechazado',           color: 'bg-red-100 text-red-700' },
  needs_correction: { label: 'Requiere corrección', color: 'bg-orange-100 text-orange-700' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return <Badge className={cfg.color}>{cfg.label}</Badge>;
};

const DocThumb = ({ url, label }) => (
  <div className="space-y-1">
    <p className="text-[11px] text-slate-500 font-medium">{label}</p>
    {url ? (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative group cursor-pointer">
          <img src={url} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
            <Eye className="w-5 h-5 text-white" />
          </div>
        </div>
      </a>
    ) : (
      <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center border border-dashed border-slate-300">
        <ImageIcon className="w-5 h-5 text-slate-300" />
      </div>
    )}
  </div>
);

// ─── Driver Card ──────────────────────────────────────────────────────────────
function DriverCard({ driver, tab, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = ['pending','documents_uploaded','automated_check','manual_review'].includes(driver.kyc_status);
  const isVehiclePending = ['pending','documents_uploaded','needs_correction'].includes(driver.vehicle_kyc_status || 'pending');

  const status = tab === 'conductores' ? driver.kyc_status : (driver.vehicle_kyc_status || 'pending');
  const notes  = tab === 'conductores' ? driver.kyc_notes : driver.vehicle_kyc_notes;
  const canAct = tab === 'conductores' ? isPending : isVehiclePending;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header row */}
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
              {driver.profile_photo
                ? <img src={driver.profile_photo} alt="" className="w-full h-full rounded-full object-cover" />
                : <User className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">{driver.full_name}</p>
              <p className="text-sm text-slate-500">{driver.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={status} />
            <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600 p-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="p-4">
            {/* Documents grid */}
            {tab === 'conductores' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <DocThumb url={driver.ine_front}    label="INE Frente" />
                <DocThumb url={driver.ine_back}     label="INE Reverso" />
                <DocThumb url={driver.selfie}       label="Selfie" />
                <DocThumb url={driver.license_front} label="Licencia" />
              </div>
            )}
            {tab === 'vehiculos' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <DocThumb url={driver.circulation_card} label="T. Circulación" />
                <DocThumb url={driver.insurance_photo}  label="Póliza/Seguro" />
                <DocThumb url={driver.vehicle_photo}    label="Foto Vehículo" />
                {driver.requires_owner_letter && <DocThumb url={driver.owner_letter} label="Carta Responsiva" />}
              </div>
            )}

            {/* Extracted data */}
            <div className="bg-slate-50 rounded-xl p-3 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {tab === 'conductores' && <>
                <div><p className="text-slate-400 text-xs">Nombre INE</p><p className="font-medium">{driver.ine_name || '—'}</p></div>
                <div><p className="text-slate-400 text-xs">CURP</p><p className="font-medium text-xs">{driver.ine_curp || '—'}</p></div>
                <div><p className="text-slate-400 text-xs">No. INE</p><p className="font-medium text-xs">{driver.ine_number || '—'}</p></div>
                <div><p className="text-slate-400 text-xs">Confianza OCR</p><p className={`font-medium ${(driver.ocr_confidence||0) >= 85 ? 'text-green-600' : 'text-orange-600'}`}>{driver.ocr_confidence ? `${driver.ocr_confidence}%` : '—'}</p></div>
              </>}
              {tab === 'vehiculos' && <>
                <div><p className="text-slate-400 text-xs">Placas</p><p className="font-medium">{driver.vehicle_plate || '—'}</p></div>
                <div><p className="text-slate-400 text-xs">Vehículo</p><p className="font-medium">{driver.vehicle_model || '—'}</p></div>
                <div><p className="text-slate-400 text-xs">Propietario T.C.</p><p className="font-medium text-xs">{driver.circulation_owner_name || '—'}</p></div>
                <div><p className="text-slate-400 text-xs">Match propietario</p><p className={`font-medium ${driver.owner_match ? 'text-green-600' : 'text-red-600'}`}>{driver.owner_match ? 'Sí' : 'No'}</p></div>
              </>}
            </div>

            {notes && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-semibold text-amber-800 mb-1">Notas admin</p>
                <p className="text-sm text-amber-700">{notes}</p>
              </div>
            )}

            {/* Actions */}
            {canAct && (
              <div className="flex gap-2 justify-end flex-wrap">
                <Button variant="outline" size="sm" onClick={() => onAction(driver, tab, 'correction')} className="text-orange-600 hover:bg-orange-50 border-orange-200">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  Solicitar corrección
                </Button>
                <Button variant="outline" size="sm" onClick={() => onAction(driver, tab, 'reject')} className="text-red-600 hover:bg-red-50 border-red-200">
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Rechazar
                </Button>
                <Button size="sm" onClick={() => onAction(driver, tab, 'approve')} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Aprobar
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Passenger Card ───────────────────────────────────────────────────────────
function PassengerCard({ subs, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const grouped = {};
  subs.forEach(s => { if (!grouped[s.doc_type] || new Date(s.created_date) > new Date(grouped[s.doc_type].created_date)) grouped[s.doc_type] = s; });
  const latest = Object.values(grouped);
  const hasPending = latest.some(s => s.status === 'pending');
  const user_name = subs[0]?.user_name || 'Pasajero';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user_name}</p>
              <p className="text-xs text-slate-500">{latest.length} documento(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasPending && <Badge className="bg-yellow-100 text-yellow-700">Pendiente</Badge>}
            <button onClick={() => setExpanded(!expanded)} className="text-slate-400 p-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {latest.map(sub => (
                <div key={sub.id}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-slate-500">{sub.doc_label || sub.doc_type}</p>
                    <StatusBadge status={sub.status} />
                  </div>
                  <DocThumb url={sub.file_url} label="" />
                  {sub.review_notes && <p className="text-xs text-orange-700 mt-1 bg-orange-50 rounded p-1">{sub.review_notes}</p>}
                  {sub.status === 'pending' && (
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 text-xs h-7 px-2" onClick={() => onAction(sub, 'reject')}>
                        Rechazar
                      </Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs h-7 px-2" onClick={() => onAction(sub, 'approve')}>
                        Aprobar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminKYC() {
  const [tab, setTab]             = useState('conductores');
  const [filter, setFilter]       = useState('pending');
  const [drivers, setDrivers]     = useState([]);
  const [passengerSubs, setPassengerSubs] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [dialog, setDialog]       = useState({ open: false, target: null, tab: '', action: '' });
  const [notes, setNotes]         = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [drvs, subs] = await Promise.all([
        base44.entities.Driver.list('-created_date', 100),
        base44.entities.DocumentSubmission.filter({ user_role: 'passenger' }, '-created_date', 200),
      ]);
      setDrivers(drvs);
      setPassengerSubs(subs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Filter drivers
  const isPendingStatus = (s) => ['pending','documents_uploaded','automated_check','manual_review'].includes(s);
  const filteredDrivers = drivers.filter(d => {
    const s = tab === 'conductores' ? d.kyc_status : (d.vehicle_kyc_status || 'pending');
    if (filter === 'pending') return isPendingStatus(s);
    if (filter === 'approved') return s === 'approved';
    if (filter === 'rejected') return s === 'rejected' || s === 'needs_correction';
    return true;
  });

  // Group passenger subs by user
  const passengerGroups = Object.values(
    passengerSubs.reduce((acc, s) => {
      if (!acc[s.user_id]) acc[s.user_id] = [];
      acc[s.user_id].push(s);
      return acc;
    }, {})
  ).filter(group => {
    if (filter === 'pending') return group.some(s => s.status === 'pending');
    if (filter === 'approved') return group.every(s => s.status === 'approved');
    if (filter === 'rejected') return group.some(s => s.status === 'rejected' || s.status === 'needs_correction');
    return true;
  });

  const pendingCount = {
    conductores: drivers.filter(d => isPendingStatus(d.kyc_status)).length,
    vehiculos:   drivers.filter(d => isPendingStatus(d.vehicle_kyc_status || 'pending')).length,
    pasajeros:   passengerSubs.filter(s => s.status === 'pending').length,
  };

  const openDialog = (target, tab, action) => {
    setDialog({ open: true, target, tab, action });
    setNotes('');
  };

  const handleAction = async () => {
    const { target, tab: actionTab, action } = dialog;
    if (action !== 'approve' && !notes.trim()) return toast.error('El motivo es obligatorio');
    setProcessing(true);
    try {
      const admin = await base44.auth.me();

      if (actionTab === 'conductores' || actionTab === 'vehiculos') {
        // Driver action
        const driver = target;
        const isIdentity = actionTab === 'conductores';
        let updateData = {};
        if (action === 'approve') {
          updateData = isIdentity
            ? { kyc_status: 'approved', kyc_notes: notes || '' }
            : { vehicle_kyc_status: 'approved', vehicle_kyc_notes: notes || '' };
        } else if (action === 'reject') {
          updateData = isIdentity
            ? { kyc_status: 'rejected', kyc_rejection_reason: notes, kyc_notes: notes }
            : { vehicle_kyc_status: 'rejected', vehicle_kyc_notes: notes };
        } else if (action === 'correction') {
          updateData = isIdentity
            ? { kyc_status: 'manual_review', kyc_notes: notes }
            : { vehicle_kyc_status: 'needs_correction', vehicle_kyc_notes: notes };
        }
        await base44.entities.Driver.update(driver.id, updateData);

        // Audit log
        await base44.entities.AuditLog.create({
          user_id: admin.id, user_email: admin.email,
          action: action === 'approve' ? 'kyc_approve' : action === 'reject' ? 'kyc_reject' : 'kyc_request_info',
          entity_type: 'Driver', entity_id: driver.id,
          details: JSON.stringify({ notes, tab: actionTab, previous_status: isIdentity ? driver.kyc_status : driver.vehicle_kyc_status })
        });

        // Notify driver
        await base44.entities.Notification.create({
          user_id: driver.user_id, type: 'kyc_update',
          title: action === 'approve' ? '✅ Documentos aprobados' : action === 'reject' ? '❌ Documentos rechazados' : '⚠️ Corrección solicitada',
          message: action === 'approve'
            ? `Tu ${isIdentity ? 'identidad' : 'vehículo'} ha sido verificado.`
            : `Motivo: ${notes}`,
        });

        toast.success(action === 'approve' ? 'Aprobado correctamente' : action === 'reject' ? 'Rechazado' : 'Corrección solicitada');
      } else {
        // Passenger doc action
        const sub = target;
        const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_correction';
        await base44.entities.DocumentSubmission.update(sub.id, {
          status: newStatus, review_notes: notes, reviewed_by: admin.email, reviewed_at: new Date().toISOString()
        });
        toast.success(action === 'approve' ? 'Documento aprobado' : 'Documento rechazado');
      }

      await loadData();
      setDialog({ open: false, target: null, tab: '', action: '' });
    } catch (e) {
      toast.error('Error al procesar');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Verificación de documentos</h1>
            <p className="text-slate-500">Aprueba o rechaza identidades, conductores y vehículos</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Tabs por tipo */}
        <Tabs value={tab} onValueChange={setTab} className="mb-5">
          <TabsList className="bg-white w-full">
            <TabsTrigger value="conductores" className="flex-1">
              Conductores {pendingCount.conductores > 0 && <Badge className="ml-2 bg-yellow-100 text-yellow-700">{pendingCount.conductores}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="vehiculos" className="flex-1">
              Vehículos {pendingCount.vehiculos > 0 && <Badge className="ml-2 bg-yellow-100 text-yellow-700">{pendingCount.vehiculos}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="pasajeros" className="flex-1">
              Pasajeros {pendingCount.pasajeros > 0 && <Badge className="ml-2 bg-yellow-100 text-yellow-700">{pendingCount.pasajeros}</Badge>}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filter */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {['pending','approved','rejected','all'].map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'}
              className={filter === f ? 'bg-blue-600 hover:bg-blue-700' : ''}
              onClick={() => setFilter(f)}>
              {{ pending: 'Pendientes', approved: 'Aprobados', rejected: 'Rechazados', all: 'Todos' }[f]}
            </Button>
          ))}
        </div>

        {/* Lists */}
        {(tab === 'conductores' || tab === 'vehiculos') && (
          filteredDrivers.length === 0
            ? <Card><CardContent className="p-14 text-center"><Shield className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">Sin registros en esta categoría</p></CardContent></Card>
            : <div className="space-y-3">
                {filteredDrivers.map(d => (
                  <DriverCard key={d.id} driver={d} tab={tab} onAction={(drv, t, action) => openDialog(drv, t, action)} />
                ))}
              </div>
        )}

        {tab === 'pasajeros' && (
          passengerGroups.length === 0
            ? <Card><CardContent className="p-14 text-center"><User className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">Sin documentos de pasajeros</p></CardContent></Card>
            : <div className="space-y-3">
                {passengerGroups.map(group => (
                  <PassengerCard key={group[0].user_id} subs={group}
                    onAction={(sub, action) => openDialog(sub, 'pasajeros', action)} />
                ))}
              </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog({ ...dialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {{ approve: 'Aprobar documentos', reject: 'Rechazar documentos', correction: 'Solicitar corrección' }[dialog.action]}
            </DialogTitle>
            <DialogDescription>
              {{ approve: 'El usuario será notificado de la aprobación.', reject: 'Indica el motivo del rechazo. El usuario podrá volver a subir.', correction: 'Indica qué debe corregir el usuario.' }[dialog.action]}
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label className="mb-1 block">
              {dialog.action === 'approve' ? 'Notas (opcional)' : 'Motivo *'}
            </Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={dialog.action === 'approve' ? 'Observaciones adicionales...' : 'Describe el motivo detalladamente...'}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ ...dialog, open: false })}>Cancelar</Button>
            <Button
              onClick={handleAction}
              disabled={processing || (dialog.action !== 'approve' && !notes.trim())}
              className={dialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : dialog.action === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}