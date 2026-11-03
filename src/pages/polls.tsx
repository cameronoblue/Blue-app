import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery } from 'convex/react'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, ArrowUpRight, Plus, Trash2, BarChart3, Copy, Eye, EyeOff, Play, Square, Users, Maximize2, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Doc, type Id } from '@/lib/backend'
import { message } from '@/lib/format'
import { Loading } from '@/App'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PollResults, PollSelect } from '@/components/poll-results'

export function PollsPage() {
  const me = useQuery(api.accounts.me)
  const polls = useQuery(api.polls.list, me?.role === 'admin' ? {} : 'skip')
  if (!me) return <Loading />
  if (me.role !== 'admin') return <div className="panel space-y-4 p-7"><h1 className="page-title">Polls & quizzes</h1><p className="text-muted-foreground">Have a code? Join a session without needing an admin account.</p><Button render={<Link to="/join" />}>Join a poll<ArrowUpRight size={16} /></Button></div>
  return <div className="space-y-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">EVERY VOICE COUNTS</p><h1 className="page-title">Polls & quizzes<span className="text-primary">.</span></h1><p className="page-subtitle">Ask a question. Bring everyone in. See the room come alive.</p></div><Button className="h-11" render={<Link to="/polls/new" />}><Plus size={17} />Create poll</Button></div>
    <div className="rounded-2xl border bg-primary/5 p-5 text-sm"><p className="font-medium">From a quick vote to a full quiz.</p><p className="mt-2 text-muted-foreground">Build up to 20 questions, share an 8-character code or QR, and choose when everyone can see results. Guests never need an account.</p><Link to="/join" className="mt-3 inline-flex min-h-9 items-center gap-2 font-medium text-primary">Open public join page<ArrowUpRight size={15} /></Link></div>
    {polls === undefined ? <Loading /> : !polls.length ? <div className="panel px-6 py-14 text-center"><BarChart3 className="mx-auto mb-4 text-primary" size={32} /><h2 className="text-xl font-semibold">What do you want to ask?</h2><p className="mt-2 text-sm text-muted-foreground">Your first live poll starts with a question.</p><Button className="mt-6 h-11" render={<Link to="/polls/new" />}>Create your first poll<Plus size={16} /></Button></div> : <div className="grid gap-4 sm:grid-cols-2">{polls.map(poll => <Link key={poll._id} to={`/polls/${poll._id}`} className="panel group space-y-5 p-6"><div className="flex items-center justify-between"><span className="app-icon"><BarChart3 size={24} /></span><Badge variant={poll.status === 'open' ? 'default' : 'secondary'}>{poll.status === 'open' ? 'LIVE' : poll.status.toUpperCase()}</Badge></div><div><h2 className="break-words text-lg font-semibold">{poll.title}</h2><p className="mt-2 line-clamp-2 break-words text-sm text-muted-foreground">{poll.description || 'A question worth asking.'}</p></div><div className="flex flex-wrap gap-4 border-t pt-4 text-xs text-muted-foreground"><span>{poll.questions.length} questions</span><span>{poll.participantCount} participants</span><ArrowUpRight className="ml-auto transition-transform group-hover:translate-x-0.5" size={16} /></div></Link>)}</div>}
    {polls?.length === 100 && <p className="text-xs text-muted-foreground">Showing your 100 most recent sessions.</p>}
  </div>
}
type DraftQuestion = { key: string, prompt: string, kind: 'choice' | 'text', options: string[], correctIndex?: number }
const newQuestion = (): DraftQuestion => ({ key: crypto.randomUUID(), prompt: '', kind: 'choice', options: ['', ''] })
export function NewPollPage() {
  const me = useQuery(api.accounts.me)
  if (!me) return <Loading />
  if (me.role !== 'admin') return <p role="alert">Only admins can create polls.</p>
  return <PollEditor />
}
function PollEditor({ poll, onCancel }: { poll?: Doc<'polls'>, onCancel?: () => void }) {
  const navigate = useNavigate()
  const create = useMutation(api.polls.create), edit = useMutation(api.polls.edit)
  const [title, setTitle] = useState(poll?.title ?? ''), [description, setDescription] = useState(poll?.description ?? '')
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => poll?.questions.map(q => ({ ...q, key: crypto.randomUUID() })) ?? [newQuestion()])
  const [pending, setPending] = useState(false), [error, setError] = useState('')
  const update = (index: number, patch: Partial<DraftQuestion>) => setQuestions(qs => qs.map((q, i) => i === index ? { ...q, ...patch } : q))
  async function submit(event: FormEvent) {
    event.preventDefault(); if (pending) return
    setPending(true); setError('')
    const args = { title, description, questions: questions.map(q => ({ prompt: q.prompt, kind: q.kind, options: q.kind === 'text' ? [] : q.options, ...(q.kind === 'choice' && q.correctIndex !== undefined ? { correctIndex: q.correctIndex } : {}) })) }
    try {
      if (poll) { await edit({ id: poll._id, ...args }); onCancel?.(); toast.success('Draft updated') }
      else { const id = await create(args); navigate(`/polls/${id}`); toast.success('Draft created. Publish when you’re ready.') }
    } catch (e) { setError(message(e)) } finally { setPending(false) }
  }
  return <div className="mx-auto max-w-3xl space-y-6"><Link to="/polls" className="inline-flex min-h-9 items-center gap-2 text-xs text-muted-foreground"><ArrowLeft size={14} />Polls & quizzes</Link><div><p className="eyebrow">MAKE ROOM FOR OPINIONS</p><h1 className="page-title">{poll ? 'Edit draft' : 'Create a poll'}.</h1><p className="page-subtitle">Mix multiple-choice and open-ended questions. Add a correct answer to turn a question into a quiz.</p></div><form onSubmit={submit} className="space-y-5"><fieldset disabled={pending} className="space-y-5"><div className="panel space-y-5 p-5 sm:p-7"><div className="space-y-2"><Label htmlFor="poll-title">Poll title</Label><Input id="poll-title" className="h-11" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required placeholder="What’s on everyone’s mind?" /></div><div className="space-y-2"><Label htmlFor="poll-description">Description (optional)</Label><Textarea id="poll-description" value={description} onChange={e => setDescription(e.target.value)} maxLength={600} placeholder="A little context for your audience." /></div></div>
      {questions.map((q, index) => <section key={q.key} aria-label={`Question ${index + 1}`} className="panel space-y-5 p-5 sm:p-7"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Question {index + 1}</h2><Button variant="ghost" size="icon" aria-label={`Remove question ${index + 1}`} disabled={questions.length === 1} onClick={() => setQuestions(qs => qs.filter((_, i) => i !== index))}><Trash2 size={16} /></Button></div><div className="space-y-2"><Label htmlFor={`prompt-${q.key}`}>Question text</Label><Textarea id={`prompt-${q.key}`} value={q.prompt} onChange={e => update(index, { prompt: e.target.value })} maxLength={300} required placeholder="Ask something interesting…" /></div><div className="space-y-2"><Label>Question type</Label><PollSelect label={`Question ${index + 1} type`} value={q.kind} onChange={kind => update(index, { kind: kind as 'choice' | 'text', correctIndex: undefined })} options={[{ value: 'choice', label: 'Multiple choice' }, { value: 'text', label: 'Open ended' }]} /></div>
        {q.kind === 'choice' ? <><div className="space-y-3">{q.options.map((option, oi) => <div key={oi} className="flex items-center gap-2"><div className="min-w-0 flex-1"><Label className="sr-only" htmlFor={`${q.key}-option-${oi}`}>Option {oi + 1}</Label><Input id={`${q.key}-option-${oi}`} className="h-11" value={option} onChange={e => update(index, { options: q.options.map((o, i) => i === oi ? e.target.value : o) })} required maxLength={100} placeholder={`Option ${oi + 1}`} /></div><Button variant="ghost" size="icon" aria-label={`Remove option ${oi + 1} from question ${index + 1}`} disabled={q.options.length <= 2} onClick={() => update(index, { options: q.options.filter((_, i) => i !== oi), correctIndex: undefined })}><X size={15} /></Button></div>)}</div><Button variant="outline" className="h-10" disabled={q.options.length >= 12} onClick={() => update(index, { options: [...q.options, ''] })}><Plus size={15} />Add option</Button><div className="space-y-2 border-t pt-4"><Label>Correct answer (optional)</Label><PollSelect label={`Question ${index + 1} correct answer`} value={q.correctIndex === undefined ? 'none' : String(q.correctIndex)} options={[{ value: 'none', label: 'Opinion poll — no correct answer' }, ...q.options.map((o, i) => ({ value: String(i), label: `Option ${i + 1}${o ? ` · ${o}` : ''}` }))]} onChange={v => update(index, { correctIndex: v === 'none' ? undefined : Number(v) })} /><p className="text-xs text-muted-foreground">Quiz scores and correct answers stay hidden until you reveal results.</p></div></> : <p className="rounded-xl bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">Guests can write up to 300 characters. Display answers as a word cloud, cards, or a data table, and hide individual answers if needed.</p>}
      </section>)}
      <Button variant="outline" className="h-12 w-full border-dashed" disabled={questions.length >= 20} onClick={() => setQuestions(qs => [...qs, newQuestion()])}><Plus size={16} />Add question ({questions.length}/20)</Button></fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap gap-3"><Button type="submit" disabled={pending} className="h-12">{pending ? 'Saving…' : poll ? 'Save draft' : 'Create draft'}</Button>{onCancel && <Button variant="outline" className="h-12" disabled={pending} onClick={onCancel}>Cancel</Button>}</div><p className="text-xs text-muted-foreground">Nothing is public until you publish. Questions are locked after publishing to keep results consistent.</p></form></div>
}
export function PollHostPage() {
  const { id } = useParams()
  const me = useQuery(api.accounts.me)
  const poll = useQuery(api.polls.get, me?.role === 'admin' ? { id: id as Id<'polls'> } : 'skip')
  const control = useMutation(api.polls.control)
  const [index, setIndex] = useState(0), [pending, setPending] = useState(false), [editing, setEditing] = useState(false)
  const [presenting, setPresenting] = useState(false), [localHidden, setLocalHidden] = useState(false)
  if (me && me.role !== 'admin') return <p role="alert">Only admins can host polls.</p>
  if (!poll) return <Loading />
  if (editing) return <PollEditor poll={poll} onCancel={() => setEditing(false)} />
  const question = poll.questions[index] ?? poll.questions[0]
  const joinUrl = `${window.location.origin}/join/${poll.code}`
  async function change(patch: { status?: 'open' | 'closed', resultsVisible?: boolean }) {
    if (!poll || pending) return
    setPending(true)
    try { await control({ id: poll._id, ...patch }) } catch (e) { toast.error(message(e)) } finally { setPending(false) }
  }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); toast.success('Copied') } catch { toast.error('Could not copy. Select and copy the join link below.') } }
  return <div className={presenting ? 'fixed inset-0 z-50 overflow-y-auto bg-background p-5 sm:p-10' : 'space-y-6'}><div className={presenting ? 'mx-auto max-w-6xl space-y-6' : 'space-y-6'}>
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><Link to="/polls" className="mb-3 inline-flex min-h-8 items-center gap-2 text-xs text-muted-foreground"><ArrowLeft size={14} />Polls & quizzes</Link><div className="flex flex-wrap items-center gap-3"><h1 className="page-title break-words">{poll.title}</h1><Badge variant={poll.status === 'open' ? 'default' : 'secondary'}>{poll.status.toUpperCase()}</Badge></div><p className="mt-3 max-w-2xl whitespace-pre-wrap break-words text-sm text-muted-foreground">{poll.description}</p></div><Button variant="outline" className="h-11" onClick={() => setPresenting(!presenting)}>{presenting ? <X size={16} /> : <Maximize2 size={16} />}{presenting ? 'Exit presentation' : 'Present'}</Button></div>
    <div className="flex flex-wrap gap-3 rounded-2xl border bg-card p-4">{poll.status === 'draft' ? <><Button className="h-11" disabled={pending} onClick={() => void change({ status: 'open' })}><Play size={16} />Publish poll</Button><Button variant="outline" className="h-11" onClick={() => setEditing(true)}><Pencil size={15} />Edit draft</Button></> : <><Button variant="outline" className="h-11" disabled={pending} onClick={() => void change({ status: poll.status === 'open' ? 'closed' : 'open' })}>{poll.status === 'open' ? <Square size={15} /> : <Play size={15} />}{poll.status === 'open' ? 'Close voting' : 'Reopen voting'}</Button><Button className="h-11" variant={poll.resultsVisible ? 'secondary' : 'default'} disabled={pending} onClick={() => void change({ resultsVisible: !poll.resultsVisible })}>{poll.resultsVisible ? <EyeOff size={16} /> : <Eye size={16} />}{poll.resultsVisible ? 'Hide participant results' : 'Show participant results'}</Button></>}<span className="ml-auto flex items-center gap-2 px-2 text-sm text-muted-foreground"><Users size={16} />{poll.participantCount} / 1,000 joined</span></div>
    <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]"><aside className="panel space-y-4 p-5"><p className="eyebrow">{poll.status === 'draft' ? 'READY WHEN YOU ARE' : 'JOIN THE CONVERSATION'}</p><div className="mx-auto w-fit rounded-2xl bg-white p-4"><QRCodeSVG value={joinUrl} size={192} level="M" marginSize={1} title={`Join ${poll.title}`} /></div><div className="text-center"><p className="text-xs text-muted-foreground">Join code</p><strong className="mt-1 block font-mono text-3xl tracking-[.12em]" data-testid="poll-code">{poll.code}</strong><p className="mt-2 text-xs text-muted-foreground">No sign-in required</p></div><div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-11" onClick={() => void copy(poll.code)}><Copy size={14} />Code</Button><Button variant="outline" className="h-11" onClick={() => void copy(joinUrl)}><Copy size={14} />Link</Button></div><a href={joinUrl} target="_blank" rel="noreferrer" className="block break-all text-center text-xs text-primary underline underline-offset-4">{joinUrl}</a>{poll.status === 'draft' && <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">This code activates when you publish the poll.</p>}<p className="text-xs leading-relaxed text-muted-foreground">One answer per question per browser session. Guests can resume on this browser. This is not identity-verified voting.</p></aside>
      <div className="panel min-w-0 space-y-5 p-5 sm:p-7"><div className="space-y-2"><Label>Question</Label><PollSelect label="Results question" value={String(index)} options={poll.questions.map((q, i) => ({ value: String(i), label: `${i + 1}. ${q.prompt}` }))} onChange={value => { setIndex(Number(value)); setLocalHidden(false) }} /></div><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Question {index + 1} of {poll.questions.length}</p><h2 className="mt-2 break-words text-xl font-semibold">{question.prompt}</h2></div><Button variant="ghost" className="h-10" onClick={() => setLocalHidden(!localHidden)}>{localHidden ? <Eye size={16} /> : <EyeOff size={16} />}{localHidden ? 'Show host view' : 'Hide host view'}</Button></div><p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">{poll.resultsVisible ? 'Participants can see live results and quiz answers.' : 'Participant results are hidden. This private host view stays available.'}</p>{localHidden ? <div className="grid min-h-64 place-content-center text-center text-muted-foreground"><EyeOff className="mx-auto mb-3" /><p>Host results hidden</p></div> : <PollResults key={`${poll._id}-${index}`} code={poll.code} index={index} question={question} admin />}</div>
    </div>
  </div></div>
}
