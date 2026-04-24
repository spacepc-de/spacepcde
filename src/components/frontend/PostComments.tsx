'use client'

import React, { useMemo, useState } from 'react'

type CommentItem = {
  authorName: string
  content: string
  createdAt: string
  id: number
  parent?: number | null
}

type Props = {
  comments: CommentItem[]
  locale: 'de' | 'en'
  postId: number
}

type FormState = {
  authorEmail: string
  authorName: string
  content: string
}

const initialFormState: FormState = {
  authorEmail: '',
  authorName: '',
  content: '',
}

function formatCommentDate(value: string, locale: 'de' | 'en') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

export function PostComments({ comments, locale, postId }: Props) {
  const [form, setForm] = useState<FormState>(initialFormState)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<number | null>(null)

  const { roots, repliesByParent } = useMemo(() => {
    const roots: CommentItem[] = []
    const repliesByParent = new Map<number, CommentItem[]>()

    for (const comment of comments) {
      if (comment.parent) {
        const existing = repliesByParent.get(comment.parent) ?? []
        existing.push(comment)
        repliesByParent.set(comment.parent, existing)
      } else {
        roots.push(comment)
      }
    }

    return { repliesByParent, roots }
  }, [comments])

  const labels =
    locale === 'de'
      ? {
          cancelReply: 'Antwort verwerfen',
          commentCount: `${comments.length} Kommentar${comments.length === 1 ? '' : 'e'}`,
          content: 'Kommentar',
          email: 'E-Mail',
          empty: 'Noch keine freigegebenen Kommentare.',
          name: 'Name',
          reply: 'Antworten',
          replyTo: 'Antwort auf Kommentar',
          submit: 'Kommentar absenden',
          success: 'Kommentar eingereicht. Er wird nach Freigabe sichtbar.',
          title: 'Kommentare',
        }
      : {
          cancelReply: 'Cancel reply',
          commentCount: `${comments.length} comment${comments.length === 1 ? '' : 's'}`,
          content: 'Comment',
          email: 'Email',
          empty: 'No approved comments yet.',
          name: 'Name',
          reply: 'Reply',
          replyTo: 'Reply to comment',
          submit: 'Submit comment',
          success: 'Comment submitted. It will appear after approval.',
          title: 'Comments',
        }

  const onChange =
    (key: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({
        ...current,
        [key]: event.target.value,
      }))
    }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/comments/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          parentId: replyTo,
          postId,
        }),
      })

      const json = (await response.json()) as { error?: string; message?: string }

      if (!response.ok) {
        setMessage(json.error ?? 'Kommentar konnte nicht gespeichert werden.')
        return
      }

      setForm(initialFormState)
      setReplyTo(null)
      setMessage(json.message ?? labels.success)
    } catch {
      setMessage(locale === 'de' ? 'Kommentar konnte nicht gespeichert werden.' : 'Comment could not be saved.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="comments-section">
      <div className="section-heading">
        <p className="eyebrow">{labels.title}</p>
        <h2>{labels.commentCount}</h2>
      </div>

      <div className="comments-layout">
        <div className="comments-list">
          {roots.length > 0 ? (
            roots.map((comment) => (
              <article className="comment-card" key={comment.id}>
                <div className="comment-card__meta">
                  <strong>{comment.authorName}</strong>
                  <span>{formatCommentDate(comment.createdAt, locale)}</span>
                </div>
                <p>{comment.content}</p>
                <button className="comment-card__reply" onClick={() => setReplyTo(comment.id)} type="button">
                  {labels.reply}
                </button>

                {(repliesByParent.get(comment.id) ?? []).map((reply) => (
                  <div className="comment-card comment-card--reply" key={reply.id}>
                    <div className="comment-card__meta">
                      <strong>{reply.authorName}</strong>
                      <span>{formatCommentDate(reply.createdAt, locale)}</span>
                    </div>
                    <p>{reply.content}</p>
                  </div>
                ))}
              </article>
            ))
          ) : (
            <div className="comment-card comment-card--empty">
              <p>{labels.empty}</p>
            </div>
          )}
        </div>

        <form className="comment-form" onSubmit={onSubmit}>
          <p className="eyebrow">{replyTo ? labels.replyTo : labels.title}</p>
          <div className="comment-form__grid">
            <label>
              <span>{labels.name}</span>
              <input onChange={onChange('authorName')} required type="text" value={form.authorName} />
            </label>
            <label>
              <span>{labels.email}</span>
              <input onChange={onChange('authorEmail')} required type="email" value={form.authorEmail} />
            </label>
          </div>
          <label>
            <span>{labels.content}</span>
            <textarea onChange={onChange('content')} required rows={6} value={form.content} />
          </label>

          <div className="comment-form__actions">
            <button className="button button--primary" disabled={isLoading} type="submit">
              {isLoading ? '...' : labels.submit}
            </button>
            {replyTo ? (
              <button className="button button--secondary" onClick={() => setReplyTo(null)} type="button">
                {labels.cancelReply}
              </button>
            ) : null}
          </div>

          {message ? <p className="comment-form__message">{message}</p> : null}
        </form>
      </div>
    </section>
  )
}
