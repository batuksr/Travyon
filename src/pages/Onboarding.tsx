import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useNavigate } from 'react-router-dom';
import { generateTravelPlan } from '../services/aiService';
import { usePlanStore } from '../store/usePlanStore';
import { Loader2, Plus, Minus } from 'lucide-react';

const Onboarding: React.FC = () => {
  const { currentStep, data, nextStep, prevStep, updateData } = useOnboardingStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const { setPlan } = usePlanStore();
  const navigate = useNavigate();

  const handleFinish = async () => {
    try {
      setIsGenerating(true);
      const generatedPlan = await generateTravelPlan(data);
      setPlan(generatedPlan);
      navigate('/dashboard');
    } catch (error: any) {
      alert(error.message || "Plan oluşturulurken bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  const variants: Variants = {
    hidden: { opacity: 0, x: 20 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { duration: 0.3 }
    },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  };

  const OptionCard = ({ selected, onClick, title }: any) => (
    <button
      onClick={onClick}
      className={`p-4 border text-center transition-colors ${
        selected 
        ? 'border-[#187fe7] text-[#187fe7] bg-blue-50/30' 
        : 'border-gray-300 text-gray-600 bg-white hover:border-gray-400'
      } rounded`}
    >
      <span className="font-medium text-sm">{title}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop')] bg-cover bg-center flex items-center justify-center p-4">
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="max-w-2xl w-full bg-white rounded shadow-2xl overflow-hidden relative z-10 flex flex-col mt-4 mb-4">
        
        {/* Header */}
        <div className="bg-[#f8981d] py-6 text-center">
          <h1 className="text-3xl text-white font-medium tracking-wide">Seyahatimi Planla!</h1>
        </div>
        
        {/* Stepper */}
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {[1, 2, 3, 4].map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white ${currentStep >= step ? 'bg-[#187fe7]' : 'bg-[#a3a3a3]'}`}>
                    {step}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${currentStep >= step ? 'text-gray-900' : 'text-gray-500'}`}>Adım {step}</span>
                </div>
                {index < 3 && (
                  <div className={`flex-1 h-px mx-2 sm:mx-4 ${currentStep > step ? 'bg-[#187fe7]' : 'bg-gray-200'}`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {/* ADIM 1 */}
            {currentStep === 1 && (
              <motion.div key="step1" variants={variants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                <div>
                  <label className="block text-[15px] font-medium text-gray-900 mb-2">Nereye Seyahat Ediyorsunuz?</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded border border-gray-300 focus:border-[#187fe7] focus:ring-1 focus:ring-[#187fe7] outline-none text-gray-700"
                    placeholder="Gideceğiniz yeri girin"
                    value={data.destination}
                    onChange={(e) => updateData({ destination: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[15px] font-medium text-gray-900 mb-2">Gidiş Tarihi</label>
                    <input 
                      type="date" 
                      className="w-full p-3 rounded border border-gray-300 focus:border-[#187fe7] focus:ring-1 focus:ring-[#187fe7] outline-none text-gray-700"
                      value={data.startDate}
                      onChange={(e) => updateData({ startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[15px] font-medium text-gray-900 mb-2">Dönüş Tarihi</label>
                    <input 
                      type="date" 
                      className="w-full p-3 rounded border border-gray-300 focus:border-[#187fe7] focus:ring-1 focus:ring-[#187fe7] outline-none text-gray-700"
                      value={data.endDate}
                      onChange={(e) => updateData({ endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[15px] font-medium text-gray-900 mb-2">Varış Saati</label>
                    <input 
                      type="time" 
                      className="w-full p-3 rounded border border-gray-300 focus:border-[#187fe7] focus:ring-1 focus:ring-[#187fe7] outline-none text-gray-700"
                      value={data.arrivalTime}
                      onChange={(e) => updateData({ arrivalTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[15px] font-medium text-gray-900 mb-2">Dönüş Saati</label>
                    <input 
                      type="time" 
                      className="w-full p-3 rounded border border-gray-300 focus:border-[#187fe7] focus:ring-1 focus:ring-[#187fe7] outline-none text-gray-700"
                      value={data.departureTime}
                      onChange={(e) => updateData({ departureTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
                  <div>
                    <label className="block text-[15px] font-medium text-gray-900 mb-3">Kişi Sayısı</label>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => updateData({ peopleCount: Math.max(1, data.peopleCount - 1) })}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 hover:border-[#187fe7] hover:text-[#187fe7] transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-lg font-medium w-4 text-center text-gray-700">{data.peopleCount}</span>
                      <button 
                        onClick={() => updateData({ peopleCount: data.peopleCount + 1 })}
                        className="w-8 h-8 rounded-full border border-[#187fe7] flex items-center justify-center text-[#187fe7] hover:bg-blue-50 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 w-full">
                    <label className="block text-[15px] font-medium text-gray-900 mb-3">Toplam Bütçe</label>
                    <div className="flex">
                      <input 
                        type="number" min="100"
                        className="w-full p-3 rounded-l border border-gray-300 border-r-0 focus:border-[#187fe7] focus:ring-1 focus:ring-[#187fe7] outline-none text-gray-700"
                        value={data.budget}
                        onChange={(e) => updateData({ budget: parseInt(e.target.value) || 0 })}
                      />
                      <select 
                        className="w-20 p-3 rounded-r border border-gray-300 bg-white focus:border-[#187fe7] focus:ring-1 focus:ring-[#187fe7] outline-none text-gray-700 cursor-pointer"
                        value={data.currencyCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          const symbols: Record<string, string> = { 'TRY': '₺', 'USD': '$', 'EUR': '€', 'GBP': '£' };
                          updateData({ currencyCode: code, currencySymbol: symbols[code] || '₺' });
                        }}
                      >
                        <option value="TRY">TRY</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ADIM 2 */}
            {currentStep === 2 && (
              <motion.div key="step2" variants={variants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                <div>
                  <label className="block text-[15px] font-medium text-gray-900 mb-3">Seyahat Amacı</label>
                  <div className="grid grid-cols-2 gap-4">
                    <OptionCard selected={data.tripPurpose === 'culture'} onClick={() => updateData({ tripPurpose: 'culture' })} title="Kültür & Tarih" />
                    <OptionCard selected={data.tripPurpose === 'relax'} onClick={() => updateData({ tripPurpose: 'relax' })} title="Dinlenme" />
                    <OptionCard selected={data.tripPurpose === 'nightlife'} onClick={() => updateData({ tripPurpose: 'nightlife' })} title="Gece Hayatı" />
                    <OptionCard selected={data.tripPurpose === 'nature'} onClick={() => updateData({ tripPurpose: 'nature' })} title="Doğa & Macera" />
                  </div>
                </div>

                <div>
                  <label className="block text-[15px] font-medium text-gray-900 mb-3">Günlük Tempo</label>
                  <div className="grid grid-cols-3 gap-4">
                    {['Yavaş', 'Orta', 'Yoğun'].map((paceOption) => (
                      <OptionCard 
                        key={paceOption}
                        selected={data.pace === paceOption.toLowerCase()} 
                        onClick={() => updateData({ pace: paceOption.toLowerCase() })} 
                        title={paceOption} 
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <input 
                    type="checkbox" 
                    id="earlyBird"
                    className="w-5 h-5 border-gray-300 rounded text-[#187fe7] focus:ring-[#187fe7]"
                    checked={data.earlyBird} 
                    onChange={(e) => updateData({ earlyBird: e.target.checked })} 
                  />
                  <label htmlFor="earlyBird" className="text-[15px] text-gray-700 cursor-pointer">
                    Erken kalkmayı severim
                  </label>
                </div>
              </motion.div>
            )}

            {/* ADIM 3 */}
            {currentStep === 3 && (
              <motion.div key="step3" variants={variants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                <div>
                  <label className="block text-[15px] font-medium text-gray-900 mb-3">Beslenme Tercihleri</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {['Vegan', 'Vejetaryen', 'Helal', 'Glutensiz', 'Pesketaryen', 'Her Şeyi Yerim'].map((diet) => {
                      const isSelected = data.dietaryRestrictions.includes(diet);
                      return (
                        <OptionCard 
                          key={diet}
                          selected={isSelected} 
                          onClick={() => {
                            if (diet === 'Her Şeyi Yerim') {
                              updateData({ dietaryRestrictions: ['Her Şeyi Yerim'] });
                            } else {
                              const newDiets = data.dietaryRestrictions.includes('Her Şeyi Yerim') ? [] : [...data.dietaryRestrictions];
                              if (isSelected) {
                                updateData({ dietaryRestrictions: newDiets.filter(d => d !== diet) });
                              } else {
                                updateData({ dietaryRestrictions: [...newDiets, diet] });
                              }
                            }
                          }}
                          title={diet} 
                        />
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[15px] font-medium text-gray-900 mb-3">Öğün Başı Bütçe</label>
                  <div className="grid grid-cols-3 gap-4">
                    <OptionCard selected={data.mealBudget === 'low'} onClick={() => updateData({ mealBudget: 'low' })} title="$ Düşük" />
                    <OptionCard selected={data.mealBudget === 'medium'} onClick={() => updateData({ mealBudget: 'medium' })} title="$$ Orta" />
                    <OptionCard selected={data.mealBudget === 'high'} onClick={() => updateData({ mealBudget: 'high' })} title="$$$ Yüksek" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ADIM 4 */}
            {currentStep === 4 && (
              <motion.div key="step4" variants={variants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                <div>
                  <label className="block text-[15px] font-medium text-gray-900 mb-3">Konaklama Tercihi</label>
                  <div className="grid grid-cols-2 gap-4">
                    <OptionCard selected={data.accommodation === 'hotel'} onClick={() => updateData({ accommodation: 'hotel' })} title="Otel" />
                    <OptionCard selected={data.accommodation === 'airbnb'} onClick={() => updateData({ accommodation: 'airbnb' })} title="Airbnb / Ev" />
                    <OptionCard selected={data.accommodation === 'hostel'} onClick={() => updateData({ accommodation: 'hostel' })} title="Hostel" />
                    <OptionCard selected={data.accommodation === 'resort'} onClick={() => updateData({ accommodation: 'resort' })} title="Tatil Köyü / Resort" />
                  </div>
                </div>

                <div>
                  <label className="block text-[15px] font-medium text-gray-900 mb-3">Şehir İçi Ulaşım Tercihi</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <OptionCard selected={data.transport === 'public'} onClick={() => updateData({ transport: 'public' })} title="Toplu Taşıma" />
                    <OptionCard selected={data.transport === 'walk'} onClick={() => updateData({ transport: 'walk' })} title="Yürüyüş Rotası" />
                    <OptionCard selected={data.transport === 'taxi'} onClick={() => updateData({ transport: 'taxi' })} title="Taksi / Uber" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="px-8 py-6 border-t border-gray-100 flex justify-between bg-white">
          {currentStep > 1 ? (
            <button 
              onClick={prevStep}
              className="px-6 py-2.5 rounded text-[15px] font-medium text-gray-600 hover:bg-gray-50 border border-gray-300 transition-colors"
            >
              Geri
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < 4 ? (
            <button 
              onClick={nextStep}
              className="px-8 py-2.5 rounded bg-[#f8981d] text-white text-[15px] font-medium hover:bg-[#e08518] transition-colors"
            >
              İleri
            </button>
          ) : (
            <button 
              onClick={handleFinish}
              disabled={isGenerating}
              className={`px-8 py-2.5 rounded text-white text-[15px] font-medium flex items-center gap-2 transition-colors ${
                isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#187fe7] hover:bg-[#156bc2]'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Planlanıyor...
                </>
              ) : (
                "Planı Oluştur"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
