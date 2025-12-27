"""GitHub API service for fetching source code."""
import httpx
import base64
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class GitHubService:
    """Service for interacting with GitHub API."""
    
    def __init__(self, api_key: str, owner: str, repo: str, branch: str = "main"):
        """Initialize GitHub service.
        
        Args:
            api_key: GitHub personal access token
            owner: Repository owner
            repo: Repository name
            branch: Branch to fetch from (default: main)
        """
        self.api_key = api_key
        self.owner = owner
        self.repo = repo
        self.branch = branch
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
    
    async def get_file_content(self, file_path: str) -> Optional[str]:
        """Fetch file content from GitHub repository.
        
        Args:
            file_path: Path to the file in the repository
            
        Returns:
            File content as string, or None if not found
        """
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/contents/{file_path}"
        params = {"ref": self.branch}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self.headers, params=params)
                
                if response.status_code == 404:
                    logger.warning(f"File not found: {file_path}")
                    return None
                
                response.raise_for_status()
                data = response.json()
                
                # GitHub returns content as base64 encoded
                if data.get("encoding") == "base64":
                    content = base64.b64decode(data.get("content", "")).decode("utf-8")
                    return content
                
                return data.get("content", "")
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching file {file_path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error fetching file {file_path}: {e}")
            return None
    
    async def get_file_content_raw(self, file_path: str) -> Optional[str]:
        """Fetch raw file content directly from GitHub.
        
        Args:
            file_path: Path to the file in the repository
            
        Returns:
            Raw file content as string, or None if not found
        """
        url = f"https://raw.githubusercontent.com/{self.owner}/{self.repo}/{self.branch}/{file_path}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers={"Authorization": f"Bearer {self.api_key}"})
                
                if response.status_code == 404:
                    logger.warning(f"Raw file not found: {file_path}")
                    return None
                
                response.raise_for_status()
                return response.text
                
        except Exception as e:
            logger.error(f"Error fetching raw file {file_path}: {e}")
            return None
    
    async def test_connection(self) -> bool:
        """Test connection to GitHub and verify repository access.
        
        Returns:
            True if connection successful and repo accessible
            
        Raises:
            Exception with specific error details if connection fails
        """
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self.headers)
                
                if response.status_code == 401:
                    raise Exception(f"Authentication failed (401): Invalid or expired GitHub API key. Please check your Personal Access Token.")
                elif response.status_code == 403:
                    error_msg = "Access forbidden (403): "
                    try:
                        error_data = response.json()
                        if "rate limit" in str(error_data).lower():
                            error_msg += "GitHub API rate limit exceeded. Please wait or use a different token."
                        else:
                            error_msg += error_data.get("message", "You don't have permission to access this repository.")
                    except:
                        error_msg += "You don't have permission to access this repository. Check token scopes."
                    raise Exception(error_msg)
                elif response.status_code == 404:
                    raise Exception(f"Repository not found (404): '{self.owner}/{self.repo}' does not exist or is not accessible with the provided token.")
                
                response.raise_for_status()
                
                # Also verify branch exists
                branch_url = f"{self.base_url}/repos/{self.owner}/{self.repo}/branches/{self.branch}"
                branch_response = await client.get(branch_url, headers=self.headers)
                if branch_response.status_code == 404:
                    raise Exception(f"Branch not found (404): Branch '{self.branch}' does not exist in repository '{self.owner}/{self.repo}'.")
                
                return True
                
        except httpx.ConnectError as e:
            raise Exception(f"Connection error: Unable to connect to GitHub API. Please check your network connection. Details: {str(e)}")
        except httpx.TimeoutException as e:
            raise Exception(f"Connection timeout: GitHub API did not respond within 30 seconds. Please try again.")
        except httpx.HTTPStatusError as e:
            raise Exception(f"HTTP error {e.response.status_code}: {e.response.text[:200] if e.response.text else 'Unknown error'}")
        except Exception as e:
            if "Authentication failed" in str(e) or "Access forbidden" in str(e) or "not found" in str(e) or "Connection" in str(e):
                raise  # Re-raise our custom exceptions
            logger.error(f"GitHub connection test failed: {e}")
            raise Exception(f"GitHub connection failed: {str(e)}")
    
    def get_code_snippet(self, content: str, line_number: int, context_lines: int = 10) -> str:
        """Extract a code snippet around a specific line.
        
        Args:
            content: Full file content
            line_number: Target line number (1-indexed)
            context_lines: Number of lines to include before and after
            
        Returns:
            Code snippet with line numbers
        """
        lines = content.split('\n')
        start_line = max(0, line_number - context_lines - 1)
        end_line = min(len(lines), line_number + context_lines)
        
        snippet_lines = []
        for i, line in enumerate(lines[start_line:end_line], start=start_line + 1):
            marker = ">>>" if i == line_number else "   "
            snippet_lines.append(f"{marker} {i:4d} | {line}")
        
        return '\n'.join(snippet_lines)
