import { expect, it } from 'vitest'
import { wordCounts } from './poll-words'

it('counts repeated words across grouped answers and omits common words', () => {
  expect(wordCounts([{ text: 'The blue, BLUE sunny!', count: 2 }, { text: 'Blue skies and the sun.', count: 1 }])).toEqual([
    { word: 'blue', count: 5 }, { word: 'sunny', count: 2 }, { word: 'skies', count: 1 }, { word: 'sun', count: 1 },
  ])
})
it('keeps accented and non-Latin words and handles punctuation-only answers', () => {
  expect(wordCounts([{ text: 'Très cool—東京 😎', count: 1 }]).map(w => w.word)).toEqual(expect.arrayContaining(['très', 'cool', '東京']))
  expect(wordCounts([{ text: '!!! 😎 and the', count: 3 }])).toEqual([])
})
