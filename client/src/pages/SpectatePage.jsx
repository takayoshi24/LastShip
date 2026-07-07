import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import SpectatorView from '../components/SpectatorView.jsx';

export default function SpectatePage() {
  const { state } = useGame();
  const navigate = useNavigate();

  if (state.screen !== 'spectator' || !state.spectatorData) {
    navigate('/');
    return null;
  }

  return <SpectatorView initialState={state.spectatorData} />;
}
