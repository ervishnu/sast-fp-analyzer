import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import { 
  Save as SaveIcon, 
  ArrowBack as BackIcon, 
  Info as InfoIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { configurationApi } from '../api';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function ConfigurationForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    llm_url: '',
    llm_model: '',
    llm_api_key: '',
    sonarqube_url: '',
    sonarqube_api_key: '',
    sonarqube_project_key: '',
    github_owner: '',
    github_repo: '',
    github_api_key: '',
    github_branch: 'main',
  });

  useEffect(() => {
    loadDefaults();
    if (isEditing) {
      loadConfiguration();
    }
  }, [id]);

  const loadDefaults = async () => {
    try {
      const response = await axios.get(`${API_URL}/defaults`);
      setDefaults(response.data);
    } catch (err) {
      console.error('Error loading defaults:', err);
    }
  };

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await configurationApi.get(id);
      setFormData({
        ...response.data,
        llm_url: response.data.llm_url || '',
        llm_model: response.data.llm_model || '',
        llm_api_key: response.data.llm_api_key || '',
        sonarqube_url: response.data.sonarqube_url || '',
        sonarqube_api_key: response.data.sonarqube_api_key || '',
        github_owner: response.data.github_owner || '',
        github_api_key: response.data.github_api_key || '',
        github_branch: response.data.github_branch || 'main',
      });
    } catch (err) {
      console.error('Error loading configuration:', err);
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Convert empty strings to null for optional fields
      const submitData = {
        ...formData,
        llm_url: formData.llm_url || null,
        llm_model: formData.llm_model || null,
        llm_api_key: formData.llm_api_key || null,
        sonarqube_url: formData.sonarqube_url || null,
        sonarqube_api_key: formData.sonarqube_api_key || null,
        github_owner: formData.github_owner || null,
        github_api_key: formData.github_api_key || null,
      };
      
      if (isEditing) {
        await configurationApi.update(id, submitData);
      } else {
        await configurationApi.create(submitData);
      }
      navigate('/configurations');
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError(err.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const getDefaultValue = (field) => {
    if (!defaults) return null;
    return defaults[field];
  };

  const DefaultChip = ({ field }) => {
    const defaultValue = getDefaultValue(field);
    if (!defaultValue) return null;
    return (
      <Tooltip title={`Default: ${field.includes('key') ? '••••••••' : defaultValue}`}>
        <Chip
          size="small"
          label="Has Default"
          color="info"
          variant="outlined"
          sx={{ ml: 1 }}
        />
      </Tooltip>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/configurations')}>
          Back
        </Button>
        <Typography variant="h4">
          {isEditing ? 'Edit Configuration' : 'New Configuration'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {defaults && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Fields marked with <Chip size="small" label="Has Default" color="info" variant="outlined" sx={{ mx: 0.5 }} /> 
            will use default settings if left empty. Configure defaults in the <strong>Default Settings</strong> page.
          </Typography>
        </Alert>
      )}

      {/* Effective Settings Summary - Shows what will actually be used */}
      {defaults && (
        <Card sx={{ mb: 3, backgroundColor: '#e3f2fd' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Effective Settings (What Will Be Used)
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              This shows the actual values that will be used when running a scan. 
              <Chip size="small" label="Config" color="primary" variant="outlined" sx={{ mx: 0.5 }} /> = from this configuration,
              <Chip size="small" label="Default" color="secondary" variant="outlined" sx={{ mx: 0.5 }} /> = from default settings.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    LLM Settings
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0 }}>URL:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {formData.llm_url ? (
                            <Chip size="small" label={formData.llm_url} color="primary" variant="outlined" title="From Config" />
                          ) : defaults.llm_url ? (
                            <Chip size="small" label={defaults.llm_url} color="secondary" variant="outlined" title="From Default" />
                          ) : (
                            <Chip size="small" label="Not Set" color="error" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0 }}>Model:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {formData.llm_model ? (
                            <Chip size="small" label={formData.llm_model} color="primary" variant="outlined" />
                          ) : defaults.llm_model ? (
                            <Chip size="small" label={defaults.llm_model} color="secondary" variant="outlined" />
                          ) : (
                            <Chip size="small" label="Not Set" color="error" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0 }}>API Key:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {formData.llm_api_key ? (
                            <Chip size="small" icon={<CheckIcon />} label="Config" color="primary" variant="outlined" />
                          ) : defaults.llm_api_key ? (
                            <Chip size="small" icon={<CheckIcon />} label="Default" color="secondary" variant="outlined" />
                          ) : (
                            <Chip size="small" label="Not Set" color="default" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    SonarQube Settings
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0 }}>URL:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {formData.sonarqube_url ? (
                            <Chip size="small" label={formData.sonarqube_url} color="primary" variant="outlined" />
                          ) : defaults.sonarqube_url ? (
                            <Chip size="small" label={defaults.sonarqube_url} color="secondary" variant="outlined" />
                          ) : (
                            <Chip size="small" label="sonarcloud.io" color="default" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0 }}>Project:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {formData.sonarqube_project_key ? (
                            <Chip size="small" label={formData.sonarqube_project_key} color="primary" variant="outlined" />
                          ) : (
                            <Chip size="small" label="Required" color="error" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0 }}>API Key:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {formData.sonarqube_api_key ? (
                            <Chip size="small" icon={<CheckIcon />} label="Config" color="primary" variant="outlined" />
                          ) : defaults.sonarqube_api_key ? (
                            <Chip size="small" icon={<CheckIcon />} label="Default" color="secondary" variant="outlined" />
                          ) : (
                            <Chip size="small" label="Not Set" color="error" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    GitHub Settings
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0 }}>Owner:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {formData.github_owner ? (
                            <Chip size="small" label={formData.github_owner} color="primary" variant="outlined" />
                          ) : defaults.github_owner ? (
                            <Chip size="small" label={defaults.github_owner} color="secondary" variant="outlined" />
                          ) : (
                            <Chip size="small" label="Not Set" color="error" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0 }}>Repo:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {formData.github_repo ? (
                            <Chip size="small" label={formData.github_repo} color="primary" variant="outlined" />
                          ) : (
                            <Chip size="small" label="Required" color="error" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0 }}>API Key:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {formData.github_api_key ? (
                            <Chip size="small" icon={<CheckIcon />} label="Config" color="primary" variant="outlined" />
                          ) : defaults.github_api_key ? (
                            <Chip size="small" icon={<CheckIcon />} label="Default" color="secondary" variant="outlined" />
                          ) : (
                            <Chip size="small" label="Not Set" color="error" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              General Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Configuration Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., My Project Analysis"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">LLM Settings</Typography>
              <DefaultChip field="llm_url" />
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Configure the AI model for vulnerability analysis. Leave empty to use default settings.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={<>LLM API URL <DefaultChip field="llm_url" /></>}
                  name="llm_url"
                  value={formData.llm_url}
                  onChange={handleChange}
                  placeholder={getDefaultValue('llm_url') || "http://localhost:1234/v1"}
                  helperText={getDefaultValue('llm_url') ? `Default: ${getDefaultValue('llm_url')}` : "For LM Studio, use http://localhost:1234/v1"}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={<>Model Name <DefaultChip field="llm_model" /></>}
                  name="llm_model"
                  value={formData.llm_model}
                  onChange={handleChange}
                  placeholder={getDefaultValue('llm_model') || "lm-studio"}
                  helperText={getDefaultValue('llm_model') ? `Default: ${getDefaultValue('llm_model')}` : "The model identifier to use"}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={<>LLM API Key <DefaultChip field="llm_api_key" /></>}
                  name="llm_api_key"
                  type="password"
                  value={formData.llm_api_key}
                  onChange={handleChange}
                  helperText={getDefaultValue('llm_api_key') ? "Has default value set" : "Optional - leave empty for local LM Studio"}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">SonarQube Settings</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Configure the SonarQube/SonarCloud connection. Project Key is required.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={<>SonarQube URL <DefaultChip field="sonarqube_url" /></>}
                  name="sonarqube_url"
                  value={formData.sonarqube_url}
                  onChange={handleChange}
                  placeholder={getDefaultValue('sonarqube_url') || "https://sonarcloud.io"}
                  helperText={getDefaultValue('sonarqube_url') ? `Default: ${getDefaultValue('sonarqube_url')}` : "Default: https://sonarcloud.io"}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Project Key"
                  name="sonarqube_project_key"
                  value={formData.sonarqube_project_key}
                  onChange={handleChange}
                  placeholder="my-project"
                  helperText="Required - unique identifier for your project"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={<>API Token <DefaultChip field="sonarqube_api_key" /></>}
                  name="sonarqube_api_key"
                  type="password"
                  value={formData.sonarqube_api_key}
                  onChange={handleChange}
                  helperText={getDefaultValue('sonarqube_api_key') ? "Has default value set" : "Generate token in SonarQube: User > My Account > Security"}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">GitHub Settings</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Configure the GitHub repository to fetch source code. Repository name and branch are required.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label={<>Repository Owner <DefaultChip field="github_owner" /></>}
                  name="github_owner"
                  value={formData.github_owner}
                  onChange={handleChange}
                  placeholder={getDefaultValue('github_owner') || "username or org"}
                  helperText={getDefaultValue('github_owner') ? `Default: ${getDefaultValue('github_owner')}` : "GitHub username or organization"}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  label="Repository Name"
                  name="github_repo"
                  value={formData.github_repo}
                  onChange={handleChange}
                  placeholder="my-repo"
                  helperText="Required - the name of the repository"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Branch"
                  name="github_branch"
                  value={formData.github_branch}
                  onChange={handleChange}
                  placeholder="main"
                  helperText="Default: main"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={<>Personal Access Token <DefaultChip field="github_api_key" /></>}
                  name="github_api_key"
                  type="password"
                  value={formData.github_api_key}
                  onChange={handleChange}
                  helperText={getDefaultValue('github_api_key') ? "Has default value set" : "Generate a PAT with 'repo' scope"}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={() => navigate('/configurations')}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}

export default ConfigurationForm;
