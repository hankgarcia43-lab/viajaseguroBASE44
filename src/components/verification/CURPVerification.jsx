import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CURPVerification({ onVerified, userName }) {
  const [curp, setCurp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateCURP = (curp) => {
    // Validación básica de estructura CURP
    const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;
    return curpRegex.test(curp);
  };

  const handleVerify = async () => {
    setError('');
    
    if (!curp) {
      setError('Por favor ingresa tu CURP');
      return;
    }

    const curpUpper = curp.toUpperCase().trim();
    
    if (!validateCURP(curpUpper)) {
      setError('CURP inválida. Verifica el formato');
      return;
    }

    setLoading(true);
    try {
      await onVerified(curpUpper);
      toast.success('CURP verificada correctamente');
    } catch (err) {
      setError(err.message || 'Error al verificar CURP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-blue-600" />
          Verificación de identidad
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-slate-700 mb-2">
            <span className="font-semibold">{userName || 'Usuario'},</span> para confirmar tu primer viaje necesitamos verificar tu identidad.
          </p>
          <p className="text-xs text-slate-500">
            Tu CURP es privada y no será visible para los conductores.
          </p>
        </div>

        <div>
          <Label htmlFor="curp">CURP (18 caracteres)</Label>
          <Input
            id="curp"
            placeholder="AAAA######HAAAAA##"
            value={curp}
            onChange={(e) => {
              setCurp(e.target.value.toUpperCase());
              setError('');
            }}
            maxLength={18}
            className="mt-1 uppercase font-mono"
          />
          <p className="text-xs text-slate-500 mt-1">
            Ejemplo: CURL850815HDFRRL09
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <Button
          onClick={handleVerify}
          disabled={loading || curp.length !== 18}
          className="w-full"
        >
          {loading ? 'Verificando...' : 'Verificar y continuar'}
        </Button>
      </CardContent>
    </Card>
  );
}