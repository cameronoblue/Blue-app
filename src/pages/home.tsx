import { Link } from 'react-router'
import { ArrowRight, ArrowUpRight, Sparkles, Lightbulb, Heart, MoveUpRight, Star, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PublicReviews } from '@/components/reviews'

export function HomePage() {
  return <div className="public-home">
    <header className="public-header">
      <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight" aria-label="Cameron Blue home"><span className="public-monogram">cb.</span><span className="hidden sm:inline">cameronblue.org</span></Link>
      <div className="flex items-center gap-4 sm:gap-6"><a href="#the-good-stuff" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">The good stuff</a><a href="#reviews" className="text-sm text-muted-foreground hover:text-foreground">Reviews</a><Button className="h-11 gap-3 rounded-full px-5" render={<Link to="/sign-in" />}>Sign in<ArrowUpRight size={16} /></Button></div>
    </header>
    <main>
      <section className="public-hero">
        <div className="public-hero-copy"><p className="public-kicker"><span className="size-2 rounded-full bg-blue-600" />GOOD NAME. EVEN BETTER ENERGY.</p><h1>Cameron<br /><span>Blue.</span><Sparkles className="public-title-star" aria-hidden="true" /></h1><p className="public-intro">A pretty cool human.<br />An exceptionally good name for a website.</p><p className="public-description">Big curiosity. Good energy. A knack for making the everyday a little more interesting. Welcome to Cameron’s corner of the internet.</p><Button className="mt-8 h-12 rounded-full px-6" variant="outline" render={<a href="#the-good-stuff" />}>See what the hype is about<ArrowRight size={16} /></Button><div className="public-footnote"><span className="flex text-blue-600" aria-hidden="true">{[0, 1, 2, 3, 4].map(i => <Star key={i} size={13} fill="currentColor" />)}</span><span>Five stars. This website may be biased.</span></div></div>
        <figure className="public-art"><img src="/images/cameron-blue-1200.webp" srcSet="/images/cameron-blue-600.webp 600w, /images/cameron-blue-1200.webp 1200w" sizes="(min-width: 1024px) 42vw, (min-width: 600px) 512px, calc(100vw - 48px)" width={1200} height={1600} fetchPriority="high" alt="Cameron Blue wearing aviator sunglasses" className="public-portrait" /><span className="public-photo-shade" aria-hidden="true" /><span className="public-art-sticker"><Sparkles size={17} />Certified good vibes</span><figcaption className="public-art-bottom"><span>THE ONE & ONLY · CAMERON BLUE</span><MoveUpRight size={31} strokeWidth={1.3} /></figcaption></figure>
      </section>
      <div className="public-ribbon" aria-hidden="true"><span>STAY CURIOUS</span><span>✦</span><span>MAKE COOL THINGS</span><span>✦</span><span>KEEP IT BLUE</span><span className="hidden sm:inline">✦</span><span className="hidden sm:inline">BRING GOOD ENERGY</span></div>
      <section id="the-good-stuff" className="public-section scroll-mt-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="public-kicker">A COMPELLING CASE</p><h2>What makes Cameron cool?</h2></div><p className="max-w-60 text-sm leading-relaxed text-muted-foreground">No complicated pitch.<br />Just a few very good reasons.</p></div><div className="mt-9 grid gap-4 md:grid-cols-3">{[
        { icon: Lightbulb, number: '01', title: 'Curiosity looks good.', text: 'The little things are worth noticing. The interesting questions are worth asking. Boring? Never the goal.' },
        { icon: Heart, number: '02', title: 'Good energy travels.', text: 'A little humor, a fresh perspective, and a healthy appreciation for not taking everything too seriously.' },
        { icon: Layers, number: '03', title: 'There’s always a next idea.', text: 'An internet corner with room to grow. Little tools, new experiments, and whatever sounds fun to build next.' },
      ].map(({ icon: Icon, number, title, text }) => <Card key={number} className="public-reason"><div className="flex items-center justify-between"><span className="public-reason-icon"><Icon size={23} strokeWidth={1.6} /></span><span className="text-xs text-muted-foreground/60">/{number}</span></div><h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></Card>)}</div></section>
      <section className="public-section pt-0"><div className="public-workspace"><div><p className="public-kicker text-blue-200">THERE’S MORE INSIDE</p><h2>A cool website.<br />A useful little workspace.</h2><p className="mt-4 max-w-md text-sm leading-relaxed text-blue-100">Behind the scenes: personal apps, everyday tools, and a place to keep track of the things that matter.</p></div><Button className="h-12 shrink-0 rounded-full bg-white px-6 text-blue-800 hover:bg-blue-50" render={<Link to="/sign-in" />}>Sign in to your apps<ArrowUpRight size={17} /></Button></div></section>
      <PublicReviews />
    </main>
    <footer className="public-footer"><Link to="/" className="text-lg font-bold tracking-tight">cameron blue<span className="text-blue-600">.</span></Link><span className="text-xs text-muted-foreground">A little curiosity. A lot of blue.</span><a href="#" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">Back to top<ArrowUpRight size={13} /></a></footer>
  </div>
}
