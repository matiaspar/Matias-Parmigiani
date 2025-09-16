
import React, { useState, useEffect, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import GameScreen from './components/GameScreen';
import LoadingSpinner from './components/LoadingSpinner';
import type { GameState } from './types';
import { generateNewMystery, generateImage } from './services/geminiService';

const SAVED_GAMES_KEY = 'mystery_cordoba_saved_games';

const App: React.FC = () => {
  const [savedGames, setSavedGames] = useState<Record<string, GameState>>({});
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);

  useEffect(() => {
    try {
      const storedGames = localStorage.getItem(SAVED_GAMES_KEY);
      if (storedGames) {
        setSavedGames(JSON.parse(storedGames));
      }
    } catch (e) {
      console.error("Failed to load saved games:", e);
      setSavedGames({});
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleNewGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);
    try {
      const language = navigator.language || 'es-ES';
      
      setLoadingMessage("Buscando un concejal desprevenido para ser la víctima...");
      setLoadingProgress(10);
      const newMystery = await generateNewMystery(language);
      
      setLoadingMessage("Pintando la escena del crimen con pinceles de bits...");
      setLoadingProgress(50);
      const initialImage = await generateImage(newMystery.initialImagePrompt);

      setLoadingMessage("Colocando pistas falsas y un asesino astuto...");
      setLoadingProgress(90);
      const newGameId = `game_${Date.now()}`;
      const newGameState: GameState = {
        id: newGameId,
        mystery: newMystery,
        chatHistory: [{ role: 'model', text: newMystery.initialScene }],
        clues: [],
        currentImage: initialImage,
        currentNarration: newMystery.initialScene,
        isSolved: false,
        createdAt: Date.now()
      };
      
      const newGames = {...savedGames, [newGameId]: newGameState};
      setSavedGames(newGames);
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(newGames));
      
      setLoadingProgress(100);
      // Short delay to show 100% before changing screen
      setTimeout(() => {
        setActiveGameId(newGameId);
        setIsLoading(false);
        setLoadingMessage(null);
        setLoadingProgress(null);
      }, 500);

    } catch (err) {
      console.error(err);
      setError("No se pudo crear un nuevo misterio. Por favor, verifica tu conexión o la configuración de la API y vuelve a intentarlo.");
      setIsLoading(false);
      setLoadingMessage(null);
      setLoadingProgress(null);
    }
  }, [savedGames]);

  const handleSaveGame = useCallback((gameState: GameState) => {
    const newGames = { ...savedGames, [gameState.id]: gameState };
    setSavedGames(newGames);
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(newGames));
  }, [savedGames]);

  const handleLoadGame = (gameId: string) => {
    if (savedGames[gameId]) {
      setActiveGameId(gameId);
    }
  };

  const handleDeleteGame = (gameId: string) => {
    const confirmation = window.confirm("¿Estás seguro de que quieres borrar esta partida? Esta acción no se puede deshacer.");
    if (confirmation) {
        const newGames = { ...savedGames };
        delete newGames[gameId];
        setSavedGames(newGames);
        localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(newGames));
    }
  };
  
  const handleExitGame = () => {
    setActiveGameId(null);
  };

  if (isLoading && Object.keys(savedGames).length === 0 && loadingProgress === null) {
      return (
          <div className="h-screen w-screen flex flex-col justify-center items-center bg-gray-900 text-white">
              <LoadingSpinner />
              <p className="mt-4">Cargando...</p>
          </div>
      );
  }

  const activeGame = activeGameId ? savedGames[activeGameId] : null;

  return (
    <div className="w-screen h-screen">
       {error && (
        <div className="absolute top-4 right-4 bg-red-800 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
            <h3 className="font-bold">Error</h3>
            <p>{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-sm text-red-200 hover:underline">Cerrar</button>
        </div>
        )}

      {activeGame ? (
        <GameScreen
          key={activeGame.id}
          initialState={activeGame}
          onSave={handleSaveGame}
          onExit={handleExitGame}
        />
      ) : (
        <HomeScreen
          savedGames={Object.values(savedGames)}
          onLoadGame={handleLoadGame}
          onNewGame={handleNewGame}
          onDeleteGame={handleDeleteGame}
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          loadingProgress={loadingProgress}
        />
      )}
    </div>
  );
};

export default App;