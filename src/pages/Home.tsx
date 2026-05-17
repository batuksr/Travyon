import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { Route, Wallet, Zap, Map, ArrowRight, Sparkles, Clock, ShieldCheck, ChevronRight } from 'lucide-react';

const features = [
  {
    icon: <Route size={24} />,
    title: 'Akıllı Rota Optimizasyonu',
    desc: 'TSP algoritması ile mekanlarınızı coğrafi yakınlığa göre sıralayarak zaman ve enerji tasarrufu sağlar.',
    badge: 'Algoritma',
  },
  {
    icon: <Wallet size={24} />,
    title: 'Gerçek Zamanlı Bütçe Takibi',
    desc: 'Harcamalarınızı anlık izleyin. Bütçe aşıldığında sistem otomatik olarak tasarruf modunu devreye alır.',
    badge: 'Finans',
  },
  {
    icon: <Zap size={24} />,
    title: 'Dinamik Vibe Değişimi',
    desc: 'Planınızı tek tıkla Dinlenme, Keşif veya Tasarruf moduna çevirin. Yapay zeka anında yeni rotanızı üretir.',
    badge: 'Yapay Zeka',
  },
  {
    icon: <Map size={24} />,
    title: 'İnteraktif Harita Görünümü',
    desc: 'Google Maps üzerinde optimize edilmiş rotanızı polyline çizgileri ve işaretçilerle görselleştirin.',
    badge: 'Harita',
  },
];

const steps = [
  { num: '01', title: 'Profilinizi Oluşturun', desc: 'Bütçe, tempo, beslenme ve seyahat tercihlerinizi belirleyin.' },
  { num: '02', title: 'AI Planınızı Üretsin', desc: 'Yapay zeka, tercihlerinize göre dakika dakika optimize bir plan oluşturur.' },
  { num: '03', title: 'Keşfetmeye Başlayın', desc: 'Harita üzerinde rotanızı görün, harcamalarınızı takip edin ve planı ayarlayın.' },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleCTA = () => {
    navigate(user ? '/onboarding' : '/register');
  };

  return (
    <div className="bg-slate-50">

      {/* ═══ Hero Section ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 lg:py-40">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-400 text-xs font-semibold uppercase tracking-widest mb-6">
              <Sparkles size={12} />
              Yapay Zeka Destekli Platform
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
              Yapay Zeka ile{' '}
              <span className="text-blue-400">Seyahat Mühendisliği</span>
            </h1>

            <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-2xl">
              Bütçenizi, tempönüzü ve ilgi alanlarınızı analiz eden yapay zeka, coğrafi olarak optimize edilmiş 
              ve dakika dakika planlanmış kişisel seyahat rotanızı saniyeler içinde oluşturur.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={handleCTA}
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-all shadow-lg shadow-blue-600/20"
              >
                Hemen Planlamaya Başla
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <ShieldCheck size={16} className="text-emerald-500" />
                Ücretsiz • Kayıt ile hemen başla
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ Özellikler Grid'i ═══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Profesyonel Seyahat Araçları
          </h2>
          <p className="mt-4 text-slate-500 max-w-2xl mx-auto">
            Gelişmiş algoritmalar ve yapay zeka ile desteklenen güçlü özellikler.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div className="w-11 h-11 bg-slate-100 rounded-lg flex items-center justify-center text-slate-700 mb-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                {f.icon}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{f.badge}</span>
              <h3 className="text-base font-bold text-slate-900 mt-3 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ Nasıl Çalışır ═══ */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Nasıl Çalışır?
            </h2>
            <p className="mt-4 text-slate-500 max-w-2xl mx-auto">
              Üç basit adımda yapay zeka destekli seyahat planınızı oluşturun.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center mb-5">
                  <span className="text-white font-extrabold text-lg">{s.num}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{s.desc}</p>

                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+40px)] w-[calc(100%-80px)]">
                    <div className="w-full border-t-2 border-dashed border-slate-200 relative">
                      <ChevronRight size={16} className="absolute -right-2 -top-2 text-slate-300" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA Alt Bölüm ═══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="bg-slate-900 rounded-2xl p-10 md:p-16 flex flex-col items-center text-center">
          <Clock size={32} className="text-blue-400 mb-4" />
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
            Planlamaya dakikalar içinde başlayın
          </h2>
          <p className="text-slate-400 max-w-lg mb-8">
            Hesabınızı oluşturun, tercihlerinizi seçin ve yapay zekanın 
            sizin için mükemmel seyahat rotasını üretmesini izleyin.
          </p>
          <button
            onClick={handleCTA}
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-all"
          >
            Ücretsiz Hesap Oluştur
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;
