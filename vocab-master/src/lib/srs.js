/**
 * Simplified SM-2 Spaced Repetition Algorithm
 *
 * Quality ratings:
 *   0 = "もう一度" (Again)
 *   1 = "微妙"     (Hard)
 *   2 = "覚えた"   (Good)
 *   3 = "簡単"     (Easy)
 */

export function createSRSCard() {
  return {
    interval: 0,       // days until next review
    easeFactor: 2.5,   // ease factor (min 1.3)
    repetitions: 0,    // consecutive correct answers
    nextReview: null,   // ISO date string
  }
}

export function updateSRS(card, quality) {
  const c = { ...card }

  if (quality < 2) {
    // Failed → reset
    c.repetitions = 0
    c.interval = 1
  } else {
    // Passed
    c.repetitions++
    if (c.repetitions === 1) c.interval = 1
    else if (c.repetitions === 2) c.interval = 3
    else c.interval = Math.round(c.interval * c.easeFactor)
  }

  // Update ease factor
  c.easeFactor = Math.max(
    1.3,
    c.easeFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02))
  )

  // Set next review date
  const next = new Date()
  next.setDate(next.getDate() + c.interval)
  c.nextReview = next.toISOString().split('T')[0]

  return c
}

export function isDueForReview(card) {
  if (!card.nextReview) return true
  const today = new Date().toISOString().split('T')[0]
  return card.nextReview <= today
}

/**
 * Get SRS status label
 */
export function getSRSStatus(card) {
  if (!card || card.repetitions === 0) return 'new'
  if (card.interval >= 21) return 'mastered'
  return 'learning'
}
