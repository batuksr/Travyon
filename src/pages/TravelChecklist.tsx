import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronDown, ArrowLeft, RefreshCw } from 'lucide-react';

interface CheckItem {
  id: string;
  label: string;
  tip?: string;
}

interface CheckGroup {
  title: string;
  emoji: string;
  items: CheckItem[];
}

const CHECKLIST: CheckGroup[] = [
  {
    title: 'Belgeler',
    emoji: '📄',
    items: [
      { id: 'passport',   label: 'Pasaport / Kimlik kartı',       tip: 'Geçerlilik süresini ve bitiş tarihini kontrol et.' },
      { id: 'visa',       label: 'Vize / Seyahat izni',            tip: 'Hedef ülkenin vize şartlarını önceden araştır.' },
      { id: 'ticket',     label: 'Uçuş bileti (çıktı veya dijital)', tip: 'Online check-in yaptıysan boarding pass\'i indir.' },
      { id: 'hotel',      label: 'Otel / konaklama rezervasyonu',  tip: 'Rezervasyon onayını e-posta veya ekrana kaydet.' },
      { id: 'insurance',  label: 'Seyahat sigortası',              tip: 'Poliçe numarasını telefonuna kaydet.' },
      { id: 'emergency',  label: 'Acil iletişim bilgileri',        tip: 'Büyükelçilik, yerel acil ve sigorta numaraları.' },
    ],
  },
  {
    title: 'Para & Finans',
    emoji: '💳',
    items: [
      { id: 'cash',       label: 'Nakit para (yerel para birimi)', tip: 'Havaalanı dışında değişim yapmak genellikle daha ucuz.' },
      { id: 'card',       label: 'Banka kartı yurt dışı bildirimi',tip: 'Bankanı seyahat tarih aralığın için bilgilendir.' },
      { id: 'backup',     label: 'Yedek kart / acil para',         tip: 'Çantandan ayrı bir yerde saklanan yedek tut.' },
    ],
  },
  {
    title: 'Sağlık & Güvenlik',
    emoji: '🏥',
    items: [
      { id: 'medicine',   label: 'Düzenli ilaçlar (yeterli dozda)', tip: 'Ülkeden ülkeye ilaç düzenlemeleri farklı olabilir.' },
      { id: 'firstaid',   label: 'Temel ilk yardım malzemeleri',   tip: 'Ağrı kesici, yara bandı ve antiseptik.' },
      { id: 'sunscreen',  label: 'Güneş kremi / böcek ilacı',      tip: 'Destinasyona göre SPF50+ veya DEET içeren seç.' },
      { id: 'vaccine',    label: 'Aşı / sağlık sertifikası',       tip: 'Bazı ülkeler sarı humma veya COVID belgesi ister.' },
    ],
  },
  {
    title: 'Teknoloji & Ulaşım',
    emoji: '🔌',
    items: [
      { id: 'charger',    label: 'Telefon şarj aleti & adaptör',   tip: 'Hedef ülkenin priz tipini kontrol et.' },
      { id: 'powerbank',  label: 'Taşınabilir şarj cihazı',        tip: 'Uçakta el bagajında olması gerekebilir.' },
      { id: 'simcard',    label: 'Yerel SIM veya roaming paketi',   tip: 'eSIM servisleri genelde daha uygun fiyatlı.' },
      { id: 'offline',    label: 'Çevrimdışı harita indir (Maps)',  tip: 'İnternet olmadan da rotanı takip etmek için.' },
      { id: 'transport',  label: 'Ulaşım kartı / transfer planı',  tip: 'Havaalanından şehir merkezine nasıl gideceğini planla.' },
    ],
  },
  {
    title: 'Bavul & Kişisel',
    emoji: '🧳',
    items: [
      { id: 'clothes',    label: 'Hava durumuna uygun kıyafetler', tip: 'Destinasyonun güncel hava tahminini kontrol et.' },
      { id: 'shoes',      label: 'Rahat yürüyüş ayakkabısı',       tip: 'Gezilerde günde 10-15 km yürümek sıradan.' },
      { id: 'lock',       label: 'Bagaj kilidi',                   tip: 'TSA onaylı kilit bazı ülkelerde zorunlu.' },
      { id: 'copies',     label: 'Belge kopyaları (fotoğraf/email)', tip: 'Pasaport ve bileti buluta veya e-postana kaydet.' },
      { id: 'notify',     label: 'Ev / işyerine haber ver',        tip: 'Güvendiğin biriyle seyahat planını paylaş.' },
    ],
  },
];

const TravelChecklist: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId') ?? 'default';
  const dest   = searchParams.get('dest') ?? '';
  const storageKey = `travyon-checklist-${planId}`;

  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(CHECKLIST.map(g => g.title))
  );

  const totalItems = CHECKLIST.flatMap(g => g.items).length;
  const checkedCount = checked.size;
  const progress = Math.round((checkedCount / totalItems) * 100);

  // planId değişince o plana ait kaydı yükle
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setChecked(saved ? new Set(JSON.parse(saved)) : new Set());
    } catch { setChecked(new Set()); }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...checked]));
  }, [checked, storageKey]);

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  };

  const reset = () => {
    setChecked(new Set());
    localStorage.removeItem(storageKey);
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Geri */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={15} />
          Geri
        </button>

        {/* Başlık */}
        <div className="mb-8">
          <p className="text-xs font-bold text-[#f8981d] uppercase tracking-widest mb-1">Hazırlık</p>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {dest ? `${dest} Hazırlık Listesi` : 'Seyahat Kontrol Listesi'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Yola çıkmadan önce her şeyin tamam olduğunu doğrula.
          </p>
        </div>

        {/* İlerleme */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{checkedCount}</span>
              <span className="text-slate-400 text-sm font-medium"> / {totalItems} tamamlandı</span>
            </div>
            <div className="flex items-center gap-2">
              {progress === 100 && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
                  🎉 Hazırsın!
                </span>
              )}
              <button
                onClick={reset}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                title="Sıfırla"
              >
                <RefreshCw size={12} />
                Sıfırla
              </button>
            </div>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: progress === 100
                  ? 'linear-gradient(90deg,#10b981,#34d399)'
                  : 'linear-gradient(90deg,#f8981d,#fbbf24)',
              }}
            />
          </div>
        </div>

        {/* Gruplar */}
        <div className="space-y-3">
          {CHECKLIST.map(group => {
            const isOpen = openGroups.has(group.title);
            const groupChecked = group.items.filter(i => checked.has(i.id)).length;
            const allDone = groupChecked === group.items.length;

            return (
              <div
                key={group.title}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700 overflow-hidden"
              >
                {/* Grup başlığı */}
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{group.emoji}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{group.title}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      allDone
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {groupChecked}/{group.items.length}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Maddeler */}
                {isOpen && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border-t border-slate-100 dark:border-slate-700/60">
                    {group.items.map(item => {
                      const isDone = checked.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggle(item.id)}
                          className="w-full flex items-start gap-3.5 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left group"
                        >
                          {isDone
                            ? <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                            : <Circle size={18} className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5 group-hover:text-slate-400 transition-colors" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-tight transition-colors ${
                              isDone
                                ? 'text-slate-400 line-through dark:text-slate-500'
                                : 'text-slate-700 dark:text-slate-200'
                            }`}>
                              {item.label}
                            </p>
                            {item.tip && !isDone && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                                {item.tip}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-8">
          İlerleme otomatik kaydedilir ✓
        </p>

      </div>
    </div>
  );
};

export default TravelChecklist;
