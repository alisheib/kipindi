// ds-auth.jsx — Auth screens (login / register / OTP / forgot) — mobile-first 393px
const { useState: auS } = React;

function AuthPhone({ children, label }) {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
    <div style={{ width: 393, height: 720, borderRadius: 30, overflow: 'hidden', position: 'relative', background: 'var(--bg)', border: '8px solid oklch(8% 0.03 268)', boxShadow: '0 24px 60px oklch(6% 0.05 268 / 0.6)' }}>
      <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', ...mono, fontSize: 11, color: 'var(--text-muted)', background: 'var(--panel)' }}>
        <span>9:41</span><span>5G ▪ 84%</span>
      </div>
      <div style={{ position: 'absolute', top: 30, left: 0, right: 0, bottom: 0, overflow: 'auto', padding: '28px 24px' }}>{children}</div>
    </div>
    <div style={{ ...mono, fontSize: 11, color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
  </div>;
}
const Field = ({ label, children }) => <div style={{ marginBottom: 14 }}><div style={{ ...mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 7 }}>{label}</div>{children}</div>;
function PhoneInput({ value = '7XX XXX XXX' }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono, fontSize: 14, color: 'var(--text)', paddingRight: 10, borderRight: '1px solid var(--border)' }}><span style={{ width: 16, height: 11, borderRadius: 2, background: 'linear-gradient(180deg,#1eb53a 0 33%,#fcd116 33% 40%,#000 40% 60%,#fcd116 60% 67%,#00a3dd 67% 100%)' }} />+255</span>
    <span style={{ ...mono, fontSize: 15, color: 'var(--text-subtle)' }}>{value}</span>
  </div>;
}
function PwInput() {
  const [show, setShow] = auS(false);
  return <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 48, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
    <span style={{ ...mono, fontSize: 15, flex: 1, color: 'var(--text)', letterSpacing: show ? 0 : '0.15em' }}>{show ? 'Simba2027' : '••••••••'}</span>
    <span role="button" tabIndex={0} aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} style={{ color: 'var(--text-subtle)', cursor: 'pointer' }}>{Icon.watch({ s: 18 })}</span>
  </div>;
}
const AuthHead = ({ title, sw }) => <div style={{ textAlign: 'center', marginBottom: 22 }}><div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><BrandLockup size={36} /></div><div className="disp" style={{ fontSize: 22, fontWeight: 700 }}>{title}</div><div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-subtle)', marginTop: 3 }}>{sw}</div></div>;

function LoginScreen() {
  return <React.Fragment>
    <AuthHead title="Welcome back" sw="Karibu tena" />
    <Field label="Phone number · Namba"><PhoneInput /></Field>
    <Field label="Password · Nenosiri"><PwInput /></Field>
    <div style={{ textAlign: 'right', marginBottom: 18 }}><span style={{ fontSize: 12.5, color: 'var(--accent-400)' }}>Forgot? · Umesahau?</span></div>
    <Btn variant="gold" size="lg" full live>Sign in · Ingia</Btn>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0', color: 'var(--text-faint)' }}><div style={{ flex: 1, height: 1, background: 'var(--border)' }} /><span style={{ ...mono, fontSize: 10.5 }}>OR</span><div style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>
    <Btn variant="outline" size="lg" full live>Create an account · Fungua</Btn>
    <p style={{ ...mono, fontSize: 10, color: 'var(--text-faint)', textAlign: 'center', marginTop: 18, lineHeight: 1.5 }}>18+ only · Play responsibly · Licensed in Tanzania</p>
  </React.Fragment>;
}
function RegisterScreen() {
  return <React.Fragment>
    <AuthHead title="Create account" sw="Fungua akaunti" />
    <Field label="Full name · Jina kamili"><div style={{ display: 'flex', alignItems: 'center', height: 48, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: '1px solid var(--border)', ...mono, fontSize: 15, color: 'var(--text)' }}>John Kessy</div></Field>
    <Field label="Phone number · Namba"><PhoneInput /></Field>
    <Field label="Referral code · Hiari (optional)"><div style={{ display: 'flex', alignItems: 'center', height: 48, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-inset)', border: '1px solid var(--border)', ...mono, fontSize: 15, color: 'var(--text-subtle)' }}>50PICK-AMWAKA</div></Field>
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, margin: '4px 0 18px', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.4 }}><span style={{ flexShrink: 0, width: 19, height: 19, borderRadius: 5, background: 'var(--accent-500)', display: 'grid', placeItems: 'center', color: '#06130d' }}>{Icon.check({ s: 13, sw: 3 })}</span>I am 18+ and accept the terms · Nina miaka 18+</label>
    <Btn variant="gold" size="lg" full live>Create account · Fungua</Btn>
    <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5, color: 'var(--text-subtle)' }}>Have an account? <span style={{ color: 'var(--accent-400)' }}>Sign in · Ingia</span></div>
  </React.Fragment>;
}
function OtpScreen() {
  return <React.Fragment>
    <AuthHead title="Verify your phone" sw="Thibitisha namba yako" />
    <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.5 }}>We sent a 6-digit code to<br /><b style={{ ...mono, color: 'var(--text)' }}>+255 7XX XXX 482</b></p>
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><OtpBoxes filled={3} /></div>
    <Btn variant="gold" size="lg" full live>Verify · Thibitisha</Btn>
    <div style={{ textAlign: 'center', marginTop: 18 }}><CountdownPill seconds={42} prefix="Resend in" suffix="· Tuma tena" /></div>
  </React.Fragment>;
}
function ForgotScreen() {
  return <React.Fragment>
    <AuthHead title="Reset password" sw="Weka upya nenosiri" />
    <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.5 }}>Enter your phone number and we'll send a reset code.<br /><span style={{ fontStyle: 'italic', color: 'var(--text-subtle)' }}>Tutakutumia msimbo wa kuweka upya.</span></p>
    <Field label="Phone number · Namba"><PhoneInput /></Field>
    <Btn variant="gold" size="lg" full live>Send reset code · Tuma</Btn>
    <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5, color: 'var(--accent-400)' }}>← Back to sign in · Rudi</div>
  </React.Fragment>;
}
function AuthBoard() {
  return <div className="kit-screen body" style={{ width: '100%', minHeight: '100%', background: 'var(--bg)', color: 'var(--text)', padding: 32, boxSizing: 'border-box' }}>
    <div style={{ marginBottom: 6 }}><div className="disp" style={{ fontSize: 21, fontWeight: 700 }}>Auth · first screens</div></div>
    <div style={{ fontSize: 12.5, color: 'var(--text-subtle)', marginBottom: 24, maxWidth: 680, lineHeight: 1.6 }}>Login, register, phone OTP, and password reset \u2014 mobile-first, bilingual, on the new token system + button family. Tanzania flag on the +255 phone field.</div>
    <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
      <AuthPhone label="Sign in"><LoginScreen /></AuthPhone>
      <AuthPhone label="Register"><RegisterScreen /></AuthPhone>
      <AuthPhone label="Phone OTP"><OtpScreen /></AuthPhone>
      <AuthPhone label="Forgot password"><ForgotScreen /></AuthPhone>
    </div>
  </div>;
}
Object.assign(window, { AuthBoard, LoginScreen, RegisterScreen, OtpScreen, ForgotScreen });
