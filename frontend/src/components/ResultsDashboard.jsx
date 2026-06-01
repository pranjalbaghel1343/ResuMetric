import React, { useState, useMemo } from 'react';
import CandidateCard from './CandidateCard';
import { Search, Download, RotateCcw, ArrowUpDown } from 'lucide-react';
import { exportCSV } from '../api';

export default function ResultsDashboard({ results, jdId, jdTitle, onReset }) {
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  const filtered = useMemo(() => {
    let list = [...results];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.filename.toLowerCase().includes(q) ||
        c.matched_skills?.some(s => s.includes(q))
      );
    }
    list.sort((a, b) => sortOrder === 'desc' ? b.match_score - a.match_score : a.match_score - b.match_score);
    return list;
  }, [results, search, sortOrder]);

  const avg = results.length ? Math.round(results.reduce((s, c) => s + c.match_score, 0) / results.length) : 0;
  const top = results.length ? Math.round(Math.max(...results.map(c => c.match_score))) : 0;

  return (
    <div>
      <div className="results-header">
        <div>
          <h2>Results for <span>{jdTitle}</span></h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {results.length} candidates ranked by AI match score
          </p>
        </div>
        <div className="results-toolbar">
          <button className="btn btn-outline btn-sm" onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}>
            <ArrowUpDown size={14} /> Sort {sortOrder === 'desc' ? '↑' : '↓'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => exportCSV(jdId)}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-danger btn-sm" onClick={onReset}>
            <RotateCcw size={14} /> New Session
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="glass stat-pill">
          <span className="stat-num" style={{ color: 'var(--purple)' }}>{results.length}</span>
          <span className="stat-label">Candidates</span>
        </div>
        <div className="glass stat-pill">
          <span className="stat-num" style={{ color: 'var(--green)' }}>{top}%</span>
          <span className="stat-label">Top Score</span>
        </div>
        <div className="glass stat-pill">
          <span className="stat-num" style={{ color: 'var(--cyan)' }}>{avg}%</span>
          <span className="stat-label">Avg Score</span>
        </div>
        <div className="glass stat-pill">
          <span className="stat-num" style={{ color: 'var(--gold)' }}>
            {results.filter(c => c.match_score >= 70).length}
          </span>
          <span className="stat-label">Strong Fits (≥70)</span>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: '1.5rem' }}>
        <Search size={16} />
        <input
          type="text"
          placeholder="Search by name, file, or skill..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Search size={48} />
          <p>No candidates match your search.</p>
        </div>
      ) : (
        <div className="candidates-grid">
          {filtered.map((c, i) => (
            <CandidateCard key={c.id} candidate={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
