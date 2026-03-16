import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Reset Your Password",
  description:
    "Forgot your Optic Rank password? Enter your email address and we'll send you a secure link to reset your password and regain access to your SEO dashboard.",
  alternates: { canonical: "/forgot-password" },
  openGraph: {
    title: "Reset Your Password",
    description:
      "Reset your Optic Rank password to regain access to your dashboard.",
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
      <ForgotPasswordForm />
    </>
  );
}
