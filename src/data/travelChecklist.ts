export interface TravelChecklistGroup {
  id: string;
  icon: string;
  items: { id: string }[];
}

export const TRAVEL_CHECKLIST: TravelChecklistGroup[] = [
  { id: 'documents', icon: 'document', items: [
    { id: 'passport' }, { id: 'visa' }, { id: 'ticket' },
    { id: 'hotel' }, { id: 'insurance' }, { id: 'emergency' },
  ] },
  { id: 'money', icon: 'credit-card', items: [
    { id: 'cash' }, { id: 'card' }, { id: 'backup' },
  ] },
  { id: 'health', icon: 'hospital', items: [
    { id: 'medicine' }, { id: 'firstaid' }, { id: 'sunscreen' }, { id: 'vaccine' },
  ] },
  { id: 'tech', icon: 'plug', items: [
    { id: 'charger' }, { id: 'powerbank' }, { id: 'simcard' },
    { id: 'offline' }, { id: 'transport' },
  ] },
  { id: 'luggage', icon: 'luggage', items: [
    { id: 'clothes' }, { id: 'shoes' }, { id: 'lock' },
    { id: 'copies' }, { id: 'notify' },
  ] },
];

export const TRAVEL_CHECKLIST_TOTAL = TRAVEL_CHECKLIST.reduce(
  (total, group) => total + group.items.length,
  0,
);

export const getTravelChecklistStorageKey = (userId: string, planId: string) =>
  `travyon-checklist-${userId || 'anonymous'}-${planId || 'default'}`;
