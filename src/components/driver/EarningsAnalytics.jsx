import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Route, Car, Minus } from 'lucide-react';
import { format, parseISO, startOfMonth, getMonth, getYear, subYears, differenceInMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { calcCommission, getCommissionPct } from '@/lib/commissionCalc';

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="font-medium">
            {entry.name}: ${Number(entry.value).toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function EarningsAnalytics({ rides, routeBookings, payments, appConfig }) {
  const paymentsMap = useMemo(() => {
    const m = {};
    payments.forEach(p => { m[p.ride_id] = p; });
    return m;
  }, [payments]);

  const getRideEarning = (ride) => {
    const p = paymentsMap[ride.id];
    if (p?.payout_driver) return p.payout_driver;
    const gross = ride.fare_final || ride.fare_estimated || 0;
    return calcCommission(gross, getCommissionPct(appConfig, 'quick_ride')).driverNet;
  };

  // Monthly breakdown — last 12 months
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { year: getYear(d), month: getMonth(d), label: MONTH_NAMES[getMonth(d)] };
    });

    return months.map(({ year, month, label }) => {
      const rideEarnings = rides
        .filter(r => {
          const d = new Date(r.completed_at || r.created_date);
          return getYear(d) === year && getMonth(d) === month;
        })
        .reduce((sum, r) => sum + getRideEarning(r), 0);

      const bookingEarnings = routeBookings
        .filter(rb => {
          const d = new Date(rb.created_date);
          return getYear(d) === year && getMonth(d) === month;
        })
        .reduce((sum, rb) => {
          const gross = rb.total_price || 0;
          return sum + calcCommission(gross, getCommissionPct(appConfig, 'route_booking')).driverNet;
        }, 0);

      return {
        label,
        rides: Math.round(rideEarnings),
        rutas: Math.round(bookingEarnings),
        total: Math.round(rideEarnings + bookingEarnings),
      };
    });
  }, [rides, routeBookings, paymentsMap, appConfig]);

  // YoY comparison — current year vs last year (by month)
  const yoyData = useMemo(() => {
    const now = new Date();
    const currentYear = getYear(now);
    const lastYear = currentYear - 1;

    return MONTH_NAMES.map((label, month) => {
      const current = [...rides, ...routeBookings.map(rb => ({ ...rb, _type: 'booking' }))]
        .filter(item => {
          const d = new Date(item.completed_at || item.created_date);
          return getYear(d) === currentYear && getMonth(d) === month;
        })
        .reduce((sum, item) => {
          if (item._type === 'booking') {
            return sum + calcCommission(item.total_price || 0, getCommissionPct(appConfig, 'route_booking')).driverNet;
          }
          return sum + getRideEarning(item);
        }, 0);

      const previous = [...rides, ...routeBookings.map(rb => ({ ...rb, _type: 'booking' }))]
        .filter(item => {
          const d = new Date(item.completed_at || item.created_date);
          return getYear(d) === lastYear && getMonth(d) === month;
        })
        .reduce((sum, item) => {
          if (item._type === 'booking') {
            return sum + calcCommission(item.total_price || 0, getCommissionPct(appConfig, 'route_booking')).driverNet;
          }
          return sum + getRideEarning(item);
        }, 0);

      return { label, [currentYear]: Math.round(current), [lastYear]: Math.round(previous) };
    });
  }, [rides, routeBookings, paymentsMap, appConfig]);

  // Top categories
  const categoryStats = useMemo(() => {
    const quickTotal = rides.reduce((sum, r) => sum + getRideEarning(r), 0);
    const quickCount = rides.length;

    const routeTotal = routeBookings.reduce((sum, rb) => {
      return sum + calcCommission(rb.total_price || 0, getCommissionPct(appConfig, 'route_booking')).driverNet;
    }, 0);
    const routeCount = routeBookings.length;

    const grandTotal = quickTotal + routeTotal;
    return [
      {
        name: 'Viajes rápidos',
        total: Math.round(quickTotal),
        count: quickCount,
        pct: grandTotal > 0 ? Math.round((quickTotal / grandTotal) * 100) : 0,
        color: 'bg-blue-500',
        icon: Car,
      },
      {
        name: 'Rutas programadas',
        total: Math.round(routeTotal),
        count: routeCount,
        pct: grandTotal > 0 ? Math.round((routeTotal / grandTotal) * 100) : 0,
        color: 'bg-emerald-500',
        icon: Route,
      },
    ];
  }, [rides, routeBookings, paymentsMap, appConfig]);

  // YoY growth summary
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  const currentYearTotal = yoyData.reduce((s, d) => s + (d[currentYear] || 0), 0);
  const lastYearTotal = yoyData.reduce((s, d) => s + (d[lastYear] || 0), 0);
  const growth = lastYearTotal > 0 ? Math.round(((currentYearTotal - lastYearTotal) / lastYearTotal) * 100) : null;

  return (
    <div className="space-y-6">

      {/* Category breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ganancias por categoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryStats.map(cat => (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <cat.icon className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                  <span className="text-xs text-slate-400">({cat.count} viajes)</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">${cat.total.toLocaleString()}</span>
                  <Badge className="ml-2 text-[10px] bg-slate-100 text-slate-600">{cat.pct}%</Badge>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className={`${cat.color} h-2 rounded-full transition-all`} style={{ width: `${cat.pct}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Monthly breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desglose mensual — últimos 12 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="rides" name="Viajes rápidos" fill="#3B82F6" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="rutas" name="Rutas" fill="#10B981" radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* YoY comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">Comparativo anual</CardTitle>
            {growth !== null && (
              <div className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-lg ${
                growth > 0 ? 'bg-green-50 text-green-700' : growth < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'
              }`}>
                {growth > 0 ? <TrendingUp className="w-4 h-4" /> : growth < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {growth > 0 ? '+' : ''}{growth}% vs {lastYear}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yoyData}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey={currentYear} name={`${currentYear}`} stroke="#6366F1" fill="url(#colorCurrent)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey={lastYear} name={`${lastYear}`} stroke="#94A3B8" fill="url(#colorLast)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-xs text-indigo-500 mb-0.5">{currentYear}</p>
              <p className="text-lg font-bold text-indigo-700">${currentYearTotal.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-0.5">{lastYear}</p>
              <p className="text-lg font-bold text-slate-600">${lastYearTotal.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}