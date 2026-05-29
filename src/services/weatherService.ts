export interface DayWeather {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  precipitationProbabilityMax: number | null;
  windSpeedMax: number;
}

interface WMOEntry { label: string; emoji: string }

const WMO: Record<number, WMOEntry> = {
  0:  { label: 'Açık',               emoji: '☀️'  },
  1:  { label: 'Az Bulutlu',         emoji: '🌤️' },
  2:  { label: 'Parçalı Bulut',      emoji: '⛅'  },
  3:  { label: 'Kapalı',             emoji: '☁️'  },
  45: { label: 'Sisli',              emoji: '🌫️' },
  48: { label: 'Yoğun Sis',          emoji: '🌫️' },
  51: { label: 'Hafif Çiseleme',     emoji: '🌦️' },
  53: { label: 'Çiseleme',           emoji: '🌦️' },
  55: { label: 'Yoğun Çiseleme',     emoji: '🌧️' },
  61: { label: 'Hafif Yağmur',       emoji: '🌧️' },
  63: { label: 'Yağmur',             emoji: '🌧️' },
  65: { label: 'Şiddetli Yağmur',    emoji: '🌧️' },
  71: { label: 'Hafif Kar',          emoji: '🌨️' },
  73: { label: 'Kar',                emoji: '❄️'  },
  75: { label: 'Yoğun Kar',          emoji: '❄️'  },
  77: { label: 'Dolu',               emoji: '🌨️' },
  80: { label: 'Sağanak',            emoji: '🌦️' },
  81: { label: 'Kuvvetli Sağanak',   emoji: '⛈️'  },
  82: { label: 'Şiddetli Sağanak',   emoji: '⛈️'  },
  85: { label: 'Kar Sağanağı',       emoji: '🌨️' },
  86: { label: 'Yoğun Kar Sağanağı', emoji: '❄️'  },
  95: { label: 'Fırtınalı',          emoji: '⛈️'  },
  96: { label: 'Dolu Fırtınası',     emoji: '⛈️'  },
  99: { label: 'Şiddetli Fırtına',   emoji: '⛈️'  },
};

export const getWeatherInfo = (code: number): WMOEntry =>
  WMO[code] ?? WMO[Math.floor(code / 10) * 10] ?? { label: 'Bilinmiyor', emoji: '🌡️' };

export const getPackingTips = (weatherList: DayWeather[]): string[] => {
  const tips: string[] = [];
  const hot    = weatherList.some(w => w.tempMax > 28);
  const cold   = weatherList.some(w => w.tempMin < 12);
  const rainy  = weatherList.some(w => w.precipitationSum > 3 || (w.precipitationProbabilityMax ?? 0) > 50);
  const snowy  = weatherList.some(w => w.weatherCode >= 71 && w.weatherCode <= 77);
  const windy  = weatherList.some(w => w.windSpeedMax > 30);
  const stormy = weatherList.some(w => w.weatherCode >= 80);

  if (hot)    tips.push('🧴 Güneş kremi ve güneş gözlüğü');
  if (rainy)  tips.push('☂️ Şemsiye veya yağmurluk');
  if (cold)   tips.push('🧥 Kalın mont / katmanlı giysi');
  if (snowy)  tips.push('🥾 Su geçirmez bot');
  if (windy)  tips.push('🧣 Rüzgarlık ve atkı');
  if (stormy) tips.push('⚡ Fırtınalı günlerde kapalı mekânları tercih et');

  return tips;
};

export interface WeatherResult {
  weather: DayWeather[];
  lat: number;
  lng: number;
}

export const fetchWeatherForTrip = async (
  destination: string,
  startDate: string,
  endDate: string,
): Promise<WeatherResult> => {
  // 1. Geocode — şehir adının ilk bölümünü al (virgülden önceki kısım)
  const cityName = destination.split(',')[0].trim();
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=tr&format=json`
  );
  if (!geoRes.ok) throw new Error('GEOCODE_FAIL');

  const geoData = await geoRes.json() as {
    results?: Array<{ latitude: number; longitude: number }>;
  };
  if (!geoData.results?.length) throw new Error('NOT_FOUND');
  const { latitude, longitude } = geoData.results[0];

  // 2. Tarih kontrolü
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const endObj   = new Date(endDate   + 'T00:00:00');
  const startObj = new Date(startDate + 'T00:00:00');
  const daysToEnd     = (endObj.getTime()   - today.getTime()) / 86_400_000;
  const daysFromStart = (today.getTime() - startObj.getTime()) / 86_400_000;

  if (daysToEnd > 16) throw new Error('TOO_FAR');

  // 3. API seçimi: forecast API ~88 gün geriye bakabilir; daha eski tarihler için archive
  const useArchive = daysFromStart > 88;
  const base = useArchive
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast';

  const dailyFields = [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'wind_speed_10m_max',
    ...(useArchive ? [] : ['precipitation_probability_max']),
  ].join(',');

  const url = new URL(base);
  url.searchParams.set('latitude',    String(latitude));
  url.searchParams.set('longitude',   String(longitude));
  url.searchParams.set('start_date',  startDate);
  url.searchParams.set('end_date',    endDate);
  url.searchParams.set('daily',       dailyFields);
  url.searchParams.set('timezone',    'auto');
  url.searchParams.set('wind_speed_unit', 'kmh');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('WEATHER_FAIL');

  const data = await res.json() as {
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      precipitation_probability_max?: (number | null)[];
      wind_speed_10m_max: number[];
    };
  };

  if (!data.daily?.time?.length) throw new Error('NO_DATA');

  const weather = data.daily.time.map((date, i) => ({
    date,
    weatherCode:                 data.daily.weather_code[i]                    ?? 0,
    tempMax:      Math.round(    data.daily.temperature_2m_max[i]              ?? 0),
    tempMin:      Math.round(    data.daily.temperature_2m_min[i]              ?? 0),
    precipitationSum:            Math.round((data.daily.precipitation_sum[i]   ?? 0) * 10) / 10,
    precipitationProbabilityMax: data.daily.precipitation_probability_max?.[i] ?? null,
    windSpeedMax: Math.round(    data.daily.wind_speed_10m_max[i]              ?? 0),
  }));

  return { weather, lat: latitude, lng: longitude };
};
