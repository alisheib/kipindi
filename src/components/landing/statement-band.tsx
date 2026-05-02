import { Pattern } from "@/components/ui/pattern";

/** Dual-language statement band — huge type, both EN and SW side by side. */
export function StatementBand() {
  return (
    <section className="relative rounded-2xl overflow-hidden border border-royal/40 bg-[#060F24]">
      <div className="absolute inset-0 bg-g-brand" aria-hidden />
      <Pattern kind="mfumo" opacity={0.05} color="var(--gold)" />
      <div
        aria-hidden
        className="absolute -bottom-40 left-1/2 -translate-x-1/2 h-72 w-[120%] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(222,188,84,0.16) 0%, rgba(222,188,84,0) 60%)" }}
      />
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12 p-6 lg:p-12 text-onBrand">
        <div>
          <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold opacity-90">English</p>
          <p className="font-display font-bold text-title-md lg:text-title-lg leading-tight tracking-tight mt-2">
            We don&apos;t do<br />two-hundred markets.<br />
            <span className="text-gold">We do five windows,</span><br />
            <span className="text-gold">three calls,</span><br />
            <span className="text-gold">one fair pool.</span>
          </p>
        </div>
        <div>
          <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold opacity-90">Kiswahili</p>
          <p className="font-display font-bold text-title-md lg:text-title-lg leading-tight tracking-tight mt-2 italic">
            Hatutoi soko<br />mia mbili.<br />
            <span className="text-gold not-italic">Tunatoa vipindi vitano,</span><br />
            <span className="text-gold not-italic">chaguzi tatu,</span><br />
            <span className="text-gold not-italic">bwawa moja la haki.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
