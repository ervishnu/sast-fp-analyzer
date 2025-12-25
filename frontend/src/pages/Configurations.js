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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as RunIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
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
        [config.id]: { loading: false, error: 'Test failed' },
      });
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
                    <strong>SonarQube:</strong> {config.sonarqube_project_key}
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
                        </Alert>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
