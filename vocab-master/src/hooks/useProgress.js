import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../components/auth/AuthContext'

/**
 * Hook to manage student word progress in Firestore
 *
 * Progress is stored as a single document per student:
 *   /progress/{studentId} → { words: { "1": { s, c, w, t, srs }, "2": {...} } }
 *
 * s = status ("new"|"learning"|"mastered")
 * c = correct count
 * w = wrong count
 * t = last reviewed timestamp (ms)
 * srs = { interval, easeFactor, repetitions, nextReview }
 */
export function useProgress() {
  const { student } = useAuth()
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)

  // Load progress on mount
  useEffect(() => {
    if (!student?.id) { setLoading(false); return }

    async function load() {
      try {
        const ref = doc(db, 'progress', student.id)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          setProgress(snap.data().words || {})
        }
      } catch (err) {
        console.error('Failed to load progress:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [student?.id])

  // Update a single word's progress
  const updateWord = useCallback(async (wordId, data) => {
    if (!student?.id) return

    const key = String(wordId)
    const updated = {
      ...progress,
      [key]: {
        ...(progress[key] || { s: 'new', c: 0, w: 0, t: 0 }),
        ...data,
        t: Date.now(),
      }
    }

    setProgress(updated)

    // Persist to Firestore
    try {
      const ref = doc(db, 'progress', student.id)
      await setDoc(ref, { words: updated }, { merge: true })
    } catch (err) {
      console.error('Failed to save progress:', err)
    }
  }, [student?.id, progress])

  // Get stats
  const getStats = useCallback(() => {
    const words = Object.values(progress)
    return {
      mastered: words.filter(w => w.s === 'mastered').length,
      learning: words.filter(w => w.s === 'learning').length,
      total: 1680,
      get remaining() { return this.total - this.mastered - this.learning },
    }
  }, [progress])

  // Get progress for a specific word
  const getWordProgress = useCallback((wordId) => {
    return progress[String(wordId)] || null
  }, [progress])

  return { progress, loading, updateWord, getStats, getWordProgress }
}
