import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { exportProgressSummary, exportTestResults, downloadCSV } from '../../lib/csv'
import words from '../../data/words.json'

export default function ExportCSV() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { teacher } = useAuth()
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(searchParams.get('class') || '')
  const [exporting, setExporting] = useState('')

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

  async function handleExportProgress() {
    if (!selectedClass) return
    setExporting('progress')
    try {
      const sq = query(collection(db, 'students'), where('classCode', '==', selectedClass))
      const studentsSnap = await getDocs(sq)
      const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      const progressMap = {}
      for (const s of students) {
        const pDoc = await getDoc(doc(db, 'progress', s.id))
        if (pDoc.exists()) {
          progressMap[s.id] = pDoc.data().words || {}
        }
      }

      exportProgressSummary(students, progressMap)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting('')
    }
  }

  async function handleExportResults() {
    if (!selectedClass) return
    setExporting('results')
    try {
      // Load students for name lookup
      const sq = query(collection(db, 'students'), where('classCode', '==', selectedClass))
      const studentsSnap = await getDocs(sq)
      const studentMap = {}
      studentsSnap.docs.forEach(d => { studentMap[d.id] = { id: d.id, ...d.data() } })

      // Load results
      const rq = query(
        collection(db, 'results'),
        where('classCode', '==', selectedClass),
        orderBy('completedAt', 'desc')
      )
      const resultsSnap = await getDocs(rq)
      const results = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      exportTestResults(results, studentMap)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting('')
    }
  }

  async function handleExportWordAccuracy() {
    if (!selectedClass) return
    setExporting('words')
    try {
      // Load students
      const sq = query(collection(db, 'students'), where('classCode', '==', selectedClass))
      const studentsSnap = await getDocs(sq)
      const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Load progress for each
      const progressMap = {}
      for (const s of students) {
        const pDoc = await getDoc(doc(db, 'progress', s.id))
        if (pDoc.exists()) {
          progressMap[s.id] = pDoc.data().words || {}
        }
      }

      // Build word accuracy table
      const headers = ['#', '単語', '意味', '全体正答率', ...students.map(s => s.name)]
      const rows = words.map(word => {
        let totalCorrect = 0, totalAttempts = 0
        const perStudent = students.map(s => {
          const wp = progressMap[s.id]?.[String(word.i)]
          if (!wp || (wp.c + wp.w) === 0) return '-'
          const c = wp.c || 0
          const w = wp.w || 0
          totalCorrect += c
          totalAttempts += c + w
          return `${Math.round((c / (c + w)) * 100)}%`
        })
        const overallPct = totalAttempts > 0
          ? `${Math.round((totalCorrect / totalAttempts) * 100)}%`
          : '-'
        return [word.i, word.w, word.sm, overallPct, ...perStudent]
      })

      downloadCSV(
        `vocab_word_accuracy_${selectedClass}_${new Date().toISOString().split('T')[0]}.csv`,
        headers,
        rows
      )
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting('')
    }
  }

  const cls = classes.find(c => c.code === selectedClass)

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#f5f2ed]/90 backdrop-blur border-b border-gray-200
        px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/teacher')} className="text-xl text-accent2 px-1">←</button>
        <h1 className="text-sm font-semibold text-accent flex-1">CSVエクスポート</h1>
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

        {/* Export options */}
        <div className="text-xs font-semibold text-gray-500 mb-3 tracking-wide flex items-center gap-2">
          エクスポート形式
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="space-y-3">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-1">進捗一覧CSV</h3>
            <p className="text-xs text-gray-400 mb-3">
              生徒名、覚えた数、学習中、未学習、達成率、最終ログイン
            </p>
            <button
              onClick={handleExportProgress}
              disabled={!!exporting}
              className="bg-accent2 text-white text-xs px-4 py-2.5 rounded-lg font-semibold
                hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {exporting === 'progress' ? 'エクスポート中...' : 'ダウンロード'}
            </button>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-1">テスト結果CSV</h3>
            <p className="text-xs text-gray-400 mb-3">
              生徒名、日時、モード、範囲、正解、不正解、スコア
            </p>
            <button
              onClick={handleExportResults}
              disabled={!!exporting}
              className="bg-accent2 text-white text-xs px-4 py-2.5 rounded-lg font-semibold
                hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {exporting === 'results' ? 'エクスポート中...' : 'ダウンロード'}
            </button>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-1">単語別正答率CSV</h3>
            <p className="text-xs text-gray-400 mb-3">
              単語、全体正答率、生徒別正答率（全1,680語）
            </p>
            <button
              onClick={handleExportWordAccuracy}
              disabled={!!exporting}
              className="bg-accent2 text-white text-xs px-4 py-2.5 rounded-lg font-semibold
                hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {exporting === 'words' ? 'エクスポート中...' : 'ダウンロード'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
