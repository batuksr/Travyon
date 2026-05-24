import { GoogleGenerativeAI } from '@google/generative-ai';

/* ══════════════════════════════════════════════
   System prompt — kısa, odaklı seyahat asistanı
═══════════════════════════════════════════════ */
const SYSTEM_PROMPT = `Sen Travyon'un akıllı seyahat asistanısın. Adın "Travyon AI".
Kullanıcıya kısa, net ve yararlı seyahat tavsiyeleri ver.
KURALAR:
- Daima Türkçe konuş.
- Yanıtını 4-6 cümleyle sınırla — çok uzun yazma.
- Şehir/ülke önerirken emoji ekle (🏛️ Roma, 🗼 Paris gibi).
- Madde listesi kullanıyorsan en fazla 4 madde.
- Bütçe sorularında net rakamlar ver.
- Seyahatle ilgili olmayan sorulara nazikçe "Bu konuda yardımcı olamam, ama seyahat sorularına bayılıyorum! 😊" de.`;

/* ══════════════════════════════════════════════
   Ana fonksiyon — streaming destekli
═══════════════════════════════════════════════ */
export const askTravelAssistant = async (
  question:  string,
  onChunk:   (text: string) => void,
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) throw new Error('Gemini API anahtarı bulunamadı.');

  const genAI = new GoogleGenerativeAI(apiKey);

  const tryStream = async (modelName: string): Promise<string> => {
    const model  = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContentStream(`${SYSTEM_PROMPT}\n\nKullanıcı sorusu: ${question}`);

    let full = '';
    for await (const chunk of result.stream) {
      full += chunk.text();
      onChunk(full);
    }
    return full;
  };

  // gemini-2.5-flash önce, hata alırsa 1.5-flash'a düş
  try {
    return await tryStream('gemini-2.5-flash');
  } catch {
    try {
      return await tryStream('gemini-1.5-flash');
    } catch (err) {
      throw err;
    }
  }
};
