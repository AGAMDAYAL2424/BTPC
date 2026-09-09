import 'server-only';
import { Lru } from '../cache/lru';

/**
 * Per-visitor conversation state, held server-side.
 *
 * The client does not send conversation history: accepting it would mean
 * trusting a client-supplied transcript, and validating it is more work than
 * keeping the state here. Anonymous visitors get a fresh session, with nothing
 * carried across sessions, because there is no consent story for remembering a
 * member of the public between visits.
 */
export interface SessionState {
  turn: number;
  /** Normalised text of the last few questions, for repeat detection. */
  recent: string[];
  timestamps: number[];
  /** The skill allows exactly one clarification round per conversation. */
  clarifications: number;
  lastIntentId: string | null;
  /** Candidates already offered, so the same chips are not shown twice. */
  offered: string[];
  escalationOffered: boolean;
}

function fresh(): SessionState {
  return {
    turn: 0,
    recent: [],
    timestamps: [],
    clarifications: 0,
    lastIntentId: null,
    offered: [],
    escalationOffered: false,
  };
}

const sessions = new Lru<string, SessionState>(5000, 60 * 60 * 1000);

export function getSession(id: string): SessionState {
  return sessions.get(id) ?? fresh();
}

export function saveSession(id: string, state: SessionState): void {
  sessions.set(id, {
    ...state,
    recent: state.recent.slice(-5),
    timestamps: state.timestamps.slice(-10),
    offered: state.offered.slice(-10),
  });
}
