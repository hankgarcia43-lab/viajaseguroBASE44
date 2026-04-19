// Shared hook to load app config from DB and return typed values
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const DEFAULTS = {
  commission_percentage: 10,
  commission_quick_ride: 20,
  commission_recurring: 10,
  base_fare: 12,
  per_km_rate: 8,
  per_min_rate: 1.5,
  min_fare: 35,
  retention_window_minutes: 10,
  initial_search_radius_km: 10,
  max_search_radius_km: 30,
  driver_accept_timeout_seconds: 15,
  max_drivers_to_notify: 3,
  ocr_confidence_threshold: 85,
  allow_owner_letter_exception: true,
  free_cancel_window_minutes: 3,
  cancel_fee: 30,
};

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 60000; // 1 min

export async function loadAppConfig() {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL) return _cache;

  try {
    const configs = await base44.entities.AppConfig.list();
    const loaded = { ...DEFAULTS };
    configs.forEach(c => {
      if (c.config_type === 'number') loaded[c.config_key] = parseFloat(c.config_value);
      else if (c.config_type === 'boolean') loaded[c.config_key] = c.config_value === 'true';
      else loaded[c.config_key] = c.config_value;
    });
    _cache = loaded;
    _cacheTime = now;
    return loaded;
  } catch {
    return { ...DEFAULTS };
  }
}

export function useAppConfig() {
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppConfig().then(c => { setConfig(c); setLoading(false); });
  }, []);

  return { config, loading };
}