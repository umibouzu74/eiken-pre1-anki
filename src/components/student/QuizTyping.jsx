import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgress } from '../../hooks/useProgress'
import { updateSRS, createSRSCard } from '../../lib/srs'
import { shuffle, getAnswer } from '../../lib/utils'
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../auth/AuthContext'
import words from '../../data/words.json'
import RangeSelector from './RangeSelector'
import TopBar from '../TopBar'
import ResultScreen from '../ResultScreen'
import { useToast } from '../Toast'

export default function QuizTyping() {
  const navigate = useNavigate()
  const { student } = useAuth()
  const { updateWord, getWordProgress } = useProgress()
  const toast = useToast()
  const inputRef = useRef(null)

  const [phase, setPhase] = useState('select')
  const [deck, setDeck] = useState([])
  const [idx, setIdx] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })
  const [details, setDetails] = useState([])
  const [range, setRange] = useState({ from: 1, to: 50 })
  const [shaking, setShaking] = useState(false)

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
    setUserAnswer('')
    setAnswered(false)
    setStats({ correct: 0, wrong: 0 })
    setDetails([])
    setRange({ from, to })
    setPhase('study')
  }

  // Focus input when entering study mode or moving to next question
  useEffect(() => {
    if (phase === 'study' && !answered) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [phase, idx, answered])

  async function submit() {
    const trimmed = userAnswer.trim()
    if (!trimmed) {
      setShaking(true)
      setTimeout(() => setShaking(false), 300)
      return
    }

    const word = deck[idx]
    const answer = getAnswer(word)
    const correct = trimmed.toLowerCase() === answer.toLowerCase()

    setIsCorrect(correct)
    setAnswered(true)
    setDetails(d => [...d, { wordId: word.i, correct }])

    if (correct) {
      setStats(s => ({ ...s, correct: s.correct + 1 }))
    } else {
      setStats(s => ({ ...s, wrong: s.wrong + 1 }))
    }

    const existing = getWordProgress(word.i)
    const srs = updateSRS(existing?.srs || createSRSCard(), correct ? 2 : 0)
    await updateWord(word.i, {
      s: correct ? (srs.interval >= 21 ? 'mastered' : 'learning') : 'learning',
      c: (existing?.c || 0) + (correct ? 1 : 0),
      w: (existing?.w || 0) + (correct ? 0 : 1),
      srs,
    })
  }

  async function next() {
    if (idx + 1 >= deck.length) {
      try {
        const ref = doc(collection(db, 'results'))
        await setDoc(ref, {
          studentId: student.id,
          classCode: student.classCode,
          mode: 'quizType',
          rangeFrom: range.from,
          rangeTo: range.to,
          correct: stats.correct,
          wrong: stats.wrong,
          total: deck.length,
          details,
          completedAt: serverTimestamp(),
        })
      } catch (err) {
        console.error('Failed to save results:', err)
        toast('結果の保存に失敗しました。通信環境を確認してください。')
      }
      setPhase('done')
      return
    }
    setIdx(idx + 1)
    setUserAnswer('')
    setAnswered(false)
    setIsCorrect(false)
  }

  // Keyboard
  useEffect(() => {
    if (phase !== 'study') return
    function onKey(e) {
      if (e.key === 'Enter') {
        if (answered) next()
        else submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, answered, idx, userAnswer])

  if (phase === 'select') {
    return <RangeSelector title="タイピングテスト" onStart={handleStart} onBack={() => navigate('/student')} />
  }

  if (phase === 'done') {
    return <ResultScreen stats={stats} total={deck.length} onHome={() => navigate('/student')} />
  }

  const word = deck[idx]
  const answer = getAnswer(word)

  return (
    <div className="min-h-screen">
      <TopBar title="タイピングテスト" onBack={() => navigate('/student')} right={`${idx + 1} / ${deck.length}`} />

      <div className="max-w-md mx-auto px-5 py-4">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-4 text-xs text-gray-400">
          <div className="w-28 h-1 bg-gray-200 rounded-full">
            <div className="h-full bg-accent2 rounded-full transition-all" style={{ width: `${(idx / deck.length) * 100}%` }} />
          </div>
          <span>正解 {stats.correct} / {idx}{answered ? '+1' : ''}</span>
        </div>

        {/* Question */}
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
              : <span>「{word.sm}」の意味の英単語を入力してください</span>
            }
          </div>
          {word.bj && (
            <div className="text-xs text-gray-500 bg-[#faf8f5] rounded-lg px-3 py-2.5 leading-relaxed mb-3">
              {word.bj}
            </div>
          )}
          <div className="text-sm text-accent2">意味：{word.sm}</div>
        </div>

        {/* Input */}
        <div className={`flex gap-2.5 ${shaking ? 'animate-shake' : ''}`}>
          <input
            ref={inputRef}
            type="text"
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            disabled={answered}
            placeholder="英単語を入力..."
            aria-label="英単語を入力"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck="false"
            className={`flex-1 border-2 rounded-xl px-4 py-3 text-base font-en
              focus:outline-none transition-colors ${
                answered
                  ? isCorrect
                    ? 'border-green-400 bg-green-50'
                    : 'border-red-400 bg-red-50'
                  : 'border-gray-200 focus:border-accent2'
              }`}
          />
          {!answered && (
            <button
              onClick={submit}
              className="bg-accent2 text-white px-5 rounded-xl text-sm font-semibold
                hover:opacity-90 active:scale-95 transition-all"
            >
              解答
            </button>
          )}
        </div>

        {/* Feedback */}
        {answered && (
          <>
            <div className={`mt-4 rounded-xl p-4 text-sm ${
              isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {isCorrect ? '✅ 正解！' : (
                <>❌ 不正解　正解は <strong className="font-en">{answer}</strong></>
              )}
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

