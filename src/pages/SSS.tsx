import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TravyonLogo from '../components/TravyonLogo';

const FAQ_ITEMS = [
  {
    category: 'Genel',
    items: [
      {
        q: 'Travyon nedir?',
        a: 'Travyon, yapay zeka destekli kişiselleştirilmiş seyahat planlama platformudur. Bütçen, tarih aralığın ve seyahat tarzına göre dakikalar içinde gün gün optimize edilmiş plan oluşturur.',
      },
      {
        q: 'Ücretsiz mi kullanabilir miyim?',
        a: 'Evet! Free planla sınırsız süre ücretsiz kullanabilirsin. 3 plan hakkı, temel AI planlama ve interaktif harita erişimi dahildir.',
      },
      {
        q: 'Hesap açmak zorunlu mu?',
        a: 'Plan oluşturmak ve kaydetmek için hesap gereklidir. Kayıt işlemi yalnızca birkaç saniye sürer ve tamamen ücretsizdir.',
      },
    ],
  },
  {
    category: 'Plan Oluşturma',
    items: [
      {
        q: 'Plan oluşturmak ne kadar sürer?',
        a: 'Ortalama 15–30 saniye. Yapay zeka tercihlerini analiz ederek coğrafi olarak optimize edilmiş, gün gün planını anında hazırlar.',
      },
      {
        q: 'Hangi şehirler destekleniyor?',
        a: 'Dünya genelinde 50+ popüler şehir destekleniyor ve liste sürekli büyüyor. İstanbul, Paris, Tokyo, Roma, Barcelona, New York gibi tüm popüler destinasyonları kapsıyoruz.',
      },
      {
        q: 'Önerileri değiştirebilir miyim?',
        a: 'Tabii! Planı oluşturduktan sonra her aktiviteyi, saati ve güzergahı dilediğin gibi düzenleyebilirsin. Plan tamamen senin kontrolünde.',
      },
      {
        q: 'Birden fazla plan kaydedebilir miyim?',
        a: 'Free planla 3, Pro planla sınırsız plan kaydedebilirsin. Kayıtlı planlarına her zaman "Kayıtlı Planlar" bölümünden erişebilirsin.',
      },
    ],
  },
  {
    category: 'Güvenlik & Gizlilik',
    items: [
      {
        q: 'Verilerim güvende mi?',
        a: 'Tüm veriler Google Firebase altyapısıyla AES-256 şifreleme ile saklanır. Kişisel bilgilerin hiçbir koşulda üçüncü taraflarla paylaşılmaz.',
      },
      {
        q: 'Hesabımı silebilir miyim?',
        a: 'Evet, Ayarlar > Hesap bölümünden hesabını ve tüm verilerini kalıcı olarak silebilirsin.',
      },
    ],
  },
  {
    category: 'Teknik',
    items: [
      {
        q: 'Mobil uygulama var mı?',
        a: 'Şu an web tabanlı çalışıyoruz. Mobil uygulama (iOS & Android) yakında geliyor — bildirim almak için kayıt olabilirsin.',
      },
      {
        q: 'Hangi tarayıcılar destekleniyor?',
        a: 'Chrome, Firefox, Safari ve Edge\'in güncel sürümlerinde sorunsuz çalışır. En iyi deneyim için Chrome önerilir.',
      },
      {
        q: 'İnternet bağlantısı şart mı?',
        a: 'Plan oluşturma ve harita görüntüleme için internet bağlantısı gereklidir. Kayıtlı planlarını çevrimdışı görüntülemek için yakında offline destek eklenecek.',
      },
    ],
  },
];

const TABS = [
  { to: '/sss', label: 'SSS' },
  { to: '/gizlilik', label: 'Gizlilik' },
  { to: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
  { to: '/iletisim', label: 'İletişim' },
];

const PageTabs: React.FC<{ active: string }> = ({ active }) => (
  <div className="flex gap-1.5 flex-wrap justify-center bg-surface-2 p-[5px] rounded-full w-fit mx-auto mt-6">
    {TABS.map(t => (
      <Link
        key={t.to}
        to={t.to}
        className={`font-heading text-sm px-5 py-2.5 rounded-full whitespace-nowrap transition-colors ${
          active === t.to ? 'bg-accent text-white' : 'text-muted hover:text-text'
        }`}
      >
        {t.label}
      </Link>
    ))}
  </div>
);

const SSS: React.FC = () => {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggle = (key: string) => setOpenItem(prev => prev === key ? null : key);

  return (
    <div className="min-h-screen bg-bg">

      {/* Header */}
      <header className="bg-surface border-b border-divider sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-[74px] flex items-center justify-between">
          <Link to="/">
            <TravyonLogo size={36} />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-text bg-surface-2 border border-divider rounded-full px-4 py-2.5 hover:bg-surface transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            Ana Sayfa
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="text-center py-10 sm:py-12 px-4 sm:px-6">
        <p className="text-xs font-heading text-accent-700 uppercase tracking-widest mb-2">Yardım & Yasal</p>
        <h1 className="font-heading text-3xl sm:text-4xl text-text">Sıkça Sorulan Sorular</h1>
        <p className="text-muted mt-3.5 text-sm max-w-lg mx-auto">
          Aklına takılanların yanıtı burada. Bulamazsan bize yazabilirsin.
        </p>
        <PageTabs active="/sss" />
      </div>

      {/* İçerik */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {FAQ_ITEMS.map((section) => (
          <div key={section.category}>
            <h2 className="text-xs font-heading uppercase tracking-widest text-accent mb-4">
              {section.category}
            </h2>
            <div className="flex flex-col gap-2.5">
              {section.items.map((item, i) => {
                const key = `${section.category}-${i}`;
                const isOpen = openItem === key;
                return (
                  <div key={key} className="bg-surface border border-divider rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-2 transition-colors group"
                    >
                      <span className="font-heading text-[15.5px] text-text pr-4">
                        {item.q}
                      </span>
                      <span className={`shrink-0 text-accent text-lg transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>+</span>
                    </button>
                    {isOpen && (
                      <p className="px-5 pb-[18px] text-[14.5px] text-muted leading-relaxed">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer mini */}
      <footer className="border-t border-divider mt-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-[22px] flex flex-wrap items-center justify-between gap-3">
          <TravyonLogo size={28} />
          <span className="text-xs text-muted">© 2026 Travyon. Tüm hakları saklıdır.</span>
        </div>
      </footer>

    </div>
  );
};

export default SSS;
