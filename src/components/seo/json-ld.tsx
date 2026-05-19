export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001";

/** Shared OG image config — import into every page metadata to avoid override loss. */
export const OG_IMAGES = [
  {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: "Optic Rank — AI-Powered SEO Intelligence",
  },
];

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Optic Rank",
    url: BASE_URL,
    logo: `${BASE_URL}/icon.png`,
    description:
      "AI-powered SEO intelligence platform for modern marketing teams.",
    foundingDate: "2024",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${BASE_URL}/contact`,
    },
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Optic Rank",
    url: BASE_URL,
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Optic Rank",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: BASE_URL,
    description:
      "AI-powered SEO dashboard tool and search engine ranking software. Track keyword rankings, monitor competitors, audit sites, and get AI content analysis insights. The SEO analytics software for tracking SEO performance.",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "199",
      priceCurrency: "USD",
      offerCount: "4",
    },
    featureList: [
      "Keyword Rank Checker",
      "Website Ranking Tracker",
      "SEO Competitor Analysis Tool",
      "Technical Site Audit",
      "Backlink Monitoring",
      "AI-Powered SEO Insights",
      "AI Content Analysis",
      "Local SEO Tools",
      "App Store Optimization",
      "Social Media Intelligence",
      "SEO Analytics Software",
    ],
  };
}

export function speakableJsonLd(
  cssSelectors: string[],
  url: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Optic Rank",
    url: `${BASE_URL}${url}`,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: cssSelectors,
    },
  };
}

export function howToJsonLd(
  name: string,
  description: string,
  steps: { name: string; text: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: BASE_URL,
      },
      ...items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: item.name,
        item: `${BASE_URL}${item.path}`,
      })),
    ],
  };
}

export function definitionJsonLd(term: string, definition: string) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term,
    description: definition,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "SEO Glossary",
      url: `${BASE_URL}/glossary`,
    },
  };
}

export function faqJsonLd(
  faqs: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
