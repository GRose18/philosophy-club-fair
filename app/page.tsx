'use client';

import { useState } from 'react';
import { ArrowRight, BookOpen, MessageCircle, RefreshCw, Scale, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

export default function Home() {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.25], [0, reduceMotion ? 0 : 110]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0.28]);
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
    <main className="relative min-h-screen overflow-hidden">
      <motion.div className="fixed left-0 top-0 z-50 h-[3px] origin-left bg-[color:var(--rust)]" style={{ scaleX: scrollYProgress, width: '100%' }} />
      <motion.div aria-hidden className="pointer-events-none absolute -right-28 top-28 h-72 w-72 rounded-full bg-[color:var(--gold)]/25 blur-3xl" animate={reduceMotion ? undefined : { x: [0, -45, 10, 0], y: [0, 35, -10, 0], scale: [1, 1.18, .92, 1] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.nav initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65 }} className="shell flex h-20 items-center justify-between border-b border-[color:var(--line)]">
        <a href="#top" className="font-display text-xl tracking-tight">PHILOSOPHY CLUB</a>
        <span className="hidden text-xs uppercase tracking-[.2em] text-[color:var(--muted-ink)] sm:block">Think deeper. Speak freely.</span>
        <motion.a whileHover={{ scale: 1.04 }} whileTap={{ scale: .96 }} href="#join" className="rounded-full bg-[color:var(--ink)] px-5 py-2.5 text-sm font-semibold text-[color:var(--paper)]">I’m curious</motion.a>
      </motion.nav>

      <section id="top" className="shell grid min-h-[calc(100vh-5rem)] items-center gap-12 py-12 lg:grid-cols-[1.05fr_.95fr]">
        <motion.div style={{ y: heroY, opacity: heroOpacity }}>
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .15, duration: .65 }} className="mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.18em] text-[color:var(--rust)]"><motion.span initial={{ width: 0 }} animate={{ width: 40 }} transition={{ delay: .35, duration: .7 }} className="h-px bg-current" /> A club for difficult questions</motion.div>
          <h1 className="font-display text-[clamp(4rem,9vw,8.5rem)] leading-[.78] tracking-[-.07em]">
            <span className="block overflow-hidden"><motion.span className="block" initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: .85, ease: [0.22, 1, 0.36, 1] }}>WHAT DO</motion.span></span>
            <span className="block overflow-hidden"><motion.span className="block" initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ delay: .1, duration: .85, ease: [0.22, 1, 0.36, 1] }}>YOU <i className="font-light text-[color:var(--rust)]">THINK?</i></motion.span></span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .55, duration: .65 }} className="mt-8 max-w-xl text-lg leading-relaxed text-[color:var(--muted-ink)] sm:text-xl">Read the thinkers. Challenge the ideas. Defend your view—and leave willing to change it.</motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .75 }} className="mt-10 flex flex-wrap items-center gap-5">
            <motion.a whileHover={{ y: -5, boxShadow: '0 13px 0 var(--ink)' }} whileTap={{ y: 2, boxShadow: '0 4px 0 var(--ink)' }} href="#dilemma" className="group inline-flex items-center gap-3 rounded-full bg-[color:var(--rust)] px-7 py-4 font-semibold text-white shadow-[0_8px_0_var(--ink)]">Try a 30-second dilemma <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></motion.a>
            <span className="text-sm text-[color:var(--muted-ink)]">No experience required.</span>
          </motion.div>
        </motion.div>

        <motion.div id="dilemma" initial={{ opacity: 0, x: 50, rotate: 2 }} animate={{ opacity: 1, x: 0, rotate: 0 }} transition={{ delay: .35, duration: .9, ease: [0.22, 1, 0.36, 1] }} className="relative">
          <motion.div aria-hidden className="absolute -inset-5 rounded-[2.25rem] border border-[color:var(--line)]" animate={reduceMotion ? undefined : { rotate: [2, -1, 2] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div whileHover={reduceMotion ? undefined : { y: -4 }} className="relative rounded-[2rem] bg-[color:var(--ink)] p-7 text-[color:var(--paper)] shadow-2xl sm:p-10">
            <div className="flex items-center justify-between"><span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[.16em]">Your turn</span><Scale className="h-6 w-6 text-[color:var(--gold)]" /></div>
            <p className="mt-8 font-display text-3xl leading-tight sm:text-4xl">Your friend cheats on a test. The teacher asks if you know anything.</p>
            <p className="mt-5 text-base leading-relaxed text-white/60">Is honesty always a duty—even when it harms someone you care about?</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <motion.div whileHover={{ scale: 1.025 }} whileTap={{ scale: .975 }}><Button onClick={() => setChoice('tell')} className="h-auto w-full rounded-xl border border-white/15 bg-white/10 px-5 py-4 text-left text-white hover:bg-white hover:text-[color:var(--ink)]">Tell the truth</Button></motion.div>
              <motion.div whileHover={{ scale: 1.025 }} whileTap={{ scale: .975 }}><Button onClick={() => setChoice('silent')} className="h-auto w-full rounded-xl border border-white/15 bg-white/10 px-5 py-4 text-left text-white hover:bg-white hover:text-[color:var(--ink)]">Protect your friend</Button></motion.div>
            </div>
            <div aria-live="polite" className="mt-5 min-h-16 overflow-hidden rounded-xl bg-white/5 p-4 text-sm leading-relaxed text-white/70">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={choice ?? 'empty'} initial={{ opacity: 0, y: 12, filter: 'blur(5px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }} transition={{ duration: .28 }}>
                  {choice === null && 'Tap an answer. There is no score—only a question worth defending.'}
                  {choice === 'tell' && <><Sparkles className="mr-2 inline h-4 w-4 text-[color:var(--gold)]" />Kant might agree: a moral rule should hold for everyone. But should consequences matter?</>}
                  {choice === 'silent' && <><Sparkles className="mr-2 inline h-4 w-4 text-[color:var(--gold)]" />A consequentialist might agree—if silence creates the better outcome. But who bears the cost?</>}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="bg-[color:var(--ink)] py-20 text-[color:var(--paper)] sm:py-28">
        <div className="shell">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .4 }} transition={{ duration: .75 }} className="grid gap-8 border-b border-white/15 pb-14 lg:grid-cols-[.8fr_1.2fr]">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[color:var(--gold)]">How a meeting works</p>
            <h2 className="font-display text-4xl leading-tight sm:text-6xl">Not a lecture. Not a competition. A room where ideas get tested.</h2>
          </motion.div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15 md:grid-cols-3">
            {[
              [BookOpen, '01 · Read', 'A short selection from a philosopher—close enough to wrestle with, rich enough to disagree about.'],
              [MessageCircle, '02 · Question', 'Unpack the historical context, challenge assumptions, and connect the idea to life now.'],
              [Users, '03 · Debate', 'Build your position, hear its strongest objection, and decide what—if anything—changed.'],
            ].map(([Icon, title, copy]) => (
              <motion.article key={String(title)} initial={{ opacity: 0, y: 45 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .35 }} transition={{ duration: .6, delay: Number(String(title).slice(0, 1)) * .1 }} whileHover={{ y: -8, backgroundColor: '#1d2c27' }} className="bg-[color:var(--ink)] p-8 sm:p-10">
                <Icon className="h-7 w-7 text-[color:var(--rust)]" />
                <h3 className="mt-8 font-display text-3xl">{title as string}</h3>
                <p className="mt-4 leading-relaxed text-white/55">{copy as string}</p>
              </motion.article>
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
              <motion.li key={number} initial={{ opacity: 0, x: 35 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .6 }} transition={{ duration: .55, delay: Number(number) * .07 }} className="group grid gap-3 py-7 sm:grid-cols-[3rem_1fr_1.2fr] sm:items-center">
                <span className="text-xs font-semibold text-[color:var(--rust)]">{number}</span>
                <div><h3 className="font-display text-3xl">{title}</h3><p className="mt-1 text-sm text-[color:var(--muted-ink)]">{names}</p></div>
                <p className="font-display text-xl italic text-[color:var(--muted-ink)] transition-colors group-hover:text-[color:var(--rust)]">“{prompt}”</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-[color:var(--line)] bg-[color:var(--gold)]/15 py-20">
        <div className="shell text-center">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[color:var(--rust)]">Question generator</p>
          <div aria-live="polite" className="mx-auto mt-7 min-h-[8rem] max-w-4xl overflow-hidden sm:min-h-[9rem]"><AnimatePresence mode="wait"><motion.p key={question} initial={{ opacity: 0, y: 35, rotateX: -25 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, y: -28, rotateX: 20 }} transition={{ duration: .42, ease: [0.22, 1, 0.36, 1] }} className="font-display text-4xl leading-tight sm:text-6xl">{questions[question]}</motion.p></AnimatePresence></div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: .95 }} onClick={() => setQuestion((question + 1) % questions.length)} className="mt-9 inline-flex items-center gap-2 rounded-full border border-[color:var(--ink)] px-6 py-3 text-sm font-semibold transition-colors hover:bg-[color:var(--ink)] hover:text-[color:var(--paper)]">
            <RefreshCw className="h-4 w-4" /> Give me another
          </motion.button>
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
