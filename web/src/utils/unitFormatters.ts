const KM_TO_MILES = 0.6213711922;

const localeFor = (language: string): string =>
  language.startsWith('en') ? 'en-US' : 'tr-TR';

export const formatUnitNumber = (
  value: number,
  language: string,
  maximumFractionDigits = 1,
): string => new Intl.NumberFormat(localeFor(language), {
  minimumFractionDigits: 0,
  maximumFractionDigits,
}).format(value);

export const formatDistanceKm = (
  kilometers: number,
  distanceKm: boolean,
  language: string,
): string => {
  const value = distanceKm ? kilometers : kilometers * KM_TO_MILES;
  return `${formatUnitNumber(value, language)} ${distanceKm ? 'km' : 'mi'}`;
};

export const formatDistanceRangeKm = (
  minimumKm: number,
  maximumKm: number,
  distanceKm: boolean,
  language: string,
  perDay = false,
): string => {
  const factor = distanceKm ? 1 : KM_TO_MILES;
  const unit = distanceKm ? 'km' : 'mi';
  const suffix = perDay ? (language.startsWith('en') ? '/day' : '/gün') : '';
  return `${formatUnitNumber(minimumKm * factor, language)}–${formatUnitNumber(maximumKm * factor, language)} ${unit}${suffix}`;
};

export const formatTemperatureC = (
  celsius: number,
  tempCelsius: boolean,
  language: string,
): string => {
  const value = tempCelsius ? celsius : celsius * 9 / 5 + 32;
  return `${formatUnitNumber(value, language, 0)}°${tempCelsius ? 'C' : 'F'}`;
};

export const formatSpeedKmh = (
  kilometersPerHour: number,
  distanceKm: boolean,
  language: string,
): string => {
  const value = distanceKm
    ? kilometersPerHour
    : kilometersPerHour * KM_TO_MILES;
  const unit = distanceKm
    ? (language.startsWith('en') ? 'km/h' : 'km/sa')
    : 'mph';
  return `${formatUnitNumber(value, language, 0)} ${unit}`;
};
