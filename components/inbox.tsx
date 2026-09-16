'use client';
import {readApiResponse} from '@/lib/api-response.mjs';
import { useEffect, useState } from 'react';
import { API, useAccount } from './account-access';
type Message = {
  id: string;
  body: string;
  name: string;
  mine: boolean;
  createdAt: string;
};
type Thread = { id: string; name: string; preview: string; updatedAt: string };
export default function Inbox() {
  const account = useAccount(),
    admin = account?.role !== 'Student';
  const [threads, setThreads] = useState<Thread[]>([]),
    [selected, setSelected] = useState(''),
    [messages, setMessages] = useState<Message[]>([]),
    [body, setBody] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    setLoading(true);
    setError('');
    const timer = setTimeout(() => controller.abort(), 60000);
    async function load() {
      const path = admin
        ? selected
          ? `/inbox?student=${encodeURIComponent(selected)}`
          : '/inbox'
        : '/inbox';
      const response = await fetch(`${API}${path}`, {
        credentials: 'include',
        signal: controller.signal,
      });
      const data = (await readApiResponse(response)) as {
        error?: string;
        threads?: Thread[];
        messages?: Message[];
      };
      if (!response.ok) throw new Error(data.error || 'Unable to load inbox');
      if (!disposed) {
        if (admin && !selected) setThreads(data.threads || []);
        else setMessages(data.messages || []);
      }
    }
    load()
      .catch((e) => {
        if (!disposed)
          setError(
            e.name === 'AbortError'
              ? 'The server took too long. Please refresh.'
              : e.message,
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
  }, [admin, selected, revision]);
  async function send() {
    if (!body.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        `${API}/inbox${admin ? `?student=${encodeURIComponent(selected)}` : ''}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ body }),
        },
      );
      const data = (await readApiResponse(response, {write:true})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Unable to send message');
      setBody('');
      setRevision((value) => value + 1);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Unable to send message. Your draft has been kept.',
      );
    } finally {
      setBusy(false);
    }
  }
  const title = admin
    ? threads.find((t) => String(t.id) === selected)?.name ||
      'Student questions'
    : 'Message your club administrators';
  return (
    <section className="club-inbox">
      <div className="inbox-heading">
        <div>
          <p className="eyebrow">PHILOSOPHY CLUB</p>
          <h2>Inbox</h2>
          <p>
            {admin
              ? 'Questions and conversations with your students.'
              : 'Ask a question about a lesson, reading, or upcoming discussion.'}
          </p>
        </div>
        <button
          className="secondary"
          disabled={loading || busy}
          onClick={() => setRevision((value) => value + 1)}
        >
          Refresh
        </button>
      </div>
      <p className="inbox-privacy">
        Messages are visible only to this student and club administrators. This
        is an in-app inbox; no email is sent.
      </p>
      {error && (
        <p className="auth-alert" role="alert">
          {error}
        </p>
      )}
      {admin && !selected ? (
        <div className="inbox-threads">
          {loading ? (
            <p role="status">Loading conversations…</p>
          ) : threads.length ? (
            threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => {
                  setSelected(String(thread.id));
                  setMessages([]);
                }}
              >
                <strong>{thread.name}</strong>
                <span>{thread.preview}</span>
                <small>{new Date(thread.updatedAt).toLocaleDateString()}</small>
              </button>
            ))
          ) : (
            <p>
              No student messages yet. Conversations will appear here when
              students write to you.
            </p>
          )}
        </div>
      ) : (
        <div className="inbox-conversation">
          <header>
            {admin && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setSelected('');
                  setBody('');
                }}
              >
                Back to inbox
              </button>
            )}
            <h3>{title}</h3>
          </header>
          <div className="inbox-messages" aria-live="polite">
            {loading ? (
              <p role="status">Loading messages…</p>
            ) : messages.length ? (
              messages.map((message) => (
                <article
                  className={message.mine ? 'message mine' : 'message'}
                  key={message.id}
                >
                  <div>
                    <strong>{message.name}</strong>
                    <time dateTime={message.createdAt}>
                      {new Date(message.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <p>{message.body}</p>
                </article>
              ))
            ) : (
              <p>Start the conversation below.</p>
            )}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label htmlFor="inbox-message">
              {admin ? 'Your reply' : 'Your message'}
            </label>
            <textarea
              id="inbox-message"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={4000}
              rows={4}
              required
              disabled={busy}
              placeholder="Write your question or reply…"
            />
            <div>
              <small>{body.length}/4,000</small>
              <button
                className="primary"
                disabled={busy || loading || !body.trim()}
                type="submit"
              >
                {busy ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
