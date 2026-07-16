"""
Kimi API Client - Wrapper around OpenAI SDK for Kimi API.
Supports streaming responses, error handling, and retries.
"""

from __future__ import annotations

import asyncio
import logging
from typing import AsyncGenerator, Callable, List, Optional

import openai
from openai import AsyncOpenAI

from config import KIMI_API_KEY, KIMI_BASE_URL, KIMI_MAX_RETRIES, KIMI_MODEL, KIMI_TIMEOUT

logger = logging.getLogger(__name__)


class KimiClientError(Exception):
    """Custom exception for Kimi client errors."""
    pass


class KimiClient:
    """
    Async client for Kimi API (OpenAI-compatible).
    Uses kimi-k2-0528 model with temperature fixed to 1.0.
    """

    def __init__(self):
        if not KIMI_API_KEY:
            logger.warning("KIMI_API_KEY not set! API calls will fail.")
        self.client = AsyncOpenAI(
            api_key=KIMI_API_KEY,
            base_url=KIMI_BASE_URL,
            timeout=KIMI_TIMEOUT,
            max_retries=KIMI_MAX_RETRIES,
        )
        self.model = KIMI_MODEL
        self.temperature = 1.0  # Kimi K2 model requirement
        logger.info(f"KimiClient initialized: model={self.model}, base_url={KIMI_BASE_URL}")

    async def chat_complete(
        self,
        messages: List[dict],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = 8192,
        stream: bool = False,
        tools: Optional[List[dict]] = None,
    ) -> str:
        """
        Send a chat completion request (non-streaming).

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Override temperature (default: 1.0 for K2)
            max_tokens: Maximum tokens to generate
            stream: Whether to stream the response
            tools: Optional tool definitions

        Returns:
            Complete response text
        """
        temp = temperature if temperature is not None else self.temperature
        try:
            logger.debug(f"Sending chat request with {len(messages)} messages")
            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": temp,
                "max_tokens": max_tokens,
                "stream": stream,
            }
            if tools:
                kwargs["tools"] = tools

            response = await self.client.chat.completions.create(**kwargs)

            if stream:
                # For streaming, return a generator
                return response  # type: ignore

            content = response.choices[0].message.content or ""
            logger.debug(f"Response received: {len(content)} chars")
            return content

        except openai.AuthenticationError as e:
            logger.error(f"Kimi API authentication error: {e}")
            raise KimiClientError(f"Authentication failed: {e}") from e
        except openai.RateLimitError as e:
            logger.error(f"Kimi API rate limit: {e}")
            raise KimiClientError(f"Rate limit exceeded: {e}") from e
        except openai.APITimeoutError as e:
            logger.error(f"Kimi API timeout: {e}")
            raise KimiClientError(f"Request timeout: {e}") from e
        except openai.APIError as e:
            logger.error(f"Kimi API error: {e}")
            raise KimiClientError(f"API error: {e}") from e
        except Exception as e:
            logger.error(f"Unexpected error in Kimi chat: {e}")
            raise KimiClientError(f"Unexpected error: {e}") from e

    async def chat_stream(
        self,
        messages: List[dict],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = 8192,
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat completion response chunk by chunk.

        Args:
            messages: List of message dicts
            temperature: Override temperature
            max_tokens: Maximum tokens

        Yields:
            Text chunks as they arrive
        """
        temp = temperature if temperature is not None else self.temperature
        try:
            logger.debug(f"Sending streaming chat request with {len(messages)} messages")
            stream_response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temp,
                max_tokens=max_tokens,
                stream=True,
            )

            async for chunk in stream_response:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content

        except openai.AuthenticationError as e:
            logger.error(f"Kimi API authentication error in stream: {e}")
            raise KimiClientError(f"Authentication failed: {e}") from e
        except openai.RateLimitError as e:
            logger.error(f"Kimi API rate limit in stream: {e}")
            raise KimiClientError(f"Rate limit exceeded: {e}") from e
        except openai.APITimeoutError as e:
            logger.error(f"Kimi API timeout in stream: {e}")
            raise KimiClientError(f"Request timeout: {e}") from e
        except openai.APIError as e:
            logger.error(f"Kimi API error in stream: {e}")
            raise KimiClientError(f"API error: {e}") from e
        except Exception as e:
            logger.error(f"Unexpected error in Kimi stream: {e}")
            raise KimiClientError(f"Unexpected error: {e}") from e

    async def generate_with_system_prompt(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: Optional[int] = 8192,
    ) -> str:
        """
        Convenience method: generate with system + user prompt.

        Args:
            system_prompt: System instruction
            user_prompt: User input
            max_tokens: Max output tokens

        Returns:
            Generated text
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        return await self.chat_complete(messages, max_tokens=max_tokens)

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        output_format_hint: str = "",
        max_tokens: Optional[int] = 8192,
    ) -> str:
        """
        Generate structured output (e.g., JSON, Markdown table).
        Appends format hint to system prompt.
        """
        combined_system = system_prompt
        if output_format_hint:
            combined_system += f"\n\n## 输出格式要求\n{output_format_hint}"
        return await self.generate_with_system_prompt(
            combined_system, user_prompt, max_tokens=max_tokens
        )


# Global singleton instance
kimi_client = KimiClient()
