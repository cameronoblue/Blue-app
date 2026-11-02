import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link } from 'react-router'
import { Plus, ArrowUpRight, MoreHorizontal, Check, Clock3, ListPlus, ArchiveRestore, Archive, Pencil, Trash2, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Doc, type Id } from '@/lib/backend'
import { colors, dateTime, message, relativeTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { captureLocation, LocationError } from '@/lib/location'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Loading } from '@/App'

type Event = Doc<'eventTypes'>
type Color = Event['color']
export function LogPage() {
  const events = useQuery(api.logbook.listEvents)
  const record = useMutation(api.logbook.record)
  const saveLocation = useMutation(api.logbook.saveLocation)
  const update = useMutation(api.logbook.updateEvent)
  const removeEvent = useMutation(api.logbook.removeEvent)
  const [deleting, setDeleting] = useState<Id<'eventTypes'> | null>(null)
  const [editor, setEditor] = useState<'new' | Id<'eventTypes'> | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [pending, setPending] = useState<Id<'eventTypes'> | null>(null)
  const [note, setNote] = useState<{ id: Id<'logs'>, name: string, time: number } | null>(null)
  if (!events) return <Loading />
  const active = events.filter(e => e.archived === showArchived)
  async function logEvent(event: Event) {
    if (pending) return
    const occurredAt = Date.now()
    setPending(event._id)
    try {
      const id = await record({ eventTypeId: event._id, occurredAt, requestId: crypto.randomUUID() })
      setNote({ id, name: event.name, time: occurredAt })
      toast.success(`${event.name} logged`)
      if (event.trackLocation) {
        try {
          const location = await captureLocation()
          await saveLocation({ id, location })
          toast.success('Location saved with your event')
        } catch (error) {
          toast.warning(`${error instanceof LocationError ? error.message : 'Could not save location.'} Your event was saved without location.`)
        }
      }
    } catch (error) { toast.error(message(error)) } finally { setPending(null) }
  }
  async function toggleArchive(event: Event) {
    try { await update({ id: event._id, name: event.name, description: event.description, color: event.color, archived: !event.archived }); toast.success(event.archived ? 'Event restored' : 'Event archived. Your history is preserved.') } catch (error) { toast.error(message(error)) }
  }
  return <div className="space-y-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">LITTLE THINGS, LOGGED</p><h1 className="page-title">Log app<span className="text-primary">.</span></h1><p className="page-subtitle">Tap an event. Capture the moment.</p></div><Button className="h-11" onClick={() => setEditor('new')}><Plus size={17} />New event</Button></div>
    <div className="log-callout"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Clock3 size={20} /></div><div><p className="text-sm font-medium">One tap is all it takes.</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">We save the time when you tap. Add a note after, if there’s more to the story.</p></div><Link to="/log/data" className="ml-auto hidden items-center gap-1 whitespace-nowrap text-xs font-medium text-primary sm:flex">View your data<ArrowUpRight size={15} /></Link></div>
    <section><div className="mb-4 flex items-center justify-between"><h2 className="section-title">{showArchived ? 'Archived events' : 'Your events'} <span className="ml-2 text-xs font-normal text-muted-foreground">{active.length}</span></h2><Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => setShowArchived(!showArchived)}>{showArchived ? 'Show active' : 'View archived'}</Button></div>
      {active.length === 0 ? <div className="empty-state"><span className="empty-icon"><ListPlus size={28} /></span><h3>{showArchived ? 'Nothing archived.' : 'What are you curious about?'}</h3><p>{showArchived ? 'Archived events keep their history and can be restored here.' : 'Create an event for anything you want to notice. A coffee, a good idea, a neighborhood cat.'}</p>{!showArchived && <Button className="mt-5 h-11" onClick={() => setEditor('new')}><Plus size={17} />Create your first event</Button>}</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{active.map(event => <article className="panel event-card" key={event._id}>
        <div className="flex items-center justify-between"><span className={`event-symbol ${colors[event.color].className}`}><ListPlus size={22} /></span><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Manage ${event.name}`} />}><MoreHorizontal size={20} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setEditor(event._id)}><Pencil size={15} />Edit event</DropdownMenuItem><DropdownMenuItem onClick={() => void toggleArchive(event)}>{event.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}{event.archived ? 'Restore event' : 'Archive event'}</DropdownMenuItem>{event.totalCount === 0 && <DropdownMenuItem onClick={() => setDeleting(event._id)}><Trash2 size={15} />Delete empty event</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></div>
        <h3 className="mt-5 truncate text-lg font-semibold" title={event.name}>{event.name}</h3><p className="mt-1 min-h-10 text-xs leading-relaxed text-muted-foreground line-clamp-2">{event.description || 'A little moment worth remembering.'}</p>
        {event.trackLocation && <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"><MapPin size={12} />Location enabled</p>}<div className="mt-5 flex items-end justify-between"><div><p className="text-2xl font-semibold tabular-nums tracking-tight">{event.totalCount.toLocaleString()}</p><p className="mt-1 text-[11px] text-muted-foreground">{relativeTime(event.lastLoggedAt)}</p></div>{event.archived ? <Button variant="outline" onClick={() => void toggleArchive(event)}>Restore</Button> : <Button className="h-11 gap-2 px-4" disabled={pending !== null} onClick={() => void logEvent(event)}>{pending === event._id ? 'Logging…' : <><Plus size={17} />Log it</>}</Button>}</div>
      </article>)}</div>}
    </section>
    <p className="flex items-center gap-2 text-xs text-muted-foreground"><Check size={14} />Saved automatically. Available on all your devices.</p>
    <Dialog open={deleting !== null} onOpenChange={open => { if (!open) setDeleting(null) }}><DialogContent><DialogHeader><DialogTitle>Delete this empty event?</DialogTitle><DialogDescription>This removes the event button. Events with history can only be archived.</DialogDescription></DialogHeader><div className="flex gap-2"><Button className="h-11 flex-1" variant="outline" onClick={() => setDeleting(null)}>Keep event</Button><Button className="h-11 flex-1" variant="destructive" onClick={async () => { if (!deleting) return; try { await removeEvent({ id: deleting }); setDeleting(null); toast.success('Event deleted') } catch (error) { toast.error(message(error)) } }}>Delete event</Button></div></DialogContent></Dialog>
    <Dialog open={editor !== null} onOpenChange={open => { if (!open) setEditor(null) }}><DialogContent><DialogHeader><DialogTitle>{editor === 'new' ? 'Create an event' : 'Edit event'}</DialogTitle><DialogDescription>Make a button for something you want to keep track of.</DialogDescription></DialogHeader>{editor && <EventForm key={editor} event={events.find(e => e._id === editor)} onDone={() => setEditor(null)} />}</DialogContent></Dialog>
    <Dialog open={note !== null} onOpenChange={open => { if (!open) setNote(null) }}><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={17} /></span>Moment captured</DialogTitle><DialogDescription>{note?.name} · {note ? dateTime(note.time) : ''}</DialogDescription></DialogHeader>{note && <CommentForm key={note.id} id={note.id} initial="" onDone={() => setNote(null)} isNew />}</DialogContent></Dialog>
  </div>
}
function EventForm({ event, onDone }: { event?: Event, onDone: () => void }) {
  const create = useMutation(api.logbook.createEvent)
  const update = useMutation(api.logbook.updateEvent)
  const [color, setColor] = useState<Color>(event?.color ?? 'blue')
  const [trackLocation, setTrackLocation] = useState(event?.trackLocation ?? false)
  const [pending, setPending] = useState(false)
  return <form className="space-y-5" onSubmit={async e => { e.preventDefault(); if (pending) return; const data = new FormData(e.currentTarget); setPending(true); const values = { name: String(data.get('name')), description: String(data.get('description')), color, trackLocation }; try { if (event) await update({ ...values, id: event._id, archived: event.archived }); else await create(values); toast.success(event ? 'Event updated' : 'Event created'); onDone() } catch (error) { toast.error(message(error)) } finally { setPending(false) } }}>
    <div className="space-y-2"><Label htmlFor="event-name">Event name</Label><Input id="event-name" name="name" placeholder="e.g. Coffee break" defaultValue={event?.name} maxLength={60} required disabled={pending} autoFocus /></div>
    <div className="space-y-2"><Label htmlFor="event-description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="event-description" name="description" placeholder="What does this moment mean to you?" defaultValue={event?.description} maxLength={240} disabled={pending} /></div>
    <fieldset><legend className="mb-3 text-sm font-medium">Color</legend><div className="flex gap-3">{Object.entries(colors).map(([value, item]) => <Button key={value} type="button" variant="ghost" className={`size-10 rounded-full ${item.dot} text-white hover:opacity-80`} aria-label={item.label} aria-pressed={color === value} disabled={pending} onClick={() => setColor(value as Color)}>{color === value && <Check size={17} />}</Button>)}</div></fieldset>
    <div className="flex items-start gap-3 rounded-xl border p-3"><Checkbox id="event-track-location" checked={trackLocation} onCheckedChange={checked => setTrackLocation(checked === true)} disabled={pending} className="mt-1" /><div><Label htmlFor="event-track-location" className="min-h-7 cursor-pointer">Log location</Label><p className="text-xs leading-relaxed text-muted-foreground">Save your device location each time you log this event. Your browser may ask for permission.</p></div></div>
    <Button type="submit" className="h-11 w-full" disabled={pending}>{pending ? 'Saving…' : event ? 'Save changes' : 'Create event'}</Button>
  </form>
}
export function CommentForm({ id, initial, onDone, isNew = false }: { id: Id<'logs'>, initial: string, onDone: () => void, isNew?: boolean }) {
  const update = useMutation(api.logbook.updateComment)
  const [pending, setPending] = useState(false)
  return <form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (pending) return; const data = new FormData(e.currentTarget); setPending(true); try { await update({ id, comment: String(data.get('comment')) }); toast.success('Note saved'); onDone() } catch (error) { toast.error(message(error)) } finally { setPending(false) } }}><div className="space-y-2"><Label htmlFor="log-comment">{isNew ? 'Anything to add?' : 'Your note'} <span className="text-muted-foreground font-normal">(optional)</span></Label><Textarea id="log-comment" name="comment" defaultValue={initial} placeholder="A thought, a detail, a little context…" maxLength={2000} rows={4} disabled={pending} /></div><div className="flex gap-2"><Button type="button" variant="outline" className="h-11 flex-1" disabled={pending} onClick={onDone}>{isNew ? 'Skip note' : 'Cancel'}</Button><Button type="submit" className="h-11 flex-1" disabled={pending}>{pending ? 'Saving…' : 'Save note'}</Button></div>{isNew && <p className="text-center text-[11px] text-muted-foreground">Your event is already saved. Notes can be edited in Data.</p>}</form>
}
