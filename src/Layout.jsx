import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from './utils';
import { 
  Car, User, Menu, X, Home, Clock, Settings, LogOut, 
  Shield, Bell, ChevronRight, MapPin, Route, Search, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Check if user is a driver
        const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
        if (drivers.length > 0) {
          setDriver(drivers[0]);
        }

        // Load notifications
        const notifs = await base44.entities.Notification.filter(
          { user_id: userData.id, read: false },
          '-created_date',
          5
        );
        setNotifications(notifs);
      }
    } catch (error) {
      console.log('User not authenticated');
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Public pages that don't need auth
  const publicPages = ['Landing', 'WelcomePasajero', 'WelcomeChofer', 'PaymentInstructions'];
  const isPublicPage = publicPages.includes(currentPageName);

  // Admin pages
  const adminPages = ['AdminDashboard', 'AdminKYC', 'AdminIncidents', 'AdminPayments', 'AdminConfig'];
  const isAdminPage = adminPages.includes(currentPageName);

  // Driver pages
  const driverPages = ['DriverDashboard', 'DriverFeed', 'DriverOnboarding', 'DriverEarnings', 'DriverHistory', 'CreateRoute', 'MyRoutes'];
  const isDriverPage = driverPages.includes(currentPageName);

  // Route pages (passenger)
  const routePages = ['SearchRoutes', 'RouteDetails', 'MyBookings'];
  const isRoutePage = routePages.includes(currentPageName);

  if (isPublicPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {children}
      </div>
    );
  }

  const passengerNavItems = [
    { name: 'Rutas', icon: Search, page: 'SearchRoutes' },
    { name: 'Mis reservas', icon: Calendar, page: 'MyBookings' },
    { name: 'Soporte', icon: Bell, page: 'Soporte' },
    { name: 'Perfil', icon: User, page: 'Profile' },
  ];

  const driverNavItems = [
    { name: 'Rutas', icon: Route, page: 'DriverFeed' },
    { name: 'Mis rutas', icon: Car, page: 'MyRoutes' },
    { name: 'Historial', icon: Clock, page: 'DriverHistory' },
    { name: 'Soporte', icon: Bell, page: 'Soporte' },
    { name: 'Perfil', icon: User, page: 'Profile' },
  ];

  const adminNavItems = [
    { name: 'Dashboard', icon: Home, page: 'AdminDashboard' },
    { name: 'KYC', icon: Shield, page: 'AdminKYC' },
    { name: 'Rutas base', icon: Route, page: 'AdminRoutes' },
    { name: 'Soporte', icon: Bell, page: 'AdminIncidents' },
    { name: 'Pagos', icon: Settings, page: 'AdminPayments' },
  ];

  const getNavItems = () => {
    if (isAdminPage || user?.role === 'admin') return adminNavItems;
    if (isDriverPage || driver) return driverNavItems;
    return passengerNavItems;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        :root {
          --primary: 220 90% 56%;
          --primary-foreground: 0 0% 100%;
        }
      `}</style>
      
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to={createPageUrl('Landing')} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">Viaja Seguro</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Notifications')} className="relative">
              <Bell className="w-5 h-5 text-slate-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </Link>
            
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b bg-gradient-to-br from-blue-600 to-indigo-600">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{user?.full_name || 'Usuario'}</p>
                        <p className="text-sm text-white/70">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  <nav className="flex-1 p-4 space-y-1">
                    {getNavItems().map((item) => (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          currentPageName === item.page
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                        <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                      </Link>
                    ))}
                  </nav>

                  <div className="p-4 border-t">
                    {driver && driver.kyc_status !== 'approved' && (
                      <Link
                        to={createPageUrl('DriverOnboarding')}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-amber-50 text-amber-700"
                      >
                        <Shield className="w-5 h-5" />
                        <span className="font-medium">Completar verificación</span>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Cerrar sesión
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 md:hidden">
        <div className="flex items-center justify-around h-16">
          {getNavItems().slice(0, 4).map((item) => (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                currentPageName === item.page
                  ? 'text-blue-600'
                  : 'text-slate-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}