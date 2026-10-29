"use client";

import { ArrowRight, ShoppingBag } from "lucide-react";

const errors: Record<string, string> = {
  invalid_credentials: "That password isn’t correct. Check it and try again.",
  invalid_request: "We couldn’t process that sign-in. Please try again.",
  session_expired: "Your session has expired. Enter the staff password again to continue.",
  unauthenticated: "Enter the staff password to continue.",
  configuration: "Staff access isn’t configured yet. Ask an administrator to finish setup.",
};

export default function LoginForm({ errorCode, signedOut }: { errorCode?: string; signedOut: boolean }) {
  return (
    <main className="login-shell">
      <section className="login-brand-panel" aria-label="Leo’s Juice & Burger">
        <div className="login-brand">
          <span className="brand-mark"><ShoppingBag size={20} /></span>
          <span><strong>Leo’s</strong><small>Juice & Burger</small></span>
        </div>
        <div className="login-brand-copy">
          <p className="login-kicker">Good food. Good company.</p>
          <h1>Every service<br />starts with you.</h1>
          <p className="login-brand-note">A quieter place to take care of the details that make a visit memorable.</p>
        </div>
        <p className="login-brand-footer">Staff workspace · Tirana</p>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <p className="eyebrow">Staff workspace</p>
          <h2 className="login-title">Welcome back</h2>
          <p className="login-description">Enter the shared staff password to continue.</p>
          {signedOut && <div className="login-success" role="status">You’ve been signed out.</div>}
          {errorCode && <div className="login-alert" role="alert">{errors[errorCode] ?? errors.invalid_request}</div>}
          <form className="login-form" action="/auth/login" method="post">
            <label className="login-field">
              <span>Staff password</span>
              <input
                autoComplete="current-password"
                type="password"
                name="password"
                placeholder="Enter the staff password"
                required
                autoFocus
              />
            </label>
            <button className="primary-button login-submit" type="submit">
              Sign in <ArrowRight size={15} />
            </button>
          </form>
          <p className="login-help">Ask your manager for the staff password.</p>
        </div>
      </section>
    </main>
  );
}
