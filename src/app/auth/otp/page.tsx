import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Pattern } from "@/components/ui/pattern";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { verifyLoginOtpAction } from "../login/actions";

export const metadata = { title: "Enter code · Weka msimbo" };

export default async function OtpPage({ searchParams }: { searchParams: Promise<{ purpose?: string; phone?: string }> }) {
  const sp = await searchParams;
  const purpose = (sp.purpose ?? "login") as "login" | "register" | "withdraw" | "reauth" | "self_exclusion";
  const phone = sp.phone ?? "";
  const masked = phone ? phone.slice(0, 4) + "*****" + phone.slice(-2) : "+255*****";

  return (
    <div className="relative min-h-[calc(100vh-44px)] grid place-items-center px-3 py-8">
      <Pattern kind="sokoni" opacity={0.04} color="var(--gold)" className="!fixed inset-0" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="text-royal hover:text-royal-hover transition-colors duration-micro inline-block mb-5">
          <Logo variant="primary" className="h-7" />
        </Link>
        <Card className="border-2 border-border-strong">
          <CardBody className="p-5 lg:p-6 space-y-4">
            <div>
              <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold">Verification · Uthibitisho</p>
              <h1 className="font-display font-bold text-title-md text-text mt-1.5">Enter the 6-digit code</h1>
              <p className="text-body-sm text-text-secondary mt-1">
                Sent to <span className="font-mono text-text font-bold">{masked}</span> · Imetumwa.
              </p>
            </div>
            <form action={verifyLoginOtpAction} className="space-y-3">
              <input type="hidden" name="phone" value={phone} />
              <input type="hidden" name="purpose" value={purpose} />
              <div>
                <label htmlFor="code" className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1.5">Code · Msimbo</label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="• • • • • •"
                  className="w-full h-14 px-3 text-center rounded-md bg-surface border-2 border-border text-text font-mono text-title-md tabular tracking-[0.6em] focus:outline-none focus:border-gold focus:ring-2 focus:ring-[var(--gold)]/30 transition-colors"
                />
                <p className="text-micro text-text-tertiary mt-1.5">Code valid for 5 minutes · Msimbo ni kwa dakika 5.</p>
              </div>
              <Button type="submit" variant="gold" size="xl" fullWidth>Verify · Thibitisha</Button>
            </form>
            <div className="flex items-center justify-between pt-2 border-t border-border-divider">
              <Link href={purpose === "register" ? "/auth/register" : "/auth/login"} className="text-body-sm font-bold text-text-secondary hover:text-text transition-colors">
                ← Change number
              </Link>
              <Link href={purpose === "register" ? "/auth/register" : "/auth/login"} className="text-body-sm font-bold text-royal hover:text-royal-hover transition-colors">
                Resend code
              </Link>
            </div>
          </CardBody>
        </Card>
        <p className="text-micro text-text-tertiary text-center mt-4">
          5 wrong attempts triggers a cool-down. · Majaribio 5 mabaya — lazimsubiri.
        </p>
      </div>
    </div>
  );
}
