import { createContext, useContext, useState, useEffect } from 'react'
import { auth, db } from '../../lib/firebase'
import { signInAnonymously, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, serverTimestamp, increment } from 'firebase/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)        // Firebase Auth user
  const [student, setStudent] = useState(null)   // Student record from Firestore
  const [teacher, setTeacher] = useState(null)   // Teacher record from Firestore
  const [loading, setLoading] = useState(true)

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        // Check if teacher
        const teacherDoc = await getDoc(doc(db, 'teachers', firebaseUser.uid))
        if (teacherDoc.exists()) {
          setTeacher({ uid: firebaseUser.uid, ...teacherDoc.data() })
          setStudent(null)
        } else {
          // Check if returning student
          const saved = sessionStorage.getItem('vm_student')
          if (saved) {
            setStudent(JSON.parse(saved))
          }
          setTeacher(null)
        }
      } else {
        setStudent(null)
        setTeacher(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  // Student login: class code + name
  async function loginStudent(classCode, name) {
    // 1. Verify class exists
    const classDoc = await getDoc(doc(db, 'classes', classCode))
    if (!classDoc.exists()) {
      throw new Error('クラスコードが見つかりません')
    }

    // 2. Anonymous auth
    let firebaseUser = auth.currentUser
    if (!firebaseUser) {
      const cred = await signInAnonymously(auth)
      firebaseUser = cred.user
    }

    // 3. Check if student already registered with this name + class
    const q = query(
      collection(db, 'students'),
      where('classCode', '==', classCode),
      where('name', '==', name)
    )
    const snap = await getDocs(q)

    let studentData
    if (snap.empty) {
      // New student → create record
      const studentRef = doc(collection(db, 'students'))
      studentData = {
        id: studentRef.id,
        name,
        classCode,
        firebaseUid: firebaseUser.uid,
        joinedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      }
      await setDoc(studentRef, studentData)
      // Increment student count on class
      await updateDoc(doc(db, 'classes', classCode), {
        studentCount: increment(1)
      })
    } else {
      // Returning student → update UID and activity
      const existingDoc = snap.docs[0]
      studentData = { id: existingDoc.id, ...existingDoc.data() }
      await updateDoc(doc(db, 'students', existingDoc.id), {
        firebaseUid: firebaseUser.uid,
        lastActiveAt: serverTimestamp(),
      })
    }

    // Save to session
    const sessionData = {
      id: studentData.id,
      name: studentData.name,
      classCode: studentData.classCode,
      className: classDoc.data().name,
    }
    sessionStorage.setItem('vm_student', JSON.stringify(sessionData))
    setStudent(sessionData)
    return sessionData
  }

  // Teacher login: email + password
  async function loginTeacher(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const teacherDoc = await getDoc(doc(db, 'teachers', cred.user.uid))
    if (!teacherDoc.exists()) {
      throw new Error('先生のアカウントが見つかりません')
    }
    const data = { uid: cred.user.uid, ...teacherDoc.data() }
    setTeacher(data)
    return data
  }

  // Logout
  async function logout() {
    sessionStorage.removeItem('vm_student')
    setStudent(null)
    setTeacher(null)
    await signOut(auth)
  }

  const value = {
    user,
    student,
    teacher,
    loading,
    loginStudent,
    loginTeacher,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
