import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  AlertCircle, Shield, CreditCard, User, Route, 
  X, Package, HelpCircle, Upload, Loader2, CheckCircle, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const CATEGORIES = [
  { id: 'safety', label: 'Seguridad', icon: Shield, priority: 'critical' },
  { id: 'payment', label: 'Problema de pago', icon: CreditCard, priority: 'high' },
  { id: 'behavior', label: 'Comportamiento inadecuado', icon: User, priority: 'high' },
  { id: 'route', label: 'Problema con la ruta', icon: Route, priority: 'medium' },
  { id: 'cancellation', label: 'Cancelación injusta', icon: X, priority: 'medium' },
  { id: 'lost_item', label: 'Objeto perdido', icon: Package, priority: 'low' },
  { id: 'other', label: 'Otro problema', icon: HelpCircle, priority: 'low' },
];

export default function ReportIncident() {
  const [user, setUser] = useState(null);
  const [ride, setRide] = useState(null);
  const [driver, setDriver] = useState(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isWithinWindow, setIsWithinWindow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Check for driver profile
      const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
      if (drivers.length > 0) {
        setDriver(drivers[0]);
      }

      const params = new URLSearchParams(window.location.search);
      const rideId = params.get('rideId');

      if (rideId) {
        const rides = await base44.entities.Ride.filter({ id: rideId });
        if (rides.length > 0) {
          setRide(rides[0]);
          
          // Check if within 10-minute window
          if (rides[0].completed_at) {
            const completedAt = new Date(rides[0].completed_at);
            const windowEnd = new Date(completedAt.getTime() + 10 * 60 * 1000);
            setIsWithinWindow(new Date() <= windowEnd);
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      setAttachments([...attachments, ...uploadedUrls]);
    } catch (error) {
      toast.error('Error al subir archivos');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!category) {
      toast.error('Selecciona una categoría');
      return;
    }
    if (!description.trim()) {
      toast.error('Describe el problema');
      return;
    }

    setSubmitting(true);
    try {
      const selectedCategory = CATEGORIES.find(c => c.id === category);
      const isPassenger = !driver || (ride && ride.passenger_id === user.id);

      await base44.entities.Incident.create({
        ride_id: ride?.id,
        reporter_id: user.id,
        reporter_role: isPassenger ? 'passenger' : 'driver',
        reporter_name: user.full_name,
        reported_user_id: isPassenger ? ride?.driver_id : ride?.passenger_id,
        category,
        priority: selectedCategory?.priority || 'medium',
        description,
        attachments,
        status: 'open',
        payment_affected: ['safety', 'payment', 'behavior'].includes(category),
        reported_in_window: isWithinWindow
      });

      // If high priority and within window, mark payment as disputed
      if (isWithinWindow && ['safety', 'payment', 'behavior'].includes(category) && ride) {
        const payments = await base44.entities.Payment.filter({ ride_id: ride.id });
        if (payments.length > 0) {
          await base44.entities.Payment.update(payments[0].id, {
            dispute_flag: true,
            status: 'disputed'
          });
        }

        // Update ride status
        await base44.entities.Ride.update(ride.id, {
          status: 'disputed'
        });
      }

      // Log the incident
      await base44.entities.AuditLog.create({
        user_id: user.id,
        user_email: user.email,
        action: 'incident_resolve', // Should be incident_create but using available enum
        entity_type: 'Incident',
        details: JSON.stringify({ category, ride_id: ride?.id })
      });

      setSubmitted(true);
      toast.success('Reporte enviado correctamente');

      setTimeout(() => {
        navigate(createPageUrl(driver ? 'DriverHistory' : 'PassengerHistory'));
      }, 3000);

    } catch (error) {
      toast.error('Error al enviar reporte');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Reporte enviado</h1>
          <p className="text-slate-500 mb-4">
            Revisaremos tu caso y te contactaremos pronto.
          </p>
          {isWithinWindow && ['safety', 'payment', 'behavior'].includes(category) && (
            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 inline mr-2" />
              El pago ha sido retenido hasta que se resuelva el caso.
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="max-w-lg mx-auto pt-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Reportar un problema</h1>
        <p className="text-slate-500 mb-6">
          Cuéntanos qué pasó y lo revisaremos lo antes posible.
        </p>

        {/* Window Alert */}
        {ride && isWithinWindow && (
          <Card className="bg-amber-50 border-amber-200 mb-6">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Ventana de seguridad activa</p>
                <p className="text-sm text-amber-700">
                  Si reportas un problema grave, el pago quedará retenido hasta resolver el caso.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ride Info */}
        {ride && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 mb-2">Viaje relacionado</p>
              <div className="flex justify-between">
                <div>
                  <p className="font-medium text-slate-900">{ride.origin_address}</p>
                  <p className="text-sm text-slate-500">→ {ride.dest_address}</p>
                </div>
                <p className="font-bold">${ride.fare_final || ride.fare_estimated} MXN</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Selection */}
        <div className="mb-6">
          <Label className="text-slate-700 mb-3 block">¿Qué tipo de problema tuviste?</Label>
          <RadioGroup value={category} onValueChange={setCategory}>
            <div className="grid gap-3">
              {CATEGORIES.map((cat) => (
                <label
                  key={cat.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    category === cat.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <RadioGroupItem value={cat.id} className="sr-only" />
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    category === cat.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <cat.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{cat.label}</p>
                    {cat.priority === 'critical' && (
                      <span className="text-xs text-red-600">Prioridad alta</span>
                    )}
                  </div>
                  {category === cat.id && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </label>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Description */}
        <div className="mb-6">
          <Label className="text-slate-700 mb-2 block">Describe el problema</Label>
          <Textarea
            placeholder="Cuéntanos con detalle qué pasó..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[120px]"
          />
        </div>

        {/* Attachments */}
        <div className="mb-8">
          <Label className="text-slate-700 mb-2 block">Adjuntar evidencia (opcional)</Label>
          <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-sm text-slate-500">Subir fotos o capturas</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>

          {attachments.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {attachments.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !category || !description.trim()}
          className="w-full h-14 bg-red-600 hover:bg-red-700 rounded-xl text-lg"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Enviar reporte
            </>
          )}
        </Button>
      </div>
    </div>
  );
}