import type { Metadata } from "next";
import { SignupForm } from "./signup-form";
import {
  JsonLd,
  OG_IMAGES,
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  speakableJsonLd,
} from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Create Your Free Account",
  description:
    "Get started with Optic Rank for free. Track keywords, audit your site, and unlock AI-powered SEO intelligence. No credit card required to start.",
  alternates: { canonical: "/signup" },
  openGraph: {
    title: "Create Your Free Account",
    description:
      "Start your free trial of Optic Rank. No credit card required.",
    images: OG_IMAGES,
  },
};

export default function SignupPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Sign Up", path: "/signup" }])} />
      <JsonLd data={speakableJsonLd(["h1", "h2", "h3", "p"], "/signup")} />
      <JsonLd
        data={howToJsonLd(
          "How to create your free Optic Rank account",
          "Sign up for Optic Rank in three simple steps — no credit card required.",
          [
            { name: "Enter your details", text: "Provide your name, email address, and choose a secure password. Or sign up instantly with Google or GitHub." },
            { name: "Verify your email", text: "Check your inbox for a verification email and click the confirmation link to activate your account." },
            { name: "Set up your first project", text: "Add your website domain, import your target keywords, and connect Google Search Console to start tracking rankings immediately." },
          ]
        )}
      />
      <JsonLd
        data={faqJsonLd([
          { question: "Is Optic Rank free to use?", answer: "Yes. Optic Rank offers a free starter plan with core features. Paid plans start at $29/month and include a 14-day free trial with no credit card required." },
          { question: "What do I need to create an account?", answer: "Just an email address and password. You can also sign up with Google or GitHub for one-click registration." },
          { question: "How long does setup take?", answer: "Account creation takes under a minute. Setting up your first project with keyword tracking and Google Search Console integration takes about 5 minutes." },
        ])}
      />

      <h1 className="sr-only">Create Your Free Optic Rank Account</h1>
      <SignupForm />

      {/* AEO: visible question headings, lists, and FAQ content */}
      <section className="mx-auto max-w-md px-6 pb-12 pt-8">
        <h2 className="font-serif text-lg font-bold text-ink">
          What do you get with a free account?
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
            Track up to 50 keywords across search engines
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
            Monitor 2 competitor websites
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
            Run basic technical site audits
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
            Access AI-powered SEO recommendations
          </li>
        </ul>

        <h3 className="mt-6 font-serif text-base font-bold text-ink">
          Do I need a credit card to sign up?
        </h3>
        <p className="mt-2 text-sm text-ink-secondary">
          No. The free plan requires no payment information. Paid plans include a 14-day free
          trial, also with no credit card required upfront.
        </p>
      </section>
    </>
  );
}
