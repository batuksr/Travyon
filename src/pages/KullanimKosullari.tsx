import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TravyonLogo from '../components/TravyonLogo';

const SECTIONS = [
  {
    title: '1. Kabul',
    content: `Travyon'u ("Platform") kullanarak bu Kullanım Koşulları'nı okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan edersiniz. Bu koşulları kabul etmiyorsanız lütfen platformu kullanmayınız.

18 yaşından küçük kullanıcıların platformu yalnızca ebeveyn veya yasal vasi gözetiminde kullanması gerekmektedir.`,
  },
  {
    title: '2. Hizmet Tanımı',
    content: `Travyon, yapay zeka teknolojisi kullanarak kişiselleştirilmiş seyahat planları oluşturan bir web platformudur. Hizmetlerimiz şunları kapsar:

• Yapay zeka destekli seyahat planı oluşturma
• İnteraktif harita ve rota görüntüleme
• Plan kaydetme ve yönetme
• Topluluk özellikleri ve plan paylaşımı
• Hava durumu ve seyahat süresi bilgileri

Hizmetlerin kapsamı, önceden bildirim yapılarak değiştirilebilir.`,
  },
  {
    title: '3. Hesap Oluşturma ve Güvenlik',
    content: `• Platformu kullanmak için geçerli bir e-posta adresiyle kayıt olmanız gerekmektedir.
• Hesap bilgilerinizin doğru ve güncel olması sizin sorumluluğunuzdadır.
• Hesabınızın güvenliğinden siz sorumlusunuz. Şifrenizi kimseyle paylaşmayınız.
• Hesabınızın yetkisiz kullanımını fark ettiğinizde derhal bize bildirmeniz gerekmektedir.
• Her kullanıcı yalnızca bir hesap açabilir.`,
  },
  {
    title: '4. Kabul Edilebilir Kullanım',
    content: `Platformu kullanırken aşağıdaki kurallara uymayı kabul edersiniz:

✓ Platformu yalnızca yasal amaçlarla kullanacaksınız.
✓ Başkalarının haklarına saygı göstereceksiniz.
✓ Doğru ve gerçek bilgiler paylaşacaksınız.

✗ Platformu kötü amaçlı yazılım dağıtmak için kullanmayacaksınız.
✗ Diğer kullanıcılara zarar verecek içerikler paylaşmayacaksınız.
✗ Platformun altyapısını aşırı yükleyecek eylemler gerçekleştirmeyeceksiniz.
✗ Otomatik araçlarla (bot, scraper vb.) veri çekmeyeceksiniz.
✗ Başka kişilerin hesaplarına yetkisiz erişim sağlamaya çalışmayacaksınız.`,
  },
  {
    title: '5. Fikri Mülkiyet',
    content: `Platform üzerindeki tüm içerik, tasarım, kod, logo ve marka unsurları Travyon'a aittir ve fikri mülkiyet yasalarıyla korunmaktadır.

Kullanıcıların platformda oluşturduğu seyahat planlarının içeriği kullanıcıya aittir. Ancak bu planların platform üzerinde saklanması ve işlenmesi için bize lisans vermiş olursunuz.

Platformun herhangi bir bölümünü kopyalamak, dağıtmak veya ticari amaçla kullanmak için önceden yazılı izin almanız gerekir.`,
  },
  {
    title: '6. Ücretli Planlar',
    content: `Pro ve Team planları için geçerli ödeme koşulları:

• Abonelikler aylık veya yıllık olarak faturalandırılır.
• Ücretli plandan çıkış, bir sonraki fatura döneminin başında geçerli olur.
• Geri ödeme politikamız: İlk 14 gün içinde iptal ettiğinizde tam iade yapılır.
• Fiyatlar önceden bildirim yapılarak değiştirilebilir. Mevcut abonelere en az 30 gün önceden bildirim yapılır.
• Ödeme bilgileri güvenli ödeme altyapımız üzerinden saklanır.`,
  },
  {
    title: '7. Sorumluluk Sınırlaması',
    content: `Travyon, yapay zeka tarafından üretilen seyahat planlarının doğruluğu veya eksiksizliği konusunda garanti vermez. Planlar tavsiye niteliğindedir; nihai kararlar kullanıcıya aittir.

Travyon aşağıdakilerden sorumlu tutulamaz:
• Seyahat iptalleri, rötar veya beklenmedik koşullar
• Üçüncü taraf hizmet sağlayıcıların (otel, havayolu vb.) eylemleri
• Yapay zeka tarafından üretilen hatalı bilgiler
• Platformun geçici olarak kullanılamamasından doğan zararlar`,
  },
  {
    title: '8. Hesap İptali',
    content: `Hesabınızı istediğiniz zaman Ayarlar > Hesap bölümünden silebilirsiniz.

Kullanım Koşulları'nı ihlal ettiğiniz tespit edilirse hesabınızı önceden bildirim yapmaksızın askıya alma veya kapatma hakkımız saklıdır. Ciddi ihlallerde iade yapılmaz.`,
  },
  {
    title: '9. Uygulanacak Hukuk',
    content: `Bu Kullanım Koşulları, Türkiye Cumhuriyeti hukukuna tabidir. Anlaşmazlıkların çözümünde İstanbul Mahkemeleri ve İcra Müdürlükleri yetkilidir.`,
  },
  {
    title: '10. Değişiklikler',
    content: `Bu koşulları zaman zaman güncelleyebiliriz. Önemli değişiklikler için kayıtlı e-posta adresine bildirim göndeririz. Değişiklik sonrası platformu kullanmaya devam etmeniz yeni koşulları kabul ettiğiniz anlamına gelir.`,
  },
  {
    title: '11. İletişim',
    content: `Bu koşullarla ilgili sorularınız için:\n\nE-posta: iletisim@travyon.app\nAdres: İstanbul, Türkiye`,
  },
];

const TABS = [
  { to: '/sss', label: 'SSS' },
  { to: '/gizlilik', label: 'Gizlilik' },
  { to: '/kullanim-kosullari', label: 'Kullanım Koşulları' },
  { to: '/iletisim', label: 'İletişim' },
];

const PageTabs: React.FC<{ active: string }> = ({ active }) => (
  <div className="flex gap-1.5 flex-wrap justify-center bg-surface-2 p-[5px] rounded-full w-fit mx-auto mt-6">
    {TABS.map(t => (
      <Link
        key={t.to}
        to={t.to}
        className={`font-heading text-sm px-5 py-2.5 rounded-full whitespace-nowrap transition-colors ${
          active === t.to ? 'bg-accent text-white' : 'text-muted hover:text-text'
        }`}
      >
        {t.label}
      </Link>
    ))}
  </div>
);

const KullanimKosullari: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg">

      {/* Header */}
      <header className="bg-surface border-b border-divider sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-[74px] flex items-center justify-between">
          <Link to="/">
            <TravyonLogo size={36} />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-text bg-surface-2 border border-divider rounded-full px-4 py-2.5 hover:bg-surface transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            Ana Sayfa
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="text-center py-10 sm:py-12 px-4 sm:px-6">
        <p className="text-xs font-heading text-accent-700 uppercase tracking-widest mb-2">Yardım & Yasal</p>
        <h1 className="font-heading text-3xl sm:text-4xl text-text">Kullanım Koşulları</h1>
        <p className="text-muted mt-3.5 text-sm">
          Travyon'u kullanırken geçerli olan kurallar ve sorumluluklar.
        </p>
        <PageTabs active="/kullanim-kosullari" />
      </div>

      {/* İçerik */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col gap-[26px]">
          <p className="text-sm text-muted leading-relaxed">
            Bu Kullanım Koşulları, Travyon platformunu ("Hizmet") kullanımınızı düzenler.
            Lütfen platformu kullanmadan önce bu koşulları dikkatlice okuyunuz.
          </p>

          {SECTIONS.map((section) => (
            <div key={section.title} className="bg-surface border border-divider rounded-3xl p-6 sm:p-7">
              <h2 className="font-heading text-xl text-text mb-2.5">{section.title}</h2>
              <p className="text-[15px] text-muted leading-[1.7] whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}
          <p className="text-xs text-muted text-center">Son güncelleme: 26 Mayıs 2026</p>
        </div>
      </div>

      {/* Footer mini */}
      <footer className="border-t border-divider mt-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-[22px] flex flex-wrap items-center justify-between gap-3">
          <TravyonLogo size={28} />
          <span className="text-xs text-muted">© 2026 Travyon. Tüm hakları saklıdır.</span>
        </div>
      </footer>

    </div>
  );
};

export default KullanimKosullari;
