const stopWords = new Set('a an and are as at be been but by for from has have i in is it its of on or our so that the their them there these they this to was we were will with you your'.split(' '))
export function wordCounts(texts: { text: string, count: number }[]) {
  const counts = new Map<string, number>()
  for (const { text, count } of texts) for (const word of text.toLocaleLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) ?? []) {
    if (word.length > 1 && !stopWords.has(word)) counts.set(word, (counts.get(word) ?? 0) + count)
  }
  return [...counts].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
}
