import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Phone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function PhoneVerification() {
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'code' | 'success'
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const checkUser = async () => {
    try {
      const userData = await base44.auth.me();
      if (userData.phone_verified) {
        // Ya verificado, redirigir
        navigate(createPageUrl('RequestRide'));
        return;
      }
      setUser(userData);
      setPhone(userData.phone || '');
    } catch (error) {
      base44.auth.redirectToLogin();
    }
  };

  const sendCode = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Ingresa un número telefónico válido');
      return;
    }

    setLoading(true);
    try {
      // Generar código de 6 dígitos
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Guardar código y teléfono
      await base44.auth.updateMe({
        phone: phone,
        phone_verification_code: verificationCode,
        phone_verification_expires: expiresAt
      });

      // Simular envío de SMS (en producción usar servicio real)
      console.log('Código de verificación:', verificationCode);
      toast.success('Código enviado por SMS');
      
      setStep('code');
      setCountdown(60);
    } catch (error) {
      toast.error('Error al enviar código');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      toast.error('Ingresa el código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      const userData = await base44.auth.me();
      
      // Verificar expiración
      if (new Date() > new Date(userData.phone_verification_expires)) {
        toast.error('El código ha expirado. Solicita uno nuevo.');
        setStep('phone');
        setLoading(false);
        return;
      }

      // Verificar código
      if (code === userData.phone_verification_code) {
        await base44.auth.updateMe({
          phone_verified: true,
          phone_verification_code: null,
          phone_verification_expires: null
        });
        
        setStep('success');
        setTimeout(() => {
          navigate(createPageUrl('RequestRide'));
        }, 2000);
      } else {
        toast.error('Código incorrecto');
      }
    } catch (error) {
      toast.error('Error al verificar código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Phone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Verifica tu teléfono
          </h1>
          <p className="text-slate-600">
            Solo una vez para mayor seguridad
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            {step === 'phone' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Número telefónico
                  </label>
                  <Input
                    type="tel"
                    placeholder="5512345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                    className="text-lg"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Ingresa tu número a 10 dígitos
                  </p>
                </div>

                <Button
                  onClick={sendCode}
                  disabled={loading || phone.length < 10}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Enviar código'
                  )}
                </Button>
              </div>
            )}

            {step === 'code' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Código de verificación
                  </label>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                  />
                  <p className="text-xs text-slate-500 mt-1 text-center">
                    Ingresa el código enviado a {phone}
                  </p>
                </div>

                <Button
                  onClick={verifyCode}
                  disabled={loading || code.length !== 6}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Verificar'
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setStep('phone')}
                  disabled={countdown > 0}
                  className="w-full"
                >
                  {countdown > 0 ? `Reenviar en ${countdown}s` : 'Cambiar número'}
                </Button>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  ¡Verificado!
                </h3>
                <p className="text-slate-600">
                  Redirigiendo...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-4">
          Recibirás un SMS con el código de verificación
        </p>
      </div>
    </div>
  );
}