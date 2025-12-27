# SAST False Positive Analyzer

AI-powered SAST (Static Application Security Testing) false positive analyzer. This application integrates with SonarQube/SonarCloud to fetch vulnerabilities and security hotspots, retrieves source code from GitHub, and uses LLM (Large Language Models) to analyze whether findings are true positives, false positives, or need human review.

## Features

### Core Capabilities
- 🔍 **SonarQube Integration**: Fetch vulnerabilities and security hotspots from SonarQube/SonarCloud
- 📂 **GitHub Integration**: Automatically retrieve source code context for analysis
- 🤖 **AI-Powered Analysis**: Use LM Studio or OpenAI-compatible APIs for vulnerability triage
- 📊 **Interactive Dashboard**: Visual statistics with charts and reports
- 💾 **PostgreSQL Storage**: Persistent storage for configurations and results
- 🐳 **Docker Deployment**: Easy deployment with Docker Compose

### Advanced Features
- 🔐 **Security Hotspots**: Analyze both vulnerabilities and security hotspots (not just issues)
- ⏸️ **Scan Control**: Pause, resume, and stop scans in progress with real-time status
- 📝 **Project Name Resolution**: Enter project names instead of keys - automatic resolution
- 🎨 **Default Settings**: Configure global defaults inherited by all configurations
- 🧪 **Connection Testing**: Test integrations with detailed error diagnostics and stack traces
- 📈 **Progress Tracking**: Real-time scan progress with processed/total vulnerability counts
- 🌙 **Dark Theme UI**: Professional security-focused dark interface

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Frontend     │────▶│    Backend      │────▶│   PostgreSQL    │
│    (React)      │     │   (FastAPI)     │     │                 │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
            ┌───────────┐ ┌───────────┐ ┌───────────┐
            │ SonarQube │ │  GitHub   │ │ LM Studio │
            │           │ │           │ │ / OpenAI  │
            └───────────┘ └───────────┘ └───────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- For local LLM: [LM Studio](https://lmstudio.ai/) running on your machine
- SonarQube/SonarCloud API token
- GitHub Personal Access Token

### 1. Clone and Configure

```bash
# Clone the repository
cd sast-fp-analyzer

# Copy the example environment file
cp .env.example .env

# Edit .env with your settings (optional - can be configured in UI)
```

### 2. Start the Application

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Configuration Guide

### Setting up LM Studio

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Download a suitable model (recommended: CodeLlama, Mistral, or similar)
3. Start the local server (default: http://localhost:1234)
4. In the app, configure:
   - **LLM URL**: `http://host.docker.internal:1234/v1` (for Docker)
   - **Model Name**: Use the model name shown in LM Studio

### Setting up SonarQube

1. Go to SonarQube/SonarCloud → User → My Account → Security
2. Generate a token with appropriate permissions
3. In the app, configure:
   - **SonarQube URL**: e.g., `https://sonarcloud.io` or your self-hosted URL
   - **Project Key** or **Project Name**: Either the exact project key OR the project name (will be resolved automatically)
   - **API Token**: The generated token

> **Note**: You can provide either a project key or project name. If you provide a name, the app will search SonarQube and automatically resolve it to the correct project key.

### Setting up GitHub

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate a token with `repo` scope
3. In the app, configure:
   - **Owner**: Repository owner (username or organization)
   - **Repository**: Repository name
   - **Branch**: Branch to fetch code from (default: main)
   - **API Token**: The generated PAT

## Usage

### 1. Configure Default Settings (Optional)

Navigate to **Settings** → **Default Settings** to configure global defaults:
- LLM URL and model (shared across configurations)
- SonarQube URL and API key
- GitHub owner and API key

These defaults are inherited by all configurations, reducing repetitive setup.

### 2. Create a Configuration

Navigate to **Configurations** → **New Configuration** and fill in:
- Configuration name
- LLM settings (or use defaults)
- SonarQube settings (project key or name required)
- GitHub settings (repository and branch required)

Fields with "Has Default" chip will use the default value if left empty.

### 3. Test the Configuration

Click **Test** to verify all connections are working properly. The test dialog shows:
- ✅ Success status with connection details
- ❌ Error details with full stack traces for debugging
- Automatic project key resolution info

### 4. Run a Scan

Click **Run Scan** to start the analysis. The scan will:
1. Fetch vulnerabilities from SonarQube
2. Fetch security hotspots from SonarQube
3. Group findings by file
4. Fetch source code from GitHub
5. Analyze each file with the LLM
6. Store results in the database

**Scan Controls:**
- ⏸️ **Pause**: Temporarily pause the scan (can resume later)
- ▶️ **Resume**: Continue a paused scan
- ⏹️ **Stop**: Permanently stop the scan (cannot resume)

### 5. View Results

Navigate to **Scans** to see all scan results. Click on a scan to view:
- Summary statistics (pie charts, severity distribution)
- Individual vulnerability analyses
- Triage decisions with explanations (True Positive, False Positive, Needs Review)
- AI-generated fix suggestions
- Security hotspot analysis results

## API Endpoints

### Configurations
- `GET /api/configurations/` - List all configurations
- `POST /api/configurations/` - Create configuration
- `GET /api/configurations/{id}` - Get configuration
- `GET /api/configurations/{id}/merged` - Get configuration with defaults merged
- `PUT /api/configurations/{id}` - Update configuration
- `DELETE /api/configurations/{id}` - Delete configuration
- `POST /api/configurations/{id}/test` - Test configuration connections (with detailed error info)

### Default Settings
- `GET /api/defaults` - Get current default settings
- `PUT /api/defaults` - Update default settings
- `DELETE /api/defaults` - Clear all default settings

### Scans
- `GET /api/scans/` - List all scans
- `POST /api/scans/` - Start a new scan
- `GET /api/scans/{id}` - Get scan details with analyses
- `GET /api/scans/{id}/status` - Get scan progress
- `POST /api/scans/{id}/pause` - Pause a running scan
- `POST /api/scans/{id}/resume` - Resume a paused scan
- `POST /api/scans/{id}/stop` - Stop a scan permanently
- `DELETE /api/scans/{id}` - Delete scan

### Dashboard
- `GET /api/dashboard/statistics` - Get dashboard statistics
- `GET /api/dashboard/vulnerabilities/by-triage` - Get triage distribution
- `GET /api/dashboard/vulnerabilities/by-severity` - Get severity distribution

## Development

### Running Locally (without Docker)

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sast_analyzer

# Run the server
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set API URL
export REACT_APP_API_URL=http://localhost:8000/api

# Run the development server
npm start
```

### Project Structure

```
sast-fp-analyzer/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py          # Application configuration
│   │   ├── database.py        # Database connection
│   │   ├── main.py            # FastAPI application
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── migrations/        # Database migrations
│   │   │   └── add_security_hotspot_fields.py
│   │   ├── routes/
│   │   │   ├── configurations.py  # Configuration CRUD + testing
│   │   │   ├── defaults.py        # Default settings management
│   │   │   ├── scans.py           # Scan execution + controls
│   │   │   └── dashboard.py       # Statistics endpoints
│   │   └── services/
│   │       ├── sonarqube.py   # SonarQube API client (vulnerabilities + hotspots)
│   │       ├── github.py      # GitHub API client
│   │       └── llm.py         # LLM integration
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api.js             # API client
│   │   ├── App.js             # Main React app with routing
│   │   ├── index.js           # Entry point with dark theme
│   │   ├── components/
│   │   │   └── Layout.js      # App layout with navigation
│   │   └── pages/
│   │       ├── Dashboard.js       # Statistics dashboard
│   │       ├── Configurations.js  # Configuration list
│   │       ├── ConfigurationForm.js  # Create/edit configuration
│   │       ├── DefaultSettings.js # Global defaults management
│   │       ├── Scans.js          # Scan list
│   │       └── ScanDetail.js     # Scan results viewer
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

## Troubleshooting

### LLM Connection Issues

- Ensure LM Studio is running and the local server is started
- For Docker, use `host.docker.internal` instead of `localhost`
- Check if the model is loaded in LM Studio
- Test connection shows detailed error messages and stack traces

### SonarQube Connection Issues

- Verify the API token has the correct permissions
- You can use either project key OR project name (auto-resolved)
- Check if the SonarQube URL is accessible
- Use the Test button to see detailed error diagnostics

### GitHub Connection Issues

- Ensure the PAT has `repo` scope
- Verify the repository exists and is accessible
- Check if the branch name is correct
- GitHub owner can be set in defaults for all configurations

### Scan Issues

- **Stuck Scans**: Use the Stop button to terminate stuck scans
- **Paused Scans**: Resume or stop paused scans from the scan detail page
- **Missing Hotspots**: Ensure your SonarQube token has access to security hotspots

### Database Issues

```bash
# Reset the database
docker-compose down -v
docker-compose up -d --build
```

## Screenshots

### Dark Theme Interface
The application features a professional dark security-focused theme with:
- Cyan primary color (`#00d4ff`) for actions and highlights
- Purple secondary color (`#7c4dff`) for accents
- Dark backgrounds optimized for security operations
- High contrast text for readability

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

### Latest Updates
- **Security Hotspots Support**: Analyze SonarQube security hotspots alongside vulnerabilities
- **Scan Control**: Pause, resume, and stop scans in progress
- **Default Settings**: Global configuration defaults inherited by all projects
- **Project Name Resolution**: Enter project names instead of keys
- **Enhanced Testing**: Detailed error diagnostics with stack traces
- **Dark Theme**: Professional security-focused UI design
- **Progress Tracking**: Real-time scan progress with counts
