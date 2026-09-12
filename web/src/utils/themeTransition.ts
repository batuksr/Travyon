/**
 * Tema değişimini dairesel View Transition animasyonuyla çalıştırır.
 * VT sırasında global CSS transition'ları devre dışı bırakır — akıcı animasyon için.
 */
export function toggleWithCircle(
  toggleFn: () => void,
  event: React.MouseEvent | MouseEvent
): void {
  const x = (event as MouseEvent).clientX;
  const y = (event as MouseEvent).clientY;

  // Tıklama noktasından ekranın en uzak köşesine kadar tam radius
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth  - x),
    Math.max(y, window.innerHeight - y),
  );

  document.documentElement.style.setProperty('--vt-cx', `${x}px`);
  document.documentElement.style.setProperty('--vt-cy', `${y}px`);
  document.documentElement.style.setProperty('--vt-r',  `${endRadius}px`);

  // View Transitions API desteklenmiyorsa düz geçiş
  if (!('startViewTransition' in document)) {
    toggleFn();
    return;
  }

  // VT boyunca global CSS transition'ları kapat → binlerce elementin
  // aynı anda animate edilmesini engelle (ana performans kazanımı)
  document.documentElement.classList.add('no-transitions');

  const vt = (document as Document & {
    startViewTransition: (cb: () => void) => { finished: Promise<void> };
  }).startViewTransition(() => toggleFn());

  vt.finished.then(() => {
    document.documentElement.classList.remove('no-transitions');
  });
}
