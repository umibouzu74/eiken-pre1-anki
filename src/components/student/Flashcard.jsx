import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useProgress } from '../../hooks/useProgress'
import { updateSRS, createSRSCard } from '../../lib/srs'
import words from '../../data/words.json'
import RangeSelector from './RangeSelector'

export default function Flashcard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { updateWord, getWordProgress } = useProgress()

  const [phase, setPhase] = useState('select') // 'select' | 'study' | 'done'
  const [deck, setDeck] = useState([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })

  // Auto-start if URL has range params
  useEffect(() => {
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (from && to) {
      handleStart(parseInt(from), parseInt(to), true, true)
    }
  }, [])

  function handleStart(from, to, shuffle, excludeMastered) {
    let selected = words.filter(w => w.i >= from && w.i <= to)
    if (excludeMastered) {
      selected = selected.filter(w => {
        const p = getWordProgress(w.i)
        return !p || p.s !== 'mastered'
      })
    }
    if (selected.length === 0) {
      alert('対象の単語がありません')
      return
    }
    if (shuffle) {
      for (let i = selected.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selected[i], selected[j]] = [selected[j], selected[i]]
      }
    }
    setDeck(selected)
    setIdx(0)
    setFlipped(false)
    setStats({ correct: 0, wrong: 0 })
    setPhase('study')
  }

  function flip() {
    setFlipped(true)
  }

  async function rate(quality) {
    const word = deck[idx]
    const existing = getWordProgress(word.i)
    const srs = updateSRS(existing?.srs || createSRSCard(), quality)

    let status = 'learning'
    if (quality >= 2) {
      status = srs.interval >= 21 ? 'mastered' : 'learning'
      setStats(s => ({ ...s, correct: s.correct + 1 }))
    } else {
      setStats(s => ({ ...s, wrong: s.wrong + 1 }))
    }

    await updateWord(word.i, {
      s: status,
      c: (existing?.c || 0) + (quality >= 2 ? 1 : 0),
      w: (existing?.w || 0) + (quality < 2 ? 1 : 0),
      srs,
    })

    if (idx + 1 >= deck.length) {
      setPhase('done')
    } else {
      setIdx(idx + 1)
      setFlipped(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'study') return
    function onKey(e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip() }
      else if (e.key === '1' && flipped) rate(0)
      else if (e.key === '2' && flipped) rate(1)
      else if (e.key === '3' && flipped) rate(2)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, flipped, idx])

  // === RANGE SELECT ===
  if (phase === 'select') {
    return (
      <RangeSelector
        title="フラッシュカード"
        onStart={handleStart}
        onBack={() => navigate('/student')}
      />
    )
  }

  // === DONE ===
  if (phase === 'done') {
    const total = stats.correct + stats.wrong
    const pct = total > 0 ? Math.round((stats.correct / total) * 100) : 0
    return (
      <div className="min-h-screen">
        <TopBar title="結果" onBack={() => navigate('/student')} />
        <div className="max-w-md mx-auto px-5 py-10 text-center animate-in">
          <div className="text-6xl mb-4">{pct >= 80 ? '🎉' : pct >= 50 ? '📚' : '💪'}</div>
          <h2 className="text-xl font-bold mb-2">
            {pct >= 80 ? 'すばらしい！' : pct >= 50 ? 'いい調子！' : 'もう少し頑張ろう！'}
          </h2>
          <div className="text-5xl font-bold text-accent2 my-4">
            {pct}<span className="text-xl text-gray-400">%</span>
          </div>
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{stats.correct}</div>
              <div className="text-[11px] text-gray-400">正解</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{stats.wrong}</div>
              <div className="text-[11px] text-gray-400">不正解</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/student')}
            className="bg-accent2 text-white px-8 py-3 rounded-xl font-semibold
              hover:opacity-90 active:scale-95 transition-all"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    )
  }

  // === STUDY ===
  const word = deck[idx]
  const details = []
  if (word.sy) details.push({ label: '同意語', value: word.sy })
  if (word.us) details.push({ label: '語法', value: word.us })
  if (word.dv) details.push({ label: '派生語', value: word.dv })
  if (word.et) details.push({ label: '語源', value: word.et })

  return (
    <div className="min-h-screen">
      <TopBar
        title="フラッシュカード"
        onBack={() => navigate('/student')}
        right={`${idx + 1} / ${deck.length}`}
      />

      <div className="max-w-md mx-auto px-5 py-4 flex flex-col items-center">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-4 text-xs text-gray-400">
          <div className="w-28 h-1 bg-gray-200 rounded-full">
            <div
              className="h-full bg-accent2 rounded-full transition-all duration-300"
              style={{ width: `${(idx / deck.length) * 100}%` }}
            />
          </div>
          <span>{idx + 1} / {deck.length}</span>
        </div>

        {/* Card */}
        <div
          className="w-full aspect-[3/4] max-h-[460px] perspective cursor-pointer mb-5"
          onClick={() => !flipped && flip()}
        >
          <div className={`w-full h-full relative preserve-3d flip-transition ${flipped ? 'rotate-y-180' : ''}`}>
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-white rounded-2xl shadow-lg
              flex flex-col items-center justify-center p-8">
              <div className="font-en text-3xl font-semibold tracking-wide">{word.w}</div>
              <div className="font-en text-sm text-gray-400 mt-2">{word.p}</div>
              <div className="mt-6 text-xs text-gray-400 border border-dashed border-gray-200
                rounded-full px-4 py-1.5">
                タップして意味を表示
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-2xl shadow-lg
              flex flex-col items-center p-6 overflow-y-auto">
              <div className="font-en text-xl font-semibold mb-3">{word.w}</div>
              <div className="text-base font-medium leading-relaxed text-center mb-3">{word.m}</div>

              {details.length > 0 && (
                <div className="w-full text-xs text-gray-600 leading-relaxed">
                  {details.map((d, i) => (
                    <div key={i} className="py-1.5 border-b border-gray-100">
                      <div className="text-[10px] text-gray-400 font-semibold tracking-wide">{d.label}</div>
                      <div>{d.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {word.ee && (
                <div className="mt-3">
                  <div className="font-en italic text-sm text-gray-500 leading-relaxed">{word.ee}</div>
                  <div className="text-xs text-gray-400 mt-1">{word.ej}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rating buttons */}
        <div className={`flex gap-3 w-full max-w-sm transition-opacity duration-200 ${
          flipped ? 'opacity-100' : 'opacity-30 pointer-events-none'
        }`}>
          <button
            onClick={() => rate(0)}
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-red-50 text-red-500
              active:scale-95 transition-transform"
          >
            もう一度
          </button>
          <button
            onClick={() => rate(1)}
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-orange-50 text-orange-500
              active:scale-95 transition-transform"
          >
            微妙
          </button>
          <button
            onClick={() => rate(2)}
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-green-50 text-green-500
              active:scale-95 transition-transform"
          >
            覚えた
          </button>
        </div>

        <div className="text-[10px] text-gray-300 mt-3">
          キーボード: Space=めくる 1=もう一度 2=微妙 3=覚えた
        </div>
      </div>
    </div>
  )
}

function TopBar({ title, onBack, right }) {
  return (
    <div className="sticky top-0 z-50 bg-[#f5f2ed]/90 backdrop-blur border-b border-gray-200
      px-5 py-3 flex items-center gap-3">
      <button onClick={onBack} className="text-xl text-accent2 px-1">←</button>
      <h1 className="text-sm font-semibold text-accent flex-1">{title}</h1>
      {right && <span className="text-xs text-gray-400">{right}</span>}
    </div>
  )
}
