import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { 
  DollarSign, TrendingUp, Calendar, Clock, 
  Loader2, Car, CreditCard, ChevronRight, Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DriverEarnings() {
  const [driver, setDriver] = useState(null);
  const [rides, setRides] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      const drivers = await base44.entities.Driver.filter({ user_id: userData.id });
      
      if (drivers.length === 0) return;
      
      const driverData = drivers[0];
      setDriver(driverData);

      // Load completed rides
      const allRides = await base44.entities.Ride.filter(
        { driver_id: driverData.id, status: 'completed' },
        '-completed_at',
        100
      );
      setRides(allRides);

      // Load payments
      const allPayments = await base44.entities.Payment.filter(
        { driver_id: driverData.id },
        '-created_date',
        100
      );
      setPayments(allPayments);

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

    const filteredRides = rides.filter(r => 
      new Date(r.completed_at) >= startDate
    );

    const totalFare = filteredRides.reduce((sum, r) => sum + (r.fare_final || r.fare_estimated || 0), 0);
    const driverEarnings = Math.round(totalFare * 0.8); // 80% for driver

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
    const days = eachDayOfInterval({
      start: subDays(now, 6),
      end: now
    });

    return days.map(day => {
      const dayStart = new Date(day.setHours(0, 0, 0, 0));
      const dayEnd = new Date(day.setHours(23, 59, 59, 999));
      
      const dayRides = rides.filter(r => {
        const completedAt = new Date(r.completed_at);
        return completedAt >= dayStart && completedAt <= dayEnd;
      });

      const earnings = dayRides.reduce((sum, r) => 
        sum + Math.round((r.fare_final || r.fare_estimated || 0) * 0.8), 0
      );

      return {
        day: format(dayStart, 'EEE', { locale: es }),
        earnings,
        rides: dayRides.length
      };
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                <span className="text-white/80">Saldo disponible</span>
              </div>
              <a
                href={`https://wa.me/5215574510969?text=${encodeURIComponent(
                  `Hola, soy ${driver?.full_name} y deseo solicitar el pago de mi saldo acumulado.\n\n` +
                  `💰 Saldo disponible: $${driver?.earnings_balance?.toLocaleString() || 0} MXN\n` +
                  `🆔 ID Conductor: ${driver?.id}\n` +
                  `📱 Teléfono: ${driver?.phone}\n\n` +
                  `Por favor, envíenme los detalles para completar el proceso.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="bg-white/20 text-white hover:bg-white/30">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Solicitar pago
                </Button>
              </a>
            </div>
            <p className="text-4xl font-bold">${driver?.earnings_balance?.toLocaleString() || 0}</p>
            <p className="text-white/60 text-sm mt-1">MXN</p>
          </CardContent>
        </Card>

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
                <span className="text-sm">Ganancias</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
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
                <span className="text-sm">Comisión plat.</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">${stats.platformFee}</p>
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
      </div>
    </div>
  );
}