"""SonarQube/SonarCloud API service."""
import httpx
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)


class SonarQubeService:
    """Service for interacting with SonarQube/SonarCloud API."""
    
    def __init__(self, base_url: str, api_key: str):
        """Initialize SonarQube service.
        
        Args:
            base_url: SonarQube/SonarCloud base URL
            api_key: API token for authentication
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json"
        }
    
    async def fetch_vulnerabilities(
        self, 
        project_key: str, 
        page: int = 1, 
        page_size: int = 500,
        types: str = "VULNERABILITY"
    ) -> Dict[str, Any]:
        """Fetch vulnerabilities from SonarQube.
        
        Args:
            project_key: The SonarQube project key
            page: Page number (1-indexed)
            page_size: Number of results per page (max 500)
            types: Issue types to fetch
            
        Returns:
            Dict containing issues and pagination info
        """
        url = f"{self.base_url}/api/issues/search"
        params = {
            "componentKeys": project_key,
            "types": types,
            "p": page,
            "ps": min(page_size, 500)
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
    
    async def fetch_all_vulnerabilities(self, project_key: str) -> List[Dict[str, Any]]:
        """Fetch all vulnerabilities from SonarQube with pagination.
        
        Args:
            project_key: The SonarQube project key
            
        Returns:
            List of all vulnerability issues
        """
        all_issues = []
        page = 1
        page_size = 500
        
        while True:
            data = await self.fetch_vulnerabilities(project_key, page, page_size)
            issues = data.get("issues", [])
            all_issues.extend(issues)
            
            total = data.get("total", 0)
            paging = data.get("paging", {})
            current_page = paging.get("pageIndex", page)
            ps = paging.get("pageSize", page_size)
            
            if current_page * ps >= total:
                break
            
            page += 1
        
        logger.info(f"Fetched {len(all_issues)} vulnerabilities from project {project_key}")
        return all_issues
    
    def group_vulnerabilities_by_file(self, issues: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group vulnerabilities by file path.
        
        Args:
            issues: List of vulnerability issues from SonarQube
            
        Returns:
            Dict mapping file paths to lists of vulnerabilities
        """
        grouped = {}
        
        for issue in issues:
            raw_component = issue.get("component", "")
            # Extract file path from component (format: project:path/to/file.java)
            file_path = raw_component.split(":", 1)[1] if ":" in raw_component else raw_component
            
            if file_path not in grouped:
                grouped[file_path] = []
            
            vulnerability_info = {
                "key": issue.get("key"),
                "rule": issue.get("rule"),
                "severity": issue.get("severity"),
                "message": issue.get("message"),
                "line": issue.get("line"),
                "type": issue.get("type"),
                "status": issue.get("status"),
                "flows": issue.get("flows", [])
            }
            
            # Extract flow locations if available
            locations = []
            for flow in issue.get("flows", []):
                for loc in flow.get("locations", []):
                    text_range = loc.get("textRange", {})
                    if text_range.get("startLine"):
                        locations.append({
                            "line": text_range.get("startLine"),
                            "message": loc.get("msg", "")
                        })
            
            if locations:
                vulnerability_info["locations"] = locations
            
            grouped[file_path].append(vulnerability_info)
        
        return grouped
    
    async def test_connection(self, project_key: str) -> bool:
        """Test connection to SonarQube and verify project exists.
        
        Args:
            project_key: The SonarQube project key
            
        Returns:
            True if connection successful and project exists
        """
        try:
            data = await self.fetch_vulnerabilities(project_key, page=1, page_size=1)
            return True
        except Exception as e:
            logger.error(f"SonarQube connection test failed: {e}")
            return False
