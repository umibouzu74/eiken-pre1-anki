import TopBar from './TopBar'

export default function ResultScreen({ stats, total, onHome, title = '結果' }) {
  const pct = total > 0 ? Math.round((stats.correct / total) * 100) : 0

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar title={title} onBack={onHome} />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-5 py-10">
          <div className="text-6xl mb-4" role="img" aria-label={pct >= 80 ? 'お祝い' : pct >= 50 ? '勉強' : '頑張ろう'}>
            {pct >= 80 ? '🎉' : pct >= 50 ? '📚' : '💪'}
          </div>
          <h2 className="text-xl font-bold mb-2">
            {pct >= 80 ? 'すばらしい！' : pct >= 50 ? 'いい調子！' : 'もう少し頑張ろう！'}
          </h2>
          <div className="text-5xl font-bold text-accent2 my-4">
            {pct}<span className="text-xl text-gray-400">%</span>
          </div>
          <div className="flex justify-center gap-8 mb-8" role="list" aria-label="テスト結果">
            <div role="listitem">
              <div className="text-2xl font-bold text-green-500">{stats.correct}</div>
              <div className="text-[11px] text-gray-400">正解</div>
            </div>
            <div role="listitem">
              <div className="text-2xl font-bold text-red-500">{stats.wrong}</div>
              <div className="text-[11px] text-gray-400">不正解</div>
            </div>
            <div role="listitem">
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-[11px] text-gray-400">出題数</div>
            </div>
          </div>
          <button
            onClick={onHome}
            className="bg-accent2 text-white px-8 py-3 rounded-xl font-semibold
              hover:opacity-90 active:scale-95 transition-all"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  )
}
