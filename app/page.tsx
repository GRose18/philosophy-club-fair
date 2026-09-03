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
    <main>
    <section className="experience">
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
      <a href="#explore" className="scroll-cue"><span>SCROLL TO EXPLORE</span><i /></a>
      <AnimatePresence>{menu && <motion.aside className="info-panel" initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{duration:.6,ease:[.16,1,.3,1]}}><button className="close" onClick={()=>setMenu(false)}>CLOSE ×</button><p className="panel-index">ABOUT / PHILOSOPHY CLUB</p><h2>WE DON’T TEACH YOU <i>WHAT</i> TO THINK.</h2><p>Each meeting studies a philosophical school, thinker, or idea through original texts, historical context, group discussion, and debate.</p><div className="panel-rule"/><h3>OUR FIRST UNIT</h3><p>Stoicism through Marcus Aurelius, Epictetus, and Seneca—then onward to ethics, identity, free will, and Existentialism.</p><div className="join-mark">CURIOUS?<br/><strong>ADD YOUR NAME AT OUR TABLE.</strong></div></motion.aside>}</AnimatePresence>
    </section>

    <section id="explore" className="editorial">
      <div className="editorial-head">
        <motion.p initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="section-index">THE CLUB / 001</motion.p>
        <motion.h2 initial={{opacity:0,y:50}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.4}} transition={{duration:.8}}>IDEAS ARE MEANT<br/>TO BE <i>TESTED.</i></motion.h2>
        <motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} transition={{delay:.2}} className="lead">Philosophy Club is a place to read difficult thinkers, challenge familiar beliefs, and develop positions of your own—without turning disagreement into a competition.</motion.p>
      </div>

      <div className="meeting-grid">
        <div className="grid-intro"><span>HOW A MEETING WORKS</span><p>One text. One central question. Many possible answers.</p></div>
        {[
          ['01','READ','Analyze a short selection from a philosophical text.'],
          ['02','CONTEXT','Learn the history and problems that shaped the idea.'],
          ['03','DISCUSS','Connect the philosophy to modern life and contemporary questions.'],
          ['04','DEBATE','Develop a position, defend it, and seriously consider its opposite.'],
        ].map(([n,title,copy],i)=><motion.article key={n} initial={{opacity:0,y:35}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.5}} transition={{delay:i*.08}}><span>{n}</span><h3>{title}</h3><p>{copy}</p></motion.article>)}
      </div>

      <div className="curriculum">
        <div className="sticky-label"><span>THE CURRICULUM / 002</span><h2>FROM INNER<br/>CONTROL TO<br/><i>RADICAL FREEDOM.</i></h2></div>
        <div className="curriculum-list">
          {[
            ['01','STOICISM','Marcus Aurelius · Epictetus · Seneca','What is actually under your control?'],
            ['02','MORALITY','Duty · consequences · character','What makes an action right?'],
            ['03','IDENTITY','Selfhood · memory · human nature','What makes you the same person?'],
            ['04','FREE WILL','Choice · causation · responsibility','Could you have chosen otherwise?'],
            ['05','EXISTENTIALISM','Sartre · Camus · de Beauvoir','How do we create meaning?'],
          ].map(([n,title,names,q])=><motion.article key={n} initial={{opacity:.25,x:35}} whileInView={{opacity:1,x:0}} viewport={{once:false,amount:.65}} transition={{duration:.5}}><span>{n}</span><div><h3>{title}</h3><p>{names}</p></div><blockquote>“{q}”</blockquote></motion.article>)}
        </div>
      </div>

      <section className="difference">
        <p className="section-index">WHY THIS CLUB / 003</p>
        <h2>NOT SELF-HELP.<br/>NOT COMPETITIVE DEBATE.</h2>
        <div className="difference-grid"><p>We are not primarily teaching students how to improve themselves. We use philosophical texts to examine fundamental questions about life, morality, human nature, and society.</p><p>The goal is not to win an argument. It is to explore opposing views, question our own assumptions, and live with questions that may not have a single correct answer.</p></div>
      </section>

      <footer className="join-footer">
        <p>PHILOSOPHY CLUB · EST. 2026</p><h2>BRING A QUESTION.<br/><i>LEAVE WITH BETTER ONES.</i></h2>
        <div><strong>ADD YOUR NAME AT OUR TABLE.</strong><span>Open to curious people, careful readers, friendly skeptics, and complete beginners.</span><span>Faculty sponsor · Rachel Silton</span></div>
      </footer>
    </section>
    </main>
  );
}
