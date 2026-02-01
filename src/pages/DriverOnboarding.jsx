import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  Camera, Upload, CheckCircle, AlertCircle, Clock, 
  ChevronRight, User, CreditCard, Car, FileText, 
  Loader2, X, Info, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const STEPS = [
  { id: 'ine', title: 'INE / Identificación', icon: User, required: true },
  { id: 'selfie', title: 'Selfie de verificación', icon: Camera, required: true },
  { id: 'license', title: 'Licencia de conducir', icon: CreditCard, required: true },
  { id: 'vehicle', title: 'Tarjeta de circulación', icon: FileText, required: true },
  { id: 'photos', title: 'Fotos del vehículo', icon: Car, required: true },
];

export default function DriverOnboarding() {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [vehicleData, setVehicleData] = useState({
    model: '',
    color: '',
    year: '',
    plate: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
      if (drivers.length > 0) {
        setDriver(drivers[0]);
        setVehicleData({
          model: drivers[0].vehicle_model || '',
          color: drivers[0].vehicle_color || '',
          year: drivers[0].vehicle_year || '',
          plate: drivers[0].vehicle_plate || ''
        });
        // Determine current step based on uploaded docs
        determineCurrentStep(drivers[0]);
      } else {
        // Create driver profile
        const newDriver = await base44.entities.Driver.create({
          user_id: userData.id,
          phone: userData.phone || '',
          full_name: userData.full_name || '',
          kyc_status: 'pending'
        });
        setDriver(newDriver);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      base44.auth.redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  const determineCurrentStep = (driverData) => {
    if (!driverData.ine_front || !driverData.ine_back) {
      setCurrentStep(0);
    } else if (!driverData.selfie) {
      setCurrentStep(1);
    } else if (!driverData.license_front) {
      setCurrentStep(2);
    } else if (!driverData.circulation_card) {
      setCurrentStep(3);
    } else if (!driverData.vehicle_photo) {
      setCurrentStep(4);
    } else {
      setCurrentStep(5);
    }
  };

  const handleFileUpload = async (file, field) => {
    if (!file) return null;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    } catch (error) {
      toast.error('Error al subir archivo');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleINEUpload = async (e, side) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileUrl = await handleFileUpload(file, side === 'front' ? 'ine_front' : 'ine_back');
      if (fileUrl) {
        const updateData = side === 'front' ? { ine_front: fileUrl } : { ine_back: fileUrl };
        await base44.entities.Driver.update(driver.id, updateData);
        
        const updatedDriver = { ...driver, ...updateData };
        setDriver(updatedDriver);

        // If both sides uploaded, run OCR
        if (updatedDriver.ine_front && updatedDriver.ine_back) {
          toast.success('INE subida correctamente. Analizando...');
          await runINEOCR(updatedDriver);
        } else {
          toast.success(`${side === 'front' ? 'Anverso' : 'Reverso'} subido`);
        }
      }
    } catch (error) {
      toast.error('Error al procesar INE');
    } finally {
      setUploading(false);
    }
  };

  const runINEOCR = async (driverData) => {
    try {
      // Use LLM to extract INE data
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analiza esta imagen de INE mexicana y extrae los datos. Devuelve un JSON con: nombre_completo, curp, numero_ine (clave de elector o folio), fecha_nacimiento, vigencia.`,
        file_urls: [driverData.ine_front, driverData.ine_back],
        response_json_schema: {
          type: 'object',
          properties: {
            nombre_completo: { type: 'string' },
            curp: { type: 'string' },
            numero_ine: { type: 'string' },
            fecha_nacimiento: { type: 'string' },
            vigencia: { type: 'string' }
          }
        }
      });

      if (result.numero_ine) {
        // Check for duplicate INE
        const existingDrivers = await base44.entities.Driver.filter({ ine_number: result.numero_ine });
        const isDuplicate = existingDrivers.some(d => d.id !== driver.id);

        if (isDuplicate) {
          await base44.entities.Driver.update(driver.id, {
            kyc_status: 'rejected',
            kyc_rejection_reason: 'Documento ya registrado en otra cuenta'
          });
          toast.error('Este documento ya está registrado. No puedes crear otra cuenta.');
          return;
        }

        await base44.entities.Driver.update(driver.id, {
          ine_name: result.nombre_completo,
          ine_curp: result.curp,
          ine_number: result.numero_ine,
          ocr_confidence: 85,
          kyc_status: 'documents_uploaded'
        });

        setDriver({
          ...driverData,
          ine_name: result.nombre_completo,
          ine_curp: result.curp,
          ine_number: result.numero_ine
        });

        toast.success('INE verificada correctamente');
        setCurrentStep(1);
      }
    } catch (error) {
      console.error('OCR Error:', error);
      toast.info('Documentos subidos. Revisión manual pendiente.');
    }
  };

  const handleSelfieUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileUrl = await handleFileUpload(file, 'selfie');
    if (fileUrl) {
      // Run face comparison
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Compara estas dos imágenes: una es una foto de INE y otra es una selfie. Determina si es la misma persona. Responde con un JSON indicando match (true/false) y confidence (0-100).`,
          file_urls: [driver.ine_front, fileUrl],
          response_json_schema: {
            type: 'object',
            properties: {
              match: { type: 'boolean' },
              confidence: { type: 'number' }
            }
          }
        });

        await base44.entities.Driver.update(driver.id, {
          selfie: fileUrl,
          face_match_confidence: result.confidence || 0
        });

        setDriver({ ...driver, selfie: fileUrl });
        toast.success('Selfie verificada');
        setCurrentStep(2);
      } catch (error) {
        await base44.entities.Driver.update(driver.id, { selfie: fileUrl });
        setDriver({ ...driver, selfie: fileUrl });
        toast.success('Selfie subida');
        setCurrentStep(2);
      }
    }
  };

  const handleLicenseUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileUrl = await handleFileUpload(file, 'license');
    if (fileUrl) {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Analiza esta imagen de licencia de conducir mexicana y extrae: numero_licencia, fecha_vigencia, tipo_licencia.`,
          file_urls: [fileUrl],
          response_json_schema: {
            type: 'object',
            properties: {
              numero_licencia: { type: 'string' },
              fecha_vigencia: { type: 'string' },
              tipo_licencia: { type: 'string' }
            }
          }
        });

        await base44.entities.Driver.update(driver.id, {
          license_front: fileUrl,
          license_number: result.numero_licencia,
          license_expiry: result.fecha_vigencia
        });

        setDriver({ ...driver, license_front: fileUrl });
        toast.success('Licencia verificada');
        setCurrentStep(3);
      } catch (error) {
        await base44.entities.Driver.update(driver.id, { license_front: fileUrl });
        setDriver({ ...driver, license_front: fileUrl });
        toast.success('Licencia subida');
        setCurrentStep(3);
      }
    }
  };

  const handleCirculationUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileUrl = await handleFileUpload(file, 'circulation');
    if (fileUrl) {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Analiza esta tarjeta de circulación mexicana y extrae: nombre_propietario, placas, marca, modelo, año.`,
          file_urls: [fileUrl],
          response_json_schema: {
            type: 'object',
            properties: {
              nombre_propietario: { type: 'string' },
              placas: { type: 'string' },
              marca: { type: 'string' },
              modelo: { type: 'string' },
              año: { type: 'string' }
            }
          }
        });

        const ownerMatch = driver.ine_name && result.nombre_propietario &&
          driver.ine_name.toLowerCase().includes(result.nombre_propietario.toLowerCase().split(' ')[0]);

        await base44.entities.Driver.update(driver.id, {
          circulation_card: fileUrl,
          circulation_owner_name: result.nombre_propietario,
          vehicle_plate: result.placas || vehicleData.plate,
          vehicle_model: `${result.marca} ${result.modelo}` || vehicleData.model,
          vehicle_year: result.año || vehicleData.year,
          owner_match: ownerMatch,
          requires_owner_letter: !ownerMatch
        });

        setDriver({ 
          ...driver, 
          circulation_card: fileUrl,
          owner_match: ownerMatch,
          requires_owner_letter: !ownerMatch
        });

        if (!ownerMatch) {
          toast.warning('El vehículo no está a tu nombre. Necesitarás subir una carta responsiva.');
        } else {
          toast.success('Tarjeta de circulación verificada');
        }
        setCurrentStep(4);
      } catch (error) {
        await base44.entities.Driver.update(driver.id, { circulation_card: fileUrl });
        setDriver({ ...driver, circulation_card: fileUrl });
        toast.success('Tarjeta de circulación subida');
        setCurrentStep(4);
      }
    }
  };

  const handleVehiclePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileUrl = await handleFileUpload(file, 'vehicle_photo');
    if (fileUrl) {
      await base44.entities.Driver.update(driver.id, {
        vehicle_photo: fileUrl,
        vehicle_model: vehicleData.model,
        vehicle_color: vehicleData.color,
        vehicle_year: vehicleData.year,
        vehicle_plate: vehicleData.plate
      });

      setDriver({ ...driver, vehicle_photo: fileUrl });
      toast.success('Foto del vehículo subida');
      setCurrentStep(5);
    }
  };

  const handleOwnerLetterUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileUrl = await handleFileUpload(file, type);
    if (fileUrl) {
      const updateData = type === 'letter' ? { owner_letter: fileUrl } : { owner_ine: fileUrl };
      await base44.entities.Driver.update(driver.id, updateData);
      setDriver({ ...driver, ...updateData });
      toast.success(type === 'letter' ? 'Carta responsiva subida' : 'INE del propietario subida');
    }
  };

  const handleSubmitForReview = async () => {
    setLoading(true);
    try {
      await base44.entities.Driver.update(driver.id, {
        kyc_status: 'automated_check',
        vehicle_model: vehicleData.model,
        vehicle_color: vehicleData.color,
        vehicle_year: vehicleData.year,
        vehicle_plate: vehicleData.plate
      });

      toast.success('Documentos enviados para revisión');
      navigate(createPageUrl('DriverDashboard'));
    } catch (error) {
      toast.error('Error al enviar documentos');
    } finally {
      setLoading(false);
    }
  };

  const getProgress = () => {
    let completed = 0;
    if (driver?.ine_front && driver?.ine_back) completed++;
    if (driver?.selfie) completed++;
    if (driver?.license_front) completed++;
    if (driver?.circulation_card) completed++;
    if (driver?.vehicle_photo) completed++;
    return (completed / 5) * 100;
  };

  const getKYCStatusBadge = () => {
    const statuses = {
      pending: { color: 'bg-slate-100 text-slate-600', text: 'Pendiente' },
      documents_uploaded: { color: 'bg-blue-100 text-blue-600', text: 'Documentos subidos' },
      automated_check: { color: 'bg-yellow-100 text-yellow-600', text: 'En revisión automática' },
      manual_review: { color: 'bg-orange-100 text-orange-600', text: 'Revisión manual' },
      approved: { color: 'bg-green-100 text-green-600', text: 'Aprobado' },
      rejected: { color: 'bg-red-100 text-red-600', text: 'Rechazado' }
    };
    const status = statuses[driver?.kyc_status] || statuses.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
        {status.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (driver?.kyc_status === 'rejected') {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-lg mx-auto pt-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-red-900 mb-2">Verificación rechazada</h2>
                <p className="text-red-700 mb-4">{driver.kyc_rejection_reason}</p>
                <p className="text-sm text-red-600">
                  Si crees que esto es un error, contacta a soporte.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (driver?.kyc_status === 'approved') {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-lg mx-auto pt-8">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-green-900 mb-2">¡Verificación aprobada!</h2>
                <p className="text-green-700 mb-6">Ya puedes empezar a recibir viajes.</p>
                <Button 
                  onClick={() => navigate(createPageUrl('DriverDashboard'))}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Ir al panel de conductor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Verificación de conductor</h1>
            {getKYCStatusBadge()}
          </div>
          <Progress value={getProgress()} className="h-2" />
          <p className="text-sm text-slate-500 mt-2">{Math.round(getProgress())}% completado</p>
        </div>

        {/* Alert for owner letter */}
        {driver?.requires_owner_letter && !driver?.owner_letter && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              El vehículo no está a tu nombre. Debes subir una carta responsiva firmada por el propietario y una copia de su INE.
            </AlertDescription>
          </Alert>
        )}

        {/* Steps */}
        <div className="space-y-4">
          {STEPS.map((step, index) => (
            <Card 
              key={step.id}
              className={`transition-all ${
                currentStep === index ? 'ring-2 ring-blue-500 shadow-lg' : ''
              } ${index < currentStep ? 'bg-green-50 border-green-200' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index < currentStep 
                      ? 'bg-green-500' 
                      : index === currentStep 
                        ? 'bg-blue-500' 
                        : 'bg-slate-200'
                  }`}>
                    {index < currentStep ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <step.icon className={`w-5 h-5 ${
                        index === currentStep ? 'text-white' : 'text-slate-400'
                      }`} />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    {step.required && (
                      <CardDescription>Obligatorio</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>

              <AnimatePresence>
                {currentStep === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <CardContent className="pt-4">
                      {/* INE Step */}
                      {step.id === 'ine' && (
                        <div className="space-y-4">
                          <Alert className="border-blue-200 bg-blue-50">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                              Sube fotos claras de tu INE (anverso y reverso). Asegúrate de que los datos sean legibles.
                            </AlertDescription>
                          </Alert>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Anverso (frente)</Label>
                              <label className={`mt-2 flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                                driver?.ine_front ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                              }`}>
                                {driver?.ine_front ? (
                                  <img src={driver.ine_front} alt="INE Frente" className="h-full w-full object-cover rounded-lg" />
                                ) : (
                                  <>
                                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                    <span className="text-sm text-slate-500">Subir frente</span>
                                  </>
                                )}
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => handleINEUpload(e, 'front')}
                                  disabled={uploading}
                                />
                              </label>
                            </div>
                            <div>
                              <Label>Reverso (atrás)</Label>
                              <label className={`mt-2 flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                                driver?.ine_back ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                              }`}>
                                {driver?.ine_back ? (
                                  <img src={driver.ine_back} alt="INE Reverso" className="h-full w-full object-cover rounded-lg" />
                                ) : (
                                  <>
                                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                    <span className="text-sm text-slate-500">Subir reverso</span>
                                  </>
                                )}
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => handleINEUpload(e, 'back')}
                                  disabled={uploading}
                                />
                              </label>
                            </div>
                          </div>

                          {driver?.ine_name && (
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-sm text-green-800">
                                <strong>Nombre detectado:</strong> {driver.ine_name}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Selfie Step */}
                      {step.id === 'selfie' && (
                        <div className="space-y-4">
                          <Alert className="border-blue-200 bg-blue-50">
                            <Camera className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                              Toma una selfie clara con buena iluminación. Tu rostro debe verse completamente.
                            </AlertDescription>
                          </Alert>

                          <label className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                            driver?.selfie ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                          }`}>
                            {driver?.selfie ? (
                              <img src={driver.selfie} alt="Selfie" className="h-full w-full object-cover rounded-lg" />
                            ) : (
                              <>
                                <Camera className="w-12 h-12 text-slate-400 mb-2" />
                                <span className="text-slate-500">Tomar selfie</span>
                              </>
                            )}
                            <input 
                              type="file" 
                              accept="image/*"
                              capture="user"
                              className="hidden" 
                              onChange={handleSelfieUpload}
                              disabled={uploading}
                            />
                          </label>
                        </div>
                      )}

                      {/* License Step */}
                      {step.id === 'license' && (
                        <div className="space-y-4">
                          <Alert className="border-blue-200 bg-blue-50">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                              Sube una foto de tu licencia de conducir vigente. Debe ser legible.
                            </AlertDescription>
                          </Alert>

                          <label className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                            driver?.license_front ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                          }`}>
                            {driver?.license_front ? (
                              <img src={driver.license_front} alt="Licencia" className="h-full w-full object-cover rounded-lg" />
                            ) : (
                              <>
                                <CreditCard className="w-12 h-12 text-slate-400 mb-2" />
                                <span className="text-slate-500">Subir licencia</span>
                              </>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleLicenseUpload}
                              disabled={uploading}
                            />
                          </label>
                        </div>
                      )}

                      {/* Circulation Card Step */}
                      {step.id === 'vehicle' && (
                        <div className="space-y-4">
                          <Alert className="border-blue-200 bg-blue-50">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                              Sube la tarjeta de circulación de tu vehículo. Verificaremos que coincida con tus datos.
                            </AlertDescription>
                          </Alert>

                          <label className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                            driver?.circulation_card ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                          }`}>
                            {driver?.circulation_card ? (
                              <img src={driver.circulation_card} alt="Tarjeta de circulación" className="h-full w-full object-cover rounded-lg" />
                            ) : (
                              <>
                                <FileText className="w-12 h-12 text-slate-400 mb-2" />
                                <span className="text-slate-500">Subir tarjeta de circulación</span>
                              </>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleCirculationUpload}
                              disabled={uploading}
                            />
                          </label>

                          {/* Owner letter section */}
                          {driver?.requires_owner_letter && (
                            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                              <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                Documentos adicionales requeridos
                              </h4>
                              <p className="text-sm text-amber-700 mb-4">
                                El vehículo está registrado a nombre de: <strong>{driver.circulation_owner_name}</strong>.
                                Sube una carta responsiva firmada y una copia del INE del propietario.
                              </p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm">Carta responsiva</Label>
                                  <label className={`mt-2 flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer ${
                                    driver?.owner_letter ? 'border-green-300 bg-green-50' : 'border-amber-300 hover:border-amber-400'
                                  }`}>
                                    {driver?.owner_letter ? (
                                      <CheckCircle className="w-8 h-8 text-green-600" />
                                    ) : (
                                      <>
                                        <Upload className="w-6 h-6 text-amber-500 mb-1" />
                                        <span className="text-xs text-amber-600">Subir carta</span>
                                      </>
                                    )}
                                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleOwnerLetterUpload(e, 'letter')} />
                                  </label>
                                </div>
                                <div>
                                  <Label className="text-sm">INE del propietario</Label>
                                  <label className={`mt-2 flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer ${
                                    driver?.owner_ine ? 'border-green-300 bg-green-50' : 'border-amber-300 hover:border-amber-400'
                                  }`}>
                                    {driver?.owner_ine ? (
                                      <CheckCircle className="w-8 h-8 text-green-600" />
                                    ) : (
                                      <>
                                        <Upload className="w-6 h-6 text-amber-500 mb-1" />
                                        <span className="text-xs text-amber-600">Subir INE</span>
                                      </>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleOwnerLetterUpload(e, 'owner_ine')} />
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Vehicle Photos Step */}
                      {step.id === 'photos' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Modelo del vehículo</Label>
                              <Input 
                                placeholder="Ej: Nissan Versa"
                                value={vehicleData.model}
                                onChange={(e) => setVehicleData({ ...vehicleData, model: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Color</Label>
                              <Input 
                                placeholder="Ej: Blanco"
                                value={vehicleData.color}
                                onChange={(e) => setVehicleData({ ...vehicleData, color: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Año</Label>
                              <Input 
                                placeholder="Ej: 2020"
                                value={vehicleData.year}
                                onChange={(e) => setVehicleData({ ...vehicleData, year: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Placas</Label>
                              <Input 
                                placeholder="Ej: ABC-123"
                                value={vehicleData.plate}
                                onChange={(e) => setVehicleData({ ...vehicleData, plate: e.target.value.toUpperCase() })}
                                className="mt-1"
                              />
                            </div>
                          </div>

                          <Label>Foto del vehículo</Label>
                          <label className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                            driver?.vehicle_photo ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                          }`}>
                            {driver?.vehicle_photo ? (
                              <img src={driver.vehicle_photo} alt="Vehículo" className="h-full w-full object-cover rounded-lg" />
                            ) : (
                              <>
                                <Car className="w-12 h-12 text-slate-400 mb-2" />
                                <span className="text-slate-500">Subir foto del vehículo</span>
                                <span className="text-xs text-slate-400 mt-1">Muestra la placa visible</span>
                              </>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleVehiclePhotoUpload}
                              disabled={uploading}
                            />
                          </label>
                        </div>
                      )}

                      {uploading && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                          <span className="text-slate-600">Subiendo...</span>
                        </div>
                      )}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>

        {/* Submit Button */}
        {currentStep >= 5 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <Button
              onClick={handleSubmitForReview}
              disabled={loading || (driver?.requires_owner_letter && (!driver?.owner_letter || !driver?.owner_ine))}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Enviar para verificación
                </>
              )}
            </Button>
            <p className="text-center text-sm text-slate-500 mt-3">
              La verificación puede tomar hasta 24 horas
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}