/** Decorative concentric rings for the login brand panel. Flat strokes only. */
export function LoginRings({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 420 420"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="260" cy="260" r="200" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <circle cx="260" cy="260" r="150" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <circle cx="260" cy="260" r="100" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <circle cx="260" cy="260" r="52" stroke="currentColor" strokeWidth="1.25" opacity="0.7" />
      <circle cx="260" cy="260" r="22" className="fill-primary" stroke="none" />
    </svg>
  )
}
