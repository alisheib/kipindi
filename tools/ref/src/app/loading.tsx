import { SectionLoader } from "@/components/brand";

export default function RootLoading() {
  // 1280 = the board width tier. This was 1240, a one-off matching no page in the
  // app, so the generic fallback always reflowed into whatever route resolved next.
  return (
    <div className="mx-auto max-w-[1280px] px-3 lg:px-6 py-10">
      <SectionLoader height={360} />
    </div>
  );
}
