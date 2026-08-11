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
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* Geri */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors mb-8"
        >
          <ArrowLeft size={15} strokeWidth={2.5} />
          Geri
        </button>

        {/* Başlık — sage gradient kart */}
        <div className="relative overflow-hidden bg-gradient-to-br from-sage to-sage-700 rounded-[26px] p-7 sm:p-8 mb-6 text-white flex items-center justify-between gap-5">
          <div>
            <p className="text-[11px] font-heading uppercase tracking-widest text-white/80">
              {dest || 'Hazırlık'}
            </p>
            <h1 className="font-heading text-[28px] mt-2 leading-tight">
              Seyahat Listesi
            </h1>
            <p className="text-white/85 text-sm mt-1">
              {checkedCount} / {totalItems} madde tamamlandı
            </p>
          </div>
          <div className="w-[78px] h-[78px] rounded-full bg-white/18 flex items-center justify-center flex-none font-heading text-2xl">
            %{progress}
          </div>
        </div>

        {/* İlerleme çubuğu + sıfırla */}
        <div className="bg-surface rounded-3xl border border-divider p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-heading text-2xl text-text">{checkedCount}</span>
              <span className="text-muted text-sm font-medium"> / {totalItems} tamamlandı</span>
            </div>
            <div className="flex items-center gap-2">
              {progress === 100 && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  🎉 Hazırsın!
                </span>
              )}
              <button
                onClick={reset}
                className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors"
                title="Sıfırla"
              >
                <RefreshCw size={12} strokeWidth={2.5} />
                Sıfırla
              </button>
            </div>
          </div>
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: progress === 100
                  ? 'linear-gradient(90deg,#10b981,#34d399)'
                  : 'linear-gradient(90deg,#7a8a5e,#a8bb84)',
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
                className="bg-surface rounded-3xl border border-divider overflow-hidden"
              >
                {/* Grup başlığı */}
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{group.emoji}</span>
                    <span className="font-heading text-text text-sm">{group.title}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      allDone
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-surface-2 text-muted'
                    }`}>
                      {groupChecked}/{group.items.length}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Maddeler */}
                {isOpen && (
                  <div className="divide-y divide-divider border-t border-divider">
                    {group.items.map(item => {
                      const isDone = checked.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggle(item.id)}
                          className="w-full flex items-start gap-3.5 px-5 py-3.5 hover:bg-surface-2 transition-colors text-left group"
                        >
                          {isDone
                            ? <CheckCircle2 size={18} className="text-sage flex-shrink-0 mt-0.5" />
                            : <Circle size={18} className="text-divider flex-shrink-0 mt-0.5 group-hover:text-muted transition-colors" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-tight transition-colors ${
                              isDone
                                ? 'text-muted line-through'
                                : 'text-text'
                            }`}>
                              {item.label}
                            </p>
                            {item.tip && !isDone && (
                              <p className="text-xs text-muted mt-0.5 leading-relaxed">
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

        <p className="text-center text-xs text-muted mt-8">
          İlerleme otomatik kaydedilir ✓
        </p>

      </div>
    </div>
  );
};

export default TravelChecklist;
