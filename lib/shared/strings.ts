import type { Lang } from './types';

/**
 * Every user-visible string, in both languages.
 *
 * Two rules the chatbot-flow-design skill imposes on this file:
 *
 *  - No bare negations. "I do not understand", "Please rephrase" and "Sorry, I
 *    cannot help with that" are named as unhelpful fallbacks. Every fallback
 *    here pairs the honest limit with a concrete next step.
 *  - The bot discloses that it is a bot. A police-branded surface that lets
 *    people believe they are talking to an officer is the worst version of this
 *    product.
 *
 * And one rule from design-taste-frontend: no em-dashes or en-dashes anywhere
 * visible. Only the plain hyphen.
 */

export interface Strings {
  siteName: string;
  siteTagline: string;
  metaTitle: string;
  metaDescription: string;

  botDisclosure: string;
  greeting: string;
  scopeLine: string;
  chipsIntro: string;
  allTopics: string;
  helplineLine: string;
  emergencyLine: string;

  composerPlaceholder: string;
  send: string;
  sending: string;
  typing: string;
  stillSearching: string;
  jumpToLatest: string;

  followUp: string;
  helpful: string;
  notHelpful: string;
  thanksFeedback: string;

  didYouMean: string;
  disambiguate: string;

  fallbackTitle: string;
  fallbackBody: string;
  fallbackResource: string;

  emergencyTitle: string;
  emergencyBody: string;
  callNow: string;

  boundaryTitle: string;
  boundaryBody: string;

  escalateTitle: string;
  escalateBody: string;
  referenceLabel: string;
  whatToSay: string;
  copySummary: string;
  copied: string;

  tooManyTitle: string;
  tooManyBody: string;

  tierNoticeDeterministic: string;
  volatileNotice: string;
  lastUpdatedLabel: string;
  sourceLabel: string;

  privacyNotice: string;
  errorTitle: string;
  errorBody: string;

  browseTitle: string;
  browseIntro: string;
  langSwitchLabel: string;
  skipToContent: string;
  officialLine: string;
}

const hi: Strings = {
  siteName: 'Delhi Traffic Police Help Desk',
  siteTagline: 'BRICS Summit 2026 - Traffic जानकारी',
  metaTitle: 'BRICS Summit 2026 Traffic Help Desk | Delhi Traffic Police',
  metaDescription:
    'BRICS Summit 2026 के दौरान Delhi में traffic, Metro, airport, railway station, VIP movement और emergency से जुड़े सवालों के जवाब। Delhi Traffic Police की official जानकारी पर आधारित।',

  botDisclosure: 'यह एक automated help desk है, कोई police officer नहीं।',
  greeting: 'नमस्ते। BRICS Summit 2026 के दौरान Delhi traffic के बारे में पूछिए।',
  scopeLine:
    'मैं Delhi Traffic Police की official advisory में दिए गए सवालों के जवाब दे सकता हूं। आप Hindi, English या Hinglish में लिख सकते हैं।',
  chipsIntro: 'किस बारे में जानना है?',
  allTopics: 'सभी विषय',
  helplineLine: 'Traffic helpline 1095 - 24 घंटे उपलब्ध',
  emergencyLine: 'किसी emergency में 112 पर call करें',

  composerPlaceholder: 'अपना सवाल लिखिए…',
  send: 'भेजें',
  sending: 'भेज रहे हैं',
  typing: 'जवाब खोज रहे हैं',
  stillSearching: 'अभी भी खोज रहे हैं',
  jumpToLatest: 'नया जवाब देखें',

  followUp: 'कुछ और पूछना चाहेंगे?',
  helpful: 'काम आया',
  notHelpful: 'काम नहीं आया',
  thanksFeedback: 'धन्यवाद, आपकी राय दर्ज हो गई।',

  didYouMean: 'क्या आप यह पूछना चाहते थे?',
  disambiguate: 'आपका सवाल इनमें से किस बारे में है?',

  fallbackTitle: 'इस सवाल का जवाब मेरे पास नहीं है',
  fallbackBody:
    'यह सवाल official advisory में दर्ज नहीं है, इसलिए मैं अंदाजा नहीं लगाऊंगा। आपका सवाल Delhi Traffic Police की team को review के लिए भेज दिया गया है। इन विषयों पर मैं अभी मदद कर सकता हूं:',
  fallbackResource: 'नई और official traffic advisory के लिए Delhi Traffic Police के official channels देखें।',

  emergencyTitle: 'तुरंत 112 पर call करें',
  emergencyBody:
    'अगर किसी को चोट लगी है, आग लगी है, या तुरंत मदद चाहिए तो पहले 112 पर call करें। Traffic में मदद के लिए 1095 उपलब्ध है। नीचे official advisory की guidance भी दी गई है।',
  callNow: '112 पर call करें',

  boundaryTitle: 'यह जानकारी मेरे पास नहीं है',
  boundaryBody:
    'Challan, गाड़ी uthane, pass approval या किसी personal record की जानकारी इस help desk के पास नहीं होती, क्योंकि यह आपके account से जुड़ी होती है। इसके लिए Delhi Traffic Police के official portal या 1095 पर संपर्क करें।',

  escalateTitle: 'किसी व्यक्ति से बात करने के लिए',
  escalateBody:
    'Traffic helpline 1095 पर 24 घंटे बात कर सकते हैं। Emergency में 112 पर call करें। नीचे दी गई details बताने से आपकी बात जल्दी समझी जाएगी।',
  referenceLabel: 'Reference number',
  whatToSay: 'Call पर यह बताइए',
  copySummary: 'Details copy करें',
  copied: 'Copy हो गया',

  tooManyTitle: 'थोड़ी देर रुकिए',
  tooManyBody:
    'बहुत जल्दी-जल्दी सवाल आ रहे हैं। कुछ मिनट बाद फिर कोशिश कीजिए। ज़रूरी हो तो 1095 पर call कर सकते हैं।',

  tierNoticeDeterministic:
    'अभी basic mode में जवाब दिए जा रहे हैं। जवाब official advisory से ही आ रहे हैं, शब्द वैसे ही हैं जैसे advisory में लिखे हैं।',
  volatileNotice:
    'यह जानकारी हालात के अनुसार बदल सकती है। यात्रा से पहले latest official advisory देख लीजिए।',
  lastUpdatedLabel: 'Updated',
  sourceLabel: 'स्रोत',

  privacyNotice:
    'कृपया अपना नाम, phone number, गाड़ी नंबर या पता यहां न लिखें। जवाब बेहतर बनाने के लिए सवाल review किए जा सकते हैं।',
  errorTitle: 'कुछ तकनीकी दिक्कत हुई',
  errorBody: 'कृपया कुछ देर बाद फिर कोशिश कीजिए। ज़रूरी हो तो 1095 पर call करें।',

  browseTitle: 'सभी सवाल और जवाब',
  browseIntro:
    'Delhi Traffic Police की BRICS Summit 2026 advisory के सभी 60 सवाल, विषय के अनुसार।',
  langSwitchLabel: 'भाषा',
  skipToContent: 'मुख्य content पर जाएं',
  officialLine: 'Delhi Traffic Police की official traffic advisory पर आधारित',
};

const en: Strings = {
  siteName: 'Delhi Traffic Police Help Desk',
  siteTagline: 'BRICS Summit 2026 traffic information',
  metaTitle: 'BRICS Summit 2026 Traffic Help Desk | Delhi Traffic Police',
  metaDescription:
    'Answers about Delhi traffic during the BRICS Summit 2026: Metro, airport, railway stations, VIP movement, deliveries and emergencies. Based on the official Delhi Traffic Police advisory.',

  botDisclosure: 'This is an automated help desk, not a police officer.',
  greeting: 'Hello. Ask me about Delhi traffic during the BRICS Summit 2026.',
  scopeLine:
    'I answer the questions covered in the official Delhi Traffic Police advisory. You can write in English, Hindi or a mix of both.',
  chipsIntro: 'What would you like to know about?',
  allTopics: 'All topics',
  helplineLine: 'Traffic helpline 1095, available 24 hours',
  emergencyLine: 'In an emergency, call 112',

  composerPlaceholder: 'Type your question…',
  send: 'Send',
  sending: 'Sending',
  typing: 'Looking for an answer',
  stillSearching: 'Still looking',
  jumpToLatest: 'Jump to latest',

  followUp: 'Anything else I can help with?',
  helpful: 'Helpful',
  notHelpful: 'Not helpful',
  thanksFeedback: 'Thank you, your feedback has been recorded.',

  didYouMean: 'Did you mean one of these?',
  disambiguate: 'Which of these is your question about?',

  fallbackTitle: 'I do not have an answer for that one',
  fallbackBody:
    'That question is not in the official advisory, so I will not guess at it. It has been sent to the Delhi Traffic Police team for review. Here is what I can help with right now:',
  fallbackResource:
    'For the newest official traffic advisory, check the Delhi Traffic Police official channels.',

  emergencyTitle: 'Call 112 right away',
  emergencyBody:
    'If someone is hurt, there is a fire, or you need immediate help, call 112 first. For traffic help, 1095 is available. The relevant guidance from the official advisory is below as well.',
  callNow: 'Call 112',

  boundaryTitle: 'I do not have access to that',
  boundaryBody:
    'A help desk like this cannot look up a challan, a towed vehicle, a pass approval or any other record tied to you personally, because that information belongs to your own account. For those, use the Delhi Traffic Police official portal or call 1095.',

  escalateTitle: 'To speak to a person',
  escalateBody:
    'The traffic helpline 1095 is staffed 24 hours. In an emergency, call 112. Reading out the details below will help them understand your situation quickly.',
  referenceLabel: 'Reference number',
  whatToSay: 'Tell them this on the call',
  copySummary: 'Copy details',
  copied: 'Copied',

  tooManyTitle: 'Please wait a moment',
  tooManyBody:
    'Questions are arriving very quickly. Please try again in a few minutes. If it is urgent, you can call 1095.',

  tierNoticeDeterministic:
    'Answering in basic mode right now. Answers still come from the official advisory, worded exactly as the advisory writes them.',
  volatileNotice:
    'This can change with the situation on the ground. Please check the latest official advisory before you travel.',
  lastUpdatedLabel: 'Updated',
  sourceLabel: 'Source',

  privacyNotice:
    'Please do not type your name, phone number, vehicle number or address here. Questions may be reviewed to improve the answers.',
  errorTitle: 'Something went wrong',
  errorBody: 'Please try again in a moment. If it is urgent, call 1095.',

  browseTitle: 'All questions and answers',
  browseIntro:
    'All 60 questions from the Delhi Traffic Police BRICS Summit 2026 advisory, grouped by topic.',
  langSwitchLabel: 'Language',
  skipToContent: 'Skip to main content',
  officialLine: 'Based on the official Delhi Traffic Police traffic advisory',
};

export const STRINGS: Record<Lang, Strings> = { hi, en };

export function t(lang: Lang): Strings {
  return STRINGS[lang];
}

export const LANGS: Lang[] = ['hi', 'en'];

export function isLang(value: unknown): value is Lang {
  return value === 'hi' || value === 'en';
}

/** Label shown on the language switch, always in its own language. */
export const LANG_LABEL: Record<Lang, string> = { hi: 'हिंदी', en: 'English' };
