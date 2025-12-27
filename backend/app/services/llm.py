"""LLM service for analyzing vulnerabilities."""
import httpx
import json
import re
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a security code review assistant. You will analyze ONE specific vulnerability or security hotspot in the provided source code.

CRITICAL: You MUST respond with ONLY a valid JSON object. No explanations, no markdown, no text before or after the JSON.

Required JSON format:
{
  "file_path": "path from input",
  "vulnerability_key": "the key from input",
  "triage": "false_positive",
  "confidence": 0.85,
  "short_reason": "Input is sanitized using prepared statements",
  "detailed_explanation": "Line 45 shows the query uses PreparedStatement which prevents SQL injection. The user input from line 30 is passed through validateInput() before reaching the query.",
  "fix_suggestion": "No fix needed - code is secure",
  "severity_override": null
}

RULES:
- Analyze ONLY the specific vulnerability/hotspot mentioned (identified by Key and Line Number)
- "triage" must be exactly one of: "false_positive", "true_positive", "needs_human_review"
- "confidence" must be a number between 0.0 and 1.0
- "severity_override" must be one of: "LOW", "MEDIUM", "HIGH", "CRITICAL", or null
- Reference the specific line numbers in your detailed_explanation
- All string values must use double quotes
- Do not include any text outside the JSON object

FOR VULNERABILITIES (false_positive / true_positive criteria):
- FALSE POSITIVE: Input is properly sanitized/validated, security controls in place, data doesn't reach dangerous sink
- TRUE POSITIVE: Unsanitized user input reaches dangerous functions, no validation/encoding, known vulnerable patterns

FOR SECURITY HOTSPOTS (requires different analysis):
- Security hotspots are code locations that may be security-sensitive and require manual review
- Evaluate if the flagged code pattern is actually risky in this specific context
- FALSE POSITIVE: The code pattern is safe in this context (e.g., hardcoded credentials are for testing, crypto is configured correctly)
- TRUE POSITIVE: The code pattern represents a real security risk (weak crypto, hardcoded production secrets, missing security headers)
- NEEDS HUMAN REVIEW: Cannot determine if the security-sensitive code is properly configured without more context

NEEDS HUMAN REVIEW criteria:
- Complex data flows that are hard to trace
- Partial mitigations that may or may not be sufficient
- When confidence is below 0.6
- Cannot determine data source or security context

Start your response with { and end with }"""

SECURITY_HOTSPOT_SYSTEM_PROMPT = """You are a security code review assistant. You will analyze ONE specific Security Hotspot in the provided source code.

Security Hotspots are code locations that require manual review because they are potentially security-sensitive. Unlike vulnerabilities, they are not confirmed issues - they highlight code that MIGHT be vulnerable depending on context.

CRITICAL: You MUST respond with ONLY a valid JSON object. No explanations, no markdown, no text before or after the JSON.

Required JSON format:
{
  "file_path": "path from input",
  "vulnerability_key": "the key from input",
  "triage": "false_positive",
  "confidence": 0.85,
  "short_reason": "Crypto algorithm is properly configured with secure parameters",
  "detailed_explanation": "The security hotspot at line 45 flags the use of cryptography. However, the implementation uses AES-256-GCM with a properly derived key and random IV. This is a secure configuration.",
  "fix_suggestion": "No fix needed - implementation follows security best practices",
  "severity_override": null
}

SECURITY HOTSPOT CATEGORIES AND EVALUATION:
- **Weak Cryptography**: Check if crypto algorithms/key sizes are adequate (AES-256, RSA-2048+, SHA-256+)
- **Hardcoded Credentials**: Determine if credentials are for testing/dev or production use
- **Insecure Configuration**: Check security headers, TLS settings, cookie flags
- **SQL Injection**: Verify if parameterized queries or ORM are used properly
- **Command Injection**: Check if user input reaches shell commands safely
- **Path Traversal**: Verify input validation for file paths
- **CSRF**: Check if anti-CSRF tokens are implemented
- **Authentication/Authorization**: Verify proper access controls

TRIAGE DECISION:
- "false_positive": The code pattern is SAFE in this context. Security controls are properly implemented.
- "true_positive": The code pattern represents a REAL security risk. Fix is required.
- "needs_human_review": Cannot determine safety without additional context or the implementation is borderline.

RULES:
- "confidence" must be a number between 0.0 and 1.0
- "severity_override" must be one of: "LOW", "MEDIUM", "HIGH", "CRITICAL", or null
- Reference the specific line numbers in your detailed_explanation
- Explain WHY the code is safe or unsafe in this specific context

Start your response with { and end with }"""


class LLMService:
    """Service for interacting with LLM API (LM Studio, OpenAI compatible)."""
    
    def __init__(self, base_url: str, model: str, api_key: Optional[str] = None):
        """Initialize LLM service.
        
        Args:
            base_url: LLM API base URL (e.g., http://localhost:1234/v1)
            model: Model name to use
            api_key: API key (optional for local LM Studio)
        """
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.api_key = api_key
        self.headers = {
            "Content-Type": "application/json"
        }
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"
    
    def _extract_json(self, content: str) -> Optional[Dict[str, Any]]:
        """Try multiple strategies to extract JSON from LLM response.
        
        Args:
            content: Raw LLM response content
            
        Returns:
            Parsed JSON dict or None if extraction failed
        """
        # Strategy 1: Direct parse (response is already valid JSON)
        try:
            return json.loads(content.strip())
        except json.JSONDecodeError:
            pass
        
        # Strategy 2: Extract from markdown code blocks
        if "```json" in content:
            try:
                json_str = content.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            except (IndexError, json.JSONDecodeError):
                pass
        
        if "```" in content:
            try:
                parts = content.split("```")
                if len(parts) >= 2:
                    json_str = parts[1].strip()
                    # Remove language identifier if present
                    if json_str.startswith(("json", "JSON")):
                        json_str = json_str[4:].strip()
                    return json.loads(json_str)
            except (IndexError, json.JSONDecodeError):
                pass
        
        # Strategy 3: Find JSON object using regex
        try:
            # Find content between first { and last }
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                json_str = match.group(0)
                return json.loads(json_str)
        except json.JSONDecodeError:
            pass
        
        # Strategy 4: Try to find nested JSON by matching braces
        try:
            start_idx = content.find('{')
            if start_idx != -1:
                brace_count = 0
                end_idx = start_idx
                for i, char in enumerate(content[start_idx:], start_idx):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = i + 1
                            break
                
                if end_idx > start_idx:
                    json_str = content[start_idx:end_idx]
                    return json.loads(json_str)
        except json.JSONDecodeError:
            pass
        
        return None
    
    async def analyze_vulnerability(
        self, 
        file_path: str,
        source_code: str, 
        vulnerability: Dict[str, Any],
        timeout: float = 120.0
    ) -> Dict[str, Any]:
        """Analyze a single vulnerability or security hotspot using LLM.
        
        Args:
            file_path: Path to the file being analyzed
            source_code: Source code of the file
            vulnerability: Single vulnerability/hotspot dict with key, rule, message, line, severity, etc.
            timeout: Request timeout in seconds
            
        Returns:
            Dict containing analysis results
        """
        # Extract vulnerability details for clearer prompt
        vuln_key = vulnerability.get("key", "unknown")
        vuln_rule = vulnerability.get("rule", "unknown")
        vuln_line = vulnerability.get("line", "unknown")
        vuln_message = vulnerability.get("message", "No message")
        vuln_severity = vulnerability.get("severity", "unknown")
        vuln_type = vulnerability.get("type", "VULNERABILITY")
        vuln_locations = vulnerability.get("locations", [])
        
        # Security hotspot specific fields
        security_category = vulnerability.get("securityCategory", "")
        vuln_probability = vulnerability.get("vulnerabilityProbability", "")
        
        # Choose appropriate system prompt based on type
        is_hotspot = vuln_type == "SECURITY_HOTSPOT"
        system_prompt = SECURITY_HOTSPOT_SYSTEM_PROMPT if is_hotspot else SYSTEM_PROMPT
        
        # Build the user prompt
        if is_hotspot:
            user_prompt = f"""File Path: {file_path}

=== SECURITY HOTSPOT DETAILS ===
Key: {vuln_key}
Rule/Category: {vuln_rule}
Security Category: {security_category}
Vulnerability Probability: {vuln_probability}
Severity: {vuln_severity}
Line Number: {vuln_line}
Message: {vuln_message}

=== FULL SOURCE CODE ===
{source_code}

Please analyze this Security Hotspot (Key: {vuln_key}) at line {vuln_line}. 
Determine if this code pattern is actually a security risk in this specific context, or if it's safely implemented.
Respond with false_positive if SAFE, true_positive if RISKY, or needs_human_review if UNCERTAIN."""
        else:
            user_prompt = f"""File Path: {file_path}

=== VULNERABILITY DETAILS ===
Key: {vuln_key}
Rule: {vuln_rule}
Type: {vuln_type}
Severity: {vuln_severity}
Line Number: {vuln_line}
Message: {vuln_message}

Additional Flow Locations:
{json.dumps(vuln_locations, indent=2) if vuln_locations else "None"}

=== FULL SOURCE CODE ===
{source_code}

Please analyze ONLY this specific vulnerability (Key: {vuln_key}) at line {vuln_line} and determine if it is a false positive, true positive, or needs human review."""

        # Store the full prompt for debugging/transparency
        full_prompt = f"""=== SYSTEM PROMPT ===
{system_prompt}

=== USER PROMPT ===
{user_prompt}"""

        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 2000
        }
        
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, headers=self.headers, json=payload)
                response.raise_for_status()
                
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # Try to extract JSON using multiple strategies
                result = self._extract_json(content)
                
                if result:
                    result["raw_response"] = content
                    result["prompt_sent"] = full_prompt
                    return result
                else:
                    logger.warning(f"Failed to parse LLM response as JSON")
                    logger.warning(f"Raw content: {content[:500]}...")
                    return {
                        "file_path": file_path,
                        "triage": "needs_human_review",
                        "confidence": 0.0,
                        "short_reason": "Failed to parse LLM response as JSON",
                        "detailed_explanation": f"The LLM returned a response that could not be parsed as JSON.\n\n--- RAW LLM RESPONSE ---\n{content}",
                        "fix_suggestion": None,
                        "severity_override": None,
                        "raw_response": content,
                        "prompt_sent": full_prompt,
                        "parse_error": "JSON extraction failed with all strategies"
                    }
                    
        except httpx.TimeoutException:
            logger.error(f"LLM request timed out for {file_path}")
            return {
                "file_path": file_path,
                "triage": "needs_human_review",
                "confidence": 0.0,
                "short_reason": "LLM request timed out",
                "detailed_explanation": "The LLM request timed out. Please try again or increase timeout.",
                "fix_suggestion": None,
                "severity_override": None,
                "prompt_sent": full_prompt,
                "error": "timeout"
            }
        except Exception as e:
            logger.error(f"LLM request failed for {file_path}: {e}")
            return {
                "file_path": file_path,
                "triage": "needs_human_review",
                "confidence": 0.0,
                "short_reason": f"LLM request failed: {str(e)}",
                "detailed_explanation": str(e),
                "fix_suggestion": None,
                "severity_override": None,
                "prompt_sent": full_prompt,
                "error": str(e)
            }
    
    async def test_connection(self) -> bool:
        """Test connection to LLM API.
        
        Returns:
            True if connection successful
            
        Raises:
            Exception with specific error details if connection fails
        """
        url = f"{self.base_url}/models"
        models_error = None
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=self.headers)
                
                if response.status_code == 401:
                    raise Exception(f"Authentication failed (401): Invalid or expired LLM API key.")
                elif response.status_code == 403:
                    raise Exception(f"Access forbidden (403): Your API key doesn't have permission to access this LLM service.")
                    
                response.raise_for_status()
                
                # Check if the model exists in the response
                try:
                    data = response.json()
                    models = data.get("data", []) if isinstance(data, dict) else data
                    model_ids = [m.get("id", "") for m in models if isinstance(m, dict)]
                    if self.model and model_ids and self.model not in model_ids:
                        available_models = ", ".join(model_ids[:5])
                        if len(model_ids) > 5:
                            available_models += f" (and {len(model_ids) - 5} more)"
                        raise Exception(f"Model not found: Model '{self.model}' is not available. Available models: {available_models}")
                except Exception as model_check_error:
                    if "Model not found" in str(model_check_error):
                        raise
                    # If we can't check models, that's okay - connection worked
                    pass
                    
                return True
                
        except httpx.ConnectError as e:
            models_error = f"Connection error: Unable to connect to LLM API at '{self.base_url}'. Please check if the LLM server (e.g., LM Studio) is running and the URL is correct."
        except httpx.TimeoutException as e:
            models_error = f"Connection timeout: LLM API at '{self.base_url}' did not respond within 10 seconds."
        except Exception as e:
            if "Authentication failed" in str(e) or "Access forbidden" in str(e) or "Model not found" in str(e):
                raise
            models_error = str(e)
        
        # Try chat endpoint as fallback
        logger.info(f"LLM /models endpoint failed, trying /chat/completions fallback")
        try:
            test_payload = {
                "model": self.model,
                "messages": [{"role": "user", "content": "test"}],
                "max_tokens": 5
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=test_payload
                )
                
                if response.status_code == 401:
                    raise Exception(f"Authentication failed (401): Invalid or expired LLM API key.")
                elif response.status_code == 403:
                    raise Exception(f"Access forbidden (403): Your API key doesn't have permission to access this LLM service.")
                elif response.status_code == 404:
                    raise Exception(f"LLM endpoint not found (404): The chat/completions endpoint is not available at '{self.base_url}'. Please verify the URL.")
                elif response.status_code == 400:
                    try:
                        error_data = response.json()
                        error_msg = error_data.get("error", {}).get("message", str(error_data))
                        if "model" in error_msg.lower():
                            raise Exception(f"Model error: {error_msg}")
                    except:
                        pass
                
                response.raise_for_status()
                return True
                
        except httpx.ConnectError as e:
            raise Exception(f"Connection error: Unable to connect to LLM API at '{self.base_url}'. Please check if the LLM server (e.g., LM Studio) is running and the URL is correct. Details: {str(e)}")
        except httpx.TimeoutException as e:
            raise Exception(f"Connection timeout: LLM API at '{self.base_url}' did not respond within 15 seconds. The server may be overloaded or not running.")
        except httpx.HTTPStatusError as e:
            try:
                error_data = e.response.json()
                error_msg = error_data.get("error", {}).get("message", e.response.text[:200])
            except:
                error_msg = e.response.text[:200] if e.response.text else str(e)
            raise Exception(f"HTTP error {e.response.status_code}: {error_msg}")
        except Exception as e:
            if "Authentication failed" in str(e) or "Access forbidden" in str(e) or "Model" in str(e) or "Connection" in str(e) or "endpoint not found" in str(e):
                raise
            logger.error(f"LLM connection test failed: {e}")
            # Include the original models endpoint error for context
            if models_error:
                raise Exception(f"LLM connection failed. Models endpoint: {models_error}. Chat endpoint: {str(e)}")
            raise Exception(f"LLM connection failed: {str(e)}")
