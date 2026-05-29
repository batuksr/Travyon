import type { TravelPlanResponse } from '../services/aiService';
import type { OnboardingData } from '../store/useOnboardingStore';

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const fmtDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`;
};

const PERIOD_ICON: Record<string, string> = {
  'Sabah': '🌅',
  'Öğle': '☀️',
  'Öğleden Sonra': '🌤️',
  'Akşam': '🌆',
  'Gece': '🌙',
};

export const exportPlanAsPDF = (
  plan: TravelPlanResponse,
  onboardingData: OnboardingData,
): void => {
  const dateRange =
    onboardingData.startDate && onboardingData.endDate
      ? `${fmtDate(onboardingData.startDate)} – ${fmtDate(onboardingData.endDate)}`
      : `${plan.dailyPlans.length} Günlük Seyahat`;

  const daysHTML = plan.dailyPlans
    .map(
      day => `
    <div class="day-section">
      <div class="day-header">
        <div>
          <div class="day-label">GÜN ${day.dayNumber}</div>
          <div class="day-date">${fmtDate(day.date)}</div>
        </div>
        <div class="day-cost">
          <div class="day-cost-label">Tahmini Maliyet</div>
          <div class="day-cost-value">${plan.currencySymbol}${day.totalEstimatedCost.toLocaleString('tr-TR')}</div>
        </div>
      </div>
      <div class="day-summary">${day.daySummary}</div>
      <div class="activities">
        ${day.activities
          .map(
            (act, i) => `
          <div class="activity">
            <div class="act-header">
              <span class="act-period">${PERIOD_ICON[act.period] ?? '•'} ${act.period}</span>
              <span class="act-cost">${plan.currencySymbol}${(act.actualCost ?? act.estimatedCost).toLocaleString('tr-TR')}</span>
            </div>
            <div class="act-name">${i + 1}. ${act.placeName}</div>
            <div class="act-desc">${act.description}</div>
          </div>`,
          )
          .join('')}
      </div>
    </div>`,
    )
    .join('');

  const cityGuideHTML = plan.cityGuide
    ? `
    <div class="guide-section">
      <div class="guide-header">🗺️ Şehir Rehberi</div>
      <div class="guide-item">
        <div class="guide-label">🚌 Ulaşım</div>
        <p>${plan.cityGuide.transportationTips}</p>
      </div>
      <div class="guide-item">
        <div class="guide-label">👥 Yerel Kültür</div>
        <p>${plan.cityGuide.localCustoms}</p>
      </div>
      <div class="guide-item">
        <div class="guide-label">💡 Faydalı Bilgiler</div>
        <p>${plan.cityGuide.generalAdvice}</p>
      </div>
    </div>`
    : '';

  const peopleStatHTML =
    onboardingData.peopleCount > 0
      ? `<div class="cover-stat">
           <span class="cover-stat-label">Kişi</span>
           <span class="cover-stat-value">${onboardingData.peopleCount}</span>
         </div>`
      : '';

  const hotelStatHTML =
    onboardingData.accommodationAddress
      ? `<div class="cover-stat cover-stat--wide">
           <span class="cover-stat-label">Konaklama</span>
           <span class="cover-stat-value cover-stat-value--sm">${onboardingData.accommodationAddress}</span>
         </div>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${plan.destination} — Seyahat Planı</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, 'Segoe UI', Arial, Helvetica, sans-serif;
      color: #1e293b;
      background: #fff;
      font-size: 13px;
      line-height: 1.55;
    }
    @page { margin: 12mm 16mm; size: A4 portrait; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-btn-bar { display: none !important; }
      .day-section { break-inside: avoid; }
      .guide-section { break-inside: avoid; }
    }

    /* ── Floating print bar (only on screen) ── */
    .print-btn-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .print-btn-bar span { font-size: 12px; color: #64748b; }
    .print-btn {
      background: #f8981d;
      color: white;
      border: none;
      padding: 9px 22px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 3px 10px rgba(248,152,29,0.35);
      transition: background 0.15s;
    }
    .print-btn:hover { background: #e08518; }

    /* ── Cover ── */
    .cover {
      background: linear-gradient(135deg, #f8981d 0%, #dc7910 100%);
      color: white;
      padding: 36px 36px 28px;
    }
    .cover-eyebrow {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      opacity: 0.7;
      margin-bottom: 8px;
    }
    .cover-title {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
    }
    .cover-dates {
      font-size: 13px;
      opacity: 0.88;
      margin-bottom: 18px;
    }
    .cover-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.25);
    }
    .cover-stat { display: flex; flex-direction: column; }
    .cover-stat--wide { flex: 1; }
    .cover-stat-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.62;
      margin-bottom: 3px;
    }
    .cover-stat-value { font-size: 17px; font-weight: 800; }
    .cover-stat-value--sm { font-size: 12px; font-weight: 600; }
    .cover-summary {
      background: rgba(0,0,0,0.12);
      border-radius: 10px;
      padding: 13px 15px;
      margin-top: 18px;
      font-size: 12px;
      line-height: 1.65;
    }

    /* ── Content wrapper ── */
    .content { padding: 22px 28px 32px; }

    /* ── Day section ── */
    .day-section {
      margin-bottom: 22px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .day-header {
      background: #1e293b;
      color: white;
      padding: 11px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .day-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      opacity: 0.55;
      margin-bottom: 2px;
    }
    .day-date { font-size: 14px; font-weight: 700; }
    .day-cost { text-align: right; }
    .day-cost-label { font-size: 8.5px; opacity: 0.45; }
    .day-cost-value { font-size: 14px; font-weight: 800; color: #f8981d; }
    .day-summary {
      background: #f8fafc;
      padding: 9px 16px;
      font-size: 11.5px;
      color: #475569;
      font-style: italic;
      border-bottom: 1px solid #e2e8f0;
    }

    /* ── Activity ── */
    .activity {
      padding: 11px 16px;
      border-bottom: 1px solid #f1f5f9;
    }
    .activity:last-child { border-bottom: none; }
    .act-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3px;
    }
    .act-period {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .act-cost {
      font-size: 11px;
      font-weight: 700;
      color: #f8981d;
      background: #fff7ed;
      padding: 1.5px 8px;
      border-radius: 20px;
    }
    .act-name {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .act-desc { font-size: 11.5px; color: #475569; line-height: 1.55; }

    /* ── City guide ── */
    .guide-section {
      margin-top: 4px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .guide-header {
      background: #0f172a;
      color: white;
      padding: 11px 16px;
      font-size: 12.5px;
      font-weight: 700;
    }
    .guide-item {
      padding: 13px 16px;
      border-bottom: 1px solid #f1f5f9;
    }
    .guide-item:last-child { border-bottom: none; }
    .guide-label {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 5px;
    }
    .guide-item p { font-size: 11.5px; color: #475569; line-height: 1.6; }

    /* ── Footer ── */
    .footer {
      margin-top: 22px;
      text-align: center;
      font-size: 9.5px;
      color: #94a3b8;
      padding-bottom: 8px;
    }

    /* Screen-only top padding */
    @media screen {
      body { padding-top: 56px; }
    }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <span>${plan.destination} — Seyahat Planı</span>
    <button class="print-btn" onclick="window.print()">⬇ PDF Olarak Kaydet</button>
  </div>

  <div class="cover">
    <div class="cover-eyebrow">Seyahat Planı</div>
    <div class="cover-title">${plan.destination}</div>
    <div class="cover-dates">📅 ${dateRange}</div>
    ${plan.overallSummary ? `<div class="cover-summary">${plan.overallSummary}</div>` : ''}
    <div class="cover-stats">
      <div class="cover-stat">
        <span class="cover-stat-label">Süre</span>
        <span class="cover-stat-value">${plan.dailyPlans.length} Gün</span>
      </div>
      <div class="cover-stat">
        <span class="cover-stat-label">Toplam Bütçe</span>
        <span class="cover-stat-value">${plan.currencySymbol}${plan.totalEstimatedCost.toLocaleString('tr-TR')}</span>
      </div>
      ${peopleStatHTML}
      ${hotelStatHTML}
    </div>
  </div>

  <div class="content">
    ${daysHTML}
    ${cityGuideHTML}
    <div class="footer">
      Bu plan yapay zeka tarafından oluşturulmuştur &nbsp;·&nbsp; ${new Date().toLocaleDateString('tr-TR')} tarihinde dışa aktarıldı
    </div>
  </div>

  <script>
    // Auto-trigger print dialog after a short delay so fonts/layout settle
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 400);
    });
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};
