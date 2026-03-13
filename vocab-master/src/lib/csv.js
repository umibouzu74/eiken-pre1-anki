/**
 * CSV export utilities for teacher dashboard
 */

export function arrayToCSV(headers, rows) {
  const escape = (val) => {
    const str = String(val ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(','))
  ]

  // BOM for Excel compatibility with Japanese
  return '\uFEFF' + lines.join('\n')
}

export function downloadCSV(filename, headers, rows) {
  const csv = arrayToCSV(headers, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export student progress summary
 */
export function exportProgressSummary(students, progressMap) {
  const headers = ['名前', 'クラス', '覚えた', '学習中', '未学習', '達成率', '最終ログイン']
  const rows = students.map(s => {
    const p = progressMap[s.id] || {}
    const words = Object.values(p)
    const mastered = words.filter(w => w.s === 'mastered').length
    const learning = words.filter(w => w.s === 'learning').length
    const remaining = 1680 - mastered - learning
    const pct = ((mastered / 1680) * 100).toFixed(1) + '%'
    const lastActive = s.lastActiveAt?.toDate?.()?.toLocaleDateString('ja-JP') || '-'
    return [s.name, s.classCode, mastered, learning, remaining, pct, lastActive]
  })

  downloadCSV(
    `vocab_progress_${new Date().toISOString().split('T')[0]}.csv`,
    headers,
    rows
  )
}

/**
 * Export test results
 */
export function exportTestResults(results, studentMap) {
  const headers = ['名前', '日時', 'モード', '範囲', '正解', '不正解', 'スコア']
  const rows = results.map(r => {
    const name = studentMap[r.studentId]?.name || '不明'
    const date = r.completedAt?.toDate?.()?.toLocaleString('ja-JP') || '-'
    const range = `${r.rangeFrom}-${r.rangeTo}`
    const score = r.total > 0 ? ((r.correct / r.total) * 100).toFixed(0) + '%' : '-'
    return [name, date, r.mode, range, r.correct, r.wrong, score]
  })

  downloadCSV(
    `vocab_results_${new Date().toISOString().split('T')[0]}.csv`,
    headers,
    rows
  )
}
