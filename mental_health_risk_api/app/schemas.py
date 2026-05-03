"""Pydantic request/response models."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class RiskAssessmentRequest(BaseModel):
    """Input payload for risk assessment."""

    chatbot_messages: list[str] = Field(
        default_factory=list,
        description="Messages from the student–chatbot conversation.",
    )
    peer_messages: list[str] = Field(
        default_factory=list,
        description="Messages from peer group chat attributed to the student.",
    )
    phq9_score: int = Field(..., ge=0, le=27, description="PHQ-9 total score (0–27).")
    gad7_score: int = Field(..., ge=0, le=21, description="GAD-7 total score (0–21).")
    counsellor_rating: int = Field(
        ...,
        ge=1,
        le=10,
        description="Counsellor concern/risk rating (1–10).",
    )

    @field_validator("chatbot_messages", "peer_messages", mode="before")
    @classmethod
    def strip_strings(cls, v: list) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(x).strip() for x in v if str(x).strip()]


RiskLevel = Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]


class RiskSummary(BaseModel):
    """
    Aggregated signals returned to the client.

    Core fields match the API contract; extra fields support step-4 aggregates.
    """

    suicidal_messages: int
    dominant_emotion: str
    phq9: int
    gad7: int
    counsellor_score: int
    sadness_fear_messages: int = Field(
        description="Count of messages whose top emotion was sadness or fear.",
    )
    average_confidence: float = Field(
        description="Mean of (suicide_top_conf + emotion_top_conf) / 2 per analyzed message.",
    )


class RiskAssessmentResponse(BaseModel):
    """Structured risk output."""

    risk_score: int
    risk_level: RiskLevel
    summary: RiskSummary
    action: str
