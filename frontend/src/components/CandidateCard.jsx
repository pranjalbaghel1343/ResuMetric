import React from 'react';
import ScoreRing from './ScoreRing';
import { Trophy, Sparkles, AlertCircle } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉'];

const ScoreBar = ({ label, value }) => (
  <div className="score-bar-row">
    <span className="score-bar-label">{label}</span>
    <div className="score-bar-track">
      <div className="score-bar-fill" style={{ width: `${value}%` }} />
    </div>
    <span className="score-bar-val">{Math.round(value)}</span>
  </div>
);

export default function CandidateCard({ candidate, index }) {
  const { name, filename, rank, match_score, skills_score, keyword_score,
          experience_score, education_score, matched_skills, missing_skills,
          strengths, gaps, scored_by } = candidate;

  const medal = MEDALS[index] || null;
  const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : '';

  return (
    <div className={`glass candidate-card ${rankClass}`} style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="card-top">
        <div className="candidate-info">
          <div className="rank-badge">#{rank} {medal}</div>
          <div className="candidate-name">{name}</div>
          <div className="candidate-file">📎 {filename}</div>
          {scored_by === 'gemini' && (
            <div style={{ marginTop: '0.3rem', fontSize: '0.65rem', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Sparkles size={10} /> AI Scored
            </div>
          )}
        </div>
        <ScoreRing score={match_score} size={72} />
      </div>

      <div className="score-bars">
        <ScoreBar label="Skills" value={skills_score} />
        <ScoreBar label="Keywords" value={keyword_score} />
        <ScoreBar label="Experience" value={experience_score} />
        <ScoreBar label="Education" value={education_score} />
      </div>

      {(matched_skills?.length > 0) && (
        <div className="skills-section">
          <div className="skills-label matched">✅ Matched Skills</div>
          <div className="badges">
            {matched_skills.slice(0, 8).map(s => (
              <span key={s} className="badge matched">{s}</span>
            ))}
          </div>
        </div>
      )}

      {(missing_skills?.length > 0) && (
        <div className="skills-section">
          <div className="skills-label missing">❌ Missing Skills</div>
          <div className="badges">
            {missing_skills.slice(0, 6).map(s => (
              <span key={s} className="badge missing">{s}</span>
            ))}
          </div>
        </div>
      )}

      {strengths && (
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(16,185,129,0.07)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', borderLeft: '2px solid var(--green)' }}>
          <strong style={{ color: 'var(--green)' }}>💪 Strength:</strong> {strengths}
        </div>
      )}
      {gaps && (
        <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.75rem', background: 'rgba(239,68,68,0.07)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', borderLeft: '2px solid var(--red)' }}>
          <strong style={{ color: 'var(--red)' }}>⚠️ Gap:</strong> {gaps}
        </div>
      )}
    </div>
  );
}
