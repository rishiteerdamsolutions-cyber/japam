import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { loadSeoPage } from '../../learn/loadSeoPage';
import type { SeoPageContent } from '../../learn/types';
import { SeoContentRenderer } from '../../learn/SeoContentRenderer';
import { useSeoPageMeta } from '../../learn/useSeoPageMeta';
import {
  isSeoLang,
  isSeoSlug,
  learnPagePath,
  SEO_DEFAULT_LANG,
} from '../../learn/seoInventory';

function FaqSection({ faqs }: { faqs: SeoPageContent['faqs'] }) {
  return (
    <section className="mt-10" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="text-xl sm:text-2xl font-semibold text-amber-300 mb-4">
        Frequently asked questions
      </h2>
      <dl className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-4">
            <dt className="font-semibold text-amber-200 mb-2">{faq.question}</dt>
            <dd className="text-amber-100/80 text-sm leading-relaxed">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AfterFaqCtas({ ctas }: { ctas: SeoPageContent['ctas'] }) {
  const items = ctas.filter((c) => c.position === 'after-faq');
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3 mt-6">
      {items.map((cta) => (
        <a
          key={cta.id}
          href={cta.href}
          className={
            cta.style === 'primary'
              ? 'inline-flex items-center justify-center min-h-[48px] px-6 py-3 rounded-xl font-semibold text-[#4a148c] bg-gradient-to-b from-amber-200 to-amber-400'
              : 'inline-flex items-center justify-center min-h-[48px] px-6 py-3 rounded-xl font-semibold text-amber-100 border-2 border-amber-400/50 bg-white/10'
          }
        >
          {cta.label}
        </a>
      ))}
    </div>
  );
}

function StickyCtaBar({ ctas }: { ctas: SeoPageContent['ctas'] }) {
  const primary =
    ctas.find((c) => c.position === 'sticky-footer' && c.style === 'primary') ??
    ctas.find((c) => c.position === 'sticky-footer') ??
    ctas.find((c) => c.id === 'start-japa');
  if (!primary) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#4a148c]/95 border-t border-amber-500/30 backdrop-blur-md md:hidden">
      <a
        href={primary.href}
        className="flex items-center justify-center w-full min-h-[48px] rounded-xl font-semibold text-[#4a148c] bg-gradient-to-b from-amber-200 to-amber-400 shadow-lg touch-manipulation"
      >
        {primary.label}
      </a>
    </div>
  );
}

function RelatedLinks({
  related,
  lang,
}: {
  related: SeoPageContent['relatedPages'];
  lang: string;
}) {
  if (related.length === 0) return null;
  return (
    <nav className="mt-10 pt-8 border-t border-white/10" aria-label="Related guides">
      <h2 className="text-lg font-semibold text-amber-300 mb-3">Related guides</h2>
      <ul className="flex flex-wrap gap-2">
        {related.map((r) => (
          <li key={r.pageId}>
            <Link
              to={learnPagePath(lang, r.pageId)}
              className="inline-block px-3 py-2 rounded-lg text-sm text-amber-200 bg-white/10 hover:bg-white/15 border border-amber-500/20"
            >
              {r.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function LearnPage() {
  const { lang: langParam = '', slug: slugParam = '' } = useParams<{ lang: string; slug: string }>();
  const [page, setPage] = useState<SeoPageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const lang = isSeoLang(langParam) ? langParam : SEO_DEFAULT_LANG;
  const slug = isSeoSlug(slugParam) ? slugParam : 'japa-108-times';
  const needsLangRedirect = langParam !== '' && !isSeoLang(langParam);
  const needsSlugRedirect = slugParam !== '' && !isSeoSlug(slugParam);

  useSeoPageMeta(loading || notFound ? null : page, lang, slug);

  useEffect(() => {
    if (needsLangRedirect || needsSlugRedirect) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    loadSeoPage(lang, slug).then((data) => {
      if (cancelled) return;
      if (!data) {
        setPage(null);
        setNotFound(true);
      } else {
        setPage(data);
        setNotFound(false);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [lang, slug, needsLangRedirect, needsSlugRedirect]);

  if (needsLangRedirect) {
    return <Navigate to={learnPagePath(SEO_DEFAULT_LANG, isSeoSlug(slugParam) ? slugParam : 'japa-108-times')} replace />;
  }
  if (needsSlugRedirect) {
    return <Navigate to={learnPagePath(lang, 'japa-108-times')} replace />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" aria-busy="true">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-amber-200/70 text-sm">Loading guide…</p>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-amber-300 mb-2">Guide not found</h1>
        <p className="text-amber-100/70 mb-6 text-sm">
          This article is not available yet. Try English or browse another topic.
        </p>
        <Link
          to={learnPagePath(SEO_DEFAULT_LANG, slug)}
          className="text-amber-400 hover:text-amber-300 underline"
        >
          View in English
        </Link>
      </div>
    );
  }

  return (
    <>
      <SeoContentRenderer blocks={page.blocks} ctas={page.ctas} />
      <FaqSection faqs={page.faqs} />
      <AfterFaqCtas ctas={page.ctas} />
      <p className="mt-10 text-xs text-amber-200/50 leading-relaxed border-t border-white/10 pt-6">
        {page.disclaimer.text}
      </p>
      <RelatedLinks related={page.relatedPages} lang={lang} />
      <StickyCtaBar ctas={page.ctas} />
    </>
  );
}
