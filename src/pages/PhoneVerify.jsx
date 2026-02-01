import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Phone, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PhoneVerify() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone'); // phone, code, verified
  const [sending, setSending] = useState(false);
  const [verificationId, setVerificationId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkVerification();
  }, []);

  const checkVerification = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Check if already verified
      if (userData.phone_verified) {
        navigate(createPageUrl('RequestRide'));
        return;
      }

      setPhone(userData.phone || '');
    } catch (error) {
      base44.auth.redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Ingresa un número válido');
      return;
    }

    setSending(true);
    try {
      // Generate 6-digit code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Save verification record
      const verification = await base44.entities.PhoneVerification.create({
        user_id: user.id,
        phone: phone,
        code: verificationCode,
        verified: false,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
        attempts: 0
      });

      setVerificationId(verification.id);

      // Send SMS (simulated - in production use Twilio/similar)
      // For demo, just show the code
      toast.success(`Código enviado: ${verificationCode}`);
      
      // Update user phone
      await base44.auth.updateMe({ phone: phone });
      
      setStep('code');
    } catch (error) {
      toast.error('Error al enviar código');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      toast.error('Ingresa el código completo');
      return;
    }

    setSending(true);
    try {
      const verifications = await base44.entities.PhoneVerification.filter({
        id: verificationId
      });

      if (verifications.length === 0) {
        toast.error('Código no encontrado');
        return;
      }

      const verification = verifications[0];

      // Check expiration
      if (new Date() > new Date(verification.expires_at)) {
        toast.error('El código expiró. Solicita uno nuevo.');
        setStep('phone');
        return;
      }

      // Check code
      if (verification.code !== code) {
        await base44.entities.PhoneVerification.update(verification.id, {
          attempts: verification.attempts + 1
        });
        toast.error('Código incorrecto');
        return;
      }

      // Mark as verified
      await base44.entities.PhoneVerification.update(verification.id, {
        verified: true
      });

      await base44.auth.updateMe({ phone_verified: true });

      setStep('verified');
      setTimeout(() => {
        navigate(createPageUrl('RequestRide'));
      }, 2000);

    } catch (error) {
      toast.error('Error al verificar');
      console.error(error);
    } finally {
      setSending(false);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl">
          <CardContent className="p-8">
            {step === 'phone' && (
              <>
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
                  <Phone className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
                  Verifica tu teléfono
                </h1>
                <p className="text-center text-slate-500 mb-8">
                  Enviaremos un código de 6 dígitos para confirmar tu número
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Número de teléfono
                    </label>
                    <Input
                      type="tel"
                      placeholder="5512345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-12 text-lg"
                      maxLength={10}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Ingresa tu número a 10 dígitos (sin espacios)
                    </p>
                  </div>

                  <Button
                    onClick={sendCode}
                    disabled={sending || !phone || phone.length < 10}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Enviar código'
                    )}
                  </Button>
                </div>
              </>
            )}

            {step === 'code' && (
              <>
                <button
                  onClick={() => setStep('phone')}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Cambiar número
                </button>

                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
                  <Phone className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
                  Ingresa el código
                </h1>
                <p className="text-center text-slate-500 mb-8">
                  Enviamos un código a {phone}
                </p>

                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-14 text-2xl text-center tracking-widest font-bold"
                    maxLength={6}
                    autoFocus
                  />

                  <Button
                    onClick={verifyCode}
                    disabled={sending || code.length !== 6}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Verificar'
                    )}
                  </Button>

                  <button
                    onClick={sendCode}
                    disabled={sending}
                    className="w-full text-center text-sm text-blue-600 hover:underline"
                  >
                    Reenviar código
                  </button>
                </div>
              </>
            )}

            {step === 'verified' && (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
                  ¡Verificado!
                </h1>
                <p className="text-center text-slate-500 mb-8">
                  Tu teléfono ha sido confirmado correctamente
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}