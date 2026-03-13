import { useState } from 'react'
import { useProgress } from '../../hooks/useProgress'
import words from '../../data/words.json'

const UNIT_SIZE = 50
const TOTAL_UNITS = Math.ceil(words.length / UNIT_SIZE)

export default function RangeSelector({ title, onStart, onBack }) {
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(50)
  const [shuffle, setShuffle] = useState(true)
  const [excludeMastered, setExcludeMastered] = useState(true)
  const { getWordProgress } = useProgress()

  function getUnitProgress(n) {
    const start = (n - 1) * UNIT_SIZE + 1
    const end = Math.min(n * UNIT_SIZE, words.length)
    let mastered = 0
    for (let i = start; i <= end; i++) {
      const p = getWordProgress(i)
      if (p?.s === 'mastered') mastered++
    }
    return mastered / (end - start + 1)
  }

  function selectUnit(n) {
    const start = (n - 1) * UNIT_SIZE + 1
    const end = Math.min(n * UNIT_SIZE, words.length)
    setFrom(start)
    setTo(end)
  }

  const count = Math.max(0, to - from + 1)

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#f5f2ed]/90 backdrop-blur border-b border-gray-200
        px-5 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-xl text-accent2 px-1">←</button>
        <h1 className="text-sm font-semibold text-accent flex-1">{title}</h1>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        <h2 className="text-lg font-semibold mb-4">学習範囲を選択</h2>

        {/* Range inputs */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-10">開始</label>
            <input
              type="number"
              value={from}
              onChange={e => setFrom(parseInt(e.target.value) || 1)}
              min={1}
              max={words.length}
              className="flex-1 border-2 border-gray-200 rounded-lg px-4 py-2.5 text-base
                focus:border-accent2 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-10">終了</label>
            <input
              type="number"
              value={to}
              onChange={e => setTo(parseInt(e.target.value) || 50)}
              min={1}
              max={words.length}
              className="flex-1 border-2 border-gray-200 rounded-lg px-4 py-2.5 text-base
                focus:border-accent2 focus:outline-none"
            />
          </div>
        </div>

        <div className="text-sm text-gray-400 bg-[#faf8f5] rounded-lg px-4 py-2.5 mb-5">
          {count}語を学習します
        </div>

        {/* Options */}
        <div className="space-y-2 mb-6">
          <label className="flex items-center gap-2 py-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={e => setShuffle(e.target.checked)}
              className="w-4 h-4 accent-accent2"
            />
            シャッフルする
          </label>
          <label className="flex items-center gap-2 py-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={excludeMastered}
              onChange={e => setExcludeMastered(e.target.checked)}
              className="w-4 h-4 accent-accent2"
            />
            「覚えた」を除外する
          </label>
        </div>

        {/* Quick unit select */}
        <div className="text-xs font-semibold text-gray-500 mb-3 tracking-wide flex items-center gap-2">
          クイック選択
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="grid grid-cols-5 gap-2 mb-6">
          {Array.from({ length: TOTAL_UNITS }, (_, i) => {
            const n = i + 1
            const start = (n - 1) * UNIT_SIZE + 1
            const end = Math.min(n * UNIT_SIZE, words.length)
            const prog = getUnitProgress(n)
            const isSelected = from === start && to === end
            return (
              <button
                key={n}
                onClick={() => selectUnit(n)}
                className={`relative overflow-hidden rounded-lg p-2.5 text-center border transition-all
                  active:scale-95 ${
                    isSelected
                      ? 'border-accent2 bg-blue-50 shadow-sm'
                      : 'border-gray-100 bg-white hover:shadow-sm'
                  }`}
              >
                <div className={`text-base font-bold ${isSelected ? 'text-accent2' : 'text-accent2/70'}`}>
                  {n}
                </div>
                <div className="text-[9px] text-gray-400">{start}–{end}</div>
                <div
                  className="absolute bottom-0 left-0 h-0.5 bg-green-400 transition-all"
                  style={{ width: `${prog * 100}%` }}
                />
              </button>
            )
          })}
        </div>

        {/* Start button */}
        <button
          onClick={() => onStart(from, to, shuffle, excludeMastered)}
          className="w-full bg-accent2 text-white py-4 rounded-xl text-base font-semibold
            hover:opacity-90 active:scale-[0.98] transition-all"
        >
          スタート
        </button>
      </div>
    </div>
  )
}
