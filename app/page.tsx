'use client';

import { useState } from 'react';
import { ArrowRight, BookOpen, MessageCircle, RefreshCw, Scale, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [choice, setChoice] = useState<'tell' | 'silent' | null>(null);
  const questions = [
    'What makes a life meaningful?',
    'Are you the same person you were five years ago?',
    'Can an action be wrong if nobody is harmed?',
    'Would immortality make life better—or empty?',
    'Do we choose freely, or only feel like we do?',
  ];
  const [question, setQuestion] = useState(0);

  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="shell flex h-20 items-center justify-between border-b border-[color:var(--line)]">
        <a href="#top" className="font-display text-xl tracking-tight">PHILOSOPHY CLUB</a>
        <span className="hidden text-xs uppercase tracking-[.2em] text-[color:var(--muted-ink)] sm:block">Think deeper. Speak freely.</span>
        <a href="#join" className="rounded-full bg-[color:var(--ink)] px-5 py-2.5 text-sm font-semibold text-[color:var(--paper)]">I’m curious</a>
      </nav>

      <section id="top" className="shell grid min-h-[calc(100vh-5rem)] items-center gap-12 py-12 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <div className="mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.18em] text-[color:var(--rust)]"><span className="h-px w-10 bg-current" /> A club for difficult questions</div>
          <h1 className="font-display text-[clamp(4rem,9vw,8.5rem)] leading-[.78] tracking-[-.07em]">WHAT DO<br />YOU <i className="font-light text-[color:var(--rust)]">THINK?</i></h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--muted-ink)] sm:text-xl">Read the thinkers. Challenge the ideas. Defend your view—and leave willing to change it.</p>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <a href="#dilemma" className="group inline-flex items-center gap-3 rounded-full bg-[color:var(--rust)] px-7 py-4 font-semibold text-white shadow-[0_8px_0_var(--ink)] transition-transform hover:-translate-y-1">Try a 30-second dilemma <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></a>
            <span className="text-sm text-[color:var(--muted-ink)]">No experience required.</span>
          </div>
        </div>

        <div id="dilemma" className="relative">
          <div className="absolute -inset-5 rotate-2 rounded-[2.25rem] border border-[color:var(--line)]" />
          <div className="relative rounded-[2rem] bg-[color:var(--ink)] p-7 text-[color:var(--paper)] shadow-2xl sm:p-10">
            <div className="flex items-center justify-between"><span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[.16em]">Your turn</span><Scale className="h-6 w-6 text-[color:var(--gold)]" /></div>
            <p className="mt-8 font-display text-3xl leading-tight sm:text-4xl">Your friend cheats on a test. The teacher asks if you know anything.</p>
            <p className="mt-5 text-base leading-relaxed text-white/60">Is honesty always a duty—even when it harms someone you care about?</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Button onClick={() => setChoice('tell')} className="h-auto rounded-xl border border-white/15 bg-white/10 px-5 py-4 text-left text-white hover:bg-white hover:text-[color:var(--ink)]">Tell the truth</Button>
              <Button onClick={() => setChoice('silent')} className="h-auto rounded-xl border border-white/15 bg-white/10 px-5 py-4 text-left text-white hover:bg-white hover:text-[color:var(--ink)]">Protect your friend</Button>
            </div>
            <div aria-live="polite" className="mt-5 min-h-16 rounded-xl bg-white/5 p-4 text-sm leading-relaxed text-white/70">
              {choice === null && 'Tap an answer. There is no score—only a question worth defending.'}
              {choice === 'tell' && <><Sparkles className="mr-2 inline h-4 w-4 text-[color:var(--gold)]" />Kant might agree: a moral rule should hold for everyone. But should consequences matter?</>}
              {choice === 'silent' && <><Sparkles className="mr-2 inline h-4 w-4 text-[color:var(--gold)]" />A consequentialist might agree—if silence creates the better outcome. But who bears the cost?</>}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[color:var(--ink)] py-20 text-[color:var(--paper)] sm:py-28">
        <div className="shell">
          <div className="grid gap-8 border-b border-white/15 pb-14 lg:grid-cols-[.8fr_1.2fr]">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[color:var(--gold)]">How a meeting works</p>
            <h2 className="font-display text-4xl leading-tight sm:text-6xl">Not a lecture. Not a competition. A room where ideas get tested.</h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15 md:grid-cols-3">
            {[
              [BookOpen, '01 · Read', 'A short selection from a philosopher—close enough to wrestle with, rich enough to disagree about.'],
              [MessageCircle, '02 · Question', 'Unpack the historical context, challenge assumptions, and connect the idea to life now.'],
              [Users, '03 · Debate', 'Build your position, hear its strongest objection, and decide what—if anything—changed.'],
            ].map(([Icon, title, copy]) => (
              <article key={String(title)} className="bg-[color:var(--ink)] p-8 sm:p-10">
                <Icon className="h-7 w-7 text-[color:var(--rust)]" />
                <h3 className="mt-8 font-display text-3xl">{title as string}</h3>
                <p className="mt-4 leading-relaxed text-white/55">{copy as string}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="shell py-20 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[color:var(--rust)]">Where we’re going</p>
            <h2 className="mt-5 font-display text-5xl tracking-tight sm:text-7xl">From calm minds to absurd worlds.</h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-[color:var(--muted-ink)]">We begin with accessible ideas, then move toward stranger and more demanding questions. You never have to agree with the philosopher of the week.</p>
          </div>
          <ol className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
            {[
              ['01', 'Stoicism', 'Marcus Aurelius · Epictetus · Seneca', 'What is actually under your control?'],
              ['02', 'Ethics', 'Duty · consequences · character', 'What makes an action right?'],
              ['03', 'Identity & free will', 'Selfhood · choice · responsibility', 'Could you have chosen otherwise?'],
              ['04', 'Existentialism', 'Sartre · Camus · de Beauvoir', 'How do we make meaning?'],
            ].map(([number, title, names, prompt]) => (
              <li key={number} className="group grid gap-3 py-7 sm:grid-cols-[3rem_1fr_1.2fr] sm:items-center">
                <span className="text-xs font-semibold text-[color:var(--rust)]">{number}</span>
                <div><h3 className="font-display text-3xl">{title}</h3><p className="mt-1 text-sm text-[color:var(--muted-ink)]">{names}</p></div>
                <p className="font-display text-xl italic text-[color:var(--muted-ink)] transition-colors group-hover:text-[color:var(--rust)]">“{prompt}”</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-[color:var(--line)] bg-[color:var(--gold)]/15 py-20">
        <div className="shell text-center">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[color:var(--rust)]">Question generator</p>
          <p aria-live="polite" className="mx-auto mt-7 max-w-4xl font-display text-4xl leading-tight sm:text-6xl">{questions[question]}</p>
          <button onClick={() => setQuestion((question + 1) % questions.length)} className="mt-9 inline-flex items-center gap-2 rounded-full border border-[color:var(--ink)] px-6 py-3 text-sm font-semibold transition-colors hover:bg-[color:var(--ink)] hover:text-[color:var(--paper)]">
            <RefreshCw className="h-4 w-4" /> Give me another
          </button>
        </div>
      </section>

      <footer id="join" className="shell py-16 sm:py-24">
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[color:var(--rust)]">Philosophy Club</p>
            <h2 className="mt-4 font-display text-5xl tracking-tight sm:text-7xl">Bring a question.<br /><i className="font-light">Leave with better ones.</i></h2>
          </div>
          <div className="max-w-sm border-l-2 border-[color:var(--rust)] pl-6">
            <p className="font-semibold">Interested? Add your name at our table.</p>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted-ink)]">Open to curious people, careful readers, friendly skeptics, and complete beginners.</p>
            <p className="mt-5 text-xs uppercase tracking-[.14em] text-[color:var(--muted-ink)]">Faculty sponsor · Rachel Silton</p>
          </div>
        </div>
        <div className="mt-16 flex items-center justify-between border-t border-[color:var(--line)] pt-6 text-xs uppercase tracking-[.15em] text-[color:var(--muted-ink)]">
          <span>Est. 2026</span><span>Read · Question · Debate</span>
        </div>
      </footer>
    </main>
  );
}
