import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { collection, query, where, getDocs, doc as docRef, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export default function Dashboard() {
  const navigate = useNavigate()
  const { teacher, logout } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newClassCode, setNewClassCode] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadClasses()
  }, [teacher?.uid])

  async function loadClasses() {
    if (!teacher?.uid) return
    try {
      const q = query(
        collection(db, 'classes'),
        where('teacherUid', '==', teacher.uid)
      )
      const snap = await getDocs(q)
      const classList = snap.docs.map(d => ({ code: d.id, ...d.data() }))

      // Load student counts per class
      for (const cls of classList) {
        const sq = query(
          collection(db, 'students'),
          where('classCode', '==', cls.code)
        )
        const sSnap = await getDocs(sq)
        cls.actualStudentCount = sSnap.size
      }

      setClasses(classList)
    } catch (err) {
      console.error('Failed to load classes:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateClass(e) {
    e.preventDefault()
    if (!newClassName.trim() || !newClassCode.trim()) return
    setCreating(true)
    try {
      const code = newClassCode.trim().toLowerCase().replace(/\s+/g, '')
      await setDoc(docRef(db, 'classes', code), {
        name: newClassName.trim(),
        teacherUid: teacher.uid,
        createdAt: serverTimestamp(),
        studentCount: 0,
      })
      setNewClassName('')
      setNewClassCode('')
      setShowCreate(false)
      await loadClasses()
    } catch (err) {
      console.error('Failed to create class:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#f5f2ed]/90 backdrop-blur border-b border-gray-200 px-5 py-3 flex items-center gap-3">
        <h1 className="text-sm font-semibold text-accent tracking-wide flex-1">先生ダッシュボード</h1>
        <span className="text-xs text-gray-400">{teacher?.displayName || teacher?.email}</span>
        <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">ログアウト</button>
      </div>

      <div className="max-w-2xl mx-auto px-5 pb-10">
        {/* Header */}
        <div className="py-8 flex items-center justify-between">
          <div>
            <h2 className="font-en text-2xl font-semibold text-accent tracking-wide">Classes</h2>
            <p className="text-xs text-gray-400 mt-1">クラス管理</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/teacher/assign')}
              className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              宿題管理
            </button>
            <button
              onClick={() => navigate('/teacher/export')}
              className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              CSVエクスポート
            </button>
          </div>
        </div>

        {/* Class list */}
        {loading ? (
          <div className="text-center text-gray-400 py-10">読み込み中...</div>
        ) : (
          <div className="space-y-3 mb-6">
            {classes.map(cls => (
              <div
                key={cls.code}
                onClick={() => navigate(`/teacher/class/${cls.code}`)}
                className="bg-white rounded-xl p-5 shadow-sm cursor-pointer
                  hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold">{cls.name}</h3>
                  <span className="text-xs bg-accent2/10 text-accent2 px-2 py-1 rounded-full font-mono">
                    {cls.code}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{cls.actualStudentCount ?? cls.studentCount}名の生徒</span>
                  {cls.createdAt?.toDate && (
                    <span>作成: {cls.createdAt.toDate().toLocaleDateString('ja-JP')}</span>
                  )}
                </div>
              </div>
            ))}

            {classes.length === 0 && (
              <div className="text-center text-gray-400 py-10">
                クラスがまだありません。下のボタンから作成してください。
              </div>
            )}
          </div>
        )}

        {/* Create class */}
        {showCreate ? (
          <form onSubmit={handleCreateClass} className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold">新しいクラスを作成</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">クラス名</label>
              <input
                type="text"
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                placeholder="例: 高3英語A"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm
                  focus:border-accent2 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">クラスコード</label>
              <input
                type="text"
                value={newClassCode}
                onChange={e => setNewClassCode(e.target.value)}
                placeholder="例: spring2026"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-mono
                  focus:border-accent2 focus:outline-none transition-colors"
              />
              <p className="text-[11px] text-gray-400 mt-1">生徒がログイン時に入力するコードです</p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-accent2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold
                  hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {creating ? '作成中...' : '作成'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-gray-400 px-4 py-2.5 rounded-xl text-sm hover:text-gray-600 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-400
              hover:border-accent2 hover:text-accent2 transition-colors"
          >
            + 新しいクラスを作成
          </button>
        )}
      </div>
    </div>
  )
}
