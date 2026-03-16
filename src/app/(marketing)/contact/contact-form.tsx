"use client";

import { useState } from "react";
import { submitContact } from "@/lib/actions/contact";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = await submitContact({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
      _hp: formData.get("website_url") as string,
    });

    if ("error" in result) {
      setStatus("error");
      setErrorMsg(result.error);
    } else {
      setStatus("success");
      form.reset();
    }
  }

  if (status === "success") {
    return (
      <div className="border-2 border-editorial-green p-8 text-center">
        <h3 className="font-serif text-xl font-bold text-ink">
          Message Sent!
        </h3>
        <p className="mt-2 text-sm text-ink-secondary">
          Thank you for reaching out. We&apos;ll get back to you within 1-2 business days.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-medium text-editorial-red hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot — hidden from humans, bots will fill it */}
      <div aria-hidden="true" className="absolute -left-[9999px] -top-[9999px]">
        <label htmlFor="website_url">Website</label>
        <input id="website_url" name="website_url" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor="name" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-ink-muted">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full border border-rule bg-surface-cream px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          placeholder="Your full name"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-ink-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full border border-rule bg-surface-cream px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label htmlFor="subject" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-ink-muted">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          className="w-full border border-rule bg-surface-cream px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          placeholder="What is this about?"
        />
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-ink-muted">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full border border-rule bg-surface-cream px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          placeholder="Tell us how we can help..."
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-editorial-red">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex h-11 items-center justify-center bg-editorial-red px-8 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-50"
      >
        {status === "loading" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
