export default function TopBar({ title, onBack, right }) {
  return (
    <div
      className="sticky top-0 z-50 bg-[#f5f2ed]/90 backdrop-blur border-b border-gray-200
        px-5 py-3 flex items-center gap-3"
      role="banner"
    >
      <button
        onClick={onBack}
        className="text-xl text-accent2 px-1"
        aria-label="戻る"
      >
        ←
      </button>
      <h1 className="text-sm font-semibold text-accent flex-1">{title}</h1>
      {right && <span className="text-xs text-gray-400">{right}</span>}
    </div>
  )
}
