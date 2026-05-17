import { create } from 'zustand';

export interface OnboardingData {
  // Adım 1: Temel Bilgiler
  destination: string;
  startDate: string;
  endDate: string;
  arrivalTime: string;
  departureTime: string;
  budget: number;
  currencyCode: string;
  currencySymbol: string;
  peopleCount: number;

  // Adım 2: Tatil Amacı ve Tempo
  tripPurpose: string;
  pace: string;
  earlyBird: boolean;

  // Adım 3: Yeme-İçme
  dietaryRestrictions: string[];
  mealBudget: string;

  // Adım 4: Konfor ve Ulaşım
  accommodation: string;
  transport: string;
}

interface OnboardingState {
  currentStep: number;
  data: OnboardingData;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (partialData: Partial<OnboardingData>) => void;
  resetForm: () => void;
}

const defaultData: OnboardingData = {
  destination: '',
  startDate: '',
  endDate: '',
  arrivalTime: '',
  departureTime: '',
  budget: 15000,
  currencyCode: 'TRY',
  currencySymbol: '₺',
  peopleCount: 1,
  
  tripPurpose: '',
  pace: '',
  earlyBird: false,
  
  dietaryRestrictions: [],
  mealBudget: '',
  
  accommodation: '',
  transport: ''
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: 1,
  data: defaultData,
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  updateData: (partialData) => set((state) => ({ data: { ...state.data, ...partialData } })),
  resetForm: () => set({ currentStep: 1, data: defaultData })
}));
