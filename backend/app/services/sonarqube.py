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
    
    async def search_projects(self, query: str) -> List[Dict[str, Any]]:
        """Search for projects by name or key.
        
        Args:
            query: Search query (project name or partial key)
            
        Returns:
            List of matching projects with key, name, and other details
        """
        url = f"{self.base_url}/api/projects/search"
        params = {
            "q": query,
            "ps": 50  # Return up to 50 matching projects
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            return data.get("components", [])
    
    async def get_project_by_name(self, project_name: str) -> Optional[Dict[str, Any]]:
        """Get a project by its exact name.
        
        Args:
            project_name: The exact project name to find
            
        Returns:
            Project dict with key, name, etc. or None if not found
        """
        projects = await self.search_projects(project_name)
        
        # Look for exact name match first
        for project in projects:
            if project.get("name", "").lower() == project_name.lower():
                return project
        
        # If no exact match, return first result if query matches closely
        if projects:
            # Check if the name contains the search query
            for project in projects:
                if project_name.lower() in project.get("name", "").lower():
                    return project
        
        return None
    
    async def resolve_project_key(
        self, 
        project_key: Optional[str] = None, 
        project_name: Optional[str] = None
    ) -> Optional[str]:
        """Resolve a project key from either a key or name.
        
        Args:
            project_key: Direct project key (used if provided)
            project_name: Project name to look up
            
        Returns:
            The resolved project key, or None if not found
        """
        if project_key:
            return project_key
        
        if project_name:
            project = await self.get_project_by_name(project_name)
            if project:
                resolved_key = project.get("key")
                logger.info(f"Resolved project name '{project_name}' to key '{resolved_key}'")
                return resolved_key
            else:
                logger.warning(f"Could not find project with name '{project_name}'")
                return None
        
        return None
    
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
    
    async def test_connection(self, project_key: Optional[str] = None, project_name: Optional[str] = None) -> dict:
        """Test connection to SonarQube and verify project exists.
        
        Args:
            project_key: The SonarQube project key (optional if project_name provided)
            project_name: The SonarQube project name to resolve (optional if project_key provided)
            
        Returns:
            Dict with success status and resolved project key
            
        Raises:
            Exception with specific error details if connection fails
        """
        resolved_key = None
        resolution_info = None
        
        # First, test basic authentication by trying to access the API
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Test authentication first with a simple API call
                auth_url = f"{self.base_url}/api/authentication/validate"
                auth_response = await client.get(auth_url, headers=self.headers)
                
                if auth_response.status_code == 401:
                    raise Exception("Authentication failed (401): Invalid or expired SonarQube API token. Please generate a new token in User > My Account > Security.")
                
                # Resolve project key from name if needed
                if project_key:
                    resolved_key = project_key
                    resolution_info = f"Using provided project key: '{project_key}'"
                elif project_name:
                    # Try to resolve project name to key
                    project = await self.get_project_by_name(project_name)
                    if project:
                        resolved_key = project.get("key")
                        resolution_info = f"Resolved project name '{project_name}' to key '{resolved_key}'"
                    else:
                        raise Exception(f"Project not found: Could not find a project with name '{project_name}'. Please verify the project name is correct or use the project key instead.")
                else:
                    raise Exception("No project identifier provided: Please provide either a project key or project name.")
                
                # Now verify the project exists and is accessible
                url = f"{self.base_url}/api/issues/search"
                params = {
                    "componentKeys": resolved_key,
                    "types": "VULNERABILITY",
                    "p": 1,
                    "ps": 1
                }
                
                response = await client.get(url, headers=self.headers, params=params)
                
                if response.status_code == 401:
                    raise Exception("Authentication failed (401): Invalid or expired SonarQube API token. Please generate a new token in User > My Account > Security.")
                elif response.status_code == 403:
                    try:
                        error_data = response.json()
                        error_msg = error_data.get("errors", [{}])[0].get("msg", "Access denied")
                    except:
                        error_msg = "Access denied"
                    raise Exception(f"Access forbidden (403): {error_msg}. Check that your token has the required permissions.")
                elif response.status_code == 404:
                    raise Exception(f"Project not found (404): Project key '{resolved_key}' does not exist or you don't have access to it.")
                
                response.raise_for_status()
                
                # Check if the project actually exists in the response
                data = response.json()
                # If we get an empty result, the project might not exist - do additional verification
                if data.get("total", 0) == 0 and data.get("issues", []) == []:
                    # Try to verify project exists by checking project API
                    project_url = f"{self.base_url}/api/projects/search"
                    project_params = {"q": resolved_key}
                    project_response = await client.get(project_url, headers=self.headers, params=project_params)
                    if project_response.status_code == 200:
                        project_data = project_response.json()
                        components = project_data.get("components", [])
                        project_exists = any(c.get("key") == resolved_key for c in components)
                        if not project_exists:
                            raise Exception(f"Project not found: No project with key '{resolved_key}' was found. Please verify the project key is correct.")
                
                return {
                    "success": True,
                    "resolved_key": resolved_key,
                    "resolution_info": resolution_info
                }
                
        except httpx.ConnectError as e:
            raise Exception(f"Connection error: Unable to connect to SonarQube at '{self.base_url}'. Please check the URL and your network connection. Details: {str(e)}")
        except httpx.TimeoutException as e:
            raise Exception(f"Connection timeout: SonarQube at '{self.base_url}' did not respond within 30 seconds. Please check if the server is running.")
        except httpx.HTTPStatusError as e:
            try:
                error_data = e.response.json()
                error_msg = error_data.get("errors", [{}])[0].get("msg", str(e))
            except:
                error_msg = e.response.text[:200] if e.response.text else str(e)
            raise Exception(f"HTTP error {e.response.status_code}: {error_msg}")
        except Exception as e:
            if "Authentication failed" in str(e) or "Access forbidden" in str(e) or "not found" in str(e) or "Connection" in str(e) or "No project identifier" in str(e):
                raise  # Re-raise our custom exceptions
            logger.error(f"SonarQube connection test failed: {e}")
            raise Exception(f"SonarQube connection failed: {str(e)}")
