import type { DemoGroup, DemoTravelTimes } from '../../data/tripPlannerDemo';

/* Çalışma zamanı aktivite durumu — kullanıcı ekleyip/silip/kopyalayıp/sıralayabildiği için
   sabit demoPlan verisinden ayrı, React state'inde tutulan zenginleştirilmiş kopya.
   `sourceItemId` doluysa başlık/açıklama i18n'den (home.product.demo.items.<id>) okunur ve
   dil değişince otomatik güncellenir; boşsa (kullanıcının eklediği aktivite) `customTitle`/
   `customDesc` doğrudan kullanılır. */
export interface RuntimeActivity {
  uid: string;
  sourceItemId?: string;
  customTitle?: string;
  customDesc?: string;
  group: DemoGroup;
  cost: number;
  times: DemoTravelTimes;
  lat: number;
  lng: number;
}

export const GROUP_COLORS: Record<DemoGroup, { bg: string; text: string; border: string }> = {
  morning:   { bg: 'bg-amber-50',   text: 'text-amber-600',  border: 'border-amber-300' },
  noon:      { bg: 'bg-accent-100', text: 'text-accent-700', border: 'border-accent-600' },
  afternoon: { bg: 'bg-blue-50',    text: 'text-blue-600',   border: 'border-blue-300' },
  evening:   { bg: 'bg-sage-200',   text: 'text-sage-700',   border: 'border-sage' },
  night:     { bg: 'bg-surface-2',  text: 'text-muted',      border: 'border-divider' },
};
