/**
 * Spinner — kit atom (kit/atoms.jsx → Spinner). Currents-color stroke
 * so it inherits the surrounding text colour. Used inside SubmitButton
 * and any in-flight indicator that shouldn't pull a brand colour.
 */

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
