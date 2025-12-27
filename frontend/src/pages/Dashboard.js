import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  BugReport as BugIcon,
  CheckCircle as FalsePositiveIcon,
  Warning as TruePositiveIcon,
  Shield as ShieldIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  Radar as RadarIcon,
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
  false_positive: '#00e676',
  true_positive: '#ff1744',
  needs_human_review: '#ffab00',
};

const SEVERITY_COLORS = {
  CRITICAL: '#ff1744',
  HIGH: '#ff5722',
  MEDIUM: '#ffab00',
  LOW: '#00e676',
  INFO: '#00b0ff',
};

function StatCard({ title, value, icon, color, subtitle, trend }) {
  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${color} 0%, transparent 100%)`,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: 'text.secondary',
                fontSize: '0.7rem',
                letterSpacing: '1px',
                display: 'block',
                mb: 0.5,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              component="div"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(45deg, ${color} 0%, #ffffff 150%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              background: `linear-gradient(135deg, ${color}20 0%, ${color}40 100%)`,
              borderRadius: '12px',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${color}30`,
            }}
          >
            {React.cloneElement(icon, { sx: { fontSize: 32, color } })}
          </Box>
        </Box>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 0.5 }}>
            <TrendingUpIcon sx={{ fontSize: 16, color: '#00e676' }} />
            <Typography variant="caption" sx={{ color: '#00e676' }}>
              {trend}
            </Typography>
          </Box>
        )}
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
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={60} thickness={2} />
          <ShieldIcon
            sx={{
              position: 'absolute',
              fontSize: 28,
              color: '#00d4ff',
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading security dashboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <ShieldIcon sx={{ fontSize: 36, color: '#00d4ff' }} />
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
            Security Dashboard
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', ml: 7 }}>
          Real-time overview of vulnerability analysis and false positive detection
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Scans"
            value={statistics?.total_scans || 0}
            icon={<RadarIcon />}
            color="#00d4ff"
            subtitle="Security analyses performed"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Vulnerabilities Analyzed"
            value={statistics?.total_vulnerabilities_analyzed || 0}
            icon={<BugIcon />}
            color="#7c4dff"
            subtitle="Issues processed by AI"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="False Positive Rate"
            value={`${((statistics?.false_positive_rate || 0) * 100).toFixed(1)}%`}
            icon={<FalsePositiveIcon />}
            color="#00e676"
            subtitle="Noise reduction achieved"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="True Positive Rate"
            value={`${((statistics?.true_positive_rate || 0) * 100).toFixed(1)}%`}
            icon={<TruePositiveIcon />}
            color="#ff1744"
            subtitle="Real threats identified"
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SecurityIcon sx={{ color: '#00d4ff' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Triage Distribution
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                AI classification of detected vulnerabilities
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
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="rgba(10, 25, 41, 0.5)"
                      strokeWidth={2}
                    >
                      {triageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0d2137',
                        border: '1px solid rgba(0, 212, 255, 0.3)',
                        borderRadius: 8,
                        color: '#e3f2fd',
                      }}
                      itemStyle={{ color: '#e3f2fd' }}
                      labelStyle={{ color: '#90caf9' }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      formatter={(value) => (
                        <span style={{ color: '#e3f2fd', fontSize: '14px' }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 6,
                    background: 'rgba(0, 212, 255, 0.02)',
                    borderRadius: 2,
                    border: '1px dashed rgba(0, 212, 255, 0.2)',
                  }}
                >
                  <RadarIcon sx={{ fontSize: 48, color: 'rgba(0, 212, 255, 0.3)', mb: 2 }} />
                  <Typography color="text.secondary" align="center">
                    No data available
                  </Typography>
                  <Typography variant="caption" color="text.secondary" align="center">
                    Run a scan to see triage results
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TruePositiveIcon sx={{ color: '#ffab00' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Severity Distribution
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Breakdown of issues by severity level
              </Typography>
              {severityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={severityData} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.1)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#90caf9', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(0, 212, 255, 0.2)' }}
                    />
                    <YAxis
                      tick={{ fill: '#90caf9', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(0, 212, 255, 0.2)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0d2137',
                        border: '1px solid rgba(0, 212, 255, 0.3)',
                        borderRadius: 8,
                        color: '#e3f2fd',
                      }}
                      itemStyle={{ color: '#e3f2fd' }}
                      labelStyle={{ color: '#90caf9' }}
                      cursor={{ fill: 'rgba(0, 212, 255, 0.1)' }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#00d4ff"
                      radius={[4, 4, 0, 0]}
                      background={{ fill: 'rgba(0, 212, 255, 0.05)' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 6,
                    background: 'rgba(0, 212, 255, 0.02)',
                    borderRadius: 2,
                    border: '1px dashed rgba(0, 212, 255, 0.2)',
                  }}
                >
                  <TruePositiveIcon sx={{ fontSize: 48, color: 'rgba(255, 171, 0, 0.3)', mb: 2 }} />
                  <Typography color="text.secondary" align="center">
                    No data available
                  </Typography>
                  <Typography variant="caption" color="text.secondary" align="center">
                    Run a scan to see severity breakdown
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Scans Section */}
      {statistics?.recent_scans?.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <RadarIcon sx={{ color: '#7c4dff' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recent Security Scans
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#90caf9', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>ID</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#90caf9', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#90caf9', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#90caf9', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>False +</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#90caf9', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>True +</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: '#90caf9', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.recent_scans.map((scan) => (
                    <tr
                      key={scan.id}
                      style={{
                        background: 'rgba(0, 212, 255, 0.03)',
                        borderRadius: '8px',
                      }}
                    >
                      <td style={{ padding: '16px', borderRadius: '8px 0 0 8px' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#00d4ff' }}>
                          #{scan.id}
                        </Typography>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <Chip
                          label={scan.status}
                          size="small"
                          color={scan.status === 'completed' ? 'success' : scan.status === 'running' ? 'info' : 'default'}
                          sx={{ fontWeight: 500 }}
                        />
                      </td>
                      <td style={{ padding: '16px' }}>
                        <Typography variant="body2">{scan.total_vulnerabilities}</Typography>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <Typography variant="body2" sx={{ color: '#00e676', fontWeight: 500 }}>
                          {scan.false_positives}
                        </Typography>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <Typography variant="body2" sx={{ color: '#ff1744', fontWeight: 500 }}>
                          {scan.true_positives}
                        </Typography>
                      </td>
                      <td style={{ padding: '16px', borderRadius: '0 8px 8px 0' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {new Date(scan.scan_started_at).toLocaleString()}
                        </Typography>
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
