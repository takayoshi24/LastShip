import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './context/GameContext.jsx';
import LobbyPage from './pages/LobbyPage.jsx';
import GamePage from './pages/GamePage.jsx';
import RankingPage from './pages/RankingPage.jsx';

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/game/:roomCode" element={<GamePage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  );
}
