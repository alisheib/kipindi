import { SectionLoader } from "@/components/brand";

export default function RootLoading() {
  return (
    <div className="mx-auto max-w-[1240px] px-3 lg:px-6 py-10">
      <SectionLoader height={360} />
    </div>
  );
}
