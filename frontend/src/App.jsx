import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import DatasetsPage from './pages/DatasetsPage'
import TestCasesPage from './pages/TestCasesPage'
import ExecutionPage from './pages/ExecutionPage'
import ReportsPage from './pages/ReportsPage'
import ManualTestPage from './pages/ManualTestPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/datasets" element={<DatasetsPage />} />
        <Route path="/testcases" element={<TestCasesPage />} />
        <Route path="/execution" element={<ExecutionPage />} />
        <Route path="/manual" element={<ManualTestPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </Layout>
  )
}
