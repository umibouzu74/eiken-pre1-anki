import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useProgress } from '../../hooks/useProgress'
import words from '../../data/words.json'

const UNIT_SIZE = 50
const TOTAL_UNITS = Math.ceil(words.length / UNIT_SIZE)

export default function StudentHome() {
  const navigate = useNavigate()
  const { student, logout } = useAuth()
  const { getStats, loading } = useProgress()
  const stats = getStats()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#f5f2ed]/90 backdrop-blur border-b border-gray-200 px-5 py-3 flex items-center gap-3">
        <h1 className="text-sm font-semibold text-accent tracking-wide flex-1">単語マスター</h1>
        <span className="text-xs text-gray-400">{student?.name}</span>
        <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">ログアウト</button>
      </div>

      <div className="max-w-lg mx-auto px-5 pb-10">
        {/* Header */}
        <div className="text-center py-8">
          <h2 className="font-en text-2xl font-semibold text-accent tracking-wide">Eiken Pre-1</h2>
          <p className="text-xs text-gray-400 mt-1">
            {student?.className} ・ 全{words.length}語
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-500">{stats.mastered}</div>
            <div className="text-[11px] text-gray-400 mt-1">覚えた</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-orange-500">{stats.learning}</div>
            <div className="text-[11px] text-gray-400 mt-1">学習中</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-gray-400">{stats.remaining}</div>
            <div className="text-[11px] text-gray-400 mt-1">未学習</div>
          </div>
        </div>

        {/* TODO: Assignments section (Phase 3) */}

        {/* Study modes */}
        <div className="text-xs font-semibold text-gray-500 mb-3 tracking-wide flex items-center gap-2">
          学習モード
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="space-y-3 mb-8">
          {[
            { icon: '🃏', title: 'フラッシュカード', desc: 'カードをめくって意味を確認', path: '/student/flashcard' },
            { icon: '🔤', title: '4択クイズ', desc: '穴埋め例文から正しい単語を選択', path: '/student/quiz4' },
            { icon: '⌨️', title: 'タイピングテスト', desc: '例文の空欄に入る単語をタイプ', path: '/student/typing' },
          ].map(mode => (
            <div
              key={mode.path}
              onClick={() => navigate(mode.path)}
              className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 cursor-pointer
                hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] transition-all"
            >
              <div className="text-2xl">{mode.icon}</div>
              <div>
                <h3 className="text-sm font-semibold">{mode.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{mode.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Unit grid */}
        <div className="text-xs font-semibold text-gray-500 mb-3 tracking-wide flex items-center gap-2">
          ユニット一覧
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {Array.from({ length: TOTAL_UNITS }, (_, i) => {
            const n = i + 1
            const start = (n - 1) * UNIT_SIZE + 1
            const end = Math.min(n * UNIT_SIZE, words.length)
            return (
              <div
                key={n}
                onClick={() => navigate(`/student/flashcard?from=${start}&to=${end}`)}
                className="bg-white rounded-lg p-3 text-center cursor-pointer border border-gray-100
                  hover:-translate-y-0.5 hover:shadow-sm active:scale-95 transition-all relative overflow-hidden"
              >
                <div className="text-lg font-bold text-accent2">{n}</div>
                <div className="text-[10px] text-gray-400">{start}–{end}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
