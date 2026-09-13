import { HttpsError } from "firebase-functions/v2/https";

const PRIVACY_KEYS = [
  "profilePublic", "plansPublic", "followPublic", "locationEnabled",
  "locationHistory", "analyticsEnabled",
] as const;
export type PrivacySettings = Record<(typeof PRIVACY_KEYS)[number], boolean>;

const record = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpsError("invalid-argument", "invalid payload");
  }
  return value as Record<string, unknown>;
};

/** Admin writes bypass rules. Never pass request.data directly into Firestore. */
export function parsePrivacySettings(value: unknown): PrivacySettings {
  const input = record(value);
  if (Object.keys(input).some((key) => !PRIVACY_KEYS.includes(key as keyof PrivacySettings)) ||
      PRIVACY_KEYS.some((key) => !Object.prototype.hasOwnProperty.call(input, key) || typeof input[key] !== "boolean")) {
    throw new HttpsError("invalid-argument", "invalid privacy settings");
  }
  if (!input.locationEnabled && input.locationHistory) {
    throw new HttpsError("invalid-argument", "location history requires location access");
  }
  // Explicit reconstruction is intentional, even after rejecting unknown keys.
  return {
    profilePublic: input.profilePublic as boolean,
    plansPublic: input.plansPublic as boolean,
    followPublic: input.followPublic as boolean,
    locationEnabled: input.locationEnabled as boolean,
    locationHistory: input.locationHistory as boolean,
    analyticsEnabled: input.analyticsEnabled as boolean,
  };
}

/** Call only after schema validation. Public documents contain a new allowlisted
 * tree: no notes, actual spending, completion state, wallet or unknown fields.
 * Stored legacy public documents require a separate reviewed migration.
 */
export function publicPlanPayload(value: unknown): Record<string, unknown> {
  const plan = record(value);
  if (!Array.isArray(plan.dailyPlans)) throw new HttpsError("invalid-argument", "invalid plan");
  const days = plan.dailyPlans.map((value) => {
    const day = record(value);
    if (!Array.isArray(day.activities)) throw new HttpsError("invalid-argument", "invalid activities");
    const activities = day.activities.map((value) => {
      const activity = record(value);
      const point = record(activity.coordinates);
      return {
        placeName: activity.placeName,
        period: activity.period,
        description: activity.description,
        coordinates: { lat: point.lat, lng: point.lng },
        estimatedCost: activity.estimatedCost,
      };
    });
    return {
      date: day.date,
      dayNumber: day.dayNumber,
      daySummary: day.daySummary,
      activities,
      totalEstimatedCost: activities.reduce((sum, activity) => sum + (activity.estimatedCost as number), 0),
    };
  });
  const result: Record<string, unknown> = {
    destination: plan.destination,
    currencySymbol: plan.currencySymbol,
    overallSummary: plan.overallSummary,
    totalEstimatedCost: days.reduce((sum, day) => sum + day.totalEstimatedCost, 0),
    dailyPlans: days,
  };
  if (plan.cityGuide !== undefined) {
    const guide = record(plan.cityGuide);
    result.cityGuide = {
      transportationTips: guide.transportationTips,
      localCustoms: guide.localCustoms,
      generalAdvice: guide.generalAdvice,
    };
  }
  return result;
}
