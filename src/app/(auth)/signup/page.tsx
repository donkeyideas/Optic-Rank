import type { Metadata } from "next";
import { SignupForm } from "./signup-form";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Create Your Free Account",
  description:
    "Get started with Optic Rank for free. Track keywords, audit your site, and unlock AI-powered SEO intelligence. No credit card required to start.",
  alternates: { canonical: "/signup" },
  openGraph: {
    title: "Create Your Free Account",
    description:
      "Start your free trial of Optic Rank. No credit card required.",
  },
};

export default function SignupPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Sign Up", path: "/signup" }])} />
      <SignupForm />
    </>
  );
}
