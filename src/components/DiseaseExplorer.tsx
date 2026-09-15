import { Link } from "@tanstack/react-router";
import { diseases } from "@/lib/diseases";
import { diseaseVisual } from "@/lib/disease-visuals";

export function DiseaseExplorer({ limit }: { limit?: number }) {
  const items = limit ? diseases.slice(0, limit) : diseases;
  return (
    <ul className="disease-gallery grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((d) => {
        const visual = diseaseVisual(d.slug);
        return (
          <li key={d.slug} className="disease-card surface lift flex flex-col overflow-hidden">
            {visual && (
              <div className="disease-card-visual relative aspect-[16/10] overflow-hidden bg-secondary">
                <img
                  src={visual.url}
                  alt={visual.alt}
                  width={1024}
                  height={1024}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="disease-card-reflection" aria-hidden />
              </div>
            )}
            <div className="flex flex-1 flex-col p-5">
              <h3 className="font-display text-base font-semibold">{d.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{d.focus}</p>
              <dl className="mt-4 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <dt>Registry trials</dt>
                  <dd className="text-right">Searched live</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Research data</dt>
                  <dd className="text-right">{d.dataStatus}</dd>
                </div>
              </dl>
              <Link
                to="/diseases/$slug"
                params={{ slug: d.slug }}
                className="nav-prism mt-4 inline-flex w-fit rounded-full border border-border/70 bg-card/70 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-card"
              >
                Explore {d.short} →
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
