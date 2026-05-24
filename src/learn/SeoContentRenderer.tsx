import type { SeoBlock, SeoCta } from './types';
import { SeoTextRuns } from './SeoTextRuns';
import { PushableLink } from '../components/ui/PushableButton';
import { pushablePrimaryFrontClass } from '../lib/landingCtaStyles';

function CtaButton({ cta }: { cta: SeoCta }) {
  return (
    <PushableLink
      href={cta.href}
      layout="inline"
      frontClassName={`${pushablePrimaryFrontClass} text-center touch-manipulation px-6`}
      data-cta-id={cta.id}
      data-cta-position={cta.position}
    >
      {cta.label}
    </PushableLink>
  );
}

function CtaRow({ ctas }: { ctas: SeoCta[] }) {
  if (ctas.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3 py-4">
      {ctas.map((cta) => (
        <CtaButton key={cta.id} cta={cta} />
      ))}
    </div>
  );
}

function ctasAt(ctas: SeoCta[], position: string): SeoCta[] {
  return ctas.filter((c) => c.position === position);
}

function isHowToHeading(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes('how to chant') || t.includes('how to practice') || t.includes('जप कैसे');
}

interface SeoContentRendererProps {
  blocks: SeoBlock[];
  ctas: SeoCta[];
}

export function SeoContentRenderer({ blocks, ctas }: SeoContentRendererProps) {
  const aboveFold = ctasAt(ctas, 'above-fold');
  const afterHowTo = ctasAt(ctas, 'after-how-to');

  let introCount = 0;
  let pastHowTo = false;
  let insertedAboveFold = false;
  let insertedAfterHowTo = false;

  const nodes: React.ReactNode[] = [];

  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    const key = `${block.type}-${index}`;

    if (block.type === 'h1') {
      nodes.push(
        <h1 key={key} className="text-3xl sm:text-4xl font-bold text-amber-300 leading-tight">
          {block.text}
        </h1>,
      );
      continue;
    }

    if (block.type === 'h2') {
      if (isHowToHeading(block.text)) pastHowTo = true;
      nodes.push(
        <h2 key={key} className="text-xl sm:text-2xl font-semibold text-amber-300 mt-8 mb-3">
          {block.text}
        </h2>,
      );
      continue;
    }

    if (block.type === 'h3') {
      nodes.push(
        <h3 key={key} className="text-lg font-semibold text-amber-200/95 mt-4 mb-2">
          {block.text}
        </h3>,
      );
      continue;
    }

    if (block.type === 'p') {
      const inIntro = !pastHowTo;
      nodes.push(
        <p key={key}>
          <SeoTextRuns runs={block.runs} />
        </p>,
      );
      if (inIntro) {
        introCount += 1;
        if (introCount >= 2 && !insertedAboveFold && aboveFold.length > 0) {
          nodes.push(<CtaRow key="cta-above-fold" ctas={aboveFold} />);
          insertedAboveFold = true;
        }
      }
      continue;
    }

    if (block.type === 'ul') {
      nodes.push(
        <ul key={key} className="list-disc pl-5 space-y-2 text-sm sm:text-base">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>,
      );
      if (pastHowTo && !insertedAfterHowTo && afterHowTo.length > 0) {
        nodes.push(<CtaRow key="cta-after-how-to" ctas={afterHowTo} />);
        insertedAfterHowTo = true;
      }
      continue;
    }

    if (block.type === 'ol') {
      nodes.push(
        <ol key={key} className="list-decimal pl-5 space-y-2 text-sm sm:text-base">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>,
      );
      if (pastHowTo && !insertedAfterHowTo && afterHowTo.length > 0) {
        nodes.push(<CtaRow key="cta-after-how-to" ctas={afterHowTo} />);
        insertedAfterHowTo = true;
      }
      continue;
    }

    if (block.type === 'blockquote') {
      nodes.push(
        <blockquote
          key={key}
          className="border-l-4 border-amber-500/60 pl-4 py-2 my-4 text-lg text-amber-50/95 italic bg-white/5 rounded-r-lg"
        >
          <SeoTextRuns runs={block.runs} />
        </blockquote>,
      );
    }
  }

  if (!insertedAboveFold && aboveFold.length > 0) {
    nodes.unshift(<CtaRow key="cta-above-fold-fallback" ctas={aboveFold} />);
  }
  if (!insertedAfterHowTo && afterHowTo.length > 0) {
    nodes.push(<CtaRow key="cta-after-how-to-fallback" ctas={afterHowTo} />);
  }

  return <article className="space-y-4 text-amber-100/85 leading-relaxed">{nodes}</article>;
}
