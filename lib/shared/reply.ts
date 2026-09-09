import type { Band, Lang, Tier } from './types';

/** What the chat UI renders. Shared, because the client imports these types. */
export type ReplyKind =
  | 'answer'
  | 'disambiguate'
  | 'fallback'
  | 'emergency'
  | 'boundary'
  | 'escalate'
  | 'throttled'
  | 'error';

export interface Suggestion {
  faqId: string;
  label: string;
  intentId: string;
}

export interface ChatReply {
  kind: ReplyKind;
  /** Heading, present on everything except a plain answer. */
  title: string | null;
  /** The answer or explanation body. Plain text, rendered as text. */
  body: string;
  /** Approved guidance shown beneath an emergency or boundary card. */
  guidance: string | null;

  faqId: string | null;
  intentId: string | null;
  band: Band;

  suggestions: Suggestion[];
  suggestionsLabel: string | null;

  /** Present on emergency, boundary and escalate replies. */
  helplines: { traffic: string; emergency: string } | null;
  referenceId: string | null;
  escalationSummary: string | null;

  followUp: string;
  /** True when the row is marked volatile and carries a freshness caveat. */
  volatile: boolean;
  lastUpdated: string | null;
  provenance: string | null;

  tier: Tier;
  tierNotice: string | null;
  lang: Lang;
  /** Null when nothing was logged, e.g. a throttled request. */
  messageId: number | null;
}

export interface ChatRequestBody {
  message: string;
  lang: Lang;
  sessionId?: string;
}
