import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  DollarSign, TrendingUp, Loader2, Car, CreditCard, Wallet,
  MessageCircle, Building2, X, Save, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, startOfWeek, eachDayOfInterval, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { loadAppConfig } from '@/lib/useAppConfig';
import { calcCommission, getCommissionPct } from '@/lib/commissionCalc';
import EarningsAnalytics from '@/components/driver/EarningsAnalytics';

export default function DriverEarnings() {
  const [driver, setDriver] = useState(null);
  const [rides, setRides] = useState([]);
  const [payments, setPayments] = useState([]);
  const [routeBookings, setRouteBookings] = useState([]);
  const [appConfig, setAppConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [mainTab, setMainTab] = useState('resumen');
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankName, setBankName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, cfg] = await Promise.all([base44.auth.me(), loadAppConfig()]);
      setAppConfig(cfg);
      const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
      
      if (drivers.length === 0) return;
      
      const driverData = drivers[0];
      setDriver(driverData);

      const [allRides, allPayments, allRouteBookings] = await Promise.all([
        base44.entities.Ride.filter({ driver_id: driverData.id, status: 'completed' }, '-completed_at', 100),
        base44.entities.Payment.filter({ driver_id: driverData.id }, '-created_date', 100),
        base44.entities.RouteBooking.filter({ driver_id: driverData.id, payment_status: 'paid' }, '-created_date', 200),
      ]);
      setRides(allRides);
      setPayments(allPayments);
      setRouteBookings(allRouteBookings);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = startOfWeek(now, { weekStartsOn: 1 });
    }

    const filteredRides = rides.filter(r => new Date(r.completed_at) >= startDate);

    // Usar payout real si existe; si no, calcular con comisión dinámica
    const commPct = getCommissionPct(appConfig, 'quick_ride');
    const paymentsMap = {};
    payments.forEach(p => { paymentsMap[p.ride_id] = p; });

    const driverEarnings = filteredRides.reduce((sum, r) => {
      const p = paymentsMap[r.id];
      if (p) return sum + (p.payout_driver || 0);
      const gross = r.fare_final || r.fare_estimated || 0;
      return sum + calcCommission(gross, commPct).driverNet;
    }, 0);
    const totalFare = filteredRides.reduce((sum, r) => sum + (r.fare_final || r.fare_estimated || 0), 0);

    return {
      rides: filteredRides.length,
      totalFare,
      earnings: driverEarnings,
      platformFee: totalFare - driverEarnings,
      avgPerRide: filteredRides.length > 0 ? Math.round(driverEarnings / filteredRides.length) : 0
    };
  };

  const getChartData = () => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
    const paymentsMap = {};
    payments.forEach(p => { paymentsMap[p.ride_id] = p; });

    return days.map(day => {
      const dayStart = new Date(day.setHours(0, 0, 0, 0));
      const dayEnd = new Date(day.setHours(23, 59, 59, 999));
      const dayRides = rides.filter(r => {
        const completedAt = new Date(r.completed_at);
        return completedAt >= dayStart && completedAt <= dayEnd;
      });
      const earnings = dayRides.reduce((sum, r) => {
        const p = paymentsMap[r.id];
        if (p) return sum + (p.payout_driver || 0);
        const gross = r.fare_final || r.fare_estimated || 0;
        return sum + calcCommission(gross, getCommissionPct(appConfig, 'quick_ride')).driverNet;
      }, 0);
      return { day: format(dayStart, 'EEE', { locale: es }), earnings, rides: dayRides.length };
    });
  };

  const stats = calculateStats();
  const chartData = getChartData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Mis ganancias</h1>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                <span className="text-white/80">Saldo disponible</span>
              </div>
            </div>
            <p className="text-4xl font-bold mb-1">${driver?.earnings_balance?.toLocaleString() || 0}</p>
            <p className="text-white/60 text-sm mb-4">MXN</p>

            {/* Bank account info */}
            {driver?.bank_account ? (
              <div className="bg-white/10 rounded-xl p-3 mb-3 text-sm">
                <p className="text-white/70 text-xs mb-0.5">Cuenta bancaria registrada</p>
                <p className="font-medium">{driver.bank_account}</p>
                {driver.bank_holder && <p className="text-white/70 text-xs">{driver.bank_holder}</p>}
              </div>
            ) : (
              <button onClick={() => setShowBankModal(true)} className="w-full bg-white/10 hover:bg-white/20 rounded-xl p-3 mb-3 text-sm text-left transition-colors">
                <p className="text-white/70 text-xs">Cuenta bancaria</p>
                <p className="font-medium text-white/90">+ Agregar para recibir pagos</p>
              </button>
            )}

            <Button
              size="sm"
              className="bg-white/20 text-white hover:bg-white/30 w-full"
              onClick={async () => {
                if (!driver?.bank_account) { setShowBankModal(true); toast.info('Registra tu cuenta bancaria primero'); return; }
                if ((driver?.earnings_balance || 0) <= 0) { toast.error('No tienes saldo disponible para solicitar'); return; }
                // Create a PaymentLedger payout request
                await base44.entities.PaymentLedger.create({
                  transaction_type: 'payout',
                  reference_type: 'route_booking',
                  reference_id: driver.id,
                  user_id: driver.id,
                  user_role: 'driver',
                  amount: driver.earnings_balance || 0,
                  status: 'pending',
                  description: `Solicitud de pago — ${driver.full_name} — CLABE: ${driver.bank_account} — Titular: ${driver.bank_holder}`,
                });
                toast.success('Solicitud enviada. Administración revisará y transferirá a tu cuenta en los próximos días hábiles.');
              }}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Solicitar pago a administración
            </Button>
            <p className="text-white/50 text-[10px] text-center mt-1">
              Los pagos se liberan después de completar viajes y validación del equipo.
            </p>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="mb-6">
          <TabsList className="w-full bg-white">
            <TabsTrigger value="resumen" className="flex-1">Resumen</TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1">Analítica</TabsTrigger>
          </TabsList>
        </Tabs>

        {mainTab === 'analytics' && (
          <EarningsAnalytics
            rides={rides}
            routeBookings={routeBookings}
            payments={payments}
            appConfig={appConfig}
          />
        )}

        {mainTab === 'resumen' && <>

        {/* Period Tabs */}
        <Tabs value={period} onValueChange={setPeriod} className="mb-6">
          <TabsList className="w-full bg-white">
            <TabsTrigger value="today" className="flex-1">Hoy</TabsTrigger>
            <TabsTrigger value="week" className="flex-1">Semana</TabsTrigger>
            <TabsTrigger value="month" className="flex-1">Mes</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Ganancia neta</span>
              </div>
              <p className="text-2xl font-bold text-green-700">
                ${stats.earnings.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Car className="w-4 h-4" />
                <span className="text-sm">Viajes</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.rides}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Promedio/viaje</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">${stats.avgPerRide}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm">Cargo operativo</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">${stats.platformFee.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Últimos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Ganancias']}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Bar 
                    dataKey="earnings" 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Route Bookings - confirmed paid */}
        {routeBookings.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Reservas confirmadas en mis rutas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {routeBookings.slice(0, 15).map((rb) => (
                <div key={rb.id} className="flex items-center justify-between p-4 border-b last:border-0">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{rb.passenger_name || 'Pasajero'}</p>
                    <p className="text-xs text-slate-500">
                      {(rb.days_booked || []).join(', ')} · {rb.seats_booked || 1} asiento(s)
                    </p>
                    <p className="text-xs text-slate-400">{format(new Date(rb.created_date), "d MMM yyyy", { locale: es })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">${rb.total_price}</p>
                    <Badge className="bg-green-100 text-green-700 text-[10px]">Pagado</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            Los pagos se liberan cuando los viajes se completan y administración valida la operación. Usa el botón de solicitud de pago para que el equipo procese tu saldo.
          </AlertDescription>
        </Alert>

        {/* Bank modal */}
        {showBankModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-600" />Cuenta bancaria</h3>
                <button onClick={() => setShowBankModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <p className="text-sm text-slate-500 mb-4">Registra tu CLABE o número de cuenta para recibir pagos. La administración validará la solicitud.</p>
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3 border border-amber-200">
                ⚠️ El titular debe coincidir exactamente con el nombre registrado en el banco.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Banco</label>
                  <input
                    type="text"
                    placeholder="Ej: BBVA, Banorte, HSBC, Santander"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="mt-1 w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">CLABE interbancaria (18 dígitos)</label>
                  <input
                    type="text"
                    placeholder="18 dígitos CLABE"
                    value={bankAccount}
                    onChange={e => setBankAccount(e.target.value.replace(/\D/g, '').slice(0, 18))}
                    className="mt-1 w-full border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={18}
                  />
                  <p className="text-xs text-slate-400 mt-0.5">{bankAccount.length}/18 dígitos</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Titular de la cuenta</label>
                  <input
                    type="text"
                    placeholder="Nombre completo como aparece en el banco"
                    value={bankHolder}
                    onChange={e => setBankHolder(e.target.value)}
                    className="mt-1 w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={async () => {
                    if (!bankAccount.trim() || !bankHolder.trim()) return;
                    await base44.entities.Driver.update(driver.id, {
                      bank_account: bankAccount,
                      bank_holder: bankHolder,
                    });
                    setDriver(prev => ({ ...prev, bank_account: bankAccount, bank_holder: bankHolder }));
                    toast.success('Cuenta bancaria guardada correctamente');
                    setShowBankModal(false);
                  }}
                  disabled={!bankAccount.trim() || !bankHolder.trim() || bankAccount.length < 16}
                >
                  <Save className="w-4 h-4 mr-2" /> Guardar cuenta bancaria
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Movimientos recientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {payments.slice(0, 10).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    payment.status === 'captured' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <DollarSign className={`w-5 h-5 ${
                      payment.status === 'captured' ? 'text-green-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {payment.status === 'captured' ? 'Pago recibido' : 'Pendiente'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {format(new Date(payment.created_date), "d MMM HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
                <p className={`font-bold ${
                  payment.status === 'captured' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  +${payment.payout_driver}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        </>}
      </div>
    </div>
  );
}