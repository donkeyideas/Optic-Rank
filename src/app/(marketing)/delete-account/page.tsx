import type { Metadata } from "next";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete Your Account",
  description:
    "Request deletion of your Optic Rank account and associated data. Learn about our data deletion process and what happens to your information.",
  alternates: { canonical: "/delete-account" },
  openGraph: {
    title: "Delete Your Account — Optic Rank",
    description:
      "Request deletion of your Optic Rank account and associated data.",
    images: OG_IMAGES,
  },
};

export default function DeleteAccountPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Delete Account", path: "/delete-account" },
        ])}
      />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12 border-b border-rule pb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
            Account
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight text-ink">
            Delete Your Account
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Last updated: March 21, 2026
          </p>
        </header>

        <div className="prose-editorial space-y-8 text-sm leading-relaxed text-ink-secondary">
          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              How to Delete Your Account
            </h2>
            <p>
              You can delete your Optic Rank account at any time. There are two
              ways to do this:
            </p>

            <h3 className="mt-4 font-sans text-base font-semibold text-ink">
              Option 1: From the App or Dashboard
            </h3>
            <ol className="ml-6 list-decimal space-y-2">
              <li>
                Log in to your account at{" "}
                <Link href="/login" className="text-editorial-red underline underline-offset-2 hover:text-editorial-red/80">
                  opticrank.com/login
                </Link>{" "}
                or open the Optic Rank mobile app.
              </li>
              <li>
                Go to <strong className="text-ink">Settings</strong> from the sidebar or
                menu.
              </li>
              <li>
                Scroll to the <strong className="text-ink">Danger Zone</strong> section at
                the bottom.
              </li>
              <li>
                Click <strong className="text-ink">&quot;Delete Account&quot;</strong> and
                confirm the action.
              </li>
            </ol>

            <h3 className="mt-6 font-sans text-base font-semibold text-ink">
              Option 2: Email Request
            </h3>
            <p>
              If you are unable to access your account, you can request account
              deletion by emailing us at{" "}
              <a
                href="mailto:support@opticrank.com"
                className="text-editorial-red underline underline-offset-2 hover:text-editorial-red/80"
              >
                support@opticrank.com
              </a>{" "}
              from the email address associated with your account. Please include
              &quot;Account Deletion Request&quot; in the subject line.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              What Gets Deleted
            </h2>
            <p>
              When you delete your account, we permanently remove the following
              data:
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Your profile information (name, email, avatar)</li>
              <li>All projects and their settings</li>
              <li>Keywords, rank tracking history, and predictions</li>
              <li>Site audit results and crawl data</li>
              <li>Content briefs, calendar entries, and content analysis</li>
              <li>Entity tracking and AI visibility checks</li>
              <li>Backlink monitoring data</li>
              <li>API keys and integration configurations</li>
              <li>Notification preferences and report schedules</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              Data Deletion Without Account Deletion
            </h2>
            <p>
              You can also request deletion of specific data without closing your
              account entirely. For example, you may want to:
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Delete a specific project and all its associated data</li>
              <li>Clear your rank tracking history</li>
              <li>Remove audit and crawl records</li>
              <li>Delete content briefs or calendar entries</li>
            </ul>
            <p className="mt-3">
              You can do most of this directly from your dashboard. For bulk data
              deletion requests, email{" "}
              <a
                href="mailto:support@opticrank.com"
                className="text-editorial-red underline underline-offset-2 hover:text-editorial-red/80"
              >
                support@opticrank.com
              </a>{" "}
              with the details of what you would like removed.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              Processing Time
            </h2>
            <p>
              Account deletions initiated from the dashboard or app are processed
              immediately. Email requests are processed within 48 hours. Once
              deletion is complete, you will receive a confirmation email.
            </p>
            <p>
              After deletion, your data cannot be recovered. If you have an
              active subscription, it will be cancelled and no further charges
              will be made.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              Data Retention
            </h2>
            <p>
              Following account deletion, we may retain certain anonymized,
              aggregated data that cannot be used to identify you. We may also
              retain records required by law (such as billing invoices) for the
              legally mandated retention period. For full details, see our{" "}
              <Link
                href="/privacy"
                className="text-editorial-red underline underline-offset-2 hover:text-editorial-red/80"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              Questions?
            </h2>
            <p>
              If you have any questions about account or data deletion, contact
              us at{" "}
              <a
                href="mailto:support@opticrank.com"
                className="text-editorial-red underline underline-offset-2 hover:text-editorial-red/80"
              >
                support@opticrank.com
              </a>{" "}
              or visit our{" "}
              <Link
                href="/contact"
                className="text-editorial-red underline underline-offset-2 hover:text-editorial-red/80"
              >
                Contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
