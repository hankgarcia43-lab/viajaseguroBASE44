import React from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Car, ArrowRight, DollarSign, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function WelcomeChofer() {
  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl('DriverOnboarding'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 shadow-xl">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
            <Car className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
            Bienvenido, Conductor
          </h1>
          <p className="text-center text-slate-600 mb-8">
            Gana dinero manejando con solo 20% de comisión
          </p>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {[
              { icon: DollarSign, text: 'Solo 20% de comisión' },
              { icon: Shield, text: 'Verificación confiable' },
              { icon: Clock, text: 'Define tus horarios' }
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-slate-700">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-sm">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Login Button */}
          <Button
            onClick={handleLogin}
            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-base shadow-lg shadow-indigo-500/25 mb-4"
          >
            Iniciar sesión
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          {/* Register Link */}
          <p className="text-center text-sm text-slate-600">
            ¿No tienes cuenta?{' '}
            <button 
              onClick={handleLogin}
              className="text-indigo-600 font-semibold hover:text-indigo-700"
            >
              Regístrate como conductor
            </button>
          </p>

          {/* Important Note */}
          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-800">
              <strong>Importante:</strong> Necesitarás subir tu INE, licencia y documentos del vehículo para verificación.
            </p>
          </div>
        </Card>

        {/* Back to Landing */}
        <p className="text-center mt-6">
          <a 
            href={createPageUrl('Landing')}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Volver al inicio
          </a>
        </p>
      </motion.div>
    </div>
  );
}