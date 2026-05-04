"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

interface GlossaryTerm {
  term: string;
  slug: string;
  short_definition: string;
  category: string;
}

export function GlossarySearch({ terms }: { terms: GlossaryTerm[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? terms.filter(
        (t) =>
          t.term.toLowerCase().includes(query.toLowerCase()) ||
          t.short_definition.toLowerCase().includes(query.toLowerCase())
      )
    : terms;

  // Group by first letter
  const grouped = new Map<string, GlossaryTerm[]>();
  for (const term of filtered) {
    const letter = term.term[0].toUpperCase();
    if (!grouped.has(letter)) grouped.set(letter, []);
    grouped.get(letter)!.push(term);
  }

  const letters = [...grouped.keys()].sort();

  return (
    <div>
      {/* Search */}
      <div className="relative mb-8">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms..."
          className="h-12 w-full border border-rule bg-surface-cream pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
        />
      </div>

      {/* Alphabet Jump */}
      {!query && (
        <div className="mb-8 flex flex-wrap gap-1">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="flex h-8 w-8 items-center justify-center border border-rule text-xs font-bold text-ink-secondary transition-colors hover:border-editorial-red hover:text-editorial-red"
            >
              {letter}
            </a>
          ))}
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">
          No terms found matching &ldquo;{query}&rdquo;
        </p>
      ) : (
        <div className="space-y-8">
          {letters.map((letter) => (
            <div key={letter} id={`letter-${letter}`}>
              <div className="mb-3 border-b-2 border-rule-dark pb-1">
                <span className="font-serif text-2xl font-bold text-editorial-red">
                  {letter}
                </span>
              </div>
              <div className="space-y-1">
                {grouped.get(letter)!.map((term) => (
                  <Link
                    key={term.slug}
                    href={`/glossary/${term.slug}`}
                    className="group flex items-start justify-between border-b border-rule px-2 py-3 transition-colors hover:bg-surface-raised"
                  >
                    <div className="flex-1">
                      <h3 className="font-serif text-base font-bold text-ink group-hover:text-editorial-red">
                        {term.term}
                      </h3>
                      <p className="mt-0.5 text-sm text-ink-secondary line-clamp-1">
                        {term.short_definition}
                      </p>
                    </div>
                    <span className="ml-4 mt-1 shrink-0 text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                      {term.category.replace(/-/g, " ")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
