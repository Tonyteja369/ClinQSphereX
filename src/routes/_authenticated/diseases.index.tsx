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
        <section className="mx-auto max-w-6xl px-5 py-16">
          <h1 className="font-display text-3xl font-semibold">Explore research by disease</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Every disease area brings a different eligibility problem. Cardiovascular studies rest on
            routine measurements, oncology on subtype and prior treatment, stroke on timing, rare
            disease on very small populations. Each page shows live registry trials for that area and
            how protocol criteria become structured, checkable screening logic.
          </p>
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
