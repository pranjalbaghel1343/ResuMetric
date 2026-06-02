# ResuMetric — AI-Powered Resume Screening & Candidate Ranking

> Full-stack web application that automates HR resume screening using **Gemini AI** (with TF-IDF fallback), ranking candidates by their fit for a job description.

![Tech Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)
![DB](https://img.shields.io/badge/Database-PostgreSQL-336791?style=flat-square&logo=postgresql)
![AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-4285F4?style=flat-square&logo=google)

---

## Features

- **Multi-resume upload** — drag-and-drop PDF / DOC / DOCX
- **Job Description input** — paste text or upload a file
- **Gemini AI scoring** — semantic understanding of resume vs JD
- **4-factor weighted analysis**: Skills (40%) · Keywords (30%) · Experience (20%) · Education (10%)
- **Ranked dashboard** — animated score rings, matched/missing skills, AI strengths & gaps
- **Search & sort** candidates by name, skill, or score
- **CSV export** of full results
- **Dual-Engine Selection** — explicitly choose between Gemini AI and the built-in Offline TF-IDF engine.
- **Resilient AI Integration** — automatic 503 error retries and strict fallback validation.

---

## Architecture

```
[React + Vite Frontend :5173]
        │ axios HTTP
        ▼
[FastAPI Backend :8000]
   ├── /api/upload-resumes   → parse PDF/DOCX, store candidates
   ├── /api/job-description  → save JD text
   ├── /api/analyze          → Gemini AI scores each resume vs JD
   ├── /api/results/:jd_id   → fetch ranked results
   ├── /api/export/:jd_id    → download CSV
   └── /api/reset            → clear session
        │ SQLAlchemy ORM
        ▼
[PostgreSQL Database]
   ├── candidates table
   └── job_descriptions table
```

---

## Scoring Algorithm

When using the Gemini engine, **Gemini 2.5 Flash** evaluates:
- Semantic skill understanding
- Experience relevance (not just keyword matching)
- Education-to-role alignment
- Contextual keyword alignment

**Final Score** = `Skills×0.4 + Keywords×0.3 + Experience×0.2 + Education×0.1`

Without API key: TF-IDF cosine similarity + rule-based extraction (automatic fallback).

---

## Setup & Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (running locally on port 5432)

### 1. Clone & Setup Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY and DATABASE_URL
```

**`.env` file:**
```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/resumetric
```

Get a free Gemini API key at: https://aistudio.google.com/app/apikey

### 2. Create PostgreSQL Database

```bash
psql -U postgres -c "CREATE DATABASE resumetric;"
```

### 3. Start Backend

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 4. Setup & Start Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at: http://localhost:5173

---

## Usage

1. **Upload Resumes** — drag and drop one or multiple PDF/DOCX files
2. **Enter Job Description** — paste the full JD text with role title
3. **Choose Scoring Engine** — click **✨ Analyze with Gemini** (or **🧮 Offline Analysis** for fallback)
4. **View Rankings** — sorted cards with scores, skill badges, AI strengths/gaps
5. **Export CSV** — download complete results spreadsheet

---

## Assumptions

- Candidate name is extracted from the first line of the resume; falls back to filename
- PostgreSQL password defaults to `postgres` — update `.env` if different
- Gemini API free tier is sufficient for up to ~50 resumes per minute
- Skills database covers 80+ common tech skills; custom skills from JD are handled semantically by Gemini

---

## Project Structure

```
ResuMetric/
├── backend/
│   ├── main.py          # FastAPI app + all API routes
│   ├── models.py        # SQLAlchemy DB models
│   ├── database.py      # PostgreSQL connection
│   ├── scorer.py        # Gemini AI + TF-IDF scoring engine
│   ├── parser.py        # PDF/DOCX text extraction
│   ├── requirements.txt
│   └── .env             # API keys (not committed)
│
└── frontend/
    ├── src/
    │   ├── App.jsx              # Main app + 4-step wizard
    │   ├── components/
    │   │   ├── UploadZone.jsx   # Drag-and-drop upload
    │   │   ├── ScoreRing.jsx    # Animated SVG score ring
    │   │   ├── CandidateCard.jsx# Result card with AI insights
    │   │   └── ResultsDashboard.jsx
    │   ├── api.js               # Axios API client
    │   └── index.css            # Dark glassmorphic design system
    └── index.html
```
