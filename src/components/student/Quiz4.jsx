import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgress } from '../../hooks/useProgress'
import { updateSRS, createSRSCard } from '../../lib/srs'
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../auth/AuthContext'
import words from '../../data/words.json'
import RangeSelector from './RangeSelector'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getAnswer(w) {
  return w.cj || w.w
}

function getChoices(correct, allWords) {
  const answer = getAnswer(correct)
  const choices = [correct]
  const pool = shuffle(allWords.filter(w => w.i !== correct.i))
  for (let i = 0; choices.length < 4 && i < pool.length; i++) {
    const candidate = getAnswer(pool[i])
    if (candidate !== answer) choices.push(pool[i])
  }
  return shuffle(choices)
}

export default function Quiz4() {
  const navigate = useNavigate()
  const { student } = useAuth()
  const { updateWord, getWordProgress } = useProgress()

  const [phase, setPhase] = useState('select')
  const [deck, setDeck] = useState([])
  const [idx, setIdx] = useState(0)
  const [choices, setChoices] = useState([])
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })
  const [details, setDetails] = useState([])
  const [range, setRange] = useState({ from: 1, to: 50 })

  function handleStart(from, to, doShuffle, excludeMastered) {
    let selected = words.filter(w => w.i >= from && w.i <= to)
    if (excludeMastered) {
      selected = selected.filter(w => {
        const p = getWordProgress(w.i)
        return !p || p.s !== 'mastered'
      })
    }
    if (selected.length === 0) { alert('対象の単語がありません'); return }
    if (doShuffle) selected = shuffle(selected)

    setDeck(selected)
    setIdx(0)
    setChoices(getChoices(selected[0], words))
    setSelected(null)
    setAnswered(false)
    setStats({ correct: 0, wrong: 0 })
    setDetails([])
    setRange({ from, to })
    setPhase('study')
  }

  async function select(choice) {
    if (answered) return
    const word = deck[idx]
    const answer = getAnswer(word)
    const val = getAnswer(choice)
    const isCorrect = val === answer

    setSelected(val)
    setAnswered(true)
    setDetails(d => [...d, { wordId: word.i, correct: isCorrect }])

    if (isCorrect) {
      setStats(s => ({ ...s, correct: s.correct + 1 }))
    } else {
      setStats(s => ({ ...s, wrong: s.wrong + 1 }))
    }

    // Update progress
    const existing = getWordProgress(word.i)
    const srs = updateSRS(existing?.srs || createSRSCard(), isCorrect ? 2 : 0)
    await updateWord(word.i, {
      s: isCorrect ? (srs.interval >= 21 ? 'mastered' : 'learning') : 'learning',
      c: (existing?.c || 0) + (isCorrect ? 1 : 0),
      w: (existing?.w || 0) + (isCorrect ? 0 : 1),
      srs,
    })
  }

  async function next() {
    if (idx + 1 >= deck.length) {
      // Save result to Firestore
      try {
        const ref = doc(collection(db, 'results'))
        await setDoc(ref, {
          studentId: student.id,
          classCode: student.classCode,
          mode: 'quiz4',
          rangeFrom: range.from,
          rangeTo: range.to,
          correct: stats.correct + (answered && selected === getAnswer(deck[idx]) ? 0 : 0),
          wrong: stats.wrong,
          total: deck.length,
          details,
          completedAt: serverTimestamp(),
        })
      } catch (err) {
        console.error('Failed to save results:', err)
      }
      setPhase('done')
      return
    }
    const nextIdx = idx + 1
    setIdx(nextIdx)
    setChoices(getChoices(deck[nextIdx], words))
    setSelected(null)
    setAnswered(false)
  }

  // Keyboard
  useEffect(() => {
    if (phase !== 'study') return
    function onKey(e) {
      if (e.key === 'Enter' && answered) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, answered, idx])

  if (phase === 'select') {
    return <RangeSelector title="4択クイズ" onStart={handleStart} onBack={() => navigate('/student')} />
  }

  if (phase === 'done') {
    return <ResultScreen stats={stats} total={deck.length} onHome={() => navigate('/student')} />
  }

  const word = deck[idx]
  const answer = getAnswer(word)

  return (
    <div className="min-h-screen">
      <TopBar title="4択クイズ" onBack={() => navigate('/student')} right={`${idx + 1} / ${deck.length}`} />

      <div className="max-w-md mx-auto px-5 py-4">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-4 text-xs text-gray-400">
          <div className="w-28 h-1 bg-gray-200 rounded-full">
            <div className="h-full bg-accent2 rounded-full transition-all" style={{ width: `${(idx / deck.length) * 100}%` }} />
          </div>
          <span>正解 {stats.correct} / {idx}{answered ? '+1' : ''}</span>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="text-xs text-gray-400 mb-3">Q{idx + 1}</div>
          <div className="text-sm leading-relaxed mb-2">
            {word.bs
              ? word.bs.split('(       )').map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className="inline-block border-b-2 border-accent2 min-w-[100px] text-center
                        text-accent2 font-semibold px-1">
                        {answered ? answer : '???'}
                      </span>
                    )}
                  </span>
                ))
              : <span>「{word.sm}」の意味の英単語は？</span>
            }
          </div>
          {word.bj && (
            <div className="text-xs text-gray-500 bg-[#faf8f5] rounded-lg px-3 py-2.5 leading-relaxed">
              {word.bj}
            </div>
          )}
        </div>

        {/* Choices */}
        <div className="space-y-2 mb-4">
          {choices.map((c, i) => {
            const val = getAnswer(c)
            let cls = 'bg-[#faf8f5] border-2 border-transparent'
            if (answered) {
              if (val === answer) cls = 'bg-green-50 border-2 border-green-400'
              else if (val === selected) cls = 'bg-red-50 border-2 border-red-400'
            } else {
              cls += ' hover:border-accent2 hover:bg-blue-50 cursor-pointer active:scale-[0.98]'
            }
            return (
              <div
                key={i}
                onClick={() => select(c)}
                className={`rounded-xl px-5 py-3.5 font-en text-base font-medium transition-all ${cls}`}
              >
                {val}
              </div>
            )
          })}
        </div>

        {/* Feedback */}
        {answered && (
          <>
            <div className={`rounded-xl p-4 text-sm ${
              selected === answer ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {selected === answer ? '✅ 正解！' : '❌ 不正解'}
              <div className="font-en font-semibold text-base mt-1">{word.w} {word.p}</div>
              <div className="text-xs mt-1 opacity-80">{word.m}</div>
            </div>
            <button
              onClick={next}
              className="w-full mt-3 bg-gray-800 text-white py-3.5 rounded-xl text-sm font-semibold
                hover:bg-gray-700 active:scale-[0.98] transition-all"
            >
              次へ →
            </button>
          </>
        )}
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

function ResultScreen({ stats, total, onHome }) {
  const pct = total > 0 ? Math.round((stats.correct / total) * 100) : 0
  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-50 bg-[#f5f2ed]/90 backdrop-blur border-b border-gray-200
        px-5 py-3 flex items-center gap-3">
        <button onClick={onHome} className="text-xl text-accent2 px-1">←</button>
        <h1 className="text-sm font-semibold text-accent flex-1">結果</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-5 py-10">
          <div className="text-6xl mb-4">{pct >= 80 ? '🎉' : pct >= 50 ? '📚' : '💪'}</div>
          <h2 className="text-xl font-bold mb-2">
            {pct >= 80 ? 'すばらしい！' : pct >= 50 ? 'いい調子！' : 'もう少し頑張ろう！'}
          </h2>
          <div className="text-5xl font-bold text-accent2 my-4">
            {pct}<span className="text-xl text-gray-400">%</span>
          </div>
          <div className="flex justify-center gap-8 mb-8">
            <div><div className="text-2xl font-bold text-green-500">{stats.correct}</div><div className="text-[11px] text-gray-400">正解</div></div>
            <div><div className="text-2xl font-bold text-red-500">{stats.wrong}</div><div className="text-[11px] text-gray-400">不正解</div></div>
            <div><div className="text-2xl font-bold">{total}</div><div className="text-[11px] text-gray-400">出題数</div></div>
          </div>
          <button onClick={onHome} className="bg-accent2 text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all">
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  )
}
