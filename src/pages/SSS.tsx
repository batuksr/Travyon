import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowLeft } from 'lucide-react';
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

const SSS: React.FC = () => {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggle = (key: string) => setOpenItem(prev => prev === key ? null : key);

  return (
    <div className="min-h-screen bg-[#f5f0e8] dark:bg-slate-900">

      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/">
            <TravyonLogo size={36} />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Ana Sayfa
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold text-[#f8981d] uppercase tracking-widest mb-2">Yardım</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Sıkça Sorulan Sorular</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-lg">
            Travyon hakkında merak ettiğin her şeyin cevabını burada bulabilirsin.
          </p>
        </div>
      </div>

      {/* İçerik */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {FAQ_ITEMS.map((section) => (
          <div key={section.category}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#f8981d] mb-4">
              {section.category}
            </h2>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
              {section.items.map((item, i) => {
                const key = `${section.category}-${i}`;
                const isOpen = openItem === key;
                return (
                  <div key={key}>
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                    >
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 pr-4">
                        {item.q}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#f8981d]' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer mini */}
      <div className="border-t border-slate-200 dark:border-slate-800 mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>© 2026 Travyon. Tüm hakları saklıdır.</span>
          <div className="flex gap-4">
            <Link to="/gizlilik" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Gizlilik</Link>
            <Link to="/kullanim-kosullari" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Kullanım Koşulları</Link>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SSS;
