from pydantic import BaseModel
from typing import List, Dict

class AnalysisRequest(BaseModel):
    transcript: str


class MissedOpportunity(BaseModel):
    type: str
    explanation: str


class AnalysisResponse(BaseModel):
    summary: str
    what_worked: List[str]
    what_hurt: List[str]
    missed_opportunity: MissedOpportunity
    rewrite: str
    cta: str
    scores: Dict[str, int]
    final_rating: int