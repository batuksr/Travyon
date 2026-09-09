import { describe, expect, it } from 'vitest';
import {
  TRAVEL_CHECKLIST,
  TRAVEL_CHECKLIST_TOTAL,
  getTravelChecklistStorageKey,
} from '../src/data/travelChecklist';

describe('travel checklist data shared with the Hub', () => {
  it('keeps every checklist item unique and included in the total', () => {
    const ids = TRAVEL_CHECKLIST.flatMap(group => group.items.map(item => item.id));
    expect(ids).toHaveLength(TRAVEL_CHECKLIST_TOTAL);
    expect(new Set(ids).size).toBe(TRAVEL_CHECKLIST_TOTAL);
    expect(TRAVEL_CHECKLIST_TOTAL).toBe(23);
  });

  it('isolates checklist progress by user and plan', () => {
    expect(getTravelChecklistStorageKey('user-1', 'plan-2'))
      .toBe('travyon-checklist-user-1-plan-2');
  });
});
