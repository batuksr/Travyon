import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface Props {
  formContent: string;
  onClose: () => void;
}

/**
 * iyzico'nun checkoutFormContent'i script tag'leri içeren ham HTML —
 * innerHTML ile enjekte edilen <script> tag'leri tarayıcıda ÇALIŞMAZ
 * (DOM güvenlik kısıtı), bu yüzden script'leri ayıklayıp yeniden
 * oluşturup manuel ekliyoruz; iyzico'nun widget'ı böyle mount olur.
 */
const IyzicoCheckoutModal: React.FC<Props> = ({ formContent, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const doc = new DOMParser().parseFromString(formContent, 'text/html');
    const scripts = Array.from(doc.querySelectorAll('script'));
    scripts.forEach(s => s.remove());
    container.innerHTML = doc.body.innerHTML;

    const injected: HTMLScriptElement[] = [];
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      if (oldScript.textContent) newScript.textContent = oldScript.textContent;
      document.body.appendChild(newScript);
      injected.push(newScript);
    });

    return () => {
      injected.forEach(s => s.remove());
      container.innerHTML = '';
    };
  }, [formContent]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center z-10"
        >
          <X size={16} />
        </button>
        <div ref={containerRef} className="p-6 pt-12" />
      </div>
    </div>
  );
};

export default IyzicoCheckoutModal;
