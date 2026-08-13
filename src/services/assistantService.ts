import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from './firebase';

/* Gemini çağrısı ve sistem promptu artık askTravelAssistant Cloud Function'ında
   (functions/src/index.ts) — istemci sadece soruyu gönderir, gerçek API key
   bu bundle'a hiç gömülmüyor. Streaming davranışı (onChunk'a her seferinde
   BİRİKMİŞ tam metin) sunucu tarafında birebir korunuyor. */
export const askTravelAssistant = async (
  question:    string,
  onChunk:     (text: string) => void,
  planContext?: string,
): Promise<string> => {
  try {
    const fn = httpsCallable<{ question: string; planContext?: string }, string>(
      functions, 'askTravelAssistant', { timeout: 100_000 },
    );
    const { stream, data } = await fn.stream({ question, planContext });
    for await (const chunk of stream) {
      onChunk(chunk as string);
    }
    return (await data) as string;
  } catch (err) {
    if (err instanceof FunctionsError && err.message) throw new Error(err.message);
    throw new Error('Asistan şu anda yanıt veremiyor.');
  }
};
