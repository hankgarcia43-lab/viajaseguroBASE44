import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Upload, CheckCircle, XCircle, Clock, AlertTriangle,
  Loader2, RefreshCw, Shield, FileText, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const DOCS_REQUIRED = [
  { doc_type: 'ine_front', label: 'INE — Anverso (frente)', category: 'identity', accept: 'image/*' },
  { doc_type: 'ine_back',  label: 'INE — Reverso (atrás)',  category: 'identity', accept: 'image/*' },
];

const STATUS_CONFIG = {
  pending:          { label: 'En revisión',       color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved:         { label: 'Aprobado',           color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  rejected:         { label: 'Rechazado',          color: 'bg-red-100 text-red-700',      icon: XCircle },
  needs_correction: { label: 'Requiere corrección', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
};

export default function PasajeroVerificacion() {
  const [user, setUser]         = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(null); // doc_type being uploaded

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      const subs = await base44.entities.DocumentSubmission.filter({ user_id: me.id, user_role: 'passenger' }, '-created_date', 50);
      setSubmissions(subs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Get latest submission per doc_type
  const getLatestSub = (doc_type) =>
    submissions.filter(s => s.doc_type === doc_type).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

  const isFullyVerified = () =>
    DOCS_REQUIRED.every(d => getLatestSub(d.doc_type)?.status === 'approved');

  const handleUpload = async (e, doc) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(doc.doc_type);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.DocumentSubmission.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_role: 'passenger',
        category: doc.category,
        doc_type: doc.doc_type,
        doc_label: doc.label,
        file_url,
        status: 'pending',
      });
      toast.success('Documento enviado para revisión');
      await loadData();
    } catch (e) {
      toast.error('Error al subir el documento');
    } finally {
      setUploading(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Verificación de cuenta</h1>
          </div>
          <p className="text-slate-500 ml-13">Sube tu identificación oficial para usar la plataforma</p>
        </div>

        {/* Full verified banner */}
        {isFullyVerified() && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">Cuenta verificada</p>
              <p className="text-sm text-green-700">Tu identidad ha sido aprobada. Puedes usar todas las funciones.</p>
            </div>
          </div>
        )}

        {/* Info */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800 text-sm">
            📋 Sube fotos claras y legibles de tu INE. La revisión toma hasta 24 horas hábiles. Recibirás notificación del resultado.
          </AlertDescription>
        </Alert>

        {/* Doc checklist */}
        <div className="space-y-4">
          {DOCS_REQUIRED.map((doc) => {
            const sub = getLatestSub(doc.doc_type);
            const status = sub?.status;
            const cfg = STATUS_CONFIG[status] || null;
            const Icon = cfg?.icon;
            const canReupload = !status || status === 'rejected' || status === 'needs_correction';

            return (
              <motion.div key={doc.doc_type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`${status === 'rejected' || status === 'needs_correction' ? 'border-red-200' : status === 'approved' ? 'border-green-200' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Preview */}
                      <div className="w-20 h-14 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {sub?.file_url ? (
                          <a href={sub.file_url} target="_blank" rel="noopener noreferrer">
                            <img src={sub.file_url} alt="" className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <FileText className="w-7 h-7 text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-slate-900 text-sm">{doc.label}</p>
                          {cfg && (
                            <Badge className={`${cfg.color} flex items-center gap-1 whitespace-nowrap`}>
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </Badge>
                          )}
                          {!status && (
                            <Badge className="bg-slate-100 text-slate-600">Sin subir</Badge>
                          )}
                        </div>

                        {/* Rejection note */}
                        {sub?.review_notes && (status === 'rejected' || status === 'needs_correction') && (
                          <p className="text-xs text-red-600 mb-2 bg-red-50 rounded p-2">
                            <strong>Motivo:</strong> {sub.review_notes}
                          </p>
                        )}

                        {/* Upload button */}
                        {canReupload && (
                          <label className="inline-block">
                            <Button
                              size="sm"
                              variant={status ? 'outline' : 'default'}
                              className={`text-xs ${!status ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                              disabled={uploading === doc.doc_type}
                              asChild
                            >
                              <span>
                                {uploading === doc.doc_type ? (
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                ) : status ? (
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                ) : (
                                  <Upload className="w-3 h-3 mr-1" />
                                )}
                                {status ? 'Volver a subir' : 'Subir documento'}
                              </span>
                            </Button>
                            <input
                              type="file"
                              accept={doc.accept}
                              className="hidden"
                              onChange={(e) => handleUpload(e, doc)}
                              disabled={!!uploading}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Checklist footer */}
        <div className="mt-8 p-4 bg-slate-100 rounded-2xl">
          <p className="text-sm font-semibold text-slate-700 mb-3">Checklist de documentos</p>
          <div className="space-y-2">
            {DOCS_REQUIRED.map(doc => {
              const s = getLatestSub(doc.doc_type)?.status;
              return (
                <div key={doc.doc_type} className="flex items-center gap-2 text-sm">
                  {s === 'approved' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : s === 'pending' ? (
                    <Clock className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                  )}
                  <span className={s === 'approved' ? 'text-green-700' : 'text-slate-600'}>{doc.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}