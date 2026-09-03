'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PhilosophyScene } from '@/components/philosophy-scene';

export default function Home() {
  const [chapter, setChapter] = useState(0);
  const [menu, setMenu] = useState(false);
  const chapters = [
    { number: '01', label: 'THE QUESTION', kicker: 'The beginning of philosophy', line1: 'ENTER THE', line2: 'UNEXAMINED.', copy: 'Every philosophy begins when an ordinary answer stops being enough.' },
    { number: '02', label: 'STOICISM', kicker: 'Marcus Aurelius · Epictetus · Seneca', line1: 'WHAT CAN', line2: 'YOU CONTROL?', copy: 'Our first unit asks whether freedom begins by separating what belongs to us from what does not.' },
    { number: '03', label: 'THE DEBATE', kicker: 'No winners. Better questions.', line1: 'DEFEND YOUR', line2: 'DOUBT.', copy: 'Read closely. Name your assumptions. Hear the strongest version of the opposing view.' },
    { number: '04', label: 'THE CLUB', kicker: 'A room for difficult ideas', line1: 'THINK WITH', line2: 'US.', copy: 'Explore morality, free will, happiness, identity, meaning, human nature, and how we should live.' },
  ];
  const current = chapters[chapter];
  const next = () => setChapter((chapter + 1) % chapters.length);
  return (
    <main className="experience">
      <div className="scene"><PhilosophyScene phase={chapter} /></div>
      <header className="hud topbar">
        <span className="brand">PHILOSOPHY<br />CLUB</span>
        <AnimatePresence mode="wait"><motion.span key={chapter} initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}} className="chapter">{current.number} / {current.label}</motion.span></AnimatePresence>
        <button onClick={() => setMenu(true)} className="menu-dot" aria-label="Open information"><span /><span /></button>
      </header>
      <section className="hud hero-copy">
        <AnimatePresence mode="wait">
          <motion.div key={chapter} initial={{ opacity:0, y:28 }} animate={{opacity:1,y:0}} exit={{opacity:0,y:-28}} transition={{duration:.65,ease:[.16,1,.3,1]}}>
            <p className="eyebrow">{current.kicker}</p>
            <h1><span>{current.line1}</span><em>{current.line2}</em></h1>
            <p className="chapter-copy">{current.copy}</p>
          </motion.div>
        </AnimatePresence>
      </section>
      <div className="hud bottom-bar">
        <div className="chapter-dots" aria-label="Experience chapters">{chapters.map((item,i)=><button key={item.number} onClick={()=>setChapter(i)} aria-label={`Open ${item.label}`} className={i===chapter?'active':''}><span>{item.number}</span></button>)}</div>
        <button onClick={next} className="enter-button">{chapter === 3 ? 'START AGAIN' : 'CONTINUE'} <span>↗</span></button>
        <p className="right-note">Rachel Silton · Faculty Sponsor</p>
      </div>
      <div className="edge-label">READ · QUESTION · DEBATE</div>
      <AnimatePresence>{menu && <motion.aside className="info-panel" initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{duration:.6,ease:[.16,1,.3,1]}}><button className="close" onClick={()=>setMenu(false)}>CLOSE ×</button><p className="panel-index">ABOUT / PHILOSOPHY CLUB</p><h2>WE DON’T TEACH YOU <i>WHAT</i> TO THINK.</h2><p>Each meeting studies a philosophical school, thinker, or idea through original texts, historical context, group discussion, and debate.</p><div className="panel-rule"/><h3>OUR FIRST UNIT</h3><p>Stoicism through Marcus Aurelius, Epictetus, and Seneca—then onward to ethics, identity, free will, and Existentialism.</p><div className="join-mark">CURIOUS?<br/><strong>ADD YOUR NAME AT OUR TABLE.</strong></div></motion.aside>}</AnimatePresence>
    </main>
  );
}
