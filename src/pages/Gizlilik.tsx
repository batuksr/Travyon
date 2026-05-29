import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TravyonLogo from '../components/TravyonLogo';

const SECTIONS = [
  {
    title: '1. Toplanan Veriler',
    content: `Travyon olarak hizmetlerimizi sunabilmek amacıyla aşağıdaki kişisel verileri işleyebiliriz:

• Hesap bilgileri: Ad, e-posta adresi ve şifre (şifreli olarak saklanır).
• Kullanım verileri: Oluşturduğun planlar, tercihler, seyahat tarihleri ve bütçe bilgileri.
• Cihaz bilgileri: Tarayıcı türü, işletim sistemi ve IP adresi.
• İletişim verileri: Destek talebi veya geri bildirim gönderdiğinde paylaştığın bilgiler.

Google ile giriş yapman durumunda Google, adın ve e-posta adresin gibi temel profil bilgilerini bizimle paylaşır.`,
  },
  {
    title: '2. Verilerin Kullanım Amacı',
    content: `Topladığımız verileri yalnızca şu amaçlarla kullanırız:

• Hesabını oluşturmak ve yönetmek.
• Seyahat planlarını oluşturmak, kaydetmek ve kişiselleştirmek.
• Hizmet güvenliğini sağlamak ve dolandırıcılığı önlemek.
• Uygulama performansını ve kullanıcı deneyimini iyileştirmek.
• Talep etmen durumunda sana destek sağlamak.
• Yasal yükümlülükleri yerine getirmek.`,
  },
  {
    title: '3. Veri Güvenliği',
    content: `Kişisel verilerinin güvenliğini sağlamak için sektör standardı güvenlik önlemlerini uygularız:

• Tüm veriler Google Firebase altyapısında AES-256 şifreleme ile saklanır.
• Bağlantılar HTTPS/TLS protokolü ile şifrelenir.
• Şifreler hiçbir zaman düz metin olarak saklanmaz.
• Sistemlerimiz düzenli güvenlik denetimine tabi tutulur.

Ancak internet üzerinden hiçbir veri iletiminin %100 güvenli olmadığını belirtiriz.`,
  },
  {
    title: '4. Veri Paylaşımı',
    content: `Kişisel verilerini üçüncü taraflarla satmıyor, kiralamıyor veya ticaretini yapmıyoruz. Verilerini yalnızca şu durumlarda paylaşabiliriz:

• Hizmet sağlayıcılar: Google Firebase (depolama), Google Maps API (harita), Google Gemini AI (plan oluşturma) gibi teknik altyapı sağlayıcıları.
• Yasal zorunluluk: Mahkeme kararı veya yasal bir yükümlülük doğrultusunda.
• Şirket işlemleri: Birleşme veya devralma durumunda, verilerin korunacağı güvence altına alınarak.`,
  },
  {
    title: '5. Çerezler',
    content: `Sitemiz oturum ve tercih bilgilerini saklamak amacıyla çerezler kullanır. Kullandığımız çerez türleri:

• Zorunlu çerezler: Oturum yönetimi ve güvenlik için gereklidir.
• Tercih çerezleri: Dil ve tema tercihlerin gibi ayarlarını hatırlar.
• Analitik çerezler: Anonim kullanım istatistikleri toplar (isteğe bağlı).

Tarayıcı ayarlarından çerezleri devre dışı bırakabilirsin; ancak bu durum bazı işlevleri etkileyebilir.`,
  },
  {
    title: '6. Haklarınız',
    content: `6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında aşağıdaki haklara sahipsindir:

• Kişisel verilerinin işlenip işlenmediğini öğrenme hakkı.
• İşlenen veriler hakkında bilgi talep etme hakkı.
• Verilerin düzeltilmesini veya silinmesini talep etme hakkı.
• Verilerin işlenmesine itiraz etme hakkı.
• Veri taşınabilirliği hakkı.

Bu haklarını kullanmak için iletisim@travyon.app adresine e-posta gönderebilirsin.`,
  },
  {
    title: '7. Veri Saklama Süresi',
    content: `Verilerini hesabın aktif olduğu sürece saklarız. Hesabını silmen durumunda kişisel verilerini 30 gün içinde sistemlerimizden kalıcı olarak sileriz. Yasal yükümlülükler gerektirdiği hallerde bazı veriler daha uzun süre saklanabilir.`,
  },
  {
    title: '8. Değişiklikler',
    content: `Bu Gizlilik Politikası'nı zaman zaman güncelleyebiliriz. Önemli değişiklikler olması durumunda kayıtlı e-posta adresine bildirim göndeririz. Politikanın güncel halini her zaman bu sayfada bulabilirsin.`,
  },
  {
    title: '9. İletişim',
    content: `Gizlilik ile ilgili soruların için:\n\nE-posta: iletisim@travyon.app\nAdres: İstanbul, Türkiye`,
  },
];

const Gizlilik: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f5f0e8] dark:bg-slate-900">

      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold text-[#f8981d] uppercase tracking-widest mb-2">Yasal</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Gizlilik Politikası</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            Son güncelleme: 26 Mayıs 2026
          </p>
        </div>
      </div>

      {/* İçerik */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-8 space-y-8">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Travyon ("biz", "bizim") olarak gizliliğinize saygı duyuyor ve kişisel verilerinizin korunmasına önem veriyoruz.
            Bu Gizlilik Politikası, hizmetlerimizi kullanırken hangi verileri topladığımızı, nasıl kullandığımızı ve koruduğumuzu açıklar.
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>© 2026 Travyon. Tüm hakları saklıdır.</span>
          <div className="flex gap-4">
            <Link to="/sss" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">SSS</Link>
            <Link to="/kullanim-kosullari" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Kullanım Koşulları</Link>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Gizlilik;
