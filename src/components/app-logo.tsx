/** The app mark (clock on an indigo tile) — sidebar header and sign-in card. */
export function AppLogo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const tile = size === 'lg' ? 'size-11 rounded-2xl' : 'size-8 rounded-xl';
  const icon = size === 'lg' ? 'size-5.5' : 'size-4.5';
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-sm shadow-indigo-600/30 ${tile}`}
    >
      <svg
        viewBox="0 0 20 20"
        className={icon}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <title>Student Day Tracker</title>
        <circle cx="10" cy="10" r="7" />
        <path d="M10 6v4l3 2" />
      </svg>
    </span>
  );
}
