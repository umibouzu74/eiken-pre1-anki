import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useToast } from '../Toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import words from '../../data/words.json'

const UNIT_SIZE = 50
const TOTAL_UNITS = Math.ceil(words.length / UNIT_SIZE)

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [student, setStudent] = useState(null)
  const [progress, setProgress] = useState({})
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    try {
      // Load student info
      const sDoc = await getDoc(doc(db, 'students', id))
      if (sDoc.exists()) {
        setStudent({ id: sDoc.id, ...sDoc.data() })
      }

      // Load progress
      const pDoc = await getDoc(doc(db, 'progress', id))
      if (pDoc.exists()) {
        setProgress(pDoc.data().words || {})
      }

      // Load test results
      const rq = query(
        collection(db, 'results'),
        where('studentId', '==', id),
        orderBy('completedAt', 'desc')
      )
      const rSnap = await getDocs(rq)
      setResults(rSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error('Failed to load student:', err)
      toast('生徒データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // All hooks must be called before any early returns (React rules of hooks)
  const { mastered, learning, remaining } = useMemo(() => {
    const allWords = Object.values(progress)
    const m = allWords.filter(w => w.s === 'mastered').length
    const l = allWords.filter(w => w.s === 'learning').length
    return { mastered: m, learning: l, remaining: 1680 - m - l }
  }, [progress])

  // Unit progress data for chart
  const unitData = useMemo(() => Array.from({ length: TOTAL_UNITS }, (_, i) => {
    const unitNum = i + 1
    const start = (unitNum - 1) * UNIT_SIZE + 1
    const end = Math.min(unitNum * UNIT_SIZE, words.length)
    let unitMastered = 0
    let unitLearning = 0
    for (let j = start; j <= end; j++) {
      const w = progress[String(j)]
      if (w?.s === 'mastered') unitMastered++
      else if (w?.s === 'learning') unitLearning++
    }
    return {
      name: `U${unitNum}`,
      覚えた: unitMastered,
      学習中: unitLearning,
    }
  }), [progress])

  // Weak words (high wrong count relative to total attempts)
  const weakWords = useMemo(() => Object.entries(progress)
    .filter(([, v]) => (v.c + v.w) >= 2 && v.w / (v.c + v.w) > 0.4)
    .sort(([, a], [, b]) => (b.w / (b.c + b.w)) - (a.w / (a.c + a.w)))
    .slice(0, 20)
    .map(([wordId, v]) => {
      const word = words.find(w => w.i === Number(wordId))
      return { wordId, word, stats: v, errorRate: Math.round((v.w / (v.c + v.w)) * 100) }
    }), [progress])

  const modeLabels = { flashcard: 'フラッシュカード', quiz4: '4択クイズ', quizType: 'タイピング' }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>
  }

  if (!student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 gap-4">
        <p>生徒が見つかりません</p>
        <button
          onClick={() => navigate('/teacher')}
          className="text-sm text-accent2 hover:underline"
        >
          ダッシュボードに戻る
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#f5f2ed]/90 backdrop-blur border-b border-gray-200
        px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-xl text-accent2 px-1">←</button>
        <h1 className="text-sm font-semibold text-accent flex-1">{student.name}</h1>
        <span className="text-xs text-gray-400">{student.classCode}</span>
      </div>

      <div className="max-w-2xl mx-auto px-5 pb-10">
        {/* Stats */}
        <div className="py-6 grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-500">{mastered}</div>
            <div className="text-[11px] text-gray-400 mt-1">覚えた</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-orange-500">{learning}</div>
            <div className="text-[11px] text-gray-400 mt-1">学習中</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-gray-400">{remaining}</div>
            <div className="text-[11px] text-gray-400 mt-1">未学習</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">全体進捗</span>
            <span className="text-xs text-gray-400">{((mastered / 1680) * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div className="h-full flex">
              <div className="bg-green-500 transition-all" style={{ width: `${(mastered / 1680) * 100}%` }} />
              <div className="bg-orange-400 transition-all" style={{ width: `${(learning / 1680) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Unit chart */}
        <div className="text-xs font-semibold text-gray-500 mb-3 tracking-wide flex items-center gap-2">
          ユニット別進捗
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={unitData} barSize={8}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Bar dataKey="覚えた" stackId="a" fill="#27ae60" radius={[0, 0, 0, 0]} />
              <Bar dataKey="学習中" stackId="a" fill="#e67e22" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Test results */}
        <div className="text-xs font-semibold text-gray-500 mb-3 tracking-wide flex items-center gap-2">
          テスト結果履歴
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        {results.length === 0 ? (
          <div className="text-center text-gray-400 py-6 bg-white rounded-xl shadow-sm mb-6">
            まだテスト結果がありません
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {results.slice(0, 10).map(r => {
              const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0
              const date = r.completedAt?.toDate?.()
              return (
                <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-accent2">
                      {modeLabels[r.mode] || r.mode}
                    </span>
                    <span className="text-xs text-gray-400">
                      {date ? date.toLocaleDateString('ja-JP') : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">#{r.rangeFrom}〜{r.rangeTo}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-green-500">{r.correct}正解</span>
                      <span className="text-xs text-red-400">{r.wrong}不正解</span>
                      <span className={`text-lg font-bold ${
                        pct >= 80 ? 'text-green-500' : pct >= 50 ? 'text-orange-500' : 'text-red-500'
                      }`}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Weak words */}
        {weakWords.length > 0 && (
          <>
            <div className="text-xs font-semibold text-gray-500 mb-3 tracking-wide flex items-center gap-2">
              苦手単語リスト
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">#</th>
                    <th className="text-left px-2 py-2 text-xs font-semibold text-gray-500">単語</th>
                    <th className="text-left px-2 py-2 text-xs font-semibold text-gray-500">意味</th>
                    <th className="text-center px-2 py-2 text-xs font-semibold text-red-400">不正解率</th>
                  </tr>
                </thead>
                <tbody>
                  {weakWords.map(({ wordId, word, errorRate }) => (
                    <tr key={wordId} className="border-b border-gray-50">
                      <td className="px-4 py-2 text-xs text-gray-400">{wordId}</td>
                      <td className="px-2 py-2 font-medium font-en">{word?.w || '?'}</td>
                      <td className="px-2 py-2 text-xs text-gray-500">{word?.sm || ''}</td>
                      <td className="text-center px-2 py-2">
                        <span className={`text-xs font-semibold ${
                          errorRate >= 70 ? 'text-red-500' : 'text-orange-500'
                        }`}>
                          {errorRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
