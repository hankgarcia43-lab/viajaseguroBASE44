import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Car, User, Shield, Clock, CreditCard, MapPin, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1920')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/60 to-slate-900" />
        
        <div className="relative">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Car className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-white">Viaja Seguro</span>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl('WelcomePasajero')}>
                <Button variant="ghost" className="text-white hover:bg-white/10 text-sm">
                  Pasajero
                </Button>
              </Link>
              <Link to={createPageUrl('WelcomeChofer')}>
                <Button variant="ghost" className="text-white hover:bg-white/10 text-sm">
                  Conductor
                </Button>
              </Link>
            </div>
          </header>

          {/* Hero Content */}
          <div className="px-6 pt-14 pb-28 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-6">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm text-white/90">Conductores verificados · Rutas fijas</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-5 leading-tight">
                EdoMex → CDMX<br />
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Precio fijo. Sin sorpresas.
                </span>
              </h1>
              <p className="text-lg text-slate-300 mb-10 max-w-md mx-auto">
                Viaja seguro en rutas compartidas recurrentes. Conductores revisados, pago transparente.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to={createPageUrl('WelcomePasajero')}>
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg rounded-2xl shadow-xl shadow-blue-500/25">
                  <User className="w-5 h-5 mr-2" />
                  Viaja ahora
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('WelcomeChofer')}>
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white/20 bg-white/5 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-2xl">
                  <Car className="w-5 h-5 mr-2" />
                  Gana dinero
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">¿Por qué Viaja Seguro?</h2>
            <p className="text-slate-600">Precio justo. Conductores verificados. Rutas diarias.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Seguridad primero', desc: 'Conductores verificados con INE, licencia y vehículo revisado.', bg: 'bg-blue-500' },
              { icon: CreditCard, title: 'Precio claro', desc: 'Sabes cuánto pagas antes de abordar. Descuento semanal automático.', bg: 'bg-indigo-500' },
              { icon: MapPin, title: 'Rutas recurrentes', desc: 'De EdoMex a CDMX, todos los días. Reserva por días de la semana.', bg: 'bg-purple-500' }
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-slate-50 rounded-3xl p-7 hover:shadow-xl transition-shadow"
              >
                <div className={`w-13 h-13 w-12 h-12 rounded-2xl ${f.bg} flex items-center justify-center mb-5 shadow-lg`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-600 text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-slate-50 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">¿Cómo funciona?</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-7 shadow-sm">
              <div className="flex items-center gap-3 mb-7">
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Para pasajeros</h3>
              </div>
              <div className="space-y-5">
                {[
                  { step: '1', title: 'Regístrate', desc: 'Crea tu cuenta con Gmail o número de celular' },
                  { step: '2', title: 'Elige tu ruta', desc: 'Ve el feed de conductores disponibles' },
                  { step: '3', title: 'Selecciona días', desc: '5+ días = descuento semanal automático' },
                  { step: '4', title: 'Paga y viaja', desc: 'Realiza tu transferencia y el equipo confirma tu lugar en menos de 12 hrs.' },
                ].map(item => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">{item.step}</div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-7 shadow-sm">
              <div className="flex items-center gap-3 mb-7">
                <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Car className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Para conductores</h3>
              </div>
              <div className="space-y-5">
                {[
                  { step: '1', title: 'Regístrate', desc: 'Crea tu cuenta con Gmail o número de celular' },
                  { step: '2', title: 'Verifica documentos', desc: 'INE, licencia, tarjeta de circulación y foto' },
                  { step: '3', title: 'Toma una ruta', desc: 'Elige del catálogo o crea la tuya propia' },
                  { step: '4', title: 'Gana dinero', desc: 'Solo 10% de comisión en rutas fijas. Pago semanal.' },
                ].map(item => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">{item.step}</div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Empieza hoy</h2>
          <p className="text-white/80 mb-8">Viaja económico. Gana bien. Sin complicaciones.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={createPageUrl('WelcomePasajero')}>
              <Button size="lg" className="bg-white text-blue-600 hover:bg-slate-100 px-8 py-5 rounded-2xl shadow-xl font-bold">
                Soy pasajero
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to={createPageUrl('WelcomeChofer')}>
              <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 px-8 py-5 rounded-2xl font-bold">
                Soy conductor
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">Viaja Seguro</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 Viaja Seguro · EdoMex / CDMX, México</p>
        </div>
      </footer>
    </div>
  );
}