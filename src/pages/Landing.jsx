import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Car, User, Shield, Clock, CreditCard, Star, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1920')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-900" />
        
        <div className="relative">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Car className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-white">RideApp</span>
            </div>
            <button onClick={() => base44.auth.redirectToLogin()}>
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Iniciar sesión
              </Button>
            </button>
          </header>

          {/* Hero Content */}
          <div className="px-6 pt-16 pb-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Viaja seguro.<br />
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Viaja económico.
                </span>
              </h1>
              <p className="text-lg text-slate-300 mb-10 max-w-md mx-auto">
                De EdoMex a CDMX con precio fijo. Sin sorpresas.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <button onClick={() => base44.auth.redirectToLogin(createPageUrl('RequestRide'))}>
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg rounded-2xl shadow-xl shadow-blue-500/25">
                  <User className="w-5 h-5 mr-2" />
                  Viaja ahora
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </button>
              <button onClick={() => base44.auth.redirectToLogin(createPageUrl('DriverOnboarding'))}>
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white/20 bg-white/5 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-2xl">
                  <Car className="w-5 h-5 mr-2" />
                  Gana dinero
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Precio justo. Conductores verificados. Rutas fijas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Seguridad primero',
                description: 'Conductores verificados. Documentos revisados. Viaja tranquilo.',
                color: 'blue'
              },
              {
                icon: CreditCard,
                title: 'Precio claro',
                description: 'Sabes cuánto pagas antes de abordar. Sin sorpresas.',
                color: 'indigo'
              },
              {
                icon: MapPin,
                title: 'Rutas diarias',
                description: 'De EdoMex a CDMX todos los días. Conexiones clave.',
                color: 'purple'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-slate-50 rounded-3xl p-8 hover:shadow-xl transition-shadow"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-${feature.color}-500 to-${feature.color}-600 flex items-center justify-center mb-6 shadow-lg shadow-${feature.color}-500/25`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-slate-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              ¿Cómo funciona?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* For Passengers */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Para pasajeros</h3>
              </div>
              <div className="space-y-6">
                {[
                  { step: '1', title: 'Regístrate rápido', desc: 'Solo tu teléfono' },
                  { step: '2', title: 'Elige tu ruta', desc: 'Precio claro desde el inicio' },
                  { step: '3', title: 'Paga y confirma', desc: 'Seguro antes de abordar' },
                  { step: '4', title: 'Viaja seguro', desc: 'Conductor verificado' }
                ].map((item, index) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{item.title}</h4>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Drivers */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Car className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Para conductores</h3>
              </div>
              <div className="space-y-6">
                {[
                  { step: '1', title: 'Regístrate fácil', desc: 'Solo tu teléfono' },
                  { step: '2', title: 'Verifica documentos', desc: 'INE, licencia, tarjeta' },
                  { step: '3', title: 'Acepta viajes', desc: 'Rutas fijas, pasajeros seguros' },
                  { step: '4', title: 'Gana bien', desc: 'Solo 20% de comisión' }
                ].map((item, index) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{item.title}</h4>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Comienza hoy mismo
          </h2>
          <p className="text-lg text-white/80 mb-10">
            Viaja económico. Gana bien. Sin complicaciones.
          </p>
          <button onClick={() => base44.auth.redirectToLogin()}>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-slate-100 px-10 py-6 text-lg rounded-2xl shadow-xl">
              Registrarse gratis
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Car className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">RideApp</span>
            </div>
            <p className="text-sm text-slate-500">
              © 2025 RideApp. CDMX, México.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}