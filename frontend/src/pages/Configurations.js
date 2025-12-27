import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as RunIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { configurationApi, scansApi } from '../api';

function Configurations() {
  const navigate = useNavigate();
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [selectedTestResult, setSelectedTestResult] = useState(null);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      const response = await configurationApi.list();
      setConfigurations(response.data);
    } catch (err) {
      console.error('Error loading configurations:', err);
      setError('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedConfig) return;
    try {
      await configurationApi.delete(selectedConfig.id);
      setConfigurations(configurations.filter((c) => c.id !== selectedConfig.id));
      setSnackbar({ open: true, message: 'Configuration deleted successfully', severity: 'success' });
    } catch (err) {
      console.error('Error deleting configuration:', err);
      setSnackbar({ open: true, message: 'Failed to delete configuration', severity: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedConfig(null);
    }
  };

  const handleTest = async (config) => {
    setTestResults({ ...testResults, [config.id]: { loading: true } });
    try {
      const response = await configurationApi.test(config.id);
      setTestResults({ ...testResults, [config.id]: { loading: false, results: response.data } });
    } catch (err) {
      console.error('Error testing configuration:', err);
      setTestResults({
        ...testResults,
        [config.id]: { loading: false, error: 'Test failed', errorDetails: err.response?.data || err.message },
      });
    }
  };

  const handleShowErrorDetails = (configId, configName) => {
    const result = testResults[configId];
    if (result && result.results) {
      setSelectedTestResult({ configName, ...result.results });
      setErrorDialogOpen(true);
    }
  };

  const handleRunScan = async (config) => {
    try {
      const response = await scansApi.start(config.id);
      setSnackbar({
        open: true,
        message: `Scan started! ID: ${response.data.scan_id}`,
        severity: 'success',
      });
      navigate(`/scans/${response.data.scan_id}`);
    } catch (err) {
      console.error('Error starting scan:', err);
      setSnackbar({ open: true, message: 'Failed to start scan', severity: 'error' });
    }
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Configurations</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/configurations/new')}
        >
          New Configuration
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {configurations.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No configurations yet
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 2 }}>
              Create your first configuration to start analyzing vulnerabilities.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/configurations/new')}
            >
              Create Configuration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {configurations.map((config) => (
            <Grid item xs={12} md={6} lg={4} key={config.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" gutterBottom>
                      {config.name}
                    </Typography>
                    <Chip
                      label={config.is_active ? 'Active' : 'Inactive'}
                      color={config.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    <strong>SonarQube:</strong> {config.sonarqube_project_key || config.sonarqube_project_name || 'Not set'}
                    {config.sonarqube_project_name && !config.sonarqube_project_key && (
                      <Chip size="small" label="by name" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    <strong>GitHub:</strong> {config.github_owner ? `${config.github_owner}/` : ''}{config.github_repo}
                    {!config.github_owner && <Chip size="small" label="Owner from default" sx={{ ml: 1 }} />}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Created:</strong> {new Date(config.created_at).toLocaleDateString()}
                  </Typography>

                  {testResults[config.id] && (
                    <Box sx={{ mt: 2 }}>
                      {testResults[config.id].loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={16} />
                          <Typography variant="body2">Testing connections...</Typography>
                        </Box>
                      ) : testResults[config.id].error ? (
                        <Alert severity="error" sx={{ py: 0 }}>
                          {testResults[config.id].error}
                          {testResults[config.id].errorDetails && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              {typeof testResults[config.id].errorDetails === 'string' 
                                ? testResults[config.id].errorDetails 
                                : JSON.stringify(testResults[config.id].errorDetails)}
                            </Typography>
                          )}
                        </Alert>
                      ) : (
                        <Box>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            <Chip
                              icon={testResults[config.id].results.sonarqube ? <CheckIcon /> : <ErrorIcon />}
                              label="SonarQube"
                              color={testResults[config.id].results.sonarqube ? 'success' : 'error'}
                              size="small"
                            />
                            <Chip
                              icon={testResults[config.id].results.github ? <CheckIcon /> : <ErrorIcon />}
                              label="GitHub"
                              color={testResults[config.id].results.github ? 'success' : 'error'}
                              size="small"
                            />
                            <Chip
                              icon={testResults[config.id].results.llm ? <CheckIcon /> : <ErrorIcon />}
                              label="LLM"
                              color={testResults[config.id].results.llm ? 'success' : 'error'}
                              size="small"
                            />
                          </Box>
                          {(testResults[config.id].results.errors?.length > 0 || 
                            !testResults[config.id].results.all_passed) && (
                            <Button
                              size="small"
                              startIcon={<InfoIcon />}
                              onClick={() => handleShowErrorDetails(config.id, config.name)}
                              sx={{ mt: 0.5 }}
                            >
                              View Details
                            </Button>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/configurations/${config.id}/edit`)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedConfig(config);
                        setDeleteDialogOpen(true);
                      }}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  <Box>
                    <Button size="small" onClick={() => handleTest(config)}>
                      Test
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<RunIcon />}
                      onClick={() => handleRunScan(config)}
                    >
                      Run Scan
                    </Button>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Configuration</DialogTitle>
        <DialogContent>
          Are you sure you want to delete "{selectedConfig?.name}"? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Details Dialog */}
      <Dialog 
        open={errorDialogOpen} 
        onClose={() => setErrorDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Test Results: {selectedTestResult?.configName}
        </DialogTitle>
        <DialogContent dividers>
          {selectedTestResult && (
            <Box>
              {/* Summary */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Connection Status
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    icon={selectedTestResult.sonarqube ? <CheckIcon /> : <ErrorIcon />}
                    label="SonarQube"
                    color={selectedTestResult.sonarqube ? 'success' : 'error'}
                  />
                  <Chip
                    icon={selectedTestResult.github ? <CheckIcon /> : <ErrorIcon />}
                    label="GitHub"
                    color={selectedTestResult.github ? 'success' : 'error'}
                  />
                  <Chip
                    icon={selectedTestResult.llm ? <CheckIcon /> : <ErrorIcon />}
                    label="LLM"
                    color={selectedTestResult.llm ? 'success' : 'error'}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Detailed Results */}
              <Typography variant="subtitle1" gutterBottom>
                Detailed Results
              </Typography>
              
              {/* SonarQube Details */}
              <Accordion defaultExpanded={!selectedTestResult.sonarqube}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selectedTestResult.sonarqube ? (
                      <CheckIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                    <Typography>SonarQube</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {selectedTestResult.details?.sonarqube ? (
                    <Box>
                      <Typography variant="body2" color={selectedTestResult.details.sonarqube.success ? 'success.main' : 'error.main'}>
                        <strong>Status:</strong> {selectedTestResult.details.sonarqube.success ? 'Connected' : 'Failed'}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Message:</strong> {selectedTestResult.details.sonarqube.message}
                      </Typography>
                      {selectedTestResult.details.sonarqube.error_type && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Error Type:</strong> {selectedTestResult.details.sonarqube.error_type}
                        </Typography>
                      )}
                      {selectedTestResult.details.sonarqube.error_details && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2"><strong>Error Details:</strong></Typography>
                          <Box
                            component="pre"
                            sx={{
                              backgroundColor: '#f5f5f5',
                              p: 1.5,
                              borderRadius: 1,
                              overflow: 'auto',
                              fontSize: '0.75rem',
                              maxHeight: 200,
                              mt: 0.5
                            }}
                          >
                            {selectedTestResult.details.sonarqube.error_details}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">No detailed information available</Typography>
                  )}
                </AccordionDetails>
              </Accordion>

              {/* GitHub Details */}
              <Accordion defaultExpanded={!selectedTestResult.github}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selectedTestResult.github ? (
                      <CheckIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                    <Typography>GitHub</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {selectedTestResult.details?.github ? (
                    <Box>
                      <Typography variant="body2" color={selectedTestResult.details.github.success ? 'success.main' : 'error.main'}>
                        <strong>Status:</strong> {selectedTestResult.details.github.success ? 'Connected' : 'Failed'}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Message:</strong> {selectedTestResult.details.github.message}
                      </Typography>
                      {selectedTestResult.details.github.error_type && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Error Type:</strong> {selectedTestResult.details.github.error_type}
                        </Typography>
                      )}
                      {selectedTestResult.details.github.error_details && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2"><strong>Error Details:</strong></Typography>
                          <Box
                            component="pre"
                            sx={{
                              backgroundColor: '#f5f5f5',
                              p: 1.5,
                              borderRadius: 1,
                              overflow: 'auto',
                              fontSize: '0.75rem',
                              maxHeight: 200,
                              mt: 0.5
                            }}
                          >
                            {selectedTestResult.details.github.error_details}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">No detailed information available</Typography>
                  )}
                </AccordionDetails>
              </Accordion>

              {/* LLM Details */}
              <Accordion defaultExpanded={!selectedTestResult.llm}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selectedTestResult.llm ? (
                      <CheckIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                    <Typography>LLM</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {selectedTestResult.details?.llm ? (
                    <Box>
                      <Typography variant="body2" color={selectedTestResult.details.llm.success ? 'success.main' : 'error.main'}>
                        <strong>Status:</strong> {selectedTestResult.details.llm.success ? 'Connected' : 'Failed'}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Message:</strong> {selectedTestResult.details.llm.message}
                      </Typography>
                      {selectedTestResult.details.llm.error_type && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Error Type:</strong> {selectedTestResult.details.llm.error_type}
                        </Typography>
                      )}
                      {selectedTestResult.details.llm.error_details && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2"><strong>Error Details:</strong></Typography>
                          <Box
                            component="pre"
                            sx={{
                              backgroundColor: '#f5f5f5',
                              p: 1.5,
                              borderRadius: 1,
                              overflow: 'auto',
                              fontSize: '0.75rem',
                              maxHeight: 200,
                              mt: 0.5
                            }}
                          >
                            {selectedTestResult.details.llm.error_details}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">No detailed information available</Typography>
                  )}
                </AccordionDetails>
              </Accordion>

              {/* General Errors */}
              {selectedTestResult.errors && selectedTestResult.errors.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom color="error">
                    Error Summary
                  </Typography>
                  {selectedTestResult.errors.map((err, index) => (
                    <Alert severity="error" key={index} sx={{ mb: 1 }}>
                      {err}
                    </Alert>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

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

export default Configurations;
