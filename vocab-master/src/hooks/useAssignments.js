import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useAssignments(classCode) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!classCode) { setLoading(false); return }
    try {
      const q = query(
        collection(db, 'assignments'),
        where('classCode', '==', classCode),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error('Failed to load assignments:', err)
    } finally {
      setLoading(false)
    }
  }, [classCode])

  useEffect(() => { load() }, [load])

  async function createAssignment({ classCode, title, rangeFrom, rangeTo, mode, dueDate }) {
    const ref = await addDoc(collection(db, 'assignments'), {
      classCode,
      title,
      rangeFrom: Number(rangeFrom),
      rangeTo: Number(rangeTo),
      mode,
      dueDate: dueDate || null,
      createdAt: serverTimestamp(),
      active: true,
    })
    await load()
    return ref.id
  }

  async function toggleAssignment(id, active) {
    await updateDoc(doc(db, 'assignments', id), { active })
    await load()
  }

  return { assignments, loading, createAssignment, toggleAssignment, reload: load }
}
