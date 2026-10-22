import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SmartInbox from './pages/SmartInbox';
import TaskManager from './pages/TaskManager';
import Settings from './pages/Settings';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1d27',
            color: '#e2e8f0',
            border: '1px solid #2e3140',
            borderRadius: '10px',
          },
        }}
      />
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inbox" element={<SmartInbox />} />
            <Route path="/tasks" element={<TaskManager />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
