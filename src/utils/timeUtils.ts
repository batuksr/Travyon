export const relativeTime = (ts: number): string => {
  const diff = Date.now() - ts;
  if (diff < 60_000)      return 'az önce';
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)} dk önce`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)} saat önce`;
  const days = Math.floor(diff / 86_400_000);
  if (days === 1)  return 'dün';
  if (days < 7)   return `${days} gün önce`;
  if (days < 14)  return 'geçen hafta';
  if (days < 30)  return `${Math.floor(days / 7)} hafta önce`;
  if (days < 60)  return 'geçen ay';
  return `${Math.floor(days / 30)} ay önce`;
};
