'use client';

import { useActionState, useEffect, useRef } from 'react';
import { loginAction } from '../actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  const alertRef = useRef<HTMLDivElement>(null);

  // Move focus to the error summary after a failed submit, so a screen reader
  // user is told what went wrong rather than left on the button.
  useEffect(() => {
    if (state?.error) alertRef.current?.focus();
  }, [state]);

  return (
    <form action={action}>
      {state?.error ? (
        <div className="alert alert-error" role="alert" tabIndex={-1} ref={alertRef}>
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          maxLength={64}
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        {/* Paste is never blocked, so a password manager can fill this. */}
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
        />
      </div>

      <button type="submit" className="btn" disabled={pending} style={{ width: '100%' }}>
        {pending ? 'Signing in' : 'Sign in'}
      </button>
    </form>
  );
}
