'use client';
import { useEffect, useState } from 'react';
import {
  AccountAccess,
  API,
  SignOut,
  useAccount,
} from '@/components/account-access';
import {
  ArrowUpRight,
  BookOpen,
  FileText,
  Video,
  RefreshCw,
} from 'lucide-react';
import { Mail } from 'lucide-react';
import Inbox from '@/components/inbox';
type Material = {
  id: number;
  kind: string;
  title: string;
  lessonTitle?: string;
  summary?: string;
  introduction?: string;
  instructions?: string;
  sourceType?: string;
  sourceUrl?: string;
  fileId?: number;
  questions?: { question: string; guidance?: string }[];
};
export default function StudentPage() {
  return (
    <AccountAccess>
      <StudentDashboard />
    </AccountAccess>
  );
}
function StudentDashboard() {
  const account = useAccount();
  const [section, setSection] = useState('Assignments');
  const [items, setItems] = useState<Material[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timer = window.setTimeout(() => controller.abort(), 60000);
    setLoading(true);
    setError('');
    fetch(`${API}/content`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.replace('/login');
          return;
        }
        const data = (await response.json()) as {
          error?: string;
          items: Material[];
        };
        if (!response.ok)
          throw new Error(data.error || 'Unable to load assignments.');
        if (!disposed) setItems(data.items || []);
      })
      .catch((reason) => {
        if (!disposed)
          setError(
            reason.name === 'AbortError'
              ? 'The server is taking longer than expected. Please try again.'
              : reason.message,
          );
      })
      .finally(() => {
        clearTimeout(timer);
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [revision]);
  const lessons = new Map<string, Material[]>();
  items.forEach((item) => {
    const name = item.lessonTitle?.trim() || 'Club reading & discussion';
    lessons.set(name, [...(lessons.get(name) || []), item]);
  });
  return (
    <main className="student-shell assignments-shell canvas-shell">
      <aside className="canvas-rail">
        <img src="/emery-weiner.png" alt="Emery/Weiner School" />
        <strong>
          Philosophy
          <br />
          Club
        </strong>
        <nav aria-label="Club navigation">
          <button
            className={section === 'Assignments' ? 'active' : ''}
            onClick={() => setSection('Assignments')}
          >
            <BookOpen />
            Assignments
          </button>
          <button
            className={section === 'Inbox' ? 'active' : ''}
            onClick={() => setSection('Inbox')}
          >
            <Mail />
            Inbox
          </button>
        </nav>
      </aside>
      <div className="canvas-main">
        <header className="student-header">
          <strong>Philosophy Club</strong>
          <div>
            <span>{account?.fullName}</span>
            <SignOut />
          </div>
        </header>
        <nav className="assignment-nav" aria-label="Current section">
          <span aria-current="page">{section}</span>
          <small>Read. Question. Discuss.</small>
        </nav>
        {section === 'Inbox' ? (
          <div className="assignment-content">
            <Inbox />
          </div>
        ) : (
          <>
            <div className="assignment-content">
              <section className="assignment-welcome">
                <p className="eyebrow">YOUR CLUB WORKSPACE</p>
                <h1>A place for better questions.</h1>
                <p>
                  Welcome, {account?.fullName?.split(' ')[0] || 'there'}.
                  Explore the materials below and come ready to share your
                  perspective.
                </p>
                <span>Readings, videos, and worksheets. All in one place.</span>
              </section>
              <div className="assignment-list-heading">
                <div>
                  <h2>Your assignments</h2>
                  <p>Everything you need for the next conversation.</p>
                </div>
                <button
                  className="secondary"
                  disabled={loading}
                  onClick={() => setRevision((value) => value + 1)}
                  aria-label="Refresh assignments"
                >
                  <RefreshCw size={16} />
                  {loading ? 'Loading…' : 'Refresh'}
                </button>
              </div>
              {loading ? (
                <section className="assignment-empty" role="status">
                  Loading your assignments…
                </section>
              ) : error ? (
                <section className="assignment-empty" role="alert">
                  <h3>Couldn’t load assignments</h3>
                  <p>{error}</p>
                  <button
                    className="secondary"
                    onClick={() => setRevision((value) => value + 1)}
                  >
                    Try again
                  </button>
                </section>
              ) : !items.length ? (
                <section className="assignment-empty">
                  <BookOpen size={30} />
                  <h3>Your next conversation starts here.</h3>
                  <p>
                    No assignments have been published yet. Check back for your
                    club’s first lesson.
                  </p>
                </section>
              ) : (
                Array.from(lessons, ([name, materials], index) => (
                  <section className="lesson-panel" key={name}>
                    <header className="lesson-heading">
                      <span className="lesson-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <p>DISCUSSION MATERIALS</p>
                        <h2>{name}</h2>
                      </div>
                      <span className="lesson-count">
                        {materials.length}{' '}
                        {materials.length === 1 ? 'resource' : 'resources'}
                      </span>
                    </header>
                    <div className="lesson-materials">
                      {materials.map((item) => (
                        <MaterialCard key={item.id} item={item} />
                      ))}
                    </div>
                  </section>
                ))
              )}
              <footer className="assignment-footer">
                Philosophy Club · Bring your curiosity.
              </footer>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
function MaterialCard({ item }: { item: Material }) {
  const worksheet =
    item.kind === 'worksheet' || item.kind === 'discussion_questions';
  const Icon = worksheet ? FileText : item.kind === 'video' ? Video : BookOpen;
  const label = worksheet
    ? 'Worksheet'
    : item.kind === 'video'
      ? 'Video'
      : 'Reading';
  const url =
    item.sourceType === 'file' && item.fileId
      ? `${API}/content-files/${item.fileId}`
      : item.sourceUrl;
  return (
    <article className="assignment-material">
      <div className="material-kind">
        <Icon size={19} />
        <span>
          {label}
          {item.sourceType === 'file'
            ? ` · ${item.kind === 'video' ? 'MP4' : 'PDF'}`
            : ''}
        </span>
      </div>
      <h3>{item.title}</h3>
      <p className="material-summary">{item.summary || item.introduction}</p>
      {item.instructions && (
        <div className="material-instructions">
          <strong>Before we meet</strong>
          <p>{item.instructions}</p>
        </div>
      )}
      {worksheet ? (
        <details className="assignment-questions">
          <summary>
            Explore worksheet{' '}
            <span>{item.questions?.length || 0} questions</span>
          </summary>
          <ol>
            {item.questions?.map((question, index) => (
              <li key={index}>
                <p>{question.question}</p>
                {question.guidance && <small>{question.guidance}</small>}
              </li>
            ))}
          </ol>
        </details>
      ) : url && (/^https:\/\//i.test(url) || /^\/api\/content-files\/\d+$/.test(url)) ? (
        <a
          className="material-open"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.kind === 'video' ? 'Watch video' : 'Open reading'}
          <ArrowUpRight size={17} />
        </a>
      ) : (
        <p>
          This resource is unavailable. Please let your club administrator know.
        </p>
      )}
    </article>
  );
}
