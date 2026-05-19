import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useOnboardingStore, type OnboardingData } from '../store/useOnboardingStore';
import { useNavigate } from 'react-router-dom';
import { generateTravelPlan } from '../services/aiService';
import { usePlanStore } from '../store/usePlanStore';
import {
  Loader2,
  Plus,
  Minus,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Plane,
  Calendar as CalendarIcon,
} from 'lucide-react';

const today = new Date().toISOString().split('T')[0];
const ALL_EATER_OPTION = 'Her Şeyi Yerim';

const ONBOARDING_STEPS = [
  { id: 1, label: 'Destinasyon' },
  { id: 2, label: 'Tercihler' },
  { id: 3, label: 'Yemek' },
  { id: 4, label: 'Konaklama' },
] as const;

const TOTAL_STEPS = ONBOARDING_STEPS.length;

const loadingMessages = [
  'Destinasyon analiz ediliyor...',
  'Rotalar optimize ediliyor...',
  'Gizli mekanlar keşfediliyor...',
  'Bütçe hesaplanıyor...',
  'Son dokunuşlar yapılıyor...',
];

const DIET_EMOJIS: Record<string, string> = {
  Vegan: '🌱',
  Vejetaryen: '🥗',
  Helal: '☪️',
  Glutensiz: '🌾',
  Pesketaryen: '🐟',
  [ALL_EATER_OPTION]: '🍽️',
};

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  emoji?: string;
  subtitle?: string;
}

const OptionCard = ({ selected, onClick, title, emoji, subtitle }: OptionCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02] flex items-center gap-3 w-full
      ${selected
        ? 'border-[#187fe7] bg-[#187fe7]/5 shadow-sm shadow-[#187fe7]/10'
        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
  >
    {emoji && (
      <span className={`text-xl shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
        ${selected ? 'bg-[#187fe7]/10' : 'bg-slate-100'}`}>
        {emoji}
      </span>
    )}
    <div className="flex-1 min-w-0">
      <p className={`font-bold text-sm ${selected ? 'text-[#187fe7]' : 'text-slate-700'}`}>
        {title}
      </p>
      {subtitle && (
        <p className="text-xs text-slate-400 mt-0.5 font-medium">{subtitle}</p>
      )}
    </div>
    {selected && (
      <div className="w-5 h-5 bg-[#187fe7] rounded-full flex items-center justify-center shrink-0">
        <Check size={11} className="text-white" />
      </div>
    )}
  </button>
);

const toggleDietaryRestriction = (diet: string, current: string[]): string[] => {
  if (diet === ALL_EATER_OPTION) {
    return current.includes(ALL_EATER_OPTION) ? [] : [ALL_EATER_OPTION];
  }

  const withoutAllEater = current.filter((d) => d !== ALL_EATER_OPTION);

  if (withoutAllEater.includes(diet)) {
    return withoutAllEater.filter((d) => d !== diet);
  }

  return [...withoutAllEater, diet];
};

const validateStep = (step: number, data: OnboardingData): string | null => {
  if (step === 1) {
    if (!data.destination.trim()) return "Lütfen bir destinasyon girin.";
    if (!data.startDate) return "Gidiş tarihi seçin.";
    if (!data.endDate) return "Dönüş tarihi seçin.";
    if (data.startDate < today) return "Gidiş tarihi bugünden önce olamaz.";
    if (data.endDate < today) return "Dönüş tarihi bugünden önce olamaz.";
    if (data.startDate >= data.endDate) return "Dönüş tarihi gidiş tarihinden sonra olmalı.";
    if (data.budget < 100) return "Bütçe en az 100 olmalı.";
  }
  if (step === 2) {
    if (!data.tripPurpose) return "Seyahat amacı seçin.";
    if (!data.pace) return "Günlük tempo seçin.";
  }
  if (step === 3) {
    if (data.dietaryRestrictions.length === 0) return "En az bir beslenme tercihi seçin.";
    if (!data.mealBudget) return "Öğün başı bütçe seçin.";
  }
  if (step === 4) {
    if (!data.accommodation) return "Konaklama tercihi seçin.";
    if (!data.transport) return "Ulaşım tercihi seçin.";
  }
  return null;
};

const validateAllSteps = (data: OnboardingData): string | null => {
  for (let step = 1; step <= TOTAL_STEPS; step++) {
    const err = validateStep(step, data);
    if (err) return err;
  }
  return null;
};

type FieldHints = {
  destination: boolean;
  startDate: boolean;
  endDate: boolean;
  budget: boolean;
  tripPurpose: boolean;
  pace: boolean;
  dietary: boolean;
  mealBudget: boolean;
  accommodation: boolean;
  transport: boolean;
};

const EMPTY_FIELD_HINTS: FieldHints = {
  destination: false,
  startDate: false,
  endDate: false,
  budget: false,
  tripPurpose: false,
  pace: false,
  dietary: false,
  mealBudget: false,
  accommodation: false,
  transport: false,
};

const getFieldHintsForStep = (step: number, data: OnboardingData): FieldHints => {
  const hints = { ...EMPTY_FIELD_HINTS };

  if (step === 1) {
    hints.destination = !data.destination.trim();
    hints.startDate =
      !data.startDate || data.startDate < today || data.startDate >= data.endDate;
    hints.endDate =
      !data.endDate || data.endDate < today || data.startDate >= data.endDate;
    hints.budget = data.budget < 100;
  }

  if (step === 2) {
    hints.tripPurpose = !data.tripPurpose;
    hints.pace = !data.pace;
  }

  if (step === 3) {
    hints.dietary = data.dietaryRestrictions.length === 0;
    hints.mealBudget = !data.mealBudget;
  }

  if (step === 4) {
    hints.accommodation = !data.accommodation;
    hints.transport = !data.transport;
  }

  return hints;
};

const getFieldHintsForAllSteps = (data: OnboardingData): FieldHints => {
  return [1, 2, 3, 4].reduce<FieldHints>(
    (merged, step) => {
      const stepHints = getFieldHintsForStep(step, data);
      return {
        destination: merged.destination || stepHints.destination,
        startDate: merged.startDate || stepHints.startDate,
        endDate: merged.endDate || stepHints.endDate,
        budget: merged.budget || stepHints.budget,
        tripPurpose: merged.tripPurpose || stepHints.tripPurpose,
        pace: merged.pace || stepHints.pace,
        dietary: merged.dietary || stepHints.dietary,
        mealBudget: merged.mealBudget || stepHints.mealBudget,
        accommodation: merged.accommodation || stepHints.accommodation,
        transport: merged.transport || stepHints.transport,
      };
    },
    { ...EMPTY_FIELD_HINTS }
  );
};

const inputBaseClass =
  'w-full px-4 py-3 rounded-xl border-2 bg-slate-50 focus:bg-white focus:border-[#187fe7] focus:ring-4 focus:ring-[#187fe7]/10 outline-none text-slate-800 font-medium placeholder:text-slate-400 transition-all duration-200';

const FieldHint = ({ show, message }: { show: boolean; message: string }) =>
  show ? <p className="mt-1.5 text-xs text-red-500 font-medium">{message}</p> : null;

const MAX_PEOPLE_COUNT = 15;

const Onboarding: React.FC = () => {
  const { currentStep, data, nextStep, prevStep, updateData } = useOnboardingStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldHints, setFieldHints] = useState<FieldHints>(EMPTY_FIELD_HINTS);
  const { setPlan } = usePlanStore();
  const navigate = useNavigate();

  useEffect(() => {
    setError(null);
    setFieldHints(EMPTY_FIELD_HINTS);
  }, [currentStep]);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleNext = () => {
    const validationError = validateStep(currentStep, data);
    if (validationError) {
      setError(validationError);
      setFieldHints(getFieldHintsForStep(currentStep, data));
      return;
    }
    setError(null);
    setFieldHints(EMPTY_FIELD_HINTS);
    nextStep();
  };

  const handlePrev = () => {
    setError(null);
    setFieldHints(EMPTY_FIELD_HINTS);
    prevStep();
  };

  const handleFinish = async () => {
    const validationError = validateAllSteps(data);
    if (validationError) {
      setError(validationError);
      setFieldHints(getFieldHintsForAllSteps(data));
      return;
    }

    try {
      setError(null);
      setFieldHints(EMPTY_FIELD_HINTS);
      setIsGenerating(true);

      let initialPlanApplied = false;
      const generatedPlan = await generateTravelPlan(data, (updatedPlan) => {
        if (initialPlanApplied) {
          setPlan(updatedPlan);
        }
      });

      setPlan(generatedPlan);
      initialPlanApplied = true;
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Plan oluşturulurken bir hata oluştu.";
      setError(message || "Plan oluşturulurken bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  const variants: Variants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3 },
    },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  };

  const currentStepMeta = ONBOARDING_STEPS[currentStep - 1];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">

      {/* ── SOL PANEL ── */}
      <div className="hidden lg:flex lg:w-5/12 lg:sticky lg:top-0 lg:h-screen relative flex-col justify-between overflow-hidden shrink-0">

        {/* Arka plan fotoğrafı */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"
            alt="Travel"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-[#187fe7]/10" />
        </div>

        {/* Üst: Logo */}
        <div className="relative z-10 p-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#f8981d] rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-lg">T</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Travyon</span>
          </div>
        </div>

        {/* Orta: Adıma özel içerik */}
        <div className="relative z-10 px-8 pb-4">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-5xl mb-4">
              {currentStep === 1 && '🌍'}
              {currentStep === 2 && '✨'}
              {currentStep === 3 && '🍽️'}
              {currentStep === 4 && '🏨'}
            </div>

            <h2 className="text-3xl font-black text-white leading-tight mb-3 whitespace-pre-line">
              {currentStep === 1 && 'Hayalindeki\nDestinasyon'}
              {currentStep === 2 && 'Seyahat\nTarzın'}
              {currentStep === 3 && 'Damak\nZevkin'}
              {currentStep === 4 && 'Konfor\nTercihin'}
            </h2>

            <p className="text-white/60 text-sm leading-relaxed">
              {currentStep === 1 && 'Nereye gideceğini ve ne kadar kalacağını söyle, gerisini biz planlayalım.'}
              {currentStep === 2 && 'Hızlı mı yavaş mı? Kültür mü macera mı? Sana özel tempo belirleyelim.'}
              {currentStep === 3 && 'Beslenme tercihlerini bilmeden mükemmel restoran öneremeyiz.'}
              {currentStep === 4 && 'Nerede kalacağın ve nasıl gezeceğin planı şekillendirir.'}
            </p>
          </motion.div>
        </div>

        {/* Alt: Adım indikatörleri */}
        <div className="relative z-10 px-8 pb-8">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1 rounded-full transition-all duration-300 ${
                  currentStep >= step ? 'bg-[#f8981d] flex-[2]' : 'bg-white/20 flex-1'
                }`}
              />
            ))}
          </div>
          <p className="text-white/40 text-xs mt-3">Adım {currentStep} / 4</p>
        </div>
      </div>

      {/* ── SAĞ PANEL ── */}
      <div className="w-full lg:w-7/12 flex flex-col bg-white min-h-screen lg:min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden">

        {/* Mobil logo */}
        <div className="lg:hidden px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#f8981d] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">T</span>
            </div>
            <span className="text-[#187fe7] font-bold text-lg tracking-tight">Travyon</span>
          </div>
        </div>

        {/* Üst stepper şeridi */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-100 shrink-0">

          {/* Stepper */}
          <div className="flex items-center gap-0 mb-6 max-w-sm">
            {ONBOARDING_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300
                    ${currentStep > step.id
                      ? 'bg-[#f8981d] text-white'
                      : currentStep === step.id
                        ? 'bg-[#f8981d] text-white ring-4 ring-[#f8981d]/20'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {currentStep > step.id ? <Check size={14} /> : step.id}
                  </div>
                  <span className={`text-[10px] font-semibold whitespace-nowrap ${
                    currentStep === step.id ? 'text-[#f8981d]' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>

                {index < ONBOARDING_STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 mb-4 transition-all duration-500 ${
                    currentStep > step.id ? 'bg-[#f8981d]' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#187fe7] to-[#f8981d] rounded-full"
              animate={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Form içeriği */}
        <div className="flex-1 px-8 py-8 relative">

          {/* Loading overlay */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white px-8 text-center"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                <div className="absolute inset-0 rounded-full border-4 border-[#187fe7] border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">✈️</div>
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-2">Planınız Hazırlanıyor</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">
                Yapay zekamız rotaları, gizli mekanları ve aktiviteleri seçiyor.
              </p>

              <div className="bg-blue-50 border border-blue-100 rounded-full px-5 py-2.5 min-w-[220px]">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingMessageIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="text-sm text-[#187fe7] font-semibold"
                  >
                    {loadingMessages[loadingMessageIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Adım başlığı + form */}
          <div aria-hidden={isGenerating || undefined}>

            <div className="mb-7">
              <p className="text-xs font-bold text-[#f8981d] uppercase tracking-widest mb-1">
                Adım {currentStep} / {TOTAL_STEPS}
              </p>
              <h2 className="text-2xl font-black text-slate-900">{currentStepMeta.label}</h2>
            </div>

            {/* Hata mesajı */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-3 p-3.5 mb-5 bg-red-50 border border-red-200 rounded-xl"
                  role="alert"
                >
                  <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-red-500 text-xs font-black">!</span>
                  </div>
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form adımları */}
            <AnimatePresence mode="wait">

              {/* ADIM 1 */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  variants={variants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Nereye seyahat ediyorsunuz?
                    </label>
                    <div className="relative">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        className={`${inputBaseClass} pl-10 ${fieldHints.destination ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}
                        placeholder="Örn. Roma, İtalya"
                        value={data.destination}
                        onChange={(e) => {
                          updateData({ destination: e.target.value });
                          setFieldHints((prev) => ({ ...prev, destination: false }));
                        }}
                      />
                    </div>
                    <FieldHint show={fieldHints.destination} message="Destinasyon girmeniz gerekiyor." />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                        <CalendarIcon size={15} className="text-[#187fe7]" />
                        Gidiş Tarihi
                      </label>
                      <input
                        type="date"
                        min={today}
                        className={`${inputBaseClass} ${fieldHints.startDate ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}
                        value={data.startDate}
                        onChange={(e) => {
                          updateData({ startDate: e.target.value });
                          setFieldHints((prev) => ({ ...prev, startDate: false }));
                        }}
                      />
                      <FieldHint show={fieldHints.startDate} message="Geçerli bir gidiş tarihi seçin." />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                        <CalendarIcon size={15} className="text-[#187fe7]" />
                        Dönüş Tarihi
                      </label>
                      <input
                        type="date"
                        min={data.startDate || today}
                        className={`${inputBaseClass} ${fieldHints.endDate ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}
                        value={data.endDate}
                        onChange={(e) => {
                          updateData({ endDate: e.target.value });
                          setFieldHints((prev) => ({ ...prev, endDate: false }));
                        }}
                      />
                      <FieldHint show={fieldHints.endDate} message="Geçerli bir dönüş tarihi seçin." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Varış Saati</label>
                      <input
                        type="time"
                        className={`${inputBaseClass} border-slate-200`}
                        value={data.arrivalTime}
                        onChange={(e) => updateData({ arrivalTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Dönüş Saati</label>
                      <input
                        type="time"
                        className={`${inputBaseClass} border-slate-200`}
                        value={data.departureTime}
                        onChange={(e) => updateData({ departureTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-8 sm:gap-10">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-4">Kişi Sayısı</label>
                      <div className="flex items-center gap-5">
                        <button
                          type="button"
                          onClick={() => updateData({ peopleCount: Math.max(1, data.peopleCount - 1) })}
                          className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-[#187fe7] hover:text-[#187fe7] transition-all duration-200"
                        >
                          <Minus size={16} />
                        </button>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-slate-900 tabular-nums">{data.peopleCount}</span>
                          <span className="text-sm text-slate-400 font-medium">kişi</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateData({ peopleCount: Math.min(MAX_PEOPLE_COUNT, data.peopleCount + 1) })}
                          className="w-10 h-10 rounded-full border-2 border-[#187fe7] flex items-center justify-center text-[#187fe7] hover:bg-blue-50 transition-all duration-200"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 w-full min-w-0">
                      <label className="block text-sm font-bold text-slate-700 mb-4">Toplam Bütçe</label>
                      <div className={`flex rounded-xl overflow-hidden border-2 focus-within:border-[#187fe7] focus-within:ring-4 focus-within:ring-[#187fe7]/10 transition-all ${fieldHints.budget ? 'border-red-300' : 'border-slate-200'}`}>
                        <input
                          type="number"
                          min="100"
                          className="flex-1 px-4 py-3 border-0 outline-none text-slate-800 font-medium bg-slate-50 focus:bg-white placeholder:text-slate-400 transition-all"
                          placeholder="15000"
                          value={data.budget === 0 ? '' : data.budget}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              updateData({ budget: 0 });
                              return;
                            }
                            const num = parseInt(val, 10);
                            if (!isNaN(num)) {
                              updateData({ budget: num });
                              setFieldHints((prev) => ({ ...prev, budget: false }));
                            }
                          }}
                        />
                        <select
                          className="px-3 py-3 border-l-2 border-slate-200 bg-slate-100 text-slate-700 font-semibold cursor-pointer outline-none focus:bg-white text-sm"
                          value={data.currencyCode}
                          onChange={(e) => {
                            const code = e.target.value;
                            const symbols: Record<string, string> = {
                              TRY: '₺', USD: '$', EUR: '€', GBP: '£',
                            };
                            updateData({ currencyCode: code, currencySymbol: symbols[code] || '₺' });
                          }}
                        >
                          <option value="TRY">TRY</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                        </select>
                      </div>
                      <FieldHint show={fieldHints.budget} message="Bütçe en az 100 olmalıdır." />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ADIM 2 */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  variants={variants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-7"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Seyahat Amacı</label>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl transition-shadow ${fieldHints.tripPurpose ? 'ring-2 ring-red-300 p-1 -m-1' : ''}`}>
                      <OptionCard
                        emoji="🏛️"
                        selected={data.tripPurpose === 'culture'}
                        onClick={() => { updateData({ tripPurpose: 'culture' }); setFieldHints((p) => ({ ...p, tripPurpose: false })); }}
                        title="Kültür & Tarih"
                        subtitle="Müzeler, tarihi mekanlar"
                      />
                      <OptionCard
                        emoji="😴"
                        selected={data.tripPurpose === 'relax'}
                        onClick={() => { updateData({ tripPurpose: 'relax' }); setFieldHints((p) => ({ ...p, tripPurpose: false })); }}
                        title="Dinlenme"
                        subtitle="Spa, sahil, yavaş tempo"
                      />
                      <OptionCard
                        emoji="🌙"
                        selected={data.tripPurpose === 'nightlife'}
                        onClick={() => { updateData({ tripPurpose: 'nightlife' }); setFieldHints((p) => ({ ...p, tripPurpose: false })); }}
                        title="Gece Hayatı"
                        subtitle="Bar, kulüp, canlı müzik"
                      />
                      <OptionCard
                        emoji="🏔️"
                        selected={data.tripPurpose === 'nature'}
                        onClick={() => { updateData({ tripPurpose: 'nature' }); setFieldHints((p) => ({ ...p, tripPurpose: false })); }}
                        title="Doğa & Macera"
                        subtitle="Trekking, doğa yürüyüşü"
                      />
                    </div>
                    <FieldHint show={fieldHints.tripPurpose} message="Bir seyahat amacı seçin." />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Günlük Tempo</label>
                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl transition-shadow ${fieldHints.pace ? 'ring-2 ring-red-300 p-1 -m-1' : ''}`}>
                      <OptionCard
                        emoji="🐢"
                        selected={data.pace === 'yavaş'}
                        onClick={() => { updateData({ pace: 'yavaş' }); setFieldHints((p) => ({ ...p, pace: false })); }}
                        title="Yavaş"
                        subtitle="Günde 2-3 aktivite"
                      />
                      <OptionCard
                        emoji="⚖️"
                        selected={data.pace === 'orta'}
                        onClick={() => { updateData({ pace: 'orta' }); setFieldHints((p) => ({ ...p, pace: false })); }}
                        title="Orta"
                        subtitle="Günde 4-5 aktivite"
                      />
                      <OptionCard
                        emoji="🔥"
                        selected={data.pace === 'yoğun'}
                        onClick={() => { updateData({ pace: 'yoğun' }); setFieldHints((p) => ({ ...p, pace: false })); }}
                        title="Yoğun"
                        subtitle="Günde 6+ aktivite"
                      />
                    </div>
                    <FieldHint show={fieldHints.pace} message="Günlük tempo seçin." />
                  </div>

                  <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 bg-slate-50 cursor-pointer hover:border-slate-300 transition-colors">
                    <input
                      type="checkbox"
                      id="earlyBird"
                      className="w-5 h-5 rounded border-slate-300 text-[#187fe7] focus:ring-[#187fe7]"
                      checked={data.earlyBird}
                      onChange={(e) => updateData({ earlyBird: e.target.checked })}
                    />
                    <span className="text-sm text-slate-700 font-semibold">Erken kalkmayı severim</span>
                  </label>
                </motion.div>
              )}

              {/* ADIM 3 */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  variants={variants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-7"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Beslenme Tercihleri</label>
                    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl transition-shadow ${fieldHints.dietary ? 'ring-2 ring-red-300 p-1 -m-1' : ''}`}>
                      {['Vegan', 'Vejetaryen', 'Helal', 'Glutensiz', 'Pesketaryen', ALL_EATER_OPTION].map((diet) => (
                        <OptionCard
                          key={diet}
                          emoji={DIET_EMOJIS[diet]}
                          selected={data.dietaryRestrictions.includes(diet)}
                          onClick={() => {
                            updateData({ dietaryRestrictions: toggleDietaryRestriction(diet, data.dietaryRestrictions) });
                            setFieldHints((p) => ({ ...p, dietary: false }));
                          }}
                          title={diet}
                        />
                      ))}
                    </div>
                    <FieldHint show={fieldHints.dietary} message="En az bir beslenme tercihi seçin." />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Öğün Başı Bütçe</label>
                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl transition-shadow ${fieldHints.mealBudget ? 'ring-2 ring-red-300 p-1 -m-1' : ''}`}>
                      <OptionCard
                        emoji="💵"
                        selected={data.mealBudget === 'low'}
                        onClick={() => { updateData({ mealBudget: 'low' }); setFieldHints((p) => ({ ...p, mealBudget: false })); }}
                        title="$ Düşük"
                      />
                      <OptionCard
                        emoji="💵💵"
                        selected={data.mealBudget === 'medium'}
                        onClick={() => { updateData({ mealBudget: 'medium' }); setFieldHints((p) => ({ ...p, mealBudget: false })); }}
                        title="$$ Orta"
                      />
                      <OptionCard
                        emoji="💵💵💵"
                        selected={data.mealBudget === 'high'}
                        onClick={() => { updateData({ mealBudget: 'high' }); setFieldHints((p) => ({ ...p, mealBudget: false })); }}
                        title="$$$ Yüksek"
                      />
                    </div>
                    <FieldHint show={fieldHints.mealBudget} message="Öğün başı bütçe seçin." />
                  </div>
                </motion.div>
              )}

              {/* ADIM 4 */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  variants={variants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-7"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Konaklama Tercihi</label>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl transition-shadow ${fieldHints.accommodation ? 'ring-2 ring-red-300 p-1 -m-1' : ''}`}>
                      <OptionCard
                        emoji="🏨"
                        selected={data.accommodation === 'hotel'}
                        onClick={() => { updateData({ accommodation: 'hotel' }); setFieldHints((prev) => ({ ...prev, accommodation: false })); }}
                        title="Otel"
                        subtitle="Konforlu, tam servis"
                      />
                      <OptionCard
                        emoji="🏠"
                        selected={data.accommodation === 'airbnb'}
                        onClick={() => { updateData({ accommodation: 'airbnb' }); setFieldHints((prev) => ({ ...prev, accommodation: false })); }}
                        title="Airbnb / Ev"
                        subtitle="Yerel deneyim"
                      />
                      <OptionCard
                        emoji="🛏️"
                        selected={data.accommodation === 'hostel'}
                        onClick={() => { updateData({ accommodation: 'hostel' }); setFieldHints((prev) => ({ ...prev, accommodation: false })); }}
                        title="Hostel"
                        subtitle="Sosyal, ekonomik"
                      />
                      <OptionCard
                        emoji="🌴"
                        selected={data.accommodation === 'resort'}
                        onClick={() => { updateData({ accommodation: 'resort' }); setFieldHints((prev) => ({ ...prev, accommodation: false })); }}
                        title="Tatil Köyü / Resort"
                        subtitle="Her şey dahil"
                      />
                    </div>
                    <FieldHint show={fieldHints.accommodation} message="Lütfen bir konaklama tercihi seçin." />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Şehir İçi Ulaşım Tercihi</label>
                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl transition-shadow ${fieldHints.transport ? 'ring-2 ring-red-300 p-1 -m-1' : ''}`}>
                      <OptionCard
                        emoji="🚇"
                        selected={data.transport === 'public'}
                        onClick={() => { updateData({ transport: 'public' }); setFieldHints((prev) => ({ ...prev, transport: false })); }}
                        title="Toplu Taşıma"
                        subtitle="Metro, otobüs"
                      />
                      <OptionCard
                        emoji="🚶"
                        selected={data.transport === 'walk'}
                        onClick={() => { updateData({ transport: 'walk' }); setFieldHints((prev) => ({ ...prev, transport: false })); }}
                        title="Yürüyüş Rotası"
                        subtitle="Yürüme mesafesi"
                      />
                      <OptionCard
                        emoji="🚕"
                        selected={data.transport === 'taxi'}
                        onClick={() => { updateData({ transport: 'taxi' }); setFieldHints((prev) => ({ ...prev, transport: false })); }}
                        title="Taksi / Uber"
                        subtitle="Kapıdan kapıya"
                      />
                    </div>
                    <FieldHint show={fieldHints.transport} message="Lütfen bir ulaşım tercihi seçin." />
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Footer navigasyon */}
        <div className="shrink-0 px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-between">

          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 font-semibold rounded-xl text-sm transition-all"
            >
              <ChevronLeft size={16} />
              Geri
            </button>
          ) : <div />}

          {/* Orta: step dots */}
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`rounded-full transition-all duration-300 ${
                  currentStep === s
                    ? 'w-5 h-2 bg-[#187fe7]'
                    : currentStep > s
                      ? 'w-2 h-2 bg-[#187fe7]/40'
                      : 'w-2 h-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#f8981d] hover:bg-[#e08518] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#f8981d]/25 hover:-translate-y-px"
            >
              İleri
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isGenerating}
              className={`inline-flex items-center gap-2 px-6 py-2.5 font-bold rounded-xl text-sm transition-all ${
                isGenerating
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#187fe7] hover:bg-[#156bc2] text-white shadow-lg shadow-[#187fe7]/25 hover:-translate-y-px'
              }`}
            >
              {isGenerating ? (
                <><Loader2 size={16} className="animate-spin" /> Planlanıyor</>
              ) : (
                <><Plane size={16} /> Planı Oluştur</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
