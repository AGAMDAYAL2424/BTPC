'use client';

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  PaperPlaneRight,
  Phone,
  ThumbsDown,
  ThumbsUp,
  Warning,
  Info,
} from '@phosphor-icons/react/dist/ssr';
import type { ChatReply, Suggestion } from '../../lib/shared/reply';
import type { Lang } from '../../lib/shared/types';
import { t } from '../../lib/shared/strings';
import SpeakButton from './SpeakButton';

/**
 * The only interactive island on the page. Everything around it - the header,
 * the intro, and the full browsable FAQ list - is server-rendered, so the
 * content is indexable and readable with JavaScript switched off.
 *
 * Every subcomponent below is defined at MODULE scope. Defining them inside
 * this component would rebuild their type on each render, and the documented
 * symptom of that is the composer losing focus on every keystroke.
 */

interface UserTurn {
  id: string;
  role: 'user';
  text: string;
  lang: Lang;
}

interface BotTurn {
  id: string;
  role: 'bot';
  reply: ChatReply;
}

type Turn = UserTurn | BotTurn;

interface Props {
  lang: Lang;
  openingChips: Suggestion[];
}

/* -------------------------------------------------------------- pieces ---- */

const UserBubble = memo(function UserBubble({ text, lang }: { text: string; lang: Lang }) {
  return (
    <article className="msg msg-user" aria-label={lang === 'hi' ? 'आपका सवाल' : 'Your question'}>
      <p className="bubble bubble-user bubble-enter">{text}</p>
    </article>
  );
});

function Chips({
  label,
  items,
  onPick,
  disabled,
}: {
  label: string | null;
  items: Suggestion[];
  onPick: (s: Suggestion) => void;
  disabled: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      {label ? <p className="chips-label">{label}</p> : null}
      <div className="chips">
        {items.map((s) => (
          <button
            key={s.faqId}
            type="button"
            className="chip"
            disabled={disabled}
            onClick={() => onPick(s)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Helplines({ reply, lang }: { reply: ChatReply; lang: Lang }) {
  if (!reply.helplines) return null;
  const s = t(lang);
  const isEmergency = reply.kind === 'emergency';
  return (
    <div className="helplines">
      {isEmergency ? (
        <a className="call-btn" href={`tel:${reply.helplines.emergency}`}>
          <Phone size={20} aria-hidden="true" />
          {s.callNow}
        </a>
      ) : null}
      <a
        className={`call-btn ${isEmergency ? 'call-btn-secondary' : 'call-btn-secondary'}`}
        href={`tel:${reply.helplines.traffic}`}
      >
        <Phone size={20} aria-hidden="true" />
        {reply.helplines.traffic}
      </a>
    </div>
  );
}

function Feedback({
  messageId,
  lang,
  spoken,
}: {
  messageId: number;
  lang: Lang;
  /** Text to read aloud, shown alongside the rating buttons. */
  spoken: string;
}) {
  const s = t(lang);
  const [sent, setSent] = useState<null | 1 | -1>(null);

  const rate = useCallback(
    (rating: 1 | -1) => {
      setSent(rating);
      // Fire and forget: a failed rating must never interrupt reading an answer.
      void fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messageId, rating }),
      }).catch(() => {});
    },
    [messageId],
  );

  return (
    <div className="feedback">
      <SpeakButton text={spoken} lang={lang} />
      {sent !== null ? (
        <p className="feedback-thanks">{s.thanksFeedback}</p>
      ) : (
        <>
          <button
            type="button"
            className="feedback-btn"
            aria-pressed={false}
            onClick={() => rate(1)}
          >
            <ThumbsUp size={18} aria-hidden="true" />
            {s.helpful}
          </button>
          <button
            type="button"
            className="feedback-btn"
            aria-pressed={false}
            onClick={() => rate(-1)}
          >
            <ThumbsDown size={18} aria-hidden="true" />
            {s.notHelpful}
          </button>
        </>
      )}
    </div>
  );
}

const CARD_CLASS: Record<string, string> = {
  emergency: 'card card-emergency',
  boundary: 'card card-boundary',
  escalate: 'card card-escalate',
  fallback: 'card card-fallback',
  throttled: 'card card-fallback',
  error: 'card card-fallback',
};

const BotTurnView = memo(function BotTurnView({
  reply,
  lang,
  onPick,
  busy,
}: {
  reply: ChatReply;
  lang: Lang;
  onPick: (s: Suggestion) => void;
  busy: boolean;
}) {
  const s = t(lang);
  const asCard = reply.kind !== 'answer' && reply.kind !== 'disambiguate';
  const label = lang === 'hi' ? 'जवाब' : 'Answer';

  return (
    <article className="msg" aria-label={label}>
      {asCard ? (
        <div className={`${CARD_CLASS[reply.kind] ?? 'card'} bubble-enter`}>
          {reply.title ? <p className="card-title">{reply.title}</p> : null}
          <p className="card-body">{reply.body}</p>
          {reply.guidance ? <p className="guidance">{reply.guidance}</p> : null}
          <Helplines reply={reply} lang={lang} />
          {reply.referenceId ? (
            <p className="meta">
              {s.referenceLabel}: <strong>{reply.referenceId}</strong>
            </p>
          ) : null}
          {reply.escalationSummary ? (
            <p className="meta">
              {s.whatToSay}: {reply.escalationSummary}
            </p>
          ) : null}
          <div className="feedback">
            <SpeakButton
              text={[reply.title, reply.body, reply.guidance].filter(Boolean).join('. ')}
              lang={lang}
            />
          </div>
        </div>
      ) : (
        <p className="bubble bubble-bot bubble-enter">{reply.body}</p>
      )}

      {reply.volatile ? (
        <p className="notice">
          <Warning size={18} aria-hidden="true" />
          <span>{s.volatileNotice}</span>
        </p>
      ) : null}

      {reply.tierNotice ? (
        <p className="notice">
          <Info size={18} aria-hidden="true" />
          <span>{reply.tierNotice}</span>
        </p>
      ) : null}

      {reply.suggestions.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <Chips
            label={reply.suggestionsLabel}
            items={reply.suggestions}
            onPick={onPick}
            disabled={busy}
          />
        </div>
      ) : null}

      {reply.lastUpdated && reply.kind === 'answer' ? (
        <p className="meta">
          {s.lastUpdatedLabel} {reply.lastUpdated}
          {reply.provenance ? ` · ${reply.provenance}` : ''}
        </p>
      ) : null}

      {reply.messageId !== null && reply.kind === 'answer' ? (
        <Feedback messageId={reply.messageId} lang={lang} spoken={reply.body} />
      ) : null}
    </article>
  );
});

/* --------------------------------------------------------------- island ---- */

export default function ChatIsland({ lang, openingChips }: Props) {
  const s = t(lang);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isPending, startTransition] = useTransition();
  const [showJump, setShowJump] = useState(false);
  const [activity, setActivity] = useState('');

  const logRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionRef = useRef<string | null>(null);
  // Whether the visitor is reading the newest message. Kept in a ref because it
  // changes on every scroll frame and must not re-render the transcript.
  const atBottomRef = useRef(true);

  /**
   * Keep the composer above the on-screen keyboard.
   *
   * dvh alone is not enough on iOS: the visual viewport shrinks when the
   * keyboard opens without firing a resize on the layout viewport, so the
   * sticky composer ends up behind the keyboard.
   */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = (): void => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb', `${offset}px`);
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      document.documentElement.style.removeProperty('--kb');
    };
  }, []);

  /**
   * Near-bottom detection with an IntersectionObserver on a sentinel, rather
   * than a scroll listener. A scroll handler runs on every frame with no
   * batching; this fires only when the sentinel crosses the edge.
   */
  useEffect(() => {
    const end = endRef.current;
    const log = logRef.current;
    if (!end || !log) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry?.isIntersecting ?? true;
        atBottomRef.current = visible;
        setShowJump(!visible);
      },
      { root: log, rootMargin: '0px 0px 96px 0px' },
    );
    io.observe(end);
    return () => io.disconnect();
  }, []);

  const scrollToEnd = useCallback((smooth: boolean) => {
    endRef.current?.scrollIntoView({
      block: 'end',
      behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'smooth'
        : 'auto',
    });
  }, []);

  const ask = useCallback(
    (question: string) => {
      const text = question.trim();
      if (text.length === 0 || isPending) return;

      // The visitor's own bubble is painted synchronously, before any network
      // call, so the interaction feels instant regardless of round-trip time.
      const userTurn: UserTurn = {
        id: `u-${Date.now()}`,
        role: 'user',
        text,
        lang,
      };
      // Functional update, so this handler needs no dependency on `turns` and
      // stays stable as the transcript grows.
      setTurns((current) => [...current, userTurn]);
      setActivity(s.typing);
      requestAnimationFrame(() => scrollToEnd(true));

      startTransition(async () => {
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              message: text,
              lang,
              ...(sessionRef.current ? { sessionId: sessionRef.current } : {}),
            }),
          });
          const data = (await res.json()) as {
            reply: ChatReply;
            sessionId?: string;
          };
          if (data.sessionId) sessionRef.current = data.sessionId;
          setTurns((current) => [
            ...current,
            { id: `b-${Date.now()}`, role: 'bot', reply: data.reply },
          ]);
        } catch {
          setTurns((current) => [
            ...current,
            {
              id: `b-${Date.now()}`,
              role: 'bot',
              reply: {
                kind: 'error',
                title: s.errorTitle,
                body: s.errorBody,
                guidance: null,
                faqId: null,
                intentId: null,
                band: 'miss',
                suggestions: [],
                suggestionsLabel: null,
                helplines: { traffic: '1095', emergency: '112' },
                referenceId: null,
                escalationSummary: null,
                followUp: s.followUp,
                volatile: false,
                lastUpdated: null,
                provenance: null,
                tier: 'deterministic',
                tierNotice: null,
                lang,
                messageId: null,
              },
            },
          ]);
        } finally {
          setActivity('');
          if (atBottomRef.current) {
            requestAnimationFrame(() => scrollToEnd(true));
          }
        }
      });
    },
    [isPending, lang, s, scrollToEnd],
  );

  const submit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const input = inputRef.current;
      if (!input) return;
      const value = input.value;
      // Uncontrolled input: the value is read on submit rather than held in
      // state, so a keystroke never re-renders the transcript. A controlled
      // textarea above a long message list is the classic cause of poor INP.
      input.value = '';
      input.style.height = '';
      ask(value);
    },
    [ask],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }
    },
    [],
  );

  const onInput = useCallback((event: FormEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${Math.min(120, el.scrollHeight)}px`;
  }, []);

  const pick = useCallback((suggestion: Suggestion) => ask(suggestion.label), [ask]);

  return (
    <>
      <div className="log-wrap">
        <div
          className="log"
          ref={logRef}
          id="chat-log"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={lang === 'hi' ? 'बातचीत' : 'Conversation'}
        >
          <div className="msg">
            <div className="intro">
              <p className="intro-disclosure">{s.botDisclosure}</p>
              <p className="intro-greeting">{s.greeting}</p>
              <p className="intro-scope">{s.scopeLine}</p>
              <div className="intro-lines">
                <span className="intro-line">
                  <Phone size={16} aria-hidden="true" />
                  {s.helplineLine}
                </span>
                <span className="intro-line">
                  <Warning size={16} aria-hidden="true" />
                  {s.emergencyLine}
                </span>
              </div>
              <Chips
                label={s.chipsIntro}
                items={openingChips}
                onPick={pick}
                disabled={isPending}
              />
            </div>
          </div>

          {turns.map((turn) =>
            turn.role === 'user' ? (
              <UserBubble key={turn.id} text={turn.text} lang={turn.lang} />
            ) : (
              <BotTurnView
                key={turn.id}
                reply={turn.reply}
                lang={lang}
                onPick={pick}
                busy={isPending}
              />
            ),
          )}

          {isPending ? (
            <article className="msg" aria-hidden="true">
              <span className="bubble bubble-bot typing">
                <span />
                <span />
                <span />
              </span>
            </article>
          ) : null}

          {/* Sentinel for near-bottom detection. Also the scroll target. */}
          <div ref={endRef} style={{ height: 1 }} />
        </div>

        {showJump ? (
          <button type="button" className="jump-btn" onClick={() => scrollToEnd(true)}>
            {s.jumpToLatest}
          </button>
        ) : null}
      </div>

      {/*
        One status region for activity, separate from the transcript log.
        A live region per bubble would make several regions compete, and
        announcing a growing answer per chunk makes a screen reader re-read the
        whole paragraph each time.
      */}
      <p role="status" aria-live="polite" className="sr-only">
        {activity}
      </p>

      <form className="composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="question">
          {s.composerPlaceholder}
        </label>
        <textarea
          id="question"
          name="question"
          ref={inputRef}
          className="composer-input"
          rows={1}
          placeholder={s.composerPlaceholder}
          maxLength={500}
          autoComplete="off"
          autoCapitalize="sentences"
          spellCheck={false}
          enterKeyHint="send"
          onKeyDown={onKeyDown}
          onInput={onInput}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={isPending}
          aria-label={isPending ? s.sending : s.send}
        >
          <PaperPlaneRight size={22} aria-hidden="true" />
        </button>
      </form>
    </>
  );
}
