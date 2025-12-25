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
        """
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"GitHub connection test failed: {e}")
            return False
    
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
