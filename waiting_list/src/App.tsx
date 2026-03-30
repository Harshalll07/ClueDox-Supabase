import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SortifiLandingPage from './pages/SortifiLandingPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SortifiLandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;