export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <rect width="40" height="40" rx="9" fill="#0f2a44" />
      <path
        d="M8 25h24l-3-7.5a3 3 0 0 0-2.8-1.9H13.8a3 3 0 0 0-2.8 1.9z"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="26.5" r="2.6" fill="#c2410c" />
      <circle cx="27" cy="26.5" r="2.6" fill="#c2410c" />
      <path
        d="M23 9.5l-2.5 4.2h3l-2.5 4.3"
        fill="none"
        stroke="#f97316"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
