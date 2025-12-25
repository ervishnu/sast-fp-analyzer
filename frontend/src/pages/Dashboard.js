import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  BugReport as BugIcon,
  CheckCircle as FalsePositiveIcon,
  Warning as TruePositiveIcon,
  Help as ReviewIcon,
  Assessment as ScanIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { dashboardApi } from '../api';

const COLORS = {
  false_positive: '#4caf50',
  true_positive: '#f44336',
  needs_human_review: '#ff9800',
};

function StatCard({ title, value, icon, color }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: '50%',
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.cloneElement(icon, { sx: { fontSize: 40, color } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [statistics, setStatistics] = useState(null);
  const [triageData, setTriageData] = useState([]);
  const [severityData, setSeverityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, triageRes, severityRes] = await Promise.all([
        dashboardApi.statistics(),
        dashboardApi.vulnerabilitiesByTriage(),
        dashboardApi.vulnerabilitiesBySeverity(),
      ]);

      setStatistics(statsRes.data);

      // Transform triage data for pie chart
      const triageChartData = Object.entries(triageRes.data).map(([key, value]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
        color: COLORS[key] || '#9e9e9e',
      }));
      setTriageData(triageChartData);

      // Transform severity data for bar chart
      const severityChartData = Object.entries(severityRes.data).map(([key, value]) => ({
        name: key,
        count: value,
      }));
      setSeverityData(severityChartData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Scans"
            value={statistics?.total_scans || 0}
            icon={<ScanIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Vulnerabilities Analyzed"
            value={statistics?.total_vulnerabilities_analyzed || 0}
            icon={<BugIcon />}
            color="#9c27b0"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="False Positive Rate"
            value={`${((statistics?.false_positive_rate || 0) * 100).toFixed(1)}%`}
            icon={<FalsePositiveIcon />}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="True Positive Rate"
            value={`${((statistics?.true_positive_rate || 0) * 100).toFixed(1)}%`}
            icon={<TruePositiveIcon />}
            color="#f44336"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Triage Distribution
              </Typography>
              {triageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={triageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {triageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
                  No data available. Run a scan to see results.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Severity Distribution
              </Typography>
              {severityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={severityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
                  No data available. Run a scan to see results.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {statistics?.recent_scans?.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Scans
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <th style={{ textAlign: 'left', padding: '12px' }}>ID</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Total Vulnerabilities</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>False Positives</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>True Positives</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.recent_scans.map((scan) => (
                    <tr key={scan.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px' }}>{scan.id}</td>
                      <td style={{ padding: '12px' }}>{scan.status}</td>
                      <td style={{ padding: '12px' }}>{scan.total_vulnerabilities}</td>
                      <td style={{ padding: '12px' }}>{scan.false_positives}</td>
                      <td style={{ padding: '12px' }}>{scan.true_positives}</td>
                      <td style={{ padding: '12px' }}>
                        {new Date(scan.scan_started_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default Dashboard;
