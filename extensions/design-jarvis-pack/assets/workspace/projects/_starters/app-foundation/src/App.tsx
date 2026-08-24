import { useState } from 'react';

type ViewState = 'ready' | 'loading' | 'empty' | 'error';

export function App() {
  const [state, setState] = useState<ViewState>('ready');

  return (
    <div className="app-shell">
      <header className="topbar">
        <strong>Product name</strong>
        <button type="button">Primary action</button>
      </header>
      <div className="workspace">
        <nav className="sidebar" aria-label="Primary navigation">
          <a href="#overview" aria-current="page">Overview</a>
          <a href="#activity">Activity</a>
          <a href="#settings">Settings</a>
        </nav>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <h1>Workspace overview</h1>
              <p>Replace this sample with the primary user task.</p>
            </div>
            <label>
              Preview state
              <select value={state} onChange={(event) => setState(event.target.value as ViewState)}>
                <option value="ready">Ready</option>
                <option value="loading">Loading</option>
                <option value="empty">Empty</option>
                <option value="error">Error</option>
              </select>
            </label>
          </div>
          <section className="card" aria-live="polite">
            {state === 'ready' && <><h2>Recent activity</h2><p>Everything is ready for realistic project content.</p></>}
            {state === 'loading' && <><h2>Loading activity</h2><p>Retrieving the latest information…</p></>}
            {state === 'empty' && <><h2>No activity yet</h2><p>Complete the primary action to create the first item.</p></>}
            {state === 'error' && <><h2>Activity is unavailable</h2><p>Your work is safe. Try again in a moment.</p><button type="button">Try again</button></>}
          </section>
        </main>
      </div>
    </div>
  );
}
