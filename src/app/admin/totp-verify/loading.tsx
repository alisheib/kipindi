import { SkBar } from "@/components/admin/admin-skeletons";
export default function Loading() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-44px)] place-items-center px-3 py-6">
      <div className="w-full max-w-md space-y-4 animate-pulse">
        <div className="flex flex-col items-center gap-2 text-center">
          <SkBar className="h-7 w-44 rounded-pill" />
          <SkBar className="h-6 w-64" />
          <SkBar className="h-3.5 w-48" />
        </div>
        <div className="rounded-xl border border-brand-500 bg-bg-elevated p-5 lg:p-6 space-y-4">
          <SkBar className="h-4 w-3/4" />
          <SkBar className="h-11 w-full rounded-md" />
          <SkBar className="h-10 w-full rounded-md" />
        </div>
        <div className="rounded-xl border border-info-border bg-info-bg/[0.10] p-3.5">
          <SkBar className="h-3 w-full" />
        </div>
      </div>
    </main>
  );
}
