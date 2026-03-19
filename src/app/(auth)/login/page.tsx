import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import {
  JsonLd,
  OG_IMAGES,
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  speakableJsonLd,
} from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Sign In to Your Dashboard",
  description:
    "Log in to your Optic Rank dashboard to track keyword rankings, monitor competitors, and access AI-powered SEO insights for your website.",
  alternates: { canonical: "/login" },
  openGraph: {
    title: "Sign In to Your Dashboard",
    description:
      "Access your Optic Rank SEO intelligence dashboard.",
    images: OG_IMAGES,
  },
};

export default function LoginPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Sign In", path: "/login" }])} />
      <JsonLd data={speakableJsonLd(["h1", "h2", "h3", "p"], "/login")} />
      <JsonLd
        data={howToJsonLd(
          "How to sign in to your Optic Rank dashboard",
          "Access your SEO intelligence dashboard in three quick steps.",
          [
            { name: "Go to the sign-in page", text: "Navigate to opticrank.com/login or click 'Sign In' from the top navigation bar." },
            { name: "Enter your credentials", text: "Type your registered email address and password, or use Google/GitHub single sign-on for one-click access." },
            { name: "Access your dashboard", text: "After successful authentication, you'll be redirected to your SEO intelligence dashboard with all your projects and data." },
          ]
        )}
      />
      <JsonLd
        data={faqJsonLd([
          { question: "How do I sign in to Optic Rank?", answer: "Enter your email and password on the login page, or use Google or GitHub single sign-on. If you've forgotten your password, click 'Forgot password?' to reset it." },
          { question: "What should I do if I forgot my password?", answer: "Click the 'Forgot password?' link on the login page and enter your email address. You'll receive a secure reset link within minutes." },
          { question: "Can I sign in with Google or GitHub?", answer: "Yes. Optic Rank supports single sign-on with Google and GitHub for quick, secure access to your dashboard." },
        ])}
      />

      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-8 w-48 animate-pulse bg-surface-raised" />
            <div className="h-4 w-64 animate-pulse bg-surface-raised" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>

      {/* AEO: visible question headings, lists, and FAQ content */}
      <section className="mx-auto max-w-md px-6 pb-12 pt-8">
        <h2 className="font-serif text-lg font-bold text-ink">
          Why sign in to Optic Rank?
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
            Track keyword rankings across all major search engines
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
            Monitor competitor strategies in real time
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
            Get AI-powered SEO insights and recommendations
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
            Run technical site audits with one click
          </li>
        </ul>

        <h3 className="mt-6 font-serif text-base font-bold text-ink">
          How do I reset my password?
        </h3>
        <p className="mt-2 text-sm text-ink-secondary">
          Click &quot;Forgot password?&quot; below the sign-in form and enter your email address.
          You&apos;ll receive a secure reset link within minutes.
        </p>
      </section>
    </>
  );
}
