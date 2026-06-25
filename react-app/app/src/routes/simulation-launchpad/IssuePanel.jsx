import { useState } from 'react';

export function IssuePanel({ entry, adminApi, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [note, setNote] = useState('');

  if (!entry) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    const logged = await adminApi.logIssue(entry, { title, severity, note });
    if (logged) {
      setTitle('');
      setSeverity('medium');
      setNote('');
      if (onSaved) {
        await onSaved();
        return;
      }
      onClose();
    }
  }

  return (
    <div className="simulation-dashboard-modal" role="dialog" aria-modal="true" aria-labelledby="simulation-issue-title">
      <form className="simulation-dashboard-modal__panel" onSubmit={handleSubmit}>
        <div className="simulation-dashboard-modal__header">
          <div>
            <p>Log issue</p>
            <h2 id="simulation-issue-title">{entry.name}</h2>
          </div>
          <button type="button" className="simulation-dashboard-icon-button" onClick={onClose} aria-label="Close issue logger">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <label>
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What is wrong?"
            required
          />
        </label>

        <label>
          <span>Severity</span>
          <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="blocker">Blocker</option>
          </select>
        </label>

        <label>
          <span>Note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Observed behavior, browser, viewport, or promotion concern."
            rows="5"
          />
        </label>

        <div className="simulation-dashboard-modal__actions">
          <button type="button" className="simulation-dashboard-button simulation-dashboard-button--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="simulation-dashboard-button simulation-dashboard-button--primary">Save issue</button>
        </div>
      </form>
    </div>
  );
}
