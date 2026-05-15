import type { SeoTextRun } from './types';

export function SeoTextRuns({ runs }: { runs: SeoTextRun[] }) {
  return (
    <>
      {runs.map((run, i) => {
        let node: React.ReactNode = run.text;
        if (run.bold) node = <strong className="text-white font-semibold">{node}</strong>;
        if (run.underline) node = <span className="underline decoration-amber-400/60">{node}</span>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}
