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

const KullanimKosullari: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">

      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/">
            <TravyonLogo size={36} />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Ana Sayfa
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 py-10">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs font-semibold text-[#f8981d] uppercase tracking-widest mb-2">Yasal</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Kullanım Koşulları</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            Son güncelleme: 26 Mayıs 2026
          </p>
        </div>
      </div>

      {/* İçerik */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 space-y-8">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Bu Kullanım Koşulları, Travyon platformunu ("Hizmet") kullanımınızı düzenler.
            Lütfen platformu kullanmadan önce bu koşulları dikkatlice okuyunuz.
          </p>

          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">{section.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer mini */}
      <div className="border-t border-slate-200 dark:border-slate-800 mt-4">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-slate-400">
          <span>© 2026 Travyon. Tüm hakları saklıdır.</span>
          <div className="flex gap-4">
            <Link to="/sss" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">SSS</Link>
            <Link to="/gizlilik" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Gizlilik</Link>
          </div>
        </div>
      </div>

    </div>
  );
};

export default KullanimKosullari;
