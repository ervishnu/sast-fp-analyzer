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
    
    async def fetch_security_hotspots(
        self,
        project_key: str,
        page: int = 1,
        page_size: int = 500,
        status: str = "TO_REVIEW"
    ) -> Dict[str, Any]:
        """Fetch security hotspots from SonarQube.
        
        Security hotspots use a different API endpoint than regular issues.
        
        Args:
            project_key: The SonarQube project key
            page: Page number (1-indexed)
            page_size: Number of results per page (max 500)
            status: Status filter (TO_REVIEW, ACKNOWLEDGED, FIXED, SAFE)
            
        Returns:
            Dict containing hotspots and pagination info
        """
        url = f"{self.base_url}/api/hotspots/search"
        params = {
            "projectKey": project_key,
            "p": page,
            "ps": min(page_size, 500),
            "status": status
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
    
    async def fetch_all_security_hotspots(self, project_key: str) -> List[Dict[str, Any]]:
        """Fetch all security hotspots from SonarQube with pagination.
        
        Args:
            project_key: The SonarQube project key
            
        Returns:
            List of all security hotspot issues
        """
        all_hotspots = []
        page = 1
        page_size = 500
        
        while True:
            try:
                data = await self.fetch_security_hotspots(project_key, page, page_size)
                hotspots = data.get("hotspots", [])
                
                # Transform hotspots to match vulnerability format
                for hotspot in hotspots:
                    transformed = {
                        "key": hotspot.get("key"),
                        "rule": hotspot.get("ruleKey") or hotspot.get("securityCategory"),
                        "severity": self._map_vulnerability_probability(hotspot.get("vulnerabilityProbability")),
                        "message": hotspot.get("message"),
                        "line": hotspot.get("line"),
                        "type": "SECURITY_HOTSPOT",
                        "issue_type": "SECURITY_HOTSPOT",
                        "status": hotspot.get("status"),
                        "component": hotspot.get("component"),
                        "securityCategory": hotspot.get("securityCategory"),
                        "security_category": hotspot.get("securityCategory"),
                        "vulnerabilityProbability": hotspot.get("vulnerabilityProbability"),
                        "flows": []
                    }
                    all_hotspots.append(transformed)
                
                paging = data.get("paging", {})
                total = paging.get("total", 0)
                current_page = paging.get("pageIndex", page)
                ps = paging.get("pageSize", page_size)
                
                if current_page * ps >= total:
                    break
                
                page += 1
            except httpx.HTTPStatusError as e:
                # Security hotspots API may not be available in all SonarQube versions
                if e.response.status_code == 404:
                    logger.warning("Security hotspots API not available")
                    break
                raise
        
        logger.info(f"Fetched {len(all_hotspots)} security hotspots from project {project_key}")
        return all_hotspots
    
    def _map_vulnerability_probability(self, probability: str) -> str:
        """Map security hotspot vulnerability probability to severity.
        
        Args:
            probability: Vulnerability probability (HIGH, MEDIUM, LOW)
            
        Returns:
            Mapped severity string
        """
        mapping = {
            "HIGH": "CRITICAL",
            "MEDIUM": "MAJOR",
            "LOW": "MINOR"
        }
        return mapping.get(probability, "INFO")
    
    async def fetch_all_vulnerabilities(
        self, 
        project_key: str,
        include_hotspots: bool = True
    ) -> List[Dict[str, Any]]:
        """Fetch all vulnerabilities and optionally security hotspots from SonarQube.
        
        Args:
            project_key: The SonarQube project key
            include_hotspots: Whether to also fetch security hotspots
            
        Returns:
            List of all vulnerability and hotspot issues
        """
        all_issues = []
        page = 1
        page_size = 500
        
        # Fetch regular vulnerabilities
        while True:
            data = await self.fetch_vulnerabilities(project_key, page, page_size)
            issues = data.get("issues", [])
            
            # Add issue_type to each vulnerability
            for issue in issues:
                issue["issue_type"] = "VULNERABILITY"
            
            all_issues.extend(issues)
            
            total = data.get("total", 0)
            paging = data.get("paging", {})
            current_page = paging.get("pageIndex", page)
            ps = paging.get("pageSize", page_size)
            
            if current_page * ps >= total:
                break
            
            page += 1
        
        logger.info(f"Fetched {len(all_issues)} vulnerabilities from project {project_key}")
        
        # Optionally fetch security hotspots
        if include_hotspots:
            try:
                hotspots = await self.fetch_all_security_hotspots(project_key)
                all_issues.extend(hotspots)
                logger.info(f"Total issues (vulnerabilities + hotspots): {len(all_issues)}")
            except Exception as e:
                logger.warning(f"Failed to fetch security hotspots: {e}")
        
        return all_issues
    
    def group_vulnerabilities_by_file(self, issues: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group vulnerabilities and security hotspots by file path.
        
        Args:
            issues: List of vulnerability/hotspot issues from SonarQube
            
        Returns:
            Dict mapping file paths to lists of vulnerabilities
        """
        grouped = {}
        
        for issue in issues:
            raw_component = issue.get("component", "")
            # Extract file path from component (format: project:path/to/file.java)
            file_path = raw_component.split(":", 1)[1] if ":" in raw_component else raw_component
            
            # Skip if no valid file path
            if not file_path:
                continue
            
            if file_path not in grouped:
                grouped[file_path] = []
            
            # Handle both regular vulnerabilities and security hotspots
            issue_type = issue.get("type", "VULNERABILITY")
            
            vulnerability_info = {
                "key": issue.get("key"),
                "rule": issue.get("rule"),
                "severity": issue.get("severity"),
                "message": issue.get("message"),
                "line": issue.get("line"),
                "type": issue_type,
                "status": issue.get("status"),
                "flows": issue.get("flows", [])
            }
            
            # Add security hotspot specific fields
            if issue_type == "SECURITY_HOTSPOT":
                vulnerability_info["securityCategory"] = issue.get("securityCategory")
                vulnerability_info["vulnerabilityProbability"] = issue.get("vulnerabilityProbability")
            
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
