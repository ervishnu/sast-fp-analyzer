# SAST False Positive Analyzer

AI-powered SAST (Static Application Security Testing) false positive analyzer. This application integrates with SonarQube/SonarCloud to fetch vulnerabilities, retrieves source code from GitHub, and uses LLM (Large Language Models) to analyze whether vulnerabilities are true positives, false positives, or need human review.

## Features

- 🔍 **SonarQube Integration**: Fetch vulnerabilities from SonarQube/SonarCloud
- 📂 **GitHub Integration**: Automatically retrieve source code for analysis
- 🤖 **AI-Powered Analysis**: Use LM Studio or OpenAI-compatible APIs for vulnerability triage
- 📊 **Dashboard**: Visual statistics and reports
- 💾 **PostgreSQL Storage**: Persistent storage for configurations and results
- 🐳 **Docker Deployment**: Easy deployment with Docker Compose

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
   - **Project Key**: Your SonarQube project key
   - **API Token**: The generated token

### Setting up GitHub

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate a token with `repo` scope
3. In the app, configure:
   - **Owner**: Repository owner (username or organization)
   - **Repository**: Repository name
   - **Branch**: Branch to fetch code from (default: main)
   - **API Token**: The generated PAT

## Usage

### 1. Create a Configuration

Navigate to **Configurations** → **New Configuration** and fill in:
- Configuration name
- LLM settings (LM Studio URL, model name)
- SonarQube settings (URL, project key, API token)
- GitHub settings (owner, repo, branch, PAT)

### 2. Test the Configuration

Click **Test** to verify all connections are working properly.

### 3. Run a Scan

Click **Run Scan** to start the analysis. The scan will:
1. Fetch vulnerabilities from SonarQube
2. Group them by file
3. Fetch source code from GitHub
4. Analyze each file with the LLM
5. Store results in the database

### 4. View Results

Navigate to **Scans** to see all scan results. Click on a scan to view:
- Summary statistics
- Individual vulnerability analyses
- Triage decisions with explanations
- Fix suggestions

## API Endpoints

### Configurations
- `GET /api/configurations/` - List all configurations
- `POST /api/configurations/` - Create configuration
- `GET /api/configurations/{id}` - Get configuration
- `PUT /api/configurations/{id}` - Update configuration
- `DELETE /api/configurations/{id}` - Delete configuration
- `POST /api/configurations/{id}/test` - Test configuration connections

### Scans
- `GET /api/scans/` - List all scans
- `POST /api/scans/` - Start a new scan
- `GET /api/scans/{id}` - Get scan details with analyses
- `GET /api/scans/{id}/status` - Get scan progress
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
│   │   ├── routes/
│   │   │   ├── configurations.py
│   │   │   ├── scans.py
│   │   │   └── dashboard.py
│   │   └── services/
│   │       ├── sonarqube.py   # SonarQube API client
│   │       ├── github.py      # GitHub API client
│   │       └── llm.py         # LLM integration
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api.js             # API client
│   │   ├── App.js             # Main React app
│   │   ├── components/
│   │   │   └── Layout.js
│   │   └── pages/
│   │       ├── Dashboard.js
│   │       ├── Configurations.js
│   │       ├── ConfigurationForm.js
│   │       ├── Scans.js
│   │       └── ScanDetail.js
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

### SonarQube Connection Issues

- Verify the API token has the correct permissions
- Ensure the project key matches exactly
- Check if the SonarQube URL is accessible

### GitHub Connection Issues

- Ensure the PAT has `repo` scope
- Verify the repository exists and is accessible
- Check if the branch name is correct

### Database Issues

```bash
# Reset the database
docker-compose down -v
docker-compose up -d --build
```

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
