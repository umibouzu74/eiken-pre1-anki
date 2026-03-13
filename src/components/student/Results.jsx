import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export default function Results() {
  const navigate = useNavigate()
  const { student } = useAuth()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student?.id) return
    async function load() {
      try {
        const q = query(
          collection(db, 'results'),
          where('studentId', '==', student.id),
          orderBy('completedAt', 'desc'),
          limit(20)
        )
        const snap = await getDocs(q)
        setResults(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error('Failed to load results:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [student?.id])

  const modeLabels = { flashcard: 'フラッシュカード', quiz4: '4択クイズ', quizType: 'タイピング' }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-50 bg-[#f5f2ed]/90 backdrop-blur border-b border-gray-200
        px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/student')} className="text-xl text-accent2 px-1">←</button>
        <h1 className="text-sm font-semibold text-accent flex-1">テスト履歴</h1>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        {loading ? (
          <div className="text-center text-gray-400 py-10">読み込み中...</div>
        ) : results.length === 0 ? (
          <div className="text-center text-gray-400 py-10">まだテスト結果がありません</div>
        ) : (
          <div className="space-y-3">
            {results.map(r => {
              const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0
              const date = r.completedAt?.toDate?.()
              return (
                <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-accent2">
                      {modeLabels[r.mode] || r.mode}
                    </span>
                    <span className="text-xs text-gray-400">
                      {date ? date.toLocaleDateString('ja-JP') : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      #{r.rangeFrom}〜{r.rangeTo}
                    </span>
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
      </div>
    </div>
  )
}
