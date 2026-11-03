import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { ArrowLeft, ArrowRight, BarChart3, Check, LockKeyhole } from 'lucide-react'
import { api } from '@/lib/backend'
import { message } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PollResults, PollSelect } from '@/components/poll-results'

export function JoinPollPage() {
  const { code } = useParams()
  return code ? <GuestPoll key={code.toUpperCase()} code={code.toUpperCase()} /> : <JoinForm />
}
function JoinForm() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  return <div className="mx-auto max-w-lg py-7 sm:py-12"><Link to="/public-apps" className="mb-7 inline-flex min-h-9 items-center gap-2 text-xs text-muted-foreground"><ArrowLeft size={14} />Public apps</Link><div className="panel p-6 sm:p-9"><span className="app-icon mb-6"><BarChart3 size={27} /></span><p className="eyebrow">YOUR VOICE. IN REAL TIME.</p><h1 className="page-title mt-3">Join a poll<span className="text-primary">.</span></h1><p className="mt-4 text-sm leading-relaxed text-muted-foreground">Have a code? You’re one step away. Join a live poll or quiz—no account needed.</p><form className="mt-8 space-y-4" onSubmit={event => { event.preventDefault(); const normalized = code.toUpperCase().replace(/[\s-]/g, ''); if (normalized.length === 8) navigate(`/join/${normalized}`) }}><Label htmlFor="join-code">8-character join code</Label><Input id="join-code" value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 8))} placeholder="ABCD2345" autoComplete="off" autoCapitalize="characters" spellCheck={false} minLength={8} maxLength={8} required className="h-14 text-center font-mono text-xl tracking-[.18em]" /><Button type="submit" className="h-12 w-full" disabled={code.length !== 8}>Find poll<ArrowRight size={16} /></Button></form><p className="mt-5 text-xs leading-relaxed text-muted-foreground">You can also scan the host’s QR code with your phone camera to open the poll directly.</p></div></div>
}
function tokenFor(code: string) {
  try { const token = localStorage.getItem(`blue-poll-${code}`); if (token && /^[0-9a-f-]{36}$/i.test(token)) return token } catch { /* Keep the session in memory if storage is unavailable. */ }
  return crypto.randomUUID()
}
function GuestPoll({ code }: { code: string }) {
  const poll = useQuery(api.polls.lookup, { code })
  const [token] = useState(() => tokenFor(code))
  const mine = useQuery(api.polls.myAnswers, { code, token })
  const join = useMutation(api.polls.join)
  const respond = useMutation(api.polls.respond)
  const [joining, setJoining] = useState(false), [sending, setSending] = useState(false), [error, setError] = useState('')
  const [index, setIndex] = useState(0), [choice, setChoice] = useState<number | null>(null), [text, setText] = useState('')
  const [resultIndex, setResultIndex] = useState(0)
  if (poll === undefined || mine === undefined) return <p role="status" className="p-8 text-center text-sm text-muted-foreground">Finding your poll…</p>
  if (!poll) return <div className="panel mx-auto max-w-lg space-y-5 p-8"><h1 className="text-2xl font-semibold">No poll found.</h1><p className="text-sm text-muted-foreground">Check the code with your host. Draft polls aren’t available until they’re published.</p><Button render={<Link to="/join" />}>Try another code<ArrowRight size={16} /></Button></div>
  const question = poll.questions[index], answered = mine?.answers.find(a => a.question === index)
  const complete = mine?.answers.length === poll.questions.length
  const nextUnanswered = (from: number) => poll.questions.findIndex((_, i) => i > from && !mine?.answers.some(a => a.question === i))
  async function enter() {
    if (joining) return
    setJoining(true); setError('')
    try { await join({ code, token }); try { localStorage.setItem(`blue-poll-${code}`, token) } catch { /* Session remains usable for this visit. */ } } catch (e) { setError(message(e)) } finally { setJoining(false) }
  }
  async function send() {
    if (sending || !question) return
    setSending(true); setError('')
    try { await respond({ code, token, question: index, ...(question.kind === 'choice' ? { choice: choice! } : { text }) }) } catch (e) { setError(message(e)) } finally { setSending(false) }
  }
  function move(value: number) { setIndex(value); setChoice(null); setText(''); setError('') }
  return <div className="mx-auto max-w-3xl space-y-6"><Link to="/join" className="inline-flex min-h-9 items-center gap-2 text-xs text-muted-foreground"><ArrowLeft size={14} />Another poll</Link><div><p className="eyebrow">CODE {code} · {poll.status === 'open' ? 'LIVE NOW' : 'VOTING CLOSED'}</p><h1 className="page-title mt-3 break-words">{poll.title}</h1>{poll.description && <p className="page-subtitle whitespace-pre-wrap break-words">{poll.description}</p>}</div>
    <Tabs defaultValue="answer"><TabsList className="h-11 w-full"><TabsTrigger value="answer" className="h-9">Your answers</TabsTrigger><TabsTrigger value="results" className="h-9">Live results</TabsTrigger></TabsList>
      <TabsContent value="answer" className="mt-3"><div className="panel space-y-5 p-5 sm:p-8">
        {!mine ? <div className="space-y-5 py-4"><span className="app-icon"><BarChart3 size={26} /></span><h2 className="text-2xl font-semibold">{poll.status === 'open' ? 'Ready to weigh in?' : 'This poll has closed.'}</h2><p className="text-sm leading-relaxed text-muted-foreground">{poll.questions.length} questions. No name, email, or account needed. Your browser remembers your answers so you can return.</p><p className="text-xs leading-relaxed text-muted-foreground">Open-ended answers may be shown publicly when the host reveals results. Please avoid personal information.</p><Button className="h-12" disabled={joining || poll.status !== 'open'} onClick={() => void enter()}>{joining ? 'Joining…' : 'Join poll'}<ArrowRight size={16} /></Button></div> : <>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{mine.answers.length} / {poll.questions.length} answered</span><span className="inline-flex items-center gap-1.5"><LockKeyhole size={13} />One answer per question</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${mine.answers.length / poll.questions.length * 100}%` }} /></div>
          {complete && <div role="status" className="rounded-xl bg-emerald-500/10 p-4"><p className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300"><Check size={18} />You’re all done!</p><p className="mt-2 text-sm text-muted-foreground">Your answers are saved. Check Live results when the host reveals them.</p>{mine.quizTotal > 0 && <p className="mt-3 text-sm font-medium">{mine.correct === null ? 'Your quiz score will appear when results are revealed.' : `Quiz score: ${mine.correct} / ${mine.quizTotal}`}</p>}</div>}
          <PollSelect label="Answer question" value={String(index)} options={poll.questions.map((q, i) => ({ value: String(i), label: `${mine.answers.some(a => a.question === i) ? '✓ ' : ''}${i + 1}. ${q.prompt}` }))} onChange={value => move(Number(value))} />
          <div><p className="text-xs text-muted-foreground">Question {index + 1} of {poll.questions.length}</p><h2 className="mt-2 break-words text-xl font-semibold">{question.prompt}</h2></div>
          {answered ? <div className="space-y-4"><div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"><p className="mb-2 flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300"><Check size={15} />Answer submitted</p><p className="whitespace-pre-wrap break-words text-sm">{question.kind === 'choice' ? question.options[answered.choice!] : answered.text}</p></div>{!complete && <Button className="h-11" onClick={() => { const next = nextUnanswered(index); move(next >= 0 ? next : poll.questions.findIndex((_, i) => !mine.answers.some(a => a.question === i))) }}>Next question<ArrowRight size={16} /></Button>}</div> : poll.status !== 'open' ? <p className="rounded-xl bg-muted p-5 text-sm text-muted-foreground">Voting is closed. The host can reopen it if needed.</p> : <form className="space-y-5" onSubmit={event => { event.preventDefault(); void send() }}>{question.kind === 'choice' ? <div className="grid gap-3">{question.options.map((option, i) => <Button key={i} variant="outline" aria-pressed={choice === i} className={`h-auto min-h-12 justify-start whitespace-normal p-4 text-left ${choice === i ? 'border-primary bg-primary/10 ring-1 ring-primary' : ''}`} disabled={sending} onClick={() => setChoice(i)}><span className="mr-2 grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs">{String.fromCharCode(65 + i)}</span><span className="min-w-0 break-words">{option}</span>{choice === i && <Check size={16} className="ml-auto shrink-0" />}</Button>)}</div> : <div className="space-y-2"><Label htmlFor="poll-answer">Your answer</Label><Textarea id="poll-answer" value={text} onChange={e => setText(e.target.value)} maxLength={300} required disabled={sending} placeholder="What comes to mind?" /><p className="text-right text-xs text-muted-foreground">{text.length}/300</p></div>}<Button type="submit" className="h-12 w-full" disabled={sending || (question.kind === 'choice' ? choice === null : !text.trim())}>{sending ? 'Submitting…' : 'Submit answer'}<ArrowRight size={16} /></Button></form>}
        </>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div></TabsContent>
      <TabsContent value="results" className="mt-3"><div className="panel space-y-5 p-5 sm:p-8"><PollSelect label="Results question" value={String(resultIndex)} options={poll.questions.map((q, i) => ({ value: String(i), label: `${i + 1}. ${q.prompt}` }))} onChange={value => setResultIndex(Number(value))} /><h2 className="break-words text-xl font-semibold">{poll.questions[resultIndex].prompt}</h2><PollResults key={resultIndex} code={code} index={resultIndex} question={poll.questions[resultIndex]} /></div></TabsContent>
    </Tabs>
  </div>
}
