'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react/dist/ssr';
import { SPEECH_RATE, VOICE_PREFERENCE, toSpeakable } from '../../lib/shared/speech';
import { t } from '../../lib/shared/strings';
import type { Lang } from '../../lib/shared/types';

/**
 * Read an answer aloud using the browser's own speech synthesiser.
 *
 * Chosen over an in-browser neural model deliberately. Kokoro is the obvious
 * open-source candidate and is about 327MB of weights, roughly 80MB quantised;
 * asking a citizen on mobile data to download that before hearing a traffic
 * advisory is the wrong trade. This ships zero bytes, costs nothing, needs no
 * API key, and works with no network once the page has loaded.
 *
 * The cost is that voice availability is a property of the device, not of this
 * code. So the control is only rendered once a usable voice has actually been
 * found, rather than offered and then failing.
 */
export default function SpeakButton({ text, lang }: { text: string; lang: Lang }) {
  const s = t(lang);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const pick = (): void => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      for (const tag of VOICE_PREFERENCE[lang]) {
        const match =
          voices.find((v) => v.lang.replace('_', '-').toLowerCase() === tag.toLowerCase()) ??
          voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(`${tag.toLowerCase()}-`));
        if (match) {
          setVoice(match);
          return;
        }
      }
      // No voice for this language. Leave `voice` null so nothing is offered:
      // a Hindi answer read by an American English voice is worse than silence.
      setVoice(null);
    };

    pick();
    // Chrome populates the list asynchronously and fires this once ready.
    window.speechSynthesis.addEventListener('voiceschanged', pick);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', pick);
  }, [lang]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    if (!voice) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(toSpeakable(text, lang));
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = SPEECH_RATE[lang];
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    utteranceRef.current = utterance;
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [voice, text, lang]);

  // Speech outlives the component otherwise: navigating away or switching
  // language leaves the previous answer still being read aloud.
  useEffect(() => {
    return () => {
      if (utteranceRef.current) window.speechSynthesis.cancel();
    };
  }, []);

  if (!voice) return null;

  return (
    <button
      type="button"
      className="feedback-btn"
      onClick={speaking ? stop : speak}
      aria-pressed={speaking}
      aria-label={speaking ? s.stopReading : s.readAloud}
    >
      {speaking ? (
        <SpeakerSlash size={18} aria-hidden="true" />
      ) : (
        <SpeakerHigh size={18} aria-hidden="true" />
      )}
      {speaking ? s.stopReading : s.readAloud}
    </button>
  );
}
