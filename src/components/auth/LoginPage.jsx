import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function LoginPage() {
  const [tab, setTab] = useState('student')
  const [classCode, setClassCode] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { loginStudent, loginTeacher, student, teacher } = useAuth()

  // Redirect if already logged in
  if (student) { navigate('/student', { replace: true }); return null }
  if (teacher) { navigate('/teacher', { replace: true }); return null }

  async function handleStudentLogin(e) {
    e.preventDefault()
    if (!classCode.trim() || !name.trim()) {
      setError('クラスコードと名前を入力してください')
      return
    }
    setLoading(true)
    setError('')
    try {
      await loginStudent(classCode.trim(), name.trim())
      navigate('/student')
    } catch (err) {
      setError(err.message || 'ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleTeacherLogin(e) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('メールアドレスとパスワードを入力してください')
      return
    }
    setLoading(true)
    setError('')
    try {
      await loginTeacher(email.trim(), password)
      navigate('/teacher')
    } catch (err) {
      setError('ログインに失敗しました。認証情報を確認してください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-en text-3xl font-semibold text-accent tracking-wide">
            Vocab Master
          </h1>
          <p className="text-sm text-gray-400 mt-1">英検準1級 単語マスター</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-white rounded-xl p-1 mb-6 shadow-sm">
          <button
            onClick={() => { setTab('student'); setError('') }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'student'
                ? 'bg-accent2 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            生徒
          </button>
          <button
            onClick={() => { setTab('teacher'); setError('') }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'teacher'
                ? 'bg-accent2 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            先生
          </button>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {tab === 'student' ? (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  クラスコード
                </label>
                <input
                  type="text"
                  value={classCode}
                  onChange={e => setClassCode(e.target.value)}
                  placeholder="例: spring2026"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base
                    focus:border-accent2 focus:outline-none transition-colors"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  名前
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="例: 田中太郎"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base
                    focus:border-accent2 focus:outline-none transition-colors"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent2 text-white py-3.5 rounded-xl text-base font-semibold
                  hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'ログイン中...' : 'はじめる'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base
                    focus:border-accent2 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base
                    focus:border-accent2 focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent2 text-white py-3.5 rounded-xl text-base font-semibold
                  hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
