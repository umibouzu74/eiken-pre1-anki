import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAssignments } from '../../hooks/useAssignments'
import { useToast } from '../Toast'

export default function ClassDetail() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [classData, setClassData] = useState(null)
  const [students, setStudents] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('name') // 'name' | 'mastered' | 'lastActive'
  const [sortDir, setSortDir] = useState('asc')
  const { assignments } = useAssignments(code)
  const toast = useToast()

  useEffect(() => {
    loadClassData()
  }, [code])

  async function loadClassData() {
    try {
      // Load class info
      const classDoc = await getDoc(doc(db, 'classes', code))
      if (classDoc.exists()) {
        setClassData({ code, ...classDoc.data() })
      }

      // Load students in this class
      const sq = query(
        collection(db, 'students'),
        where('classCode', '==', code)
      )
      const studentsSnap = await getDocs(sq)
      const studentList = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      setStudents(studentList)

      // Load progress for each student
      const pMap = {}
      for (const s of studentList) {
        const pDoc = await getDoc(doc(db, 'progress', s.id))
        if (pDoc.exists()) {
          pMap[s.id] = pDoc.data().words || {}
        }
      }
      setProgressMap(pMap)
    } catch (err) {
      console.error('Failed to load class:', err)
      toast('クラスデータの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  function getStudentStats(studentId) {
    const words = Object.values(progressMap[studentId] || {})
    const mastered = words.filter(w => w.s === 'mastered').length
    const learning = words.filter(w => w.s === 'learning').length
    return { mastered, learning, remaining: 1680 - mastered - learning }
  }

  function handleSort(field) {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir(field === 'name' ? 'asc' : 'desc')
    }
  }

  const sortedStudents = [...students].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortBy === 'name') {
      return dir * a.name.localeCompare(b.name, 'ja')
    }
    if (sortBy === 'mastered') {
      return dir * (getStudentStats(a.id).mastered - getStudentStats(b.id).mastered)
    }
    if (sortBy === 'lastActive') {
      const aTime = a.lastActiveAt?.toDate?.()?.getTime() || 0
      const bTime = b.lastActiveAt?.toDate?.()?.getTime() || 0
      return dir * (aTime - bTime)
    }
    return 0
  })

  const sortArrow = (field) => sortBy === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#f5f2ed]/90 backdrop-blur border-b border-gray-200
        px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/teacher')} className="text-xl text-accent2 px-1">←</button>
        <h1 className="text-sm font-semibold text-accent flex-1">
          {classData?.name || code}
        </h1>
        <span className="text-xs bg-accent2/10 text-accent2 px-2 py-1 rounded-full font-mono">{code}</span>
      </div>

      <div className="max-w-3xl mx-auto px-5 pb-10">
        {/* Summary */}
        <div className="py-6 grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-accent2">{students.length}</div>
            <div className="text-[11px] text-gray-400 mt-1">生徒数</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-500">
              {students.length > 0
                ? Math.round(students.reduce((sum, s) => sum + getStudentStats(s.id).mastered, 0) / students.length)
                : 0}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">平均 覚えた</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-warning">
              {assignments.filter(a => a.active).length}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">配信中の宿題</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => navigate(`/teacher/assign?class=${code}`)}
            className="text-xs bg-accent2 text-white px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            宿題を追加
          </button>
          <button
            onClick={() => navigate(`/teacher/export?class=${code}`)}
            className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            CSVエクスポート
          </button>
        </div>

        {/* Student table */}
        <div className="text-xs font-semibold text-gray-500 mb-3 tracking-wide flex items-center gap-2">
          生徒一覧
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {students.length === 0 ? (
          <div className="text-center text-gray-400 py-10 bg-white rounded-xl shadow-sm">
            まだ生徒が参加していません
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th
                    onClick={() => handleSort('name')}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700"
                  >
                    名前{sortArrow('name')}
                  </th>
                  <th
                    onClick={() => handleSort('mastered')}
                    className="text-center px-2 py-3 text-xs font-semibold text-green-500 cursor-pointer hover:text-green-700"
                  >
                    覚えた{sortArrow('mastered')}
                  </th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-orange-500">学習中</th>
                  <th className="text-center px-2 py-3 text-xs font-semibold text-gray-400">未学習</th>
                  <th
                    onClick={() => handleSort('lastActive')}
                    className="text-center px-2 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 hidden sm:table-cell"
                  >
                    最終ログイン{sortArrow('lastActive')}
                  </th>
                  <th className="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map(s => {
                  const stats = getStudentStats(s.id)
                  const pct = ((stats.mastered / 1680) * 100).toFixed(0)
                  const lastActive = s.lastActiveAt?.toDate?.()
                  return (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/teacher/student/${s.id}`)}
                      className="border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="text-center px-2 py-3">
                        <span className="text-green-500 font-semibold">{stats.mastered}</span>
                        <span className="text-[10px] text-gray-300 ml-1">({pct}%)</span>
                      </td>
                      <td className="text-center px-2 py-3 text-orange-500">{stats.learning}</td>
                      <td className="text-center px-2 py-3 text-gray-400">{stats.remaining}</td>
                      <td className="text-center px-2 py-3 text-xs text-gray-400 hidden sm:table-cell">
                        {lastActive ? lastActive.toLocaleDateString('ja-JP') : '-'}
                      </td>
                      <td className="px-2 py-3 text-accent2 text-xs">詳細→</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Active assignments */}
        {assignments.filter(a => a.active).length > 0 && (
          <>
            <div className="text-xs font-semibold text-gray-500 mb-3 mt-8 tracking-wide flex items-center gap-2">
              配信中の宿題
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-2">
              {assignments.filter(a => a.active).map(a => (
                <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{a.title}</h4>
                    <span className="text-xs text-gray-400">
                      #{a.rangeFrom}〜{a.rangeTo}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{a.mode === 'any' ? '自由' : a.mode}</span>
                    {a.dueDate && (
                      <span>期限: {a.dueDate.toDate?.()?.toLocaleDateString('ja-JP') || a.dueDate}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
