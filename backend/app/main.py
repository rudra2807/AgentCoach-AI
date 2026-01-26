
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

APP_ENV = os.getenv("APP_ENV", "dev")


app = FastAPI(title="MVP Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get('/health-check')
def health_check():
    return {"status": "Backend running "}

@app.on_event("startup")
def startup():
    print(f"Backend starting in {APP_ENV} mode")

@app.post('/analyze-transcript', response_model=AnalysisResponse)
def analyze_transcript(payload: AnalysisRequest):
    scores = {
        "value_clarity": 4,
        "objection_handling": 3,
        "engagement": 4,
        "next_step": 2,
        "conversion_likelihood": 3,
    }

    final_rating = round(sum(scores.values()) / len(scores))

    return {
        "summary": "The agent introduced the product and discussed pricing, but the call ended without a clear commitment.",
        "what_worked": [
            "Clear explanation of the product’s core features",
            "Professional and friendly tone throughout the call",
            "Responded calmly to initial pricing concerns"
        ],
        "what_hurt": [
            "Did not clearly articulate ROI or business value",
            "Missed addressing the client’s hesitation directly",
            "No concrete follow-up date was proposed"
        ],
        "missed_opportunity": {
            "type": "next_step",
            "explanation": "The agent failed to propose a specific follow-up action or timeline."
        },
        "rewrite": (
            "Thanks for taking the time today. Based on our discussion, I’d recommend a short follow-up "
            "to walk through how this solution can directly impact your current workflow."
        ),
        "cta": "Schedule a 15-minute follow-up call this week",
        "scores": scores,
        "final_rating": final_rating
    }
    