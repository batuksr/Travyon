import React from 'react';
import { usePlanStore } from '../store/usePlanStore';
import { useNavigate } from 'react-router-dom';
import { Navigation, Calendar, Bus, Users, Lightbulb } from 'lucide-react';
import DailyPlanView from '../components/DailyPlanView';
import MapView from '../components/MapView';
import BudgetWidget from '../components/BudgetWidget';



const Dashboard: React.FC = () => {
  const { plan } = usePlanStore();
  const navigate = useNavigate();

  if (!plan) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-4">
          <Navigation size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Henüz Bir Plan Oluşturmadınız</h2>
        <p className="text-slate-500 mb-6 text-center max-w-sm text-sm">Yapay zeka ile kendinize özel, coğrafi olarak optimize edilmiş bir seyahat planı oluşturun.</p>
        <button
          onClick={() => navigate('/onboarding')}
          className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors"
        >
          Hemen Plan Oluştur
        </button>
      </div>
    );
  }

  const [activeDayIndex, setActiveDayIndex] = React.useState(0);
  const activeDayActivities = plan.dailyPlans[activeDayIndex]?.activities || [];

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 overflow-x-hidden font-sans">
      {/* Şehir Başlığı */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-16 pb-12">
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
          {plan.destination}
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto font-medium leading-relaxed">
          {plan.overallSummary}
        </p>
      </div>

      {/* İçerik Container (Glassmorphism kartları sarmalar) */}
      <div className="max-w-[1440px] mx-auto relative z-10 pb-20">
        
        {/* Yeni Plan Butonu */}
        <div className="px-6 lg:px-8 mb-6 flex justify-end">
          <button
            onClick={() => navigate('/onboarding')}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold text-sm transition-all shadow-sm"
          >
            + Yeni Plan
          </button>
        </div>

        {/* Bütçe Widget */}
        <div className="px-6 lg:px-8 mb-8">
          <div className="bg-white shadow-sm border border-slate-200 rounded-2xl">
            <BudgetWidget />
          </div>
        </div>

        {/* Şehir Rehberi Paneli */}
        {plan.cityGuide && (
          <div className="px-6 lg:px-8 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={20} className="text-slate-400" />
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Şehir Rehberi & Tüyolar</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Ulaşım */}
              <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Bus size={20} />
                  </div>
                  <span className="font-bold text-sm text-slate-800 uppercase tracking-wider">Ulaşım</span>
                </div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {plan.cityGuide.transportationTips}
                </p>
              </div>
              {/* Yerel Kültür */}
              <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <span className="font-bold text-sm text-slate-800 uppercase tracking-wider">Yerel Kültür</span>
                </div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {plan.cityGuide.localCustoms}
                </p>
              </div>
              {/* Önemli Bilgiler */}
              <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Lightbulb size={20} />
                  </div>
                  <span className="font-bold text-sm text-slate-800 uppercase tracking-wider">Faydalı Bilgiler</span>
                </div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {plan.cityGuide.generalAdvice}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Ana İçerik: 2 Sütunlu Grid */}
        <div className="px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sol Sütun: Gün Sekmeleri ve Plan */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
            {/* Gün Sekmeleri */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {plan.dailyPlans.map((day, index) => (
                <button
                  key={day.dayNumber}
                  onClick={() => setActiveDayIndex(index)}
                  className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-left transition-all shrink-0 min-w-[140px] ${
                    activeDayIndex === index
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                    activeDayIndex === index ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {day.dayNumber}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${activeDayIndex === index ? 'text-white' : 'text-slate-900'}`}>
                      {day.dayNumber}. Gün
                    </p>
                    <p className={`text-xs ${activeDayIndex === index ? 'text-slate-300' : 'text-slate-500'}`}>
                      {day.date}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Seçili Gün Planı */}
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <Calendar size={18} className="text-slate-400" />
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {plan.dailyPlans[activeDayIndex]?.dayNumber}. Gün Planı
                </h3>
              </div>
              <DailyPlanView day={plan.dailyPlans[activeDayIndex]} />
            </div>
          </div>

          {/* Sağ Sütun: Harita */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-6">
              <div className="h-[500px] lg:h-[calc(100vh-120px)] rounded-3xl overflow-hidden shadow-sm bg-white border border-slate-200">
                <MapView activities={activeDayActivities} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
