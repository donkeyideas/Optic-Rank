import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Sign In to Your Dashboard",
  description:
    "Log in to your Optic Rank dashboard to track keyword rankings, monitor competitors, and access AI-powered SEO insights for your website.",
  alternates: { canonical: "/login" },
  openGraph: {
    title: "Sign In to Your Dashboard",
    description:
      "Access your Optic Rank SEO intelligence dashboard.",
  },
};

export default function LoginPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Sign In", path: "/login" }])} />
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
    </>
  );
}
