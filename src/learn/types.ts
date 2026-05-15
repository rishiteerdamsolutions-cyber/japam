/** SEO guide page JSON schema (version 1). */
export interface SeoTextRun {
  text: string;
  bold?: boolean;
  underline?: boolean;
}

export type SeoBlock =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; runs: SeoTextRun[] }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'blockquote'; runs: SeoTextRun[] };

export interface SeoCta {
  id: string;
  position: string;
  label: string;
  href: string;
  style: 'primary' | 'secondary';
}

export interface SeoFaq {
  question: string;
  answer: string;
}

export interface SeoRelatedPage {
  pageId: string;
  label: string;
}

export interface SeoPageContent {
  schemaVersion: 1;
  pageId: string;
  lang: string;
  slug: string;
  deityId: string | null;
  primaryKeyword: string;
  secondaryKeywords: string[];
  meta: {
    title: string;
    description: string;
    ogImage?: string;
  };
  blocks: SeoBlock[];
  ctas: SeoCta[];
  faqs: SeoFaq[];
  disclaimer: { text: string };
  relatedPages: SeoRelatedPage[];
}
