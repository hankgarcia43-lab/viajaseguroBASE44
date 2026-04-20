import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { 
  User, Mail, Phone, Star, Car, Shield, 
  ChevronRight, LogOut, Bell, HelpCircle,
  CreditCard, Loader2, Camera, Edit, UserCheck, AlertTriangle, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      setFormData({
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        emergency_contact_name: userData.emergency_contact_name || '',
        emergency_contact_phone: userData.emergency_contact_phone || '',
      });

      const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
      if (drivers.length > 0) {
        setDriver(drivers[0]);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await base44.auth.updateMe(formData);
      setUser({ ...user, ...formData });
      setEditing(false);
      toast.success('Perfil actualizado');
    } catch (error) {
      toast.error('Error al actualizar perfil');
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleDeleteAccount = async () => {
    try {
      await base44.auth.updateMe({ account_status: 'deletion_requested' });
      toast.success('Solicitud de eliminación enviada. Tu cuenta será eliminada en 7 días.');
      base44.auth.logout();
    } catch (error) {
      toast.error('Error al procesar la solicitud');
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
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 pt-8 pb-20 px-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Mi perfil</h1>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => setEditing(!editing)}
          >
            <Edit className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
              <Camera className="w-4 h-4 text-slate-600" />
            </button>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.full_name || 'Usuario'}</h2>
            <p className="text-white/70">{user?.email}</p>
            {driver && (
              <div className="flex items-center gap-2 mt-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-white font-medium">{driver.rating?.toFixed(1) || '5.0'}</span>
                <span className="text-white/50">•</span>
                <span className="text-white/70">{driver.total_rides || 0} viajes</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-12">
        {/* Edit Form */}
        {editing && (
          <Card className="mb-4">
            <CardContent className="p-4 space-y-4">
              <div>
                <Label>Nombre completo</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="5512345678"
                  maxLength={10}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Este número se usará para confirmar tu viaje por WhatsApp.
                </p>
              </div>
              <div>
                <Label>Contacto de emergencia — Nombre</Label>
                <Input
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  placeholder="Nombre completo"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Contacto de emergencia — Teléfono</Label>
                <Input
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  placeholder="5512345678"
                  maxLength={10}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">Cancelar</Button>
                <Button onClick={handleSave} className="flex-1">Guardar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Cards */}
        <Card className="mb-4">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-4 border-b">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">Correo electrónico</p>
                <p className="font-medium text-slate-900">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">Teléfono</p>
                <p className="font-medium text-slate-900">{user?.phone || 'No registrado'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Section */}
        {driver && (
          <Card className="mb-4">
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Car className="w-5 h-5 text-indigo-600" />
                  Información de conductor
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Vehículo</span>
                  <span className="font-medium">{driver.vehicle_model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Placas</span>
                  <span className="font-medium">{driver.vehicle_plate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estado KYC</span>
                  <span className={`font-medium ${
                    driver.kyc_status === 'approved' ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {driver.kyc_status === 'approved' ? 'Verificado' : 'Pendiente'}
                  </span>
                </div>
              </div>
              {driver.kyc_status !== 'approved' && (
                <div className="p-4 border-t">
                  <Link to={createPageUrl('DriverOnboarding')}>
                    <Button className="w-full" variant="outline">
                      <Shield className="w-4 h-4 mr-2" />
                      Completar verificación
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Become Driver */}
        {!driver && (
          <Card className="mb-4 bg-gradient-to-r from-indigo-500 to-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">¿Quieres ser conductor?</h3>
                  <p className="text-white/70 text-sm">Solo 10% comisión. Ingresos constantes.</p>
                </div>
                <Link to={createPageUrl('DriverOnboarding')}>
                  <Button className="bg-white text-indigo-600 hover:bg-white/90">
                    Registrarme
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu Options */}
        <Card className="mb-4">
          <CardContent className="p-0">
            <Link to={createPageUrl('Notifications')} className="flex items-center gap-4 p-4 border-b hover:bg-slate-50">
              <Bell className="w-5 h-5 text-slate-400" />
              <span className="flex-1 font-medium text-slate-900">Notificaciones</span>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </Link>
            <button className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 text-left">
              <HelpCircle className="w-5 h-5 text-slate-400" />
              <span className="flex-1 font-medium text-slate-900">Ayuda y soporte</span>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </CardContent>
        </Card>

        {/* Emergency contacts */}
        {(user?.emergency_contact_name || user?.emergency_contact_phone) && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-2">
                <UserCheck className="w-4 h-4" /> Contacto de emergencia
              </p>
              <p className="text-sm text-amber-800">{user.emergency_contact_name}</p>
              <p className="text-sm text-amber-700">{user.emergency_contact_phone}</p>
            </CardContent>
          </Card>
        )}

        {/* 911 Button */}
        <a href="tel:911" className="block mb-4">
          <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Emergencias — Llamar al 911
          </Button>
        </a>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 mb-3"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Cerrar sesión
        </Button>

        {/* Delete Account */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full text-slate-400 hover:text-red-500 hover:bg-red-50 text-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar cuenta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es irreversible. Tu cuenta y todos tus datos serán eliminados permanentemente en un plazo de 7 días. Las reservas activas serán canceladas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700"
              >
                Sí, eliminar mi cuenta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}