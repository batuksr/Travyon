/* Landing sayfasındaki etkileşimli "gezi planlayıcı" demosu için elle hazırlanmış
   sabit örnek plan (Roma, 4 gün). Firestore/AI'a bağlı değildir — metinler i18n'den
   (home.product.demo.items.<id>, .summaries.<dayId>, .guide, .weather) okunur, burada
   sadece yapısal/konumsal veri (sıra, dönem, ücret, seyahat süreleri, gerçek harita
   koordinatı) tutulur. İçerik `Roma Gezi Planlayıcı.dc.html` tasarım referansından
   birebir taşınmıştır; gerçek kullanıcı verisiyle değiştirilebilir.

   Not: Kullanıcı listede aktivite ekleyip/silip/kopyalayıp/sıralayabildiği için bu
   dosyadaki `items` yalnızca BAŞLANGIÇ durumudur — çalışma zamanındaki gerçek liste
   TripPlannerDemo.tsx içindeki React state'te tutulur. */

export type DemoGroup = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

export const GROUP_ORDER: DemoGroup[] = ['morning', 'noon', 'afternoon', 'evening', 'night'];

export interface DemoTravelTimes {
  km: number;
  car: number;
  bus: number;
  walk: number;
  bike: number;
}

export interface DemoActivity {
  id: string;
  group: DemoGroup;
  cost: number; // €
  times: DemoTravelTimes;
  lat: number;
  lng: number;
}

/* weatherView.conditions.* i18n anahtarlarıyla birebir eşleşir (bkz. WeatherView.tsx WMO_LABEL_KEYS) */
export type DemoWeatherCond = 'clear' | 'mostlyClear' | 'partlyCloudy';

export interface DemoDay {
  id: string;
  date: string;   // '2026-08-20'
  tab: string;    // '08-20'
  weather: { cond: DemoWeatherCond; hi: number; lo: number; rain: number; windKmh: number };
  items: DemoActivity[];
}

const T = (km: number, car: number, bus: number, walk: number, bike: number): DemoTravelTimes =>
  ({ km, car, bus, walk, bike });

/* Konaklama yerin — Monti mahallesi civarında, haritada sabit kırmızı pin */
export const DEMO_STAY = { lat: 41.8946, lng: 12.4886 };

export const DEMO_DAYS: DemoDay[] = [
  {
    id: 'day1',
    date: '2026-08-20',
    tab: '08-20',
    weather: { cond: 'mostlyClear', hi: 31, lo: 23, rain: 21, windKmh: 15 },
    items: [
      { id: 'd1-panificio', group: 'noon',      cost: 8,  times: T(0.6, 10, 16, 19, 9), lat: 41.8946, lng: 12.4886 },
      { id: 'd1-oppio',     group: 'afternoon', cost: 0,  times: T(0.5, 9, 13, 14, 4),  lat: 41.8916, lng: 12.4964 },
      { id: 'd1-colosseo',  group: 'afternoon', cost: 0,  times: T(0.9, 5, 15, 18, 9),  lat: 41.8902, lng: 12.4922 },
      { id: 'd1-venezia',   group: 'afternoon', cost: 0,  times: T(0.7, 9, 17, 17, 10), lat: 41.8955, lng: 12.4823 },
      { id: 'd1-trevi',     group: 'afternoon', cost: 0,  times: T(0.9, 5, 16, 16, 7),  lat: 41.9009, lng: 12.4833 },
      { id: 'd1-monti',     group: 'evening',   cost: 22, times: T(0.8, 7, 15, 16, 8),  lat: 41.8946, lng: 12.4886 },
    ],
  },
  {
    id: 'day2',
    date: '2026-08-21',
    tab: '08-21',
    weather: { cond: 'clear', hi: 33, lo: 24, rain: 14, windKmh: 13 },
    items: [
      { id: 'd2-vatikan',     group: 'morning',   cost: 25, times: T(3.4, 14, 24, 42, 18), lat: 41.9065, lng: 12.4536 },
      { id: 'd2-pizzarium',   group: 'noon',      cost: 10, times: T(0.7, 6, 12, 9, 5),    lat: 41.9106, lng: 12.4453 },
      { id: 'd2-sanpietro',   group: 'afternoon', cost: 0,  times: T(1.1, 7, 14, 15, 8),   lat: 41.9022, lng: 12.4539 },
      { id: 'd2-castel',      group: 'afternoon', cost: 0,  times: T(1.0, 6, 13, 13, 6),   lat: 41.9031, lng: 12.4663 },
      { id: 'd2-ponte',       group: 'afternoon', cost: 0,  times: T(0.3, 3, 6, 5, 2),     lat: 41.9022, lng: 12.4655 },
      { id: 'd2-trastevere',  group: 'evening',   cost: 0,  times: T(2.1, 10, 18, 26, 12), lat: 41.8898, lng: 12.4695 },
      { id: 'd2-enzo',        group: 'evening',   cost: 30, times: T(0.4, 4, 7, 5, 3),     lat: 41.8884, lng: 12.4780 },
    ],
  },
  {
    id: 'day3',
    date: '2026-08-22',
    tab: '08-22',
    weather: { cond: 'mostlyClear', hi: 34, lo: 23, rain: 17, windKmh: 14 },
    items: [
      { id: 'd3-navona',        group: 'morning',   cost: 0,  times: T(1.2, 7, 14, 15, 7), lat: 41.8992, lng: 12.4731 },
      { id: 'd3-pantheon',      group: 'noon',      cost: 7,  times: T(0.5, 4, 9, 7, 4),   lat: 41.8986, lng: 12.4769 },
      { id: 'd3-eustachio',     group: 'noon',      cost: 3,  times: T(0.2, 2, 4, 3, 2),   lat: 41.8977, lng: 12.4744 },
      { id: 'd3-campodefiori',  group: 'afternoon', cost: 8,  times: T(0.6, 5, 10, 8, 5),  lat: 41.8955, lng: 12.4723 },
      { id: 'd3-farnese',       group: 'afternoon', cost: 0,  times: T(0.3, 3, 6, 4, 2),   lat: 41.8953, lng: 12.4720 },
      { id: 'd3-roscioli',      group: 'evening',   cost: 45, times: T(0.7, 5, 11, 9, 5),  lat: 41.8938, lng: 12.4738 },
    ],
  },
  {
    id: 'day4',
    date: '2026-08-23',
    tab: '08-23',
    weather: { cond: 'partlyCloudy', hi: 38, lo: 24, rain: 24, windKmh: 13 },
    items: [
      { id: 'd4-borghese-gardens', group: 'morning',   cost: 0,  times: T(2.0, 9, 16, 25, 11), lat: 41.9109, lng: 12.4823 },
      { id: 'd4-galleria',         group: 'noon',      cost: 18, times: T(0.4, 3, 7, 5, 3),    lat: 41.9142, lng: 12.4923 },
      { id: 'd4-gelateria',        group: 'noon',      cost: 5,  times: T(0.9, 5, 11, 12, 6),  lat: 41.9075, lng: 12.4780 },
      { id: 'd4-popolo',           group: 'afternoon', cost: 0,  times: T(1.0, 6, 12, 13, 6),  lat: 41.9109, lng: 12.4763 },
      { id: 'd4-margutta',         group: 'evening',   cost: 38, times: T(0.5, 4, 9, 7, 4),    lat: 41.9068, lng: 12.4776 },
    ],
  },
];
