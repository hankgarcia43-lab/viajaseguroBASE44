import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Car, Upload, CheckCircle, AlertCircle, Clock, Loader2,
  Shield, FileText, Camera, Edit2, Save, X, Info, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

const DOC_STATUS = {
  pending: { label: 'Pendiente', color: 'bg-slate-100 text-slate-600', icon: Clock },
  approved: { label: 'Aprobado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-700', icon: X },
  needs_correction: { label: 'Corrección', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
};

function DocStatusBadge({ status }) {
  const cfg = DOC_STATUS[status] || DOC_STATUS.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function DocUploadCard({ label, hint, field, fileUrl, submissionStatus, reviewNotes, onUpload, uploading, accept = 'image/*' }) {
  return (
    <div className="border rounded-xl p-4 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-800 text-sm">{label}</p>
          {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
        </div>
        <DocStatusBadge status={submissionStatus || (fileUrl ? 'pending' : undefined)} />
      </div>

      {reviewNotes && (
        <Alert className="border-red-200 bg-red-50 py-2">
          <AlertDescription className="text-xs text-red-700">{reviewNotes}</AlertDescription>
        </Alert>
      )}

      <label className={`flex flex-col items-center justify-center h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
        fileUrl ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50'
      }`}>
        {fileUrl ? (
          accept.includes('image') ? (
            <img src={fileUrl} alt={label} className="h-full w-full object-contain rounded-lg p-1" />
          ) : (
            <div className="flex flex-col items-center">
              <FileText className="w-10 h-10 text-green-500 mb-1" />
              <span className="text-xs text-green-700">Documento cargado</span>
              <span className="text-[10px] text-green-500 mt-0.5">Toca para reemplazar</span>
            </div>
          )
        ) : (
          <>
            <Upload className="w-8 h-8 text-slate-300 mb-1" />
            <span className="text-sm text-slate-400">Subir {label.toLowerCase()}</span>
          </>
        )}
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={uploading}
          onChange={onUpload}
        />
      </label>
    </div>
  );
}

export default function DriverVehicle() {
  const [driver, setDriver] = useState(null);
  const [user, setUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null); // field name
  const [editingInfo, setEditingInfo] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState({ model: '', color: '', year: '', plate: '', brand: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
      if (drivers.length === 0) return;
      const d = drivers[0];
      setDriver(d);
      setVehicleInfo({
        brand: d.vehicle_model?.split(' ')[0] || '',
        model: d.vehicle_model || '',
        color: d.vehicle_color || '',
        year: d.vehicle_year || '',
        plate: d.vehicle_plate || '',
      });
      const subs = await base44.entities.DocumentSubmission.filter({ driver_id: d.id }, '-created_date', 50);
      setSubmissions(subs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getLatestSubmission = (docType) => {
    return submissions.filter(s => s.doc_type === docType).sort((a, b) =>
      new Date(b.created_date) - new Date(a.created_date)
    )[0];
  };

  const uploadFile = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  };

  const handleDocUpload = async (e, docType, docLabel, driverField, category = 'vehicle') => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(docType);
    try {
      const fileUrl = await uploadFile(file);
      // Update driver record
      await base44.entities.Driver.update(driver.id, { [driverField]: fileUrl });
      // Register DocumentSubmission
      await base44.entities.DocumentSubmission.create({
        user_id: user.id,
        user_name: user.full_name || '',
        user_role: 'driver',
        category,
        doc_type: docType,
        doc_label: docLabel,
        file_url: fileUrl,
        status: 'pending',
        driver_id: driver.id,
      });
      setDriver(prev => ({ ...prev, [driverField]: fileUrl }));
      await loadData(); // refresh submissions
      toast.success(`${docLabel} subido correctamente`);
    } catch {
      toast.error('Error al subir el documento');
    } finally {
      setUploading(null);
    }
  };

  const handleSaveVehicleInfo = async () => {
    setSaving(true);
    try {
      const modelFull = vehicleInfo.model || `${vehicleInfo.brand}`.trim();
      await base44.entities.Driver.update(driver.id, {
        vehicle_model: modelFull,
        vehicle_color: vehicleInfo.color,
        vehicle_year: vehicleInfo.year,
        vehicle_plate: vehicleInfo.plate.toUpperCase(),
      });
      setDriver(prev => ({ ...prev, vehicle_model: modelFull, vehicle_color: vehicleInfo.color, vehicle_year: vehicleInfo.year, vehicle_plate: vehicleInfo.plate.toUpperCase() }));
      toast.success('Información del vehículo actualizada');
      setEditingInfo(false);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const kycBadge = () => {
    const map = {
      pending: 'bg-slate-100 text-slate-600',
      documents_uploaded: 'bg-blue-100 text-blue-700',
      automated_check: 'bg-yellow-100 text-yellow-700',
      manual_review: 'bg-orange-100 text-orange-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      suspended: 'bg-red-200 text-red-800',
    };
    const labels = {
      pending: 'Pendiente', documents_uploaded: 'Documentos enviados',
      automated_check: 'Verificación automática', manual_review: 'Revisión manual',
      approved: 'Aprobado', rejected: 'Rechazado', suspended: 'Suspendido',
    };
    const s = driver?.kyc_status || 'pending';
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${map[s] || map.pending}`}>{labels[s] || s}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Alert className="max-w-sm border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">No se encontró perfil de conductor asociado a tu cuenta.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const circulationSub = getLatestSubmission('circulation_card');
  const insuranceSub = getLatestSubmission('insurance');
  const vehiclePhotoSub = getLatestSubmission('vehicle_photo');
  const licenseSub = getLatestSubmission('license');

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mi vehículo</h1>
            <p className="text-slate-500 text-sm">Gestiona tu auto y documentos de verificación</p>
          </div>
          <div className="flex items-center gap-2">
            {kycBadge()}
            <Button variant="ghost" size="icon" onClick={loadData}>
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        </div>

        {driver.kyc_rejection_reason && driver.kyc_status === 'rejected' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 font-medium">{driver.kyc_rejection_reason}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="vehicle">
          <TabsList className="w-full bg-white">
            <TabsTrigger value="vehicle" className="flex-1">Vehículo</TabsTrigger>
            <TabsTrigger value="docs" className="flex-1">Documentos</TabsTrigger>
            <TabsTrigger value="identity" className="flex-1">Identidad</TabsTrigger>
          </TabsList>

          {/* ── TAB: Vehículo ── */}
          <TabsContent value="vehicle" className="space-y-4 pt-4">

            {/* Vehicle info card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Car className="w-5 h-5 text-blue-600" /> Datos del vehículo
                  </CardTitle>
                  {!editingInfo ? (
                    <Button variant="ghost" size="sm" onClick={() => setEditingInfo(true)}>
                      <Edit2 className="w-4 h-4 mr-1" /> Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingInfo(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                      <Button size="sm" onClick={handleSaveVehicleInfo} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Guardar</>}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingInfo ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Marca</Label>
                      <Input placeholder="Nissan, Toyota…" value={vehicleInfo.brand}
                        onChange={e => setVehicleInfo(p => ({ ...p, brand: e.target.value }))} className="mt-1 h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Modelo</Label>
                      <Input placeholder="Versa, Corolla…" value={vehicleInfo.model}
                        onChange={e => setVehicleInfo(p => ({ ...p, model: e.target.value }))} className="mt-1 h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <Input placeholder="Blanco, Gris…" value={vehicleInfo.color}
                        onChange={e => setVehicleInfo(p => ({ ...p, color: e.target.value }))} className="mt-1 h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Año</Label>
                      <Input placeholder="2020" value={vehicleInfo.year}
                        onChange={e => setVehicleInfo(p => ({ ...p, year: e.target.value.replace(/\D/g, '').slice(0, 4) }))} className="mt-1 h-9" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Placas</Label>
                      <Input placeholder="ABC-123" value={vehicleInfo.plate}
                        onChange={e => setVehicleInfo(p => ({ ...p, plate: e.target.value.toUpperCase() }))} className="mt-1 h-9 font-mono tracking-widest" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                    {[
                      ['Modelo', driver.vehicle_model || '—'],
                      ['Color', driver.vehicle_color || '—'],
                      ['Año', driver.vehicle_year || '—'],
                      ['Placas', driver.vehicle_plate || '—'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs text-slate-400">{k}</p>
                        <p className={`font-semibold text-slate-900 ${k === 'Placas' ? 'font-mono tracking-wider' : ''}`}>{v}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vehicle photo */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Foto del vehículo</CardTitle>
                  <DocStatusBadge status={vehiclePhotoSub?.status || (driver.vehicle_photo ? 'pending' : undefined)} />
                </div>
                <CardDescription>Foto exterior donde se vean las placas claramente</CardDescription>
              </CardHeader>
              <CardContent>
                {vehiclePhotoSub?.review_notes && (
                  <Alert className="border-red-200 bg-red-50 mb-3 py-2">
                    <AlertDescription className="text-xs text-red-700">{vehiclePhotoSub.review_notes}</AlertDescription>
                  </Alert>
                )}
                <label className={`flex flex-col items-center justify-center h-52 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  driver.vehicle_photo ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                }`}>
                  {driver.vehicle_photo ? (
                    <img src={driver.vehicle_photo} alt="Vehículo" className="h-full w-full object-contain rounded-xl p-1" />
                  ) : (
                    <>
                      <Camera className="w-12 h-12 text-slate-300 mb-2" />
                      <span className="text-slate-400">Subir foto</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden"
                    disabled={uploading === 'vehicle_photo'}
                    onChange={e => handleDocUpload(e, 'vehicle_photo', 'Foto del vehículo', 'vehicle_photo', 'vehicle')} />
                </label>
                {uploading === 'vehicle_photo' && (
                  <p className="text-center text-sm text-slate-500 mt-2 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Subiendo...
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB: Documentos del vehículo ── */}
          <TabsContent value="docs" className="space-y-4 pt-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                Todos los documentos son revisados manualmente. El estado se actualiza en 24–48 horas hábiles.
              </AlertDescription>
            </Alert>

            <DocUploadCard
              label="Tarjeta de circulación"
              hint="Del vehículo con que operarás"
              field="circulation_card"
              fileUrl={driver.circulation_card}
              submissionStatus={circulationSub?.status}
              reviewNotes={circulationSub?.review_notes}
              uploading={uploading === 'circulation_card'}
              onUpload={e => handleDocUpload(e, 'circulation_card', 'Tarjeta de circulación', 'circulation_card', 'vehicle')}
            />

            <DocUploadCard
              label="Póliza / Seguro del vehículo"
              hint="Debe estar vigente al momento de operar"
              field="insurance_photo"
              fileUrl={driver.insurance_photo}
              submissionStatus={insuranceSub?.status}
              reviewNotes={insuranceSub?.review_notes}
              uploading={uploading === 'insurance'}
              accept="image/*,.pdf"
              onUpload={e => handleDocUpload(e, 'insurance', 'Póliza de seguro', 'insurance_photo', 'vehicle')}
            />

            {driver.requires_owner_letter && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Carta responsiva requerida
                  </CardTitle>
                  <CardDescription className="text-amber-700">
                    El vehículo está a nombre de <strong>{driver.circulation_owner_name}</strong>. Sube los documentos del propietario.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4">
                  <DocUploadCard
                    label="Carta responsiva firmada"
                    hint="Firmada por el propietario del vehículo"
                    field="owner_letter"
                    fileUrl={driver.owner_letter}
                    uploading={uploading === 'owner_letter'}
                    accept="image/*,.pdf"
                    onUpload={async (e) => {
                      const file = e.target.files[0]; if (!file) return;
                      setUploading('owner_letter');
                      try {
                        const url = await uploadFile(file);
                        await base44.entities.Driver.update(driver.id, { owner_letter: url });
                        setDriver(p => ({ ...p, owner_letter: url }));
                        toast.success('Carta responsiva subida');
                      } catch { toast.error('Error al subir'); } finally { setUploading(null); }
                    }}
                  />
                  <DocUploadCard
                    label="INE del propietario"
                    field="owner_ine"
                    fileUrl={driver.owner_ine}
                    uploading={uploading === 'owner_ine'}
                    onUpload={async (e) => {
                      const file = e.target.files[0]; if (!file) return;
                      setUploading('owner_ine');
                      try {
                        const url = await uploadFile(file);
                        await base44.entities.Driver.update(driver.id, { owner_ine: url });
                        setDriver(p => ({ ...p, owner_ine: url }));
                        toast.success('INE del propietario subida');
                      } catch { toast.error('Error al subir'); } finally { setUploading(null); }
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Submission history */}
            {submissions.filter(s => s.category === 'vehicle').length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600">Historial de documentos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {submissions.filter(s => s.category === 'vehicle').map(sub => (
                    <div key={sub.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{sub.doc_label}</p>
                        <p className="text-xs text-slate-400">{new Date(sub.created_date).toLocaleDateString('es-MX')}</p>
                      </div>
                      <DocStatusBadge status={sub.status} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── TAB: Identidad ── */}
          <TabsContent value="identity" className="space-y-4 pt-4">

            <DocUploadCard
              label="INE — Anverso"
              hint="Frente de tu identificación oficial vigente"
              field="ine_front"
              fileUrl={driver.ine_front}
              uploading={uploading === 'ine_front'}
              onUpload={async (e) => {
                const file = e.target.files[0]; if (!file) return;
                setUploading('ine_front');
                try {
                  const url = await uploadFile(file);
                  await base44.entities.Driver.update(driver.id, { ine_front: url });
                  await base44.entities.DocumentSubmission.create({ user_id: user.id, user_name: user.full_name || '', user_role: 'driver', category: 'identity', doc_type: 'ine_front', doc_label: 'INE Anverso', file_url: url, status: 'pending', driver_id: driver.id });
                  setDriver(p => ({ ...p, ine_front: url }));
                  await loadData();
                  toast.success('INE anverso subido');
                } catch { toast.error('Error al subir'); } finally { setUploading(null); }
              }}
            />

            <DocUploadCard
              label="INE — Reverso"
              hint="Parte trasera de tu identificación"
              field="ine_back"
              fileUrl={driver.ine_back}
              uploading={uploading === 'ine_back'}
              onUpload={async (e) => {
                const file = e.target.files[0]; if (!file) return;
                setUploading('ine_back');
                try {
                  const url = await uploadFile(file);
                  await base44.entities.Driver.update(driver.id, { ine_back: url });
                  await base44.entities.DocumentSubmission.create({ user_id: user.id, user_name: user.full_name || '', user_role: 'driver', category: 'identity', doc_type: 'ine_back', doc_label: 'INE Reverso', file_url: url, status: 'pending', driver_id: driver.id });
                  setDriver(p => ({ ...p, ine_back: url }));
                  await loadData();
                  toast.success('INE reverso subido');
                } catch { toast.error('Error al subir'); } finally { setUploading(null); }
              }}
            />

            <DocUploadCard
              label="Licencia de conducir"
              hint="Vigente al momento de operar"
              field="license_front"
              fileUrl={driver.license_front}
              submissionStatus={getLatestSubmission('license')?.status}
              reviewNotes={getLatestSubmission('license')?.review_notes}
              uploading={uploading === 'license'}
              onUpload={e => handleDocUpload(e, 'license', 'Licencia de conducir', 'license_front', 'driver')}
            />

            <DocUploadCard
              label="Selfie de verificación"
              hint="Foto tuya con buena iluminación, rostro visible"
              field="selfie"
              fileUrl={driver.selfie}
              uploading={uploading === 'selfie'}
              onUpload={async (e) => {
                const file = e.target.files[0]; if (!file) return;
                setUploading('selfie');
                try {
                  const url = await uploadFile(file);
                  await base44.entities.Driver.update(driver.id, { selfie: url });
                  setDriver(p => ({ ...p, selfie: url }));
                  toast.success('Selfie subida');
                } catch { toast.error('Error al subir'); } finally { setUploading(null); }
              }}
            />

            {/* OCR / KYC extracted info */}
            {(driver.ine_name || driver.ine_curp || driver.ine_number) && (
              <Card className="border-blue-100 bg-blue-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Datos extraídos de tu INE
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2">
                  {driver.ine_name && <div><p className="text-xs text-blue-500">Nombre</p><p className="text-sm font-semibold text-blue-900">{driver.ine_name}</p></div>}
                  {driver.ine_curp && <div><p className="text-xs text-blue-500">CURP</p><p className="text-sm font-mono text-blue-900">{driver.ine_curp}</p></div>}
                  {driver.ine_number && <div><p className="text-xs text-blue-500">Clave de elector</p><p className="text-sm font-mono text-blue-900">{driver.ine_number}</p></div>}
                  {driver.ocr_confidence && (
                    <div><p className="text-xs text-blue-500">Confianza OCR</p>
                      <p className="text-sm font-semibold text-blue-900">{driver.ocr_confidence}%</p></div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Identity submissions history */}
            {submissions.filter(s => s.category === 'identity' || s.category === 'driver').length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600">Historial de documentos de identidad</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {submissions.filter(s => s.category === 'identity' || s.category === 'driver').map(sub => (
                    <div key={sub.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{sub.doc_label}</p>
                        <p className="text-xs text-slate-400">{new Date(sub.created_date).toLocaleDateString('es-MX')}</p>
                      </div>
                      <DocStatusBadge status={sub.status} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}