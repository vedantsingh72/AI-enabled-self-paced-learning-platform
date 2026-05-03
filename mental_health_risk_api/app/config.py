"""
Application configuration.

HF_TOKEN is read only from the environment — never hard-code or log it.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Hugging Face access token (Inference API). Required for live HF calls.
    hf_token: str = ""

    # HTTP client
    hf_timeout_seconds: float = 10.0
    hf_max_retries: int = 2  # two retries => three attempts total

    # Optional: truncate very long messages before sending to HF (character count)
    max_message_chars: int = 2000


@lru_cache
def get_settings() -> Settings:
    return Settings()
