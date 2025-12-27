import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
  Divider,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import {
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  Settings as SettingsIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Cancel as NotSetIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function DefaultSettings() {
  const [settings, setSettings] = useState({
    llm_url: '',
    llm_model: '',
    llm_api_key: '',
    sonarqube_url: '',
    sonarqube_api_key: '',
    github_owner: '',
    github_api_key: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showPasswords, setShowPasswords] = useState({
    llm_api_key: false,
    sonarqube_api_key: false,
    github_api_key: false,
  });
  const [savedSettings, setSavedSettings] = useState(null);  // Store the last saved settings for display

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/defaults`);
      const data = response.data;
      setSavedSettings(data);  // Store the original saved settings
      setSettings({
        llm_url: data.llm_url || '',
        llm_model: data.llm_model || '',
        llm_api_key: data.llm_api_key || '',
        sonarqube_url: data.sonarqube_url || '',
        sonarqube_api_key: data.sonarqube_api_key || '',
        github_owner: data.github_owner || '',
        github_api_key: data.github_api_key || '',
      });
    } catch (error) {
      console.error('Error fetching default settings:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load default settings',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    setSettings({
      ...settings,
      [field]: event.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await axios.put(`${API_URL}/defaults`, settings);
      setSavedSettings(response.data);  // Update saved settings display
      setSnackbar({
        open: true,
        message: 'Default settings saved successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error saving default settings:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Failed to save default settings',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field],
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 2 }}>
        <CircularProgress size={48} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Loading settings...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 2, fontSize: 32, color: '#00d4ff' }} />
        <Typography 
          variant="h4"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(90deg, #00d4ff 0%, #7c4dff 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Default Settings
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Configure default values for scan configurations. These values will be used when a field 
          is left empty in a scan configuration. Each scan configuration can still override these 
          defaults with its own values.
        </Typography>
      </Alert>

      {/* Current Saved Settings Summary */}
      {savedSettings && (
        <Card sx={{ mb: 3, background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
              Currently Saved Default Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, background: 'rgba(0, 212, 255, 0.03)', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
                  <Typography variant="subtitle2" sx={{ color: '#90caf9' }} gutterBottom>
                    LLM Settings
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0, color: '#e3f2fd' }}>URL:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {savedSettings.llm_url ? (
                            <Chip size="small" label={savedSettings.llm_url} color="success" variant="outlined" />
                          ) : (
                            <Chip size="small" label="Not Set" color="default" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0, color: '#e3f2fd' }}>Model:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {savedSettings.llm_model ? (
                            <Chip size="small" label={savedSettings.llm_model} color="success" variant="outlined" />
                          ) : (
                            <Chip size="small" label="Not Set" color="default" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0, color: '#e3f2fd' }}>API Key:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {savedSettings.llm_api_key ? (
                            <Chip size="small" icon={<CheckIcon />} label="Set" color="success" variant="outlined" />
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
                <Paper sx={{ p: 2, background: 'rgba(0, 212, 255, 0.03)', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
                  <Typography variant="subtitle2" sx={{ color: '#90caf9' }} gutterBottom>
                    SonarQube Settings
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0, color: '#e3f2fd' }}>URL:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {savedSettings.sonarqube_url ? (
                            <Chip size="small" label={savedSettings.sonarqube_url} color="success" variant="outlined" />
                          ) : (
                            <Chip size="small" label="Not Set" color="default" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0, color: '#e3f2fd' }}>API Key:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {savedSettings.sonarqube_api_key ? (
                            <Chip size="small" icon={<CheckIcon />} label="Set" color="success" variant="outlined" />
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
                <Paper sx={{ p: 2, background: 'rgba(0, 212, 255, 0.03)', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
                  <Typography variant="subtitle2" sx={{ color: '#90caf9' }} gutterBottom>
                    GitHub Settings
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0, color: '#e3f2fd' }}>Owner:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {savedSettings.github_owner ? (
                            <Chip size="small" label={savedSettings.github_owner} color="success" variant="outlined" />
                          ) : (
                            <Chip size="small" label="Not Set" color="default" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ border: 0, py: 0.5, pl: 0, color: '#e3f2fd' }}>API Key:</TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          {savedSettings.github_api_key ? (
                            <Chip size="small" icon={<CheckIcon />} label="Set" color="success" variant="outlined" />
                          ) : (
                            <Chip size="small" label="Not Set" color="default" variant="outlined" />
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
        <Grid container spacing={3}>
          {/* LLM Settings */}
          <Grid item xs={12}>
            <Card sx={{ background: 'linear-gradient(145deg, #0d2137 0%, #132f4c 100%)', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  LLM Settings
                </Typography>
                <Typography variant="body2" sx={{ color: '#90caf9', mb: 2 }}>
                  Default settings for the AI/LLM service used for vulnerability analysis
                </Typography>
                <Divider sx={{ mb: 2, borderColor: 'rgba(0, 212, 255, 0.2)' }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="LLM API URL"
                      value={settings.llm_url}
                      onChange={handleChange('llm_url')}
                      placeholder="http://localhost:1234/v1"
                      helperText="LM Studio, Ollama, or OpenAI compatible API endpoint"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Model Name"
                      value={settings.llm_model}
                      onChange={handleChange('llm_model')}
                      placeholder="lm-studio"
                      helperText="Model identifier (e.g., lm-studio, gpt-4, llama2)"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="LLM API Key"
                      type={showPasswords.llm_api_key ? 'text' : 'password'}
                      value={settings.llm_api_key}
                      onChange={handleChange('llm_api_key')}
                      placeholder="Optional for local LLM"
                      helperText="API key (optional for local LLM services)"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => togglePasswordVisibility('llm_api_key')}
                              edge="end"
                            >
                              {showPasswords.llm_api_key ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* SonarQube Settings */}
          <Grid item xs={12}>
            <Card sx={{ background: 'linear-gradient(145deg, #0d2137 0%, #132f4c 100%)', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  SonarQube Settings
                </Typography>
                <Typography variant="body2" sx={{ color: '#90caf9', mb: 2 }}>
                  Default SonarQube/SonarCloud connection settings (project key must be set per configuration)
                </Typography>
                <Divider sx={{ mb: 2, borderColor: 'rgba(0, 212, 255, 0.2)' }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SonarQube URL"
                      value={settings.sonarqube_url}
                      onChange={handleChange('sonarqube_url')}
                      placeholder="https://sonarcloud.io"
                      helperText="SonarQube server or SonarCloud URL"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SonarQube API Key"
                      type={showPasswords.sonarqube_api_key ? 'text' : 'password'}
                      value={settings.sonarqube_api_key}
                      onChange={handleChange('sonarqube_api_key')}
                      helperText="API token for SonarQube authentication"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => togglePasswordVisibility('sonarqube_api_key')}
                              edge="end"
                            >
                              {showPasswords.sonarqube_api_key ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* GitHub Settings */}
          <Grid item xs={12}>
            <Card sx={{ background: 'linear-gradient(145deg, #0d2137 0%, #132f4c 100%)', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  GitHub Settings
                </Typography>
                <Typography variant="body2" sx={{ color: '#90caf9', mb: 2 }}>
                  Default GitHub connection settings (repository and branch must be set per configuration)
                </Typography>
                <Divider sx={{ mb: 2, borderColor: 'rgba(0, 212, 255, 0.2)' }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="GitHub Owner/Organization"
                      value={settings.github_owner}
                      onChange={handleChange('github_owner')}
                      placeholder="myorganization"
                      helperText="Default GitHub username or organization"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="GitHub API Key"
                      type={showPasswords.github_api_key ? 'text' : 'password'}
                      value={settings.github_api_key}
                      onChange={handleChange('github_api_key')}
                      helperText="Personal access token for GitHub API"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => togglePasswordVisibility('github_api_key')}
                              edge="end"
                            >
                              {showPasswords.github_api_key ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Save Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Default Settings'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default DefaultSettings;
