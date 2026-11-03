import { useId, useRef, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { message } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type AnswerQuestion = { prompt: string, kind: 'choice' | 'checkbox' | 'text', options: string[], allowMultiple?: boolean, allowMultipleSubmissions?: boolean }
export function PollAnswerForm({ question, disabled = false, onSubmit }: { question: AnswerQuestion, disabled?: boolean, onSubmit: (choices: number[], text: string, requestId: string) => Promise<unknown> }) {
  const id = useId()
  const requestId = useRef<string | null>(null)
  const [choices, setChoices] = useState<number[]>([]), [text, setText] = useState('')
  const [sending, setSending] = useState(false), [error, setError] = useState('')
  return <form className="space-y-5" onSubmit={async event => { event.preventDefault(); if (sending || disabled) return; setSending(true); setError(''); try { requestId.current ??= crypto.randomUUID(); await onSubmit(choices, text, requestId.current); requestId.current = null; if (question.allowMultipleSubmissions) { setChoices([]); setText('') } } catch (e) { setError(message(e)) } finally { setSending(false) } }}>
    {question.kind !== 'text' ? <><p className="text-xs font-medium text-muted-foreground">{(question.kind === 'checkbox' || question.allowMultiple) ? 'Select all answers that apply, then submit.' : 'Choose one answer, then submit.'}</p><div className="grid gap-3">{question.options.map((option, i) => (question.kind === 'checkbox' || question.allowMultiple) ? <Label key={i} htmlFor={`${id}-${i}`} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 leading-relaxed transition-colors ${choices.includes(i) ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'}`}><Checkbox id={`${id}-${i}`} checked={choices.includes(i)} disabled={sending || disabled} onCheckedChange={checked => setChoices(current => checked ? [...current, i] : current.filter(n => n !== i))} /><span className="min-w-0 break-words">{option}</span></Label> : <Button key={i} variant="outline" aria-pressed={choices.includes(i)} className={`h-auto min-h-14 justify-start whitespace-normal p-4 text-left ${choices.includes(i) ? 'border-primary bg-primary/10 ring-1 ring-primary' : ''}`} disabled={sending || disabled} onClick={() => setChoices([i])}><span className="mr-2 grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs">{String.fromCharCode(65 + i)}</span><span className="min-w-0 break-words">{option}</span>{choices.includes(i) && <Check size={16} className="ml-auto shrink-0" />}</Button>)}</div></> : <div className="space-y-2"><Label htmlFor={`${id}-text`}>Your answer</Label><Textarea id={`${id}-text`} value={text} onChange={e => setText(e.target.value)} maxLength={300} required disabled={sending || disabled} placeholder="What comes to mind?" /><p className="text-right text-xs text-muted-foreground">{text.length}/300</p></div>}
    <Button type="submit" className="h-12 w-full" disabled={sending || disabled || (question.kind !== 'text' ? !choices.length : !text.trim())}>{sending ? 'Submitting…' : 'Submit answer'}<ArrowRight size={16} /></Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}
