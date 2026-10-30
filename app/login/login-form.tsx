"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { LanguageToggle, Translated } from "@/components/language";

const errors: Record<string, string> = {
  invalid_credentials: "That password isn’t correct. Check it and try again.",
  invalid_request: "We couldn’t process that sign-in. Please try again.",
  session_expired: "Your session has expired. Enter the staff password again to continue.",
  unauthenticated: "Enter the staff password to continue.",
  configuration: "Staff access isn’t configured yet. Ask an administrator to finish setup.",
};

export default function LoginForm({ errorCode, signedOut }: { errorCode?: string; signedOut: boolean }) {
  return (
    <Translated><main className="login-shell">
      <section className="login-brand-panel" aria-label="Leo’s Juice & Burger">
        <div className="login-brand">
          <Image className="login-brand-logo" src="/leos-juice-burger-badge.png" alt="Leo’s Juice & Burger" width={112} height={112} priority />
        </div>
        <div className="login-brand-copy">
          <h1>Welcome back.</h1>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <LanguageToggle className="login-language" />
          <p className="login-description">Enter the staff password.</p>
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
        </div>
      </section>
    </main></Translated>
  );
}
