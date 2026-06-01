import re
import json
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ─── Try to load Gemini (new google.genai SDK) ───────────────────────────────
try:
    from google import genai as google_genai
    from google.genai import types as genai_types
    from dotenv import load_dotenv
    load_dotenv()
    GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
    if GEMINI_KEY:
        _genai_client = google_genai.Client(api_key=GEMINI_KEY)
        GEMINI_AVAILABLE = True
        print("[OK] Gemini AI scoring enabled (google.genai SDK)")
    else:
        GEMINI_AVAILABLE = False
        print("[WARN] No GEMINI_API_KEY found - using TF-IDF fallback")
except Exception as e:
    GEMINI_AVAILABLE = False
    print(f"[WARN] Gemini not available: {e}")

# ─── Skills DB ────────────────────────────────────────────────────────────────
SKILLS_DB = [
    "python","javascript","typescript","java","c++","c#","go","rust","kotlin","swift","ruby","php","scala","r","dart",
    "react","react.js","next.js","vue","angular","html","css","sass","tailwind","bootstrap","jquery","webpack","vite",
    "redux","graphql","rest api","node.js","express","fastapi","flask","django","spring","nestjs",
    "postgresql","mysql","mongodb","sqlite","redis","elasticsearch","sql","nosql","firebase",
    "aws","gcp","azure","docker","kubernetes","ci/cd","jenkins","github actions","terraform","nginx","linux",
    "machine learning","deep learning","nlp","computer vision","tensorflow","pytorch","keras","scikit-learn",
    "pandas","numpy","data analysis","data science","llm","openai","langchain",
    "react native","flutter","android","ios",
    "git","github","gitlab","jira","figma","postman","agile","scrum",
]

EDUCATION_LEVELS = {
    "phd":100,"doctorate":100,"master":80,"m.tech":80,"m.sc":80,"mba":75,
    "bachelor":60,"b.tech":60,"b.sc":60,"b.e":60,"diploma":40,
}

EXPERIENCE_PATTERNS = [
    r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:work\s*)?experience',
    r'(\d+)\+?\s*yrs?\s*(?:of\s*)?experience',
    r'experience\s*(?:of\s*)?(\d+)\+?\s*years?',
]


def clean_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s\.\+#]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def extract_skills(text):
    text_lower = text.lower()
    return list({s for s in SKILLS_DB if re.search(r'\b' + re.escape(s) + r'\b', text_lower)})


def extract_experience_years(text):
    text_lower = text.lower()
    max_years = 0.0
    for pattern in EXPERIENCE_PATTERNS:
        for m in re.findall(pattern, text_lower):
            try: max_years = max(max_years, float(m))
            except: pass
    return max_years


def extract_education_score(text):
    text_lower = text.lower()
    return max((score for kw, score in EDUCATION_LEVELS.items() if kw in text_lower), default=0.0)


def compute_tfidf_similarity(text1, text2):
    try:
        vec = TfidfVectorizer(stop_words='english', ngram_range=(1,2), max_features=5000)
        mat = vec.fit_transform([clean_text(text1), clean_text(text2)])
        return float(cosine_similarity(mat[0:1], mat[1:2])[0][0])
    except:
        return 0.0


def gemini_score(resume_text: str, jd_text: str, candidate_name: str) -> dict:
    """Use Gemini to semantically analyze resume vs JD."""
    prompt = f"""You are an expert HR recruiter. Analyze this resume against the job description.

JOB DESCRIPTION:
{jd_text[:3000]}

RESUME (Candidate: {candidate_name}):
{resume_text[:3000]}

Return ONLY a valid JSON object (no markdown) with exactly this structure:
{{"overall_fit":<int 0-100>,"skills_match":<int 0-100>,"experience_relevance":<int 0-100>,"education_fit":<int 0-100>,"keyword_alignment":<int 0-100>,"matched_skills":[<strings>],"missing_skills":[<strings>],"strengths":"<one sentence>","gaps":"<one sentence>"}}"""

    try:
        response = _genai_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        raw = response.text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        data = json.loads(raw)
        return {"success": True, "data": data}
    except Exception as e:
        print(f"[WARN] Gemini scoring error: {e}")
        return {"success": False}


def score_resume(resume_text: str, jd_text: str, candidate_name: str = "Candidate") -> dict:
    """
    Score a resume against a JD.
    Uses Gemini AI if available, falls back to TF-IDF + rules.
    """
    # ── Extract local skills regardless (for fallback / enrichment) ────────────
    jd_skills = extract_skills(jd_text)
    resume_skills = extract_skills(resume_text)
    matched = [s for s in jd_skills if s in resume_skills]
    missing = [s for s in jd_skills if s not in resume_skills]

    # ── GEMINI PATH ────────────────────────────────────────────────────────────
    if GEMINI_AVAILABLE:
        result = gemini_score(resume_text, jd_text, candidate_name)
        if result["success"]:
            d = result["data"]
            # Weighted final score from Gemini's sub-scores
            total = round(
                d.get("skills_match", 50) * 0.40 +
                d.get("keyword_alignment", 50) * 0.30 +
                d.get("experience_relevance", 50) * 0.20 +
                d.get("education_fit", 50) * 0.10,
                1
            )
            # Use Gemini's skills if available, else use local extraction
            g_matched = d.get("matched_skills", matched)
            g_missing = d.get("missing_skills", missing[:10])
            return {
                "total_score": min(max(total, 0), 100),
                "skills_score": d.get("skills_match", 0),
                "keyword_score": d.get("keyword_alignment", 0),
                "experience_score": d.get("experience_relevance", 0),
                "education_score": d.get("education_fit", 0),
                "matched_skills": g_matched,
                "missing_skills": g_missing[:10],
                "resume_skills": resume_skills,
                "strengths": d.get("strengths", ""),
                "gaps": d.get("gaps", ""),
                "scored_by": "gemini",
            }

    # ── FALLBACK: TF-IDF + Rules ───────────────────────────────────────────────
    skills_score = (len(matched) / len(jd_skills) * 100) if jd_skills else 50.0
    tfidf = compute_tfidf_similarity(resume_text, jd_text)
    keyword_score = min(tfidf * 250, 100.0)

    jd_years = extract_experience_years(jd_text)
    resume_years = extract_experience_years(resume_text)
    if jd_years > 0:
        exp_score = 100.0 if resume_years >= jd_years else (resume_years / jd_years * 100 if resume_years > 0 else 20.0)
    else:
        exp_score = min(resume_years * 15, 100.0) if resume_years > 0 else 40.0

    edu_score = extract_education_score(resume_text) or 30.0

    total = round(
        skills_score * 0.40 + keyword_score * 0.30 + exp_score * 0.20 + edu_score * 0.10, 1
    )

    return {
        "total_score": min(max(total, 0), 100),
        "skills_score": round(skills_score, 1),
        "keyword_score": round(keyword_score, 1),
        "experience_score": round(exp_score, 1),
        "education_score": round(edu_score, 1),
        "matched_skills": matched,
        "missing_skills": missing[:10],
        "resume_skills": resume_skills,
        "strengths": "",
        "gaps": "",
        "scored_by": "tfidf",
    }


def rank_candidates(candidates_scores: list) -> list:
    sorted_c = sorted(candidates_scores, key=lambda x: x["total_score"], reverse=True)
    for i, c in enumerate(sorted_c):
        c["rank"] = i + 1
    return sorted_c
