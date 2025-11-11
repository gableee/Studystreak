"""
Ollama API client for local LLM inference.
Supports Qwen3-VL and other Ollama models.
"""

import logging
import json
from typing import Optional, Dict, Any, List
import httpx
import os

logger = logging.getLogger(__name__)


class OllamaClient:
    """Client for interacting with local Ollama API."""
    
    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "qwen3-vl:8b",
        timeout: float = 300.0
    ):
        """
        Initialize Ollama client.
        
        Args:
            base_url: Ollama API base URL (default: http://localhost:11434)
            model: Model name to use (default: qwen3-vl:8b)
            timeout: Request timeout in seconds (default: 300s)
        """
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.timeout = timeout
        
        logger.info(f"Ollama client initialized (model: {model}, url: {base_url})")
    
    def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stop: Optional[List[str]] = None,
        stream: bool = False,
        format: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate text completion using Ollama.
        
        Args:
            prompt: User prompt/instruction
            system: Optional system prompt
            temperature: Sampling temperature (0.0-2.0, default: 0.7)
            max_tokens: Maximum tokens to generate (default: model default)
            stop: List of stop sequences
            stream: Whether to stream response (default: False)
            format: Response format ('json' for JSON output)
        
        Returns:
            dict with 'response', 'model', 'created_at', 'done', etc.
        """
        try:
            url = f"{self.base_url}/api/generate"
            
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": stream,
                "options": {
                    "temperature": temperature
                }
            }
            
            if system:
                payload["system"] = system
            
            if max_tokens:
                payload["options"]["num_predict"] = max_tokens
            
            if stop:
                payload["options"]["stop"] = stop
            
            if format:
                payload["format"] = format
            
            logger.info(f"Generating with {self.model} (temp={temperature}, max_tokens={max_tokens}, stream={stream})")
            logger.debug(f"Prompt preview: {prompt[:200]}...")

            if stream:
                # Stream incremental tokens and accumulate response text
                response_text = ""
                created_at = None
                model = self.model
                with httpx.Client(timeout=self.timeout) as client:
                    with client.stream("POST", url, json=payload) as resp:
                        resp.raise_for_status()
                        for line in resp.iter_lines():
                            if not line:
                                continue
                            try:
                                data = json.loads(line)
                            except Exception:
                                # Some Ollama builds prefix with 'data: '
                                if isinstance(line, (bytes, bytearray)):
                                    line_str = line.decode(errors='ignore')
                                else:
                                    line_str = str(line)
                                if line_str.startswith('data:'):
                                    try:
                                        data = json.loads(line_str[len('data:'):].strip())
                                    except Exception:
                                        continue
                                else:
                                    continue
                            if 'response' in data:
                                response_text += data.get('response', '')
                            if 'model' in data:
                                model = data['model']
                            if 'created_at' in data and created_at is None:
                                created_at = data['created_at']
                            if data.get('done'):
                                logger.info(f"Generated {len(response_text)} chars (stream)")
                                return {
                                    'response': response_text,
                                    'model': model,
                                    'created_at': created_at,
                                    'done': True
                                }
                # If we exit the stream without 'done', return what we have
                logger.warning("Stream ended without done flag")
                return {
                    'response': response_text,
                    'model': model,
                    'created_at': created_at,
                    'done': False
                }
            else:
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.post(url, json=payload)
                    response.raise_for_status()

                    result = response.json()

                    if result.get('done'):
                        response_text = result.get('response', '')
                        logger.info(f"Generated {len(response_text)} chars")
                        return result
                    else:
                        logger.warning("Generation incomplete or error occurred")
                        return result
        
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from Ollama: {e.response.status_code} - {e.response.text}")
            raise
        except httpx.TimeoutException:
            logger.error(f"Ollama request timed out after {self.timeout}s")
            raise
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            raise
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        format: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Chat completion using Ollama (multi-turn conversation).
        
        Args:
            messages: List of message dicts with 'role' and 'content'
                     Example: [{"role": "user", "content": "Hello"}]
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            format: Response format ('json' for JSON output)
        
        Returns:
            dict with 'message', 'model', 'created_at', 'done', etc.
        """
        try:
            url = f"{self.base_url}/api/chat"
            
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature
                }
            }
            
            if max_tokens:
                payload["options"]["num_predict"] = max_tokens
            
            if format:
                payload["format"] = format
            
            logger.info(f"Chat with {self.model} ({len(messages)} messages)")
            
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, json=payload)
                response.raise_for_status()
                
                result = response.json()
                
                if result.get('done'):
                    message = result.get('message', {})
                    content = message.get('content', '')
                    logger.info(f"Generated {len(content)} chars")
                    return result
                else:
                    logger.warning("Chat incomplete or error occurred")
                    return result
        
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from Ollama: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Ollama chat failed: {e}")
            raise
    
    def generate_json(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: Optional[int] = None,
        retry_attempts: int = 3
    ) -> Dict[str, Any]:
        """
        Generate structured JSON output with retry logic and robust error handling.
        
        Args:
            prompt: User prompt
            system: Optional system prompt
            temperature: Sampling temperature (lower for JSON, default: 0.3)
            max_tokens: Maximum tokens to generate
            retry_attempts: Number of retry attempts (default: 3)
        
        Returns:
            Parsed JSON dict or fallback structure with error info
        """
        import re
        
        last_error = None
        last_response = None
        
        for attempt in range(retry_attempts):
            try:
                logger.info(f"JSON generation attempt {attempt + 1}/{retry_attempts}")
                
                # First attempt: use format="json" for structured output
                use_format = "json" if attempt == 0 else None
                
                result = self.generate(
                    prompt=prompt,
                    system=system,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    format=use_format,
                    stream=False if use_format else True
                )
                
                response_text = result.get('response', '').strip()
                last_response = response_text
                
                # Validate response is not empty
                if not response_text or len(response_text) < 5:
                    logger.warning(f"Empty or very short response ({len(response_text)} chars) on attempt {attempt + 1}")
                    if attempt < retry_attempts - 1:
                        logger.info("Retrying without format constraint...")
                        continue
                    else:
                        logger.error("All attempts returned empty responses")
                        return {"raw_response": "", "parse_error": "Empty response from model"}
                
                # Extract JSON from markdown code blocks if present
                # This is safely wrapped in a try-except to avoid syntax errors
                try:
                    if '```json' in response_text:
                        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
                        if json_match:
                            response_text = json_match.group(1)
                            logger.debug("Extracted JSON from ```json code block")
                    elif '```' in response_text:
                        json_match = re.search(r'```\s*(\{.*?\})\s*```', response_text, re.DOTALL)
                        if json_match:
                            response_text = json_match.group(1)
                            logger.debug("Extracted JSON from ``` code block")
                except Exception as extract_error:
                    logger.warning(f"Failed to extract JSON from markdown: {extract_error}")
                    # Continue with original response_text
                
                # Parse JSON
                try:
                    json_data = json.loads(response_text)
                    logger.info(f"Successfully parsed JSON response (attempt {attempt + 1})")
                    return json_data
                    
                except json.JSONDecodeError as e:
                    last_error = e
                    logger.warning(f"JSON parse error on attempt {attempt + 1}: {str(e)[:100]}")
                    logger.debug(f"Failed response preview: {response_text[:200]}...")
                    
                    if attempt < retry_attempts - 1:
                        logger.info(f"Retrying JSON generation (attempt {attempt + 2}/{retry_attempts})...")
                        continue
                    else:
                        logger.error(f"All {retry_attempts} attempts failed to parse JSON")
                        logger.error(f"Last response: {response_text[:500]}")
                        # Return raw response as fallback for client to handle
                        return {
                            "raw_response": response_text,
                            "parse_error": str(e),
                            "error_type": "json_decode_error"
                        }
            
            except httpx.TimeoutException as e:
                last_error = e
                logger.error(f"Timeout on attempt {attempt + 1}: Request exceeded {self.timeout}s")
                if attempt < retry_attempts - 1:
                    logger.info(f"Retrying with shorter timeout (attempt {attempt + 2}/{retry_attempts})...")
                    # For retry, we could reduce complexity or continue with same settings
                    continue
                else:
                    logger.error(f"JSON generation timed out after {retry_attempts} attempts")
                    raise
            
            except Exception as e:
                last_error = e
                logger.error(f"Unexpected error on attempt {attempt + 1}: {type(e).__name__}: {str(e)[:200]}")
                if attempt < retry_attempts - 1:
                    logger.info(f"Retrying (attempt {attempt + 2}/{retry_attempts})...")
                    continue
                else:
                    logger.error(f"JSON generation failed after {retry_attempts} attempts")
                    raise
        
        # Should not reach here, but handle it gracefully
        logger.error("JSON generation exhausted all retries without success")
        return {
            "raw_response": last_response or "",
            "parse_error": str(last_error) if last_error else "Unknown error",
            "error_type": "retry_exhausted"
        }
    
    def is_available(self) -> bool:
        """
        Check if Ollama server is available.
        
        Returns:
            True if server is reachable, False otherwise
        """
        try:
            url = f"{self.base_url}/api/tags"
            with httpx.Client(timeout=5.0) as client:
                response = client.get(url)
                return response.status_code == 200
        except Exception:
            return False
    
    def list_models(self) -> List[str]:
        """
        List available models on Ollama server.
        
        Returns:
            List of model names
        """
        try:
            url = f"{self.base_url}/api/tags"
            with httpx.Client(timeout=10.0) as client:
                response = client.get(url)
                response.raise_for_status()
                
                data = response.json()
                models = [m['name'] for m in data.get('models', [])]
                logger.info(f"Found {len(models)} models: {models}")
                return models
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return []


def get_ollama_client(
    model: Optional[str] = None,
    base_url: Optional[str] = None
) -> OllamaClient:
    """
    Factory function to get configured Ollama client.
    
    Args:
        model: Model name (default: from OLLAMA_MODEL env or 'qwen3-vl:8b')
        base_url: Ollama URL (default: from OLLAMA_BASE_URL env or 'http://localhost:11434')
    
    Returns:
        Configured OllamaClient instance
    """
    model = model or os.getenv('OLLAMA_MODEL', 'qwen3-vl:8b')
    base_url = base_url or os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
    
    return OllamaClient(base_url=base_url, model=model)
