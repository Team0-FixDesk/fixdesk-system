export function useTruncateText() {
  const truncateSentences = (text) => {
    if (!text) return ''

    const MAX_CHARS = 50
    const MAX_WORDS = 13

    // พยายามตัดเป็นประโยค (ภาษาไทย)
    try {
      const sentenceSeg = new Intl.Segmenter('th', { granularity: 'sentence' })
      const sentences = [...sentenceSeg.segment(text)].map((s) => s.segment.trim()).filter(Boolean)

      if (sentences.length > 1) {
        return sentences[0]
      }
    } catch {
      // ignore
    }

    // พยายามตัดเป็นคำ
    try {
      const wordSeg = new Intl.Segmenter('th', { granularity: 'word' })
      const words = [...wordSeg.segment(text)].map((w) => w.segment).filter((w) => w.trim())

      if (words.length > MAX_WORDS) {
        return words.slice(0, MAX_WORDS).join('')
      }
    } catch {
      // ignore
    }

    // fallback ตัดตามตัวอักษร
    return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '...' : text
  }

  return { truncateSentences }
}
