import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAssignments } from '../../hooks/useAssignments'

export default function AssignmentForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { teacher } = useAuth()
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(searchParams.get('class') || '')
  const { assignments, loading: assignLoading, createAssignment, toggleAssignment } = useAssignments(selectedClass)

  const [title, setTitle] = useState('')
  const [rangeFrom, setRangeFrom] = useState('1')
  const [rangeTo, setRangeTo] = useState('50')
  const [mode, setMode] = useState('any')
  const [dueDate, setDueDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadClasses()
  }, [teacher?.uid])

  async function loadClasses() {
    if (!teacher?.uid) return
    const q = query(collection(db, 'classes'), where('teacherUid', '==', teacher.uid))
    const snap = await getDocs(q)
    const list = snap.docs.map(d => ({ code: d.id, ...d.data() }))
    setClasses(list)
    if (!selectedClass && list.length > 0) {
      setSelectedClass(list[0].code)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedClass || !title.trim()) return
    setCreating(true)
    setMessage('')
    try {
      await createAssignment({
        classCode: selectedClass,
        title: title.trim(),
        rangeFrom,
        rangeTo,
        mode,
        dueDate: dueDate || null,
      })
      setTitle('')
      setRangeFrom('1')
      setRangeTo('50')
      setMode('any')
      setDueDate('')
      setMessage('宿題を配信しました')
    } catch (err) {
      setMessage('エラー: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  const modeLabels = {
    any: '自由（どのモードでもOK）',
    flashcard: 'フラッシュカード',
    quiz4: '4択クイズ',
    quizType: 'タイピングテスト',
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#f5f2ed]/90 backdrop-blur border-b border-gray-200
        px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/teacher')} className="text-xl text-accent2 px-1">←</button>
        <h1 className="text-sm font-semibold text-accent flex-1">宿題管理</h1>
      </div>

      <div className="max-w-lg mx-auto px-5 pb-10">
        {/* Class selector */}
        <div className="py-6">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">クラスを選択</label>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm bg-white
              focus:border-accent2 focus:outline-none transition-colors"
          >
            {classes.map(c => (
              <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>

        {/* Create form */}
        <div className="text-xs font-semibold text-gray-500 mb-3 tracking-wide flex items-center gap-2">
          新しい宿題を作成
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 shadow-sm space-y-4 mb-8">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: Unit 1-3 復習"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm
                focus:border-accent2 focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">開始番号</label>
              <input
                type="number"
                value={rangeFrom}
                onChange={e => setRangeFrom(e.target.value)}
                min="1"
                max="1680"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm
                  focus:border-accent2 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">終了番号</label>
              <input
                type="number"
                value={rangeTo}
                onChange={e => setRangeTo(e.target.value)}
                min="1"
                max="1680"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm
                  focus:border-accent2 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">モード</label>
            <select
              value={mode}
              onChange={e => setMode(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm bg-white
                focus:border-accent2 focus:outline-none transition-colors"
            >
              {Object.entries(modeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">期限（任意）</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm
                focus:border-accent2 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="w-full bg-accent2 text-white py-3.5 rounded-xl text-sm font-semibold
              hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {creating ? '配信中...' : '宿題を配信'}
          </button>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.startsWith('エラー') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
            }`}>
              {message}
            </div>
          )}
        </form>

        {/* Existing assignments */}
        <div className="text-xs font-semibold text-gray-500 mb-3 tracking-wide flex items-center gap-2">
          配信済み宿題
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {assignLoading ? (
          <div className="text-center text-gray-400 py-6">読み込み中...</div>
        ) : assignments.length === 0 ? (
          <div className="text-center text-gray-400 py-6 bg-white rounded-xl shadow-sm">
            まだ宿題がありません
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map(a => (
              <div key={a.id} className={`bg-white rounded-xl p-4 shadow-sm ${!a.active ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold">{a.title}</h4>
                  <button
                    onClick={() => toggleAssignment(a.id, !a.active)}
                    className={`text-xs px-2 py-1 rounded-full ${
                      a.active
                        ? 'bg-green-50 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {a.active ? '配信中' : '停止中'}
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>#{a.rangeFrom}〜{a.rangeTo}</span>
                  <span>{modeLabels[a.mode] || a.mode}</span>
                  {a.dueDate && <span>期限: {a.dueDate}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
