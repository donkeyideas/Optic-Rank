import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";
import {
  JsonLd,
  OG_IMAGES,
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  speakableJsonLd,
} from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Reset Your Password",
  description:
    "Forgot your Optic Rank password? Enter your email and we'll send a secure reset link to regain access to your SEO dashboard.",
  alternates: { canonical: "/forgot-password" },
  openGraph: {
    title: "Reset Your Password",
    description:
      "Reset your Optic Rank password to regain access to your dashboard.",
    images: OG_IMAGES,
  },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Reset Password", path: "/forgot-password" },
        ])}
      />
      <JsonLd data={speakableJsonLd(["h1", "h2", "h3", "p"], "/forgot-password")} />
      <JsonLd
        data={howToJsonLd(
          "How to reset your Optic Rank password",
          "Recover access to your SEO dashboard in three simple steps.",
          [
            { name: "Enter your email address", text: "Type the email address associated with your Optic Rank account into the reset form." },
            { name: "Check your inbox", text: "Open the password reset email from Optic Rank and click the secure reset link. The link expires after 1 hour." },
            { name: "Create a new password", text: "Choose a strong new password and confirm it. You'll be automatically signed in and redirected to your dashboard." },
          ]
        )}
      />
      <JsonLd
        data={faqJsonLd([
          { question: "How do I reset my Optic Rank password?", answer: "Enter your email address on the password reset page. You'll receive a secure link within minutes to create a new password." },
          { question: "How long is the reset link valid?", answer: "Password reset links expire after 1 hour for security. If your link has expired, simply request a new one." },
          { question: "What if I don't receive the reset email?", answer: "Check your spam or junk folder first. If you still don't see it, ensure you're using the email address you registered with, or contact support at opticrank.com/contact." },
        ])}
      />

      <h1 className="sr-only">Reset Your Optic Rank Password</h1>
      <ForgotPasswordForm />

      {/* AEO: visible question headings, lists, and FAQ content */}
      <section className="mx-auto max-w-md px-6 pb-12 pt-8">
        <h2 className="font-serif text-lg font-bold text-ink">
          How does password reset work?
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-secondary">
          <li>Enter the email address linked to your account</li>
          <li>Check your inbox for a secure reset link</li>
          <li>Click the link and create a new password</li>
          <li>You&apos;ll be signed in automatically</li>
        </ol>

        <h3 className="mt-6 font-serif text-base font-bold text-ink">
          What if I don&apos;t receive the reset email?
        </h3>
        <p className="mt-2 text-sm text-ink-secondary">
          Check your spam or junk folder first. Make sure you&apos;re using the same email address
          you registered with. If you still need help, contact us at opticrank.com/contact.
        </p>
      </section>
    </>
  );
}
