# 🚀 ResuMetric — Full-Stack Intern Task: Implementation Plan
**Time Budget: ~90 minutes | Goal: Build something that WOWS the evaluator**

---

## What You're Building

A full-stack **AI-powered Resume Screening & Candidate Ranking** web app called **ResuMetric**.

> **The workflow:** Upload Resumes → Enter/Upload JD → AI Analyzes → Score 0–100 → Ranked Dashboard

---

## Our "Stand Out" Strategy (vs. other candidates)

Most people will do the bare minimum. Here's what we do differently:

| Other Candidates | Our ResuMetric |
|---|---|
| Plain white UI | Dark glassmorphic premium UI with animations |
| Basic keyword match | TF-IDF + weighted multi-factor scoring (skills, education, experience, keywords) |
| Single resume upload | Drag-and-drop multi-file upload |
| Table of results | Animated ranked cards with score ring, missing skills, matched skills badges |
| No export | CSV export of results |
| No DB | SQLite (zero-config, no PostgreSQL install needed) |
| Just frontend | Full backend with REST API |
| No README | Professional README with architecture diagram |

---

## Tech Stack (Chosen for Speed + Impact)

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React + Vite | Fast dev server, modern |
| **Backend** | Python FastAPI | Easiest REST API, great for AI/NLP |
| **Database** | SQLite (via SQLAlchemy) | Zero setup, file-based, meets DB requirement |
| **AI/Scoring** | `pdfplumber` + `python-docx` + `scikit-learn` TF-IDF | No API key needed, works offline |
| **Deployment** | Render (backend) + Vercel (frontend) | Free, fast |

> **Why FastAPI over Node.js?** Because Python has `pdfplumber`, `scikit-learn`, `python-docx` — all the NLP libraries we need out of the box. Node.js would require much more work.

---

## Architecture

```
[Browser]
   |
   v
[React Frontend - Vite]  ──────────────────────────────
   |  (fetch/axios)                                    |
   v                                                   |
[FastAPI Backend]                                      |
   |── POST /api/upload-resumes (PDF/DOC files)        |
   |── POST /api/job-description (text or file)        |
   |── POST /api/analyze (triggers scoring)            |
   |── GET  /api/results (ranked candidates)           |
   |── GET  /api/export/csv                            |
   |                                                   |
   v                                                   |
[SQLite DB via SQLAlchemy]                             |
   - candidates table                                  |
   - job_descriptions table                            |
   - analysis_results table                            |
```

---

## Scoring Algorithm (Our Secret Weapon)

We use **weighted multi-factor TF-IDF scoring**:

```
Final Score (0-100) = 
  Skills Match     × 40%  (extract skills from JD, find in resume)
+ Keyword Match    × 30%  (TF-IDF cosine similarity JD vs resume text)
+ Experience Match × 20%  (years of experience keywords)
+ Education Match  × 10%  (degree level keywords)
```

This is **far better** than simple keyword matching. We'll also return:
- ✅ **Matched skills** (green badges)
- ❌ **Missing skills** (red badges)
- 📊 **Score breakdown** per factor

---

## File Structure

```
d:\XYZ\ResuMetric\
├── backend/
│   ├── main.py              ← FastAPI app entry point
│   ├── models.py            ← SQLAlchemy DB models
│   ├── database.py          ← DB connection setup
│   ├── scorer.py            ← AI scoring engine (TF-IDF + rules)
│   ├── parser.py            ← PDF/DOCX text extractor
│   ├── requirements.txt
│   └── uploads/             ← Stored resume files
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css        ← Dark glassmorphic design system
│   │   ├── components/
│   │   │   ├── UploadZone.jsx      ← Drag & drop upload
│   │   │   ├── JDInput.jsx         ← Job Description input
│   │   │   ├── CandidateCard.jsx   ← Ranked result card
│   │   │   ├── ScoreRing.jsx       ← Animated circular score
│   │   │   └── ResultsDashboard.jsx
│   │   └── api.js           ← Axios API calls
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 90-Minute Build Order

### ⏱️ Minutes 0–10: Setup
- [ ] Create `backend/` and `frontend/` folders
- [ ] `pip install` all backend packages
- [ ] `npm create vite frontend` (React)
- [ ] Verify both run

### ⏱️ Minutes 10–25: Backend Core
- [ ] `database.py` — SQLite + SQLAlchemy setup
- [ ] `models.py` — 3 tables: Candidates, JobDescriptions, Results
- [ ] `parser.py` — PDF (pdfplumber) + DOCX (python-docx) text extraction
- [ ] `scorer.py` — TF-IDF scoring engine with 4 factors

### ⏱️ Minutes 25–40: FastAPI Routes
- [ ] `main.py` — All 5 API endpoints
- [ ] CORS setup (so React can talk to it)
- [ ] Test with curl / Postman

### ⏱️ Minutes 40–65: Frontend UI
- [ ] `index.css` — Dark glassmorphic design system
- [ ] `UploadZone.jsx` — Drag & drop multi-file
- [ ] `JDInput.jsx` — Textarea + file upload tab
- [ ] `ResultsDashboard.jsx` — Ranked grid layout
- [ ] `CandidateCard.jsx` — Score ring + skill badges
- [ ] Wire up `api.js` to backend

### ⏱️ Minutes 65–80: Polish & Features
- [ ] Loading states + animations
- [ ] CSV export button
- [ ] Search candidates input
- [ ] Sort by score toggle
- [ ] Error handling

### ⏱️ Minutes 80–90: README + Submission
- [ ] Push to GitHub
- [ ] Deploy backend to Render (or keep local + demo video)
- [ ] Deploy frontend to Vercel
- [ ] Write README

---

## Key Dependencies

### Backend (`requirements.txt`)
```
fastapi==0.111.0
uvicorn==0.29.0
python-multipart==0.0.9
sqlalchemy==2.0.30
pdfplumber==0.11.0
python-docx==1.1.2
scikit-learn==1.4.2
numpy==1.26.4
aiofiles==23.2.1
```

### Frontend (`package.json` deps)
```
react, react-dom, axios, lucide-react
```

---

## Design Vision

- **Background**: Deep dark `#0a0a0f` with subtle gradient
- **Cards**: Glassmorphism — `backdrop-filter: blur(20px)`, semi-transparent borders
- **Score Ring**: Animated SVG circular progress in gold/green
- **Accent Color**: Electric purple `#7c3aed` → cyan `#06b6d4` gradient
- **Typography**: Inter font from Google Fonts
- **Animations**: Card entrance animations, hover lifts, score counter animation

---

## Open Questions

> [!IMPORTANT]
> **Do you want to use an actual AI API (like Google Gemini or OpenAI) for smarter scoring?**
> We have the free Gemini API available. Using it would make the scoring MUCH smarter (true semantic understanding vs keyword matching). However it requires an API key. Do you have one?

> [!IMPORTANT]  
> **Deployment preference?**  
> We can deploy right now on **Render** (backend) + **Vercel** (frontend) for free. Or just do a local demo with a screen recording. Which do you prefer?

> [!NOTE]
> SQLite is being used instead of PostgreSQL/MySQL to avoid any installation overhead. It still fully satisfies the "database" requirement and is production-appropriate for this scale. We can note this in the README.
