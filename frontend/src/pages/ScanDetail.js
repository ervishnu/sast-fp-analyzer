import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Paper,
  Tabs,
  Tab,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as FalsePositiveIcon,
  Warning as TruePositiveIcon,
  Help as ReviewIcon,
  Refresh as RefreshIcon,
  Pause as PauseIcon,
  PlayArrow as ResumeIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { scansApi } from '../api';

const triageColors = {
  false_positive: 'success',
  true_positive: 'error',
  needs_human_review: 'warning',
};

const triageIcons = {
  false_positive: <FalsePositiveIcon />,
  true_positive: <TruePositiveIcon />,
  needs_human_review: <ReviewIcon />,
};

function ScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [controlLoading, setControlLoading] = useState(null);
  const previousStatusRef = useRef(null);

  const loadScan = useCallback(async () => {
    try {
      const response = await scansApi.get(id);
      setScan(response.data);
    } catch (err) {
      console.error('Error loading scan:', err);
      setError('Failed to load scan details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadStatus = useCallback(async () => {
    try {
      const response = await scansApi.status(id);
      const newStatus = response.data;
      
      // Check if status just changed to completed/failed/stopped
      const wasActive = previousStatusRef.current && 
        ['running', 'pending', 'paused'].includes(previousStatusRef.current);
      const isNowComplete = ['completed', 'failed', 'stopped'].includes(newStatus.status);
      
      if (wasActive && isNowComplete) {
        // Auto-refresh scan data when completed
        await loadScan();
        setSnackbar({
          open: true,
          message: `Scan ${newStatus.status}!`,
          severity: newStatus.status === 'completed' ? 'success' : 
                   newStatus.status === 'stopped' ? 'warning' : 'error'
        });
      }
      
      previousStatusRef.current = newStatus.status;
      setStatus(newStatus);
    } catch (err) {
      console.error('Error loading status:', err);
    }
  }, [id, loadScan]);

  const handlePause = async () => {
    setControlLoading('pause');
    try {
      await scansApi.pause(id);
      setSnackbar({ open: true, message: 'Pause request sent', severity: 'info' });
      await loadStatus();
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.detail || 'Failed to pause scan', 
        severity: 'error' 
      });
    } finally {
      setControlLoading(null);
    }
  };

  const handleResume = async () => {
    setControlLoading('resume');
    try {
      await scansApi.resume(id);
      setSnackbar({ open: true, message: 'Resume request sent', severity: 'info' });
      await loadStatus();
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.detail || 'Failed to resume scan', 
        severity: 'error' 
      });
    } finally {
      setControlLoading(null);
    }
  };

  const handleStop = async () => {
    setControlLoading('stop');
    try {
      await scansApi.stop(id);
      setSnackbar({ open: true, message: 'Stop request sent', severity: 'warning' });
      await loadStatus();
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.detail || 'Failed to stop scan', 
        severity: 'error' 
      });
    } finally {
      setControlLoading(null);
    }
  };

  useEffect(() => {
    loadScan();
    loadStatus();
  }, [loadScan, loadStatus]);

  useEffect(() => {
    // Poll for status updates while scan is running or paused
    if (scan?.status === 'running' || scan?.status === 'pending' || scan?.status === 'paused' ||
        status?.status === 'running' || status?.status === 'pending' || status?.status === 'paused') {
      const interval = setInterval(loadStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [scan?.status, status?.status, loadStatus]);

  const filteredAnalyses = scan?.vulnerability_analyses?.filter((a) => {
    if (tabValue === 0) return true;
    if (tabValue === 1) return a.triage === 'false_positive';
    if (tabValue === 2) return a.triage === 'true_positive';
    if (tabValue === 3) return a.triage === 'needs_human_review';
    return true;
  }) || [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/scans')} sx={{ mb: 2 }}>
          Back to Scans
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/scans')}>
          Back
        </Button>
        <Typography variant="h4">Scan #{id}</Typography>
        <Chip
          label={status?.status || scan?.status}
          color={
            (status?.status || scan?.status) === 'completed'
              ? 'success'
              : (status?.status || scan?.status) === 'failed'
              ? 'error'
              : (status?.status || scan?.status) === 'stopped'
              ? 'warning'
              : (status?.status || scan?.status) === 'paused'
              ? 'secondary'
              : 'primary'
          }
        />
        
        {/* Scan Control Buttons */}
        {(scan?.status === 'running' || status?.status === 'running') && (
          <>
            <Button 
              startIcon={controlLoading === 'pause' ? <CircularProgress size={16} /> : <PauseIcon />} 
              onClick={handlePause} 
              size="small"
              variant="outlined"
              color="warning"
              disabled={controlLoading !== null}
            >
              Pause
            </Button>
            <Button 
              startIcon={controlLoading === 'stop' ? <CircularProgress size={16} /> : <StopIcon />} 
              onClick={handleStop} 
              size="small"
              variant="outlined"
              color="error"
              disabled={controlLoading !== null}
            >
              Stop
            </Button>
          </>
        )}
        
        {(scan?.status === 'paused' || status?.status === 'paused') && (
          <>
            <Button 
              startIcon={controlLoading === 'resume' ? <CircularProgress size={16} /> : <ResumeIcon />} 
              onClick={handleResume} 
              size="small"
              variant="contained"
              color="success"
              disabled={controlLoading !== null}
            >
              Resume
            </Button>
            <Button 
              startIcon={controlLoading === 'stop' ? <CircularProgress size={16} /> : <StopIcon />} 
              onClick={handleStop} 
              size="small"
              variant="outlined"
              color="error"
              disabled={controlLoading !== null}
            >
              Stop
            </Button>
          </>
        )}
        
        {(scan?.status === 'running' || scan?.status === 'pending' || scan?.status === 'paused') && (
          <Button startIcon={<RefreshIcon />} onClick={loadStatus} size="small">
            Refresh
          </Button>
        )}
      </Box>

      {/* Progress indicator for running/paused scans */}
      {(scan?.status === 'running' || scan?.status === 'pending' || scan?.status === 'paused' ||
        status?.status === 'running' || status?.status === 'pending' || status?.status === 'paused') && status && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">
                Scan Progress
              </Typography>
              {status?.status === 'paused' && (
                <Chip label="PAUSED" color="secondary" size="small" />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={status.progress || 0}
                  color={status?.status === 'paused' ? 'secondary' : 'primary'}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Typography variant="body2">{status.progress || 0}%</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {status.message}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Summary statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4">{scan?.total_vulnerabilities || 0}</Typography>
            <Typography color="textSecondary">Total</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e8f5e9' }}>
            <Typography variant="h4" color="success.main">
              {scan?.false_positives || 0}
            </Typography>
            <Typography color="textSecondary">False Positives</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#ffebee' }}>
            <Typography variant="h4" color="error.main">
              {scan?.true_positives || 0}
            </Typography>
            <Typography color="textSecondary">True Positives</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#fff3e0' }}>
            <Typography variant="h4" color="warning.main">
              {scan?.needs_review || 0}
            </Typography>
            <Typography color="textSecondary">Needs Review</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Error message if scan failed */}
      {scan?.error_message && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {scan.error_message}
        </Alert>
      )}

      {/* Vulnerability and Hotspot analyses */}
      {scan?.vulnerability_analyses && scan.vulnerability_analyses.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Security Findings (Vulnerabilities & Hotspots)
            </Typography>

            <Tabs
              value={tabValue}
              onChange={(e, v) => setTabValue(v)}
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label={`All (${scan.vulnerability_analyses.length})`} />
              <Tab
                label={`False Positives (${scan.false_positives})`}
                icon={<FalsePositiveIcon color="success" />}
                iconPosition="start"
              />
              <Tab
                label={`True Positives (${scan.true_positives})`}
                icon={<TruePositiveIcon color="error" />}
                iconPosition="start"
              />
              <Tab
                label={`Needs Review (${scan.needs_review})`}
                icon={<ReviewIcon color="warning" />}
                iconPosition="start"
              />
            </Tabs>

            {filteredAnalyses.map((analysis) => (
              <Accordion key={analysis.id}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Chip
                      icon={triageIcons[analysis.triage]}
                      label={analysis.triage?.replace(/_/g, ' ')}
                      color={triageColors[analysis.triage] || 'default'}
                      size="small"
                    />
                    {analysis.issue_type === 'SECURITY_HOTSPOT' && (
                      <Chip
                        label="Hotspot"
                        size="small"
                        sx={{
                          backgroundColor: '#ff9800',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '0.7rem',
                        }}
                      />
                    )}
                    <Typography sx={{ flexGrow: 1 }} noWrap>
                      {analysis.file_path}
                    </Typography>
                    {analysis.line_number && (
                      <Typography variant="body2" color="textSecondary">
                        Line {analysis.line_number}
                      </Typography>
                    )}
                    {analysis.severity && (
                      <Chip label={analysis.severity} size="small" variant="outlined" />
                    )}
                    {analysis.confidence !== null && (
                      <Typography variant="body2" color="textSecondary">
                        Confidence: {(analysis.confidence * 100).toFixed(0)}%
                      </Typography>
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {analysis.issue_type === 'SECURITY_HOTSPOT' && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, backgroundColor: '#fff3e0', mb: 1 }}>
                          <Typography variant="subtitle2" color="warning.main" gutterBottom>
                            🔥 Security Hotspot
                          </Typography>
                          <Typography variant="body2">
                            This is a security-sensitive area of code that requires review.
                            {analysis.security_category && (
                              <> Category: <strong>{analysis.security_category}</strong></>
                            )}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">
                        {analysis.issue_type === 'SECURITY_HOTSPOT' ? 'Rule' : 'Vulnerability Type'}
                      </Typography>
                      <Typography>{analysis.vulnerability_type || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Original Message
                      </Typography>
                      <Typography>{analysis.original_message || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" color="textSecondary">
                        Short Reason
                      </Typography>
                      <Typography>{analysis.short_reason || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Detailed Explanation
                      </Typography>
                      <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                        <Typography
                          component="pre"
                          sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', m: 0 }}
                        >
                          {analysis.detailed_explanation || 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    {analysis.fix_suggestion && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Fix Suggestion
                        </Typography>
                        <Paper
                          sx={{
                            p: 2,
                            backgroundColor: '#e3f2fd',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                          }}
                        >
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {analysis.fix_suggestion}
                          </pre>
                        </Paper>
                      </Grid>
                    )}
                    {analysis.severity_override && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Severity Override
                        </Typography>
                        <Chip label={analysis.severity_override} color="warning" />
                      </Grid>
                    )}
                    {analysis.prompt_sent && (
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle2" color="textSecondary">
                          Prompt Sent to LLM
                        </Typography>
                        <Paper
                          sx={{
                            p: 2,
                            backgroundColor: '#fafafa',
                            border: '1px solid #e0e0e0',
                            maxHeight: '400px',
                            overflow: 'auto',
                          }}
                        >
                          <pre
                            style={{
                              margin: 0,
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              lineHeight: 1.5,
                            }}
                          >
                            {analysis.prompt_sent}
                          </pre>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ScanDetail;
