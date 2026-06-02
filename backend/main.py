import os
import json
import csv
import io
import shutil
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import aiofiles
from dotenv import load_dotenv
load_dotenv()

from database import engine, get_db, Base
from models import Candidate, JobDescription
from parser import extract_text, extract_name_from_text
from scorer import score_resume, rank_candidates

# ── Init DB tables ────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Create uploads dir ────────────────────────────────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="ResuMetric API", version="1.0.0")

# ── CORS — allow React dev server ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# ROUTE 1: Health check
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "message": "ResuMetric API is running 🚀"}


# ─────────────────────────────────────────────────────────────────────────────
# ROUTE 2: Upload Resumes
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/upload-resumes")
async def upload_resumes(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    uploaded = []
    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".pdf", ".doc", ".docx"]:
            continue

        # Save file
        safe_name = f"{os.urandom(8).hex()}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, safe_name)
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)

        # Extract text
        raw_text = extract_text(file_path)
        name = extract_name_from_text(raw_text, file.filename)

        # Save to DB
        candidate = Candidate(
            name=name,
            filename=file.filename,
            file_path=file_path,
            raw_text=raw_text,
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)

        uploaded.append({
            "id": candidate.id,
            "name": candidate.name,
            "filename": candidate.filename,
            "text_length": len(raw_text),
        })

    return {"uploaded": len(uploaded), "candidates": uploaded}


# ─────────────────────────────────────────────────────────────────────────────
# ROUTE 3: Save Job Description
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/job-description")
async def save_job_description(
    title: str = Form(...),
    content: str = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    jd_text = content or ""

    # If JD uploaded as file
    if file:
        ext = os.path.splitext(file.filename)[1].lower()
        jd_path = os.path.join(UPLOAD_DIR, f"jd_{os.urandom(4).hex()}{ext}")
        async with aiofiles.open(jd_path, "wb") as f:
            await f.write(await file.read())
        jd_text = extract_text(jd_path)

    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description is empty")

    jd = JobDescription(title=title, content=jd_text)
    db.add(jd)
    db.commit()
    db.refresh(jd)

    return {"id": jd.id, "title": jd.title, "content_length": len(jd_text)}


# ─────────────────────────────────────────────────────────────────────────────
# ROUTE 4: Analyze — Score & Rank all uploaded candidates
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/analyze")
def analyze(
    jd_id: int = Form(...),
    candidate_ids: str = Form(...),   # JSON array string e.g. "[1,2,3]"
    engine: str = Form("gemini"),
    db: Session = Depends(get_db)
):
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")

    ids = json.loads(candidate_ids)
    candidates = db.query(Candidate).filter(Candidate.id.in_(ids)).all()

    if not candidates:
        raise HTTPException(status_code=404, detail="No candidates found")

    # Score each candidate
    scored = []
    for c in candidates:
        if not c.raw_text:
            continue
        result = score_resume(c.raw_text, jd.content, candidate_name=c.name, engine=engine)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        scored.append({"candidate": c, "result": result})

    # Rank them
    score_data = [{"id": s["candidate"].id, "total_score": s["result"]["total_score"]} for s in scored]
    ranked = rank_candidates(score_data)
    rank_map = {r["id"]: r["rank"] for r in ranked}

    # Save scores to DB
    results = []
    for s in scored:
        c = s["candidate"]
        r = s["result"]
        c.jd_id = jd_id
        c.match_score = r["total_score"]
        c.skills_score = r["skills_score"]
        c.keyword_score = r["keyword_score"]
        c.experience_score = r["experience_score"]
        c.education_score = r["education_score"]
        c.matched_skills = json.dumps(r["matched_skills"])
        c.missing_skills = json.dumps(r["missing_skills"])
        c.rank = rank_map.get(c.id, 0)
        db.commit()

        results.append({
            "id": c.id,
            "name": c.name,
            "filename": c.filename,
            "rank": c.rank,
            "match_score": c.match_score,
            "skills_score": c.skills_score,
            "keyword_score": c.keyword_score,
            "experience_score": c.experience_score,
            "education_score": c.education_score,
            "matched_skills": r["matched_skills"],
            "missing_skills": r["missing_skills"],
            "strengths": r.get("strengths", ""),
            "gaps": r.get("gaps", ""),
            "scored_by": r.get("scored_by", "tfidf"),
        })

    results.sort(key=lambda x: x["rank"])
    return {"jd_title": jd.title, "total_candidates": len(results), "results": results}


# ─────────────────────────────────────────────────────────────────────────────
# ROUTE 5: Get results for a JD
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/results/{jd_id}")
def get_results(jd_id: int, db: Session = Depends(get_db)):
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="JD not found")

    candidates = (
        db.query(Candidate)
        .filter(Candidate.jd_id == jd_id)
        .order_by(Candidate.rank)
        .all()
    )

    results = []
    for c in candidates:
        results.append({
            "id": c.id,
            "name": c.name,
            "filename": c.filename,
            "rank": c.rank,
            "match_score": c.match_score,
            "skills_score": c.skills_score,
            "keyword_score": c.keyword_score,
            "experience_score": c.experience_score,
            "education_score": c.education_score,
            "matched_skills": json.loads(c.matched_skills or "[]"),
            "missing_skills": json.loads(c.missing_skills or "[]"),
        })

    return {"jd_title": jd.title, "total_candidates": len(results), "results": results}


# ─────────────────────────────────────────────────────────────────────────────
# ROUTE 6: Export CSV
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/export/{jd_id}")
def export_csv(jd_id: int, db: Session = Depends(get_db)):
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="JD not found")

    candidates = (
        db.query(Candidate)
        .filter(Candidate.jd_id == jd_id)
        .order_by(Candidate.rank)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Rank", "Name", "Filename", "Match Score (%)",
        "Skills Score", "Keyword Score", "Experience Score", "Education Score",
        "Matched Skills", "Missing Skills"
    ])

    for c in candidates:
        matched = ", ".join(json.loads(c.matched_skills or "[]"))
        missing = ", ".join(json.loads(c.missing_skills or "[]"))
        writer.writerow([
            c.rank, c.name, c.filename, c.match_score,
            c.skills_score, c.keyword_score, c.experience_score, c.education_score,
            matched, missing
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=resumetric_results_{jd_id}.csv"}
    )


# ─────────────────────────────────────────────────────────────────────────────
# ROUTE 7: List all JDs
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/job-descriptions")
def list_jds(db: Session = Depends(get_db)):
    jds = db.query(JobDescription).order_by(JobDescription.created_at.desc()).all()
    return [{"id": j.id, "title": j.title, "created_at": str(j.created_at)} for j in jds]


# ─────────────────────────────────────────────────────────────────────────────
# ROUTE 8: Delete all data (reset)
# ─────────────────────────────────────────────────────────────────────────────
@app.delete("/api/reset")
def reset(db: Session = Depends(get_db)):
    db.query(Candidate).delete()
    db.query(JobDescription).delete()
    db.commit()
    # Clear uploads
    shutil.rmtree(UPLOAD_DIR, ignore_errors=True)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    return {"message": "All data cleared"}
