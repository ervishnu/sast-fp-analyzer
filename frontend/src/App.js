import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Configurations from './pages/Configurations';
import ConfigurationForm from './pages/ConfigurationForm';
import Scans from './pages/Scans';
import ScanDetail from './pages/ScanDetail';
import DefaultSettings from './pages/DefaultSettings';

function App() {
  return (
    <Router>
      <Box sx={{ display: 'flex' }}>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<DefaultSettings />} />
            <Route path="/configurations" element={<Configurations />} />
            <Route path="/configurations/new" element={<ConfigurationForm />} />
            <Route path="/configurations/:id/edit" element={<ConfigurationForm />} />
            <Route path="/scans" element={<Scans />} />
            <Route path="/scans/:id" element={<ScanDetail />} />
          </Routes>
        </Layout>
      </Box>
    </Router>
  );
}

export default App;
