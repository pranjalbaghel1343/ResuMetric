import React, { useState, useCallback } from 'react';
import UploadZone from './components/UploadZone';
import ResultsDashboard from './components/ResultsDashboard';
import { uploadResumes, saveJobDescription, analyzeResumes, resetData } from './api';
import { Briefcase, FileSearch, Zap, BarChart3 } from 'lucide-react';

const STEPS = [
  { label: 'Upload Resumes', icon: <FileSearch size={14} /> },
  { label: 'Job Description', icon: <Briefcase size={14} /> },
  { label: 'Analyze', icon: <Zap size={14} /> },
  { label: 'Results', icon: <BarChart3 size={14} /> },
];

function Toast({ message, type, onClose }) {
  React.useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{message}</div>;
}

export default function App() {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [uploadedCandidates, setUploadedCandidates] = useState([]);
  const [jdTitle, setJdTitle] = useState('');
  const [jdText, setJdText] = useState('');
  const [jdId, setJdId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [results, setResults] = useState(null);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => setToast({ message, type });
  const hideToast = () => setToast(null);

  // ── Step 1: Upload resumes ────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!files.length) { showToast('Please select at least one resume file.', 'error'); return; }
    setLoading(true); setLoadingMsg('Uploading and parsing resumes…');
    try {
      const res = await uploadResumes(files);
      setUploadedCandidates(res.data.candidates);
      showToast(`✅ ${res.data.uploaded} resume(s) uploaded successfully!`, 'success');
      setStep(1);
    } catch (e) {
      showToast('Upload failed. Is the backend running on port 8000?', 'error');
    } finally { setLoading(false); }
  };

  // ── Step 2: Save JD ───────────────────────────────────────────────────────
  const handleSaveJD = async () => {
    if (!jdTitle.trim()) { showToast('Please enter a job title.', 'error'); return; }
    if (!jdText.trim()) { showToast('Please enter the job description.', 'error'); return; }
    setLoading(true); setLoadingMsg('Saving job description…');
    try {
      const res = await saveJobDescription(jdTitle, jdText);
      setJdId(res.data.id);
      showToast('✅ Job description saved!', 'success');
      setStep(2);
    } catch (e) {
      showToast('Failed to save JD. Check backend.', 'error');
    } finally { setLoading(false); }
  };

  // ── Step 3: Analyze ───────────────────────────────────────────────────────
  const handleAnalyze = async (engine = 'gemini') => {
    setLoading(true);
    setAnalyzeError(null);
    setLoadingMsg(engine === 'gemini' 
      ? '🤖 Gemini AI is analyzing resumes… this may take 15–30 seconds'
      : '🧮 Offline engine is scoring resumes…');
    try {
      const ids = uploadedCandidates.map(c => c.id);
      const res = await analyzeResumes(jdId, ids, engine);
      setResults(res.data);
      setStep(3);
      showToast('🎉 Analysis complete! Candidates ranked.', 'success');
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Analysis failed. Check backend logs.';
      setAnalyzeError(errorMsg);
      showToast('Analysis failed.', 'error');
    } finally { setLoading(false); }
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    try { await resetData(); } catch {}
    setStep(0); setFiles([]); setUploadedCandidates([]);
    setJdTitle(''); setJdText(''); setJdId(null); setResults(null);
    showToast('Session cleared. Start fresh!', 'info');
  };

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">Resu<span>Metric</span></div>
        <span className="nav-badge">⚡ Gemini AI Powered</span>
      </nav>

      <div className="container">
        {/* HERO */}
        {step === 0 && (
          <div className="hero">
            <h1>AI-Powered <span>Resume Screening</span><br />& Candidate Ranking</h1>
            <p>Upload resumes, paste a job description, and get instant AI-scored rankings with skill analysis.</p>
          </div>
        )}

        {/* STEPS */}
        <div className="steps">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`step ${step === i ? 'active' : ''} ${step > i ? 'done' : ''}`}>
                <div className="step-num">{step > i ? '✓' : i + 1}</div>
                <span className="step-label">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`step-line ${step > i ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="glass card loading-overlay">
            <div className="spinner" />
            <p>{loadingMsg}</p>
          </div>
        )}

        {/* STEP 0: UPLOAD */}
        {!loading && step === 0 && (
          <div className="glass card">
            <div className="card-title"><FileSearch size={18} /> Upload Resumes</div>
            <UploadZone onFilesChange={setFiles} uploadedCandidates={uploadedCandidates} />
            <div className="action-row">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </span>
              <button className="btn btn-primary" onClick={handleUpload} disabled={!files.length}>
                Upload & Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: JD */}
        {!loading && step === 1 && (
          <div className="glass card">
            <div className="card-title"><Briefcase size={18} /> Job Description</div>
            <input
              type="text"
              placeholder="Job Title (e.g. Full Stack Developer)"
              value={jdTitle}
              onChange={e => setJdTitle(e.target.value)}
            />
            <textarea
              placeholder="Paste the full job description here…&#10;&#10;Include required skills, experience, responsibilities, and qualifications for best results."
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              style={{ minHeight: 220 }}
            />
            <div className="action-row">
              <button className="btn btn-outline" onClick={() => setStep(0)}>← Back</button>
              <button className="btn btn-primary" onClick={handleSaveJD} disabled={!jdTitle || !jdText}>
                Save & Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ANALYZE */}
        {!loading && step === 2 && (
          <div className="glass card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🤖</div>
            <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Ready to Analyze</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--text)' }}>{uploadedCandidates.length}</strong> resumes will be scored against{' '}
              <strong style={{ color: 'var(--cyan)' }}>{jdTitle}</strong>
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
              Gemini AI will evaluate skills, experience, education & keyword alignment
            </p>
            
            {analyzeError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--red)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'left' }}>
                <h4 style={{ color: 'var(--red)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⚠️ Analysis Error
                </h4>
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>{analyzeError}</p>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleAnalyze('offline')}>
                  🧮 Fallback to Offline Analysis
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-outline" onClick={() => handleAnalyze('offline')}>
                🧮 Offline Analysis
              </button>
              <button className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2.5rem' }} onClick={() => handleAnalyze('gemini')}>
                ✨ Analyze with Gemini
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RESULTS */}
        {!loading && step === 3 && results && (
          <ResultsDashboard
            results={results.results}
            jdId={jdId}
            jdTitle={results.jd_title}
            onReset={handleReset}
          />
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </>
  );
}
