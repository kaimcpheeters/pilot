export function OrientationGate() {
  return (
    <div className="orientation-gate" role="alertdialog" aria-live="assertive">
      <div className="orientation-gate__inner">
        <div className="orientation-gate__icon" aria-hidden="true">
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
            <rect
              x="14"
              y="28"
              width="68"
              height="40"
              rx="6"
              stroke="currentColor"
              strokeWidth="3"
            />
            <rect
              x="22"
              y="36"
              width="52"
              height="24"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.5"
            />
            <path
              d="M48 14 C 60 14, 70 22, 72 30"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M66 28 L 72 30 L 70 24"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2>Rotate your device</h2>
        <p>Pilot is designed for landscape on desktop. Please rotate to landscape to play.</p>
      </div>
    </div>
  );
}
