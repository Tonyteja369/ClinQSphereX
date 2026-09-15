import { createFileRoute } from "@tanstack/react-router";
import { DiseaseExplorer } from "@/components/DiseaseExplorer";
import { SafetyBanner } from "@/components/SafetyBanner";

export const Route = createFileRoute("/_authenticated/diseases/")({
  head: () => ({
    meta: [
      { title: "Research by Disease Area — ClinQSphereX" },
      {
        name: "description",
        content:
          "Explore clinical research workflows by disease area: heart and cardiovascular, cancer, diabetes, stroke, kidney, neurological, respiratory and rare diseases.",
      },
      { property: "og:title", content: "Research by Disease Area — ClinQSphereX" },
      {
        property: "og:description",
        content:
          "Live registry trial discovery and structured eligibility screening across eight major disease areas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiseasesIndex,
});

function DiseasesIndex() {
  return (
    <>
      <main className="min-h-screen bg-transparent">
        <section className="mx-auto max-w-6xl px-3 py-8 sm:px-5 sm:py-12">
          <header className="disease-overview-head">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Clinical research atlas</p>
              <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Explore research by disease</h1>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every disease area brings a different eligibility problem. Cardiovascular studies rest on
            routine measurements, oncology on subtype and prior treatment, stroke on timing, rare
            disease on very small populations. Each page shows live registry trials for that area and
            how protocol criteria become structured, checkable screening logic.
            </p>
          </header>
          <div className="mt-8">
            <SafetyBanner />
          </div>
          <div className="mt-10">
            <DiseaseExplorer />
          </div>
        </section>
      </main>
    </>
  );
}
