import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Pause as PauseIcon,
  PlayArrow as ResumeIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { scansApi } from '../api';

const statusColors = {
  pending: 'default',
  running: 'primary',
  paused: 'secondary',
  completed: 'success',
  stopped: 'warning',
  failed: 'error',
};

function Scans() {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [controlLoading, setControlLoading] = useState({});

  const loadScans = useCallback(async () => {
    try {
      const response = await scansApi.list();
      setScans(response.data);
    } catch (err) {
      console.error('Error loading scans:', err);
      setError('Failed to load scans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  useEffect(() => {
    // Auto-refresh every 3 seconds if there are active scans
    const hasActiveScans = scans.some((s) => 
      s.status === 'running' || s.status === 'pending' || s.status === 'paused'
    );
    
    if (hasActiveScans) {
      const interval = setInterval(loadScans, 3000);
      return () => clearInterval(interval);
    }
  }, [scans, loadScans]);

  const handlePause = async (scanId) => {
    setControlLoading({ ...controlLoading, [scanId]: 'pause' });
    try {
      await scansApi.pause(scanId);
      setSnackbar({ open: true, message: 'Pause request sent', severity: 'info' });
      await loadScans();
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.detail || 'Failed to pause scan', 
        severity: 'error' 
      });
    } finally {
      setControlLoading({ ...controlLoading, [scanId]: null });
    }
  };

  const handleResume = async (scanId) => {
    setControlLoading({ ...controlLoading, [scanId]: 'resume' });
    try {
      await scansApi.resume(scanId);
      setSnackbar({ open: true, message: 'Resume request sent', severity: 'info' });
      await loadScans();
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.detail || 'Failed to resume scan', 
        severity: 'error' 
      });
    } finally {
      setControlLoading({ ...controlLoading, [scanId]: null });
    }
  };

  const handleStop = async (scanId) => {
    setControlLoading({ ...controlLoading, [scanId]: 'stop' });
    try {
      await scansApi.stop(scanId);
      setSnackbar({ open: true, message: 'Stop request sent', severity: 'warning' });
      await loadScans();
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.detail || 'Failed to stop scan', 
        severity: 'error' 
      });
    } finally {
      setControlLoading({ ...controlLoading, [scanId]: null });
    }
  };

  const handleDelete = async () => {
    if (!selectedScan) return;
    try {
      await scansApi.delete(selectedScan.id);
      setScans(scans.filter((s) => s.id !== selectedScan.id));
      setSnackbar({ open: true, message: 'Scan deleted', severity: 'success' });
    } catch (err) {
      console.error('Error deleting scan:', err);
      setSnackbar({ open: true, message: 'Failed to delete scan', severity: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedScan(null);
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
        <Typography variant="h4">Scans</Typography>
        <IconButton onClick={loadScans} title="Refresh">
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {scans.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No scans yet
            </Typography>
            <Typography color="textSecondary">
              Start a scan from a configuration to see results here.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Total Vulnerabilities</TableCell>
                <TableCell>False Positives</TableCell>
                <TableCell>True Positives</TableCell>
                <TableCell>Needs Review</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scans.map((scan) => (
                <TableRow key={scan.id} hover>
                  <TableCell>{scan.id}</TableCell>
                  <TableCell>
                    <Chip
                      label={scan.status}
                      color={statusColors[scan.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{scan.total_vulnerabilities}</TableCell>
                  <TableCell>
                    <Chip label={scan.false_positives} color="success" size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={scan.true_positives} color="error" size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={scan.needs_review} color="warning" size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{new Date(scan.scan_started_at).toLocaleString()}</TableCell>
                  <TableCell>
                    {scan.scan_completed_at
                      ? new Date(scan.scan_completed_at).toLocaleString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/scans/${scan.id}`)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    
                    {/* Pause button for running scans */}
                    {scan.status === 'running' && (
                      <Tooltip title="Pause Scan">
                        <IconButton
                          size="small"
                          onClick={() => handlePause(scan.id)}
                          disabled={controlLoading[scan.id]}
                          color="warning"
                        >
                          {controlLoading[scan.id] === 'pause' ? (
                            <CircularProgress size={16} />
                          ) : (
                            <PauseIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {/* Resume button for paused scans */}
                    {scan.status === 'paused' && (
                      <Tooltip title="Resume Scan">
                        <IconButton
                          size="small"
                          onClick={() => handleResume(scan.id)}
                          disabled={controlLoading[scan.id]}
                          color="success"
                        >
                          {controlLoading[scan.id] === 'resume' ? (
                            <CircularProgress size={16} />
                          ) : (
                            <ResumeIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {/* Stop button for running/paused scans */}
                    {(scan.status === 'running' || scan.status === 'paused' || scan.status === 'pending') && (
                      <Tooltip title="Stop Scan">
                        <IconButton
                          size="small"
                          onClick={() => handleStop(scan.id)}
                          disabled={controlLoading[scan.id]}
                          color="error"
                        >
                          {controlLoading[scan.id] === 'stop' ? (
                            <CircularProgress size={16} />
                          ) : (
                            <StopIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedScan(scan);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={scan.status === 'running' || scan.status === 'paused'}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Scan</DialogTitle>
        <DialogContent>
          Are you sure you want to delete scan #{selectedScan?.id}? This will also delete all
          associated vulnerability analyses.
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

export default Scans;
