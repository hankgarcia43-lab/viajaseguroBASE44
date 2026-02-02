import React from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { User, ArrowRight, MapPin, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function WelcomePasajero() {
  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl('SearchRoutes'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 shadow-xl">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
            <User className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
            Bienvenido, Pasajero
          </h1>
          <p className="text-center text-slate-600 mb-8">
            Viaja seguro y económico de EdoMex a CDMX
          </p>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {[
              { icon: MapPin, text: 'Rutas fijas diarias' },
              { icon: Shield, text: 'Conductores verificados' },
              { icon: Clock, text: 'Precio transparente' }
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-slate-700">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Login Button */}
          <Button
            onClick={handleLogin}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-base shadow-lg shadow-blue-500/25 mb-4"
          >
            Iniciar sesión
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          {/* Register Link */}
          <p className="text-center text-sm text-slate-600">
            ¿No tienes cuenta?{' '}
            <button 
              onClick={handleLogin}
              className="text-blue-600 font-semibold hover:text-blue-700"
            >
              Regístrate gratis
            </button>
          </p>
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