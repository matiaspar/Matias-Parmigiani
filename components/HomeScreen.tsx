import React from 'react';
import type { GameState } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface HomeScreenProps {
  savedGames: GameState[];
  onLoadGame: (gameId: string) => void;
  onNewGame: () => void;
  onDeleteGame: (gameId: string) => void;
  isLoading: boolean;
  loadingMessage: string | null;
  loadingProgress: number | null;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ savedGames, onLoadGame, onNewGame, onDeleteGame, isLoading, loadingMessage, loadingProgress }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-purple-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
          Misterio en el Concejo
        </h1>
        <p className="text-gray-300 mt-2 text-lg">Una aventura de detectives en Córdoba.</p>
      </div>
      
      <div className="w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl p-6 md:p-8">
        <button
          onClick={onNewGame}
          disabled={isLoading}
          className={`w-full bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 rounded-lg text-xl transition-all duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center ${isLoading ? 'py-4 h-[92px]' : 'py-3'}`}
        >
          {isLoading ? (
            <div className="w-full">
              <span className="text-base font-semibold mb-2 block text-center">{loadingMessage || 'Creando misterio...'}</span>
              <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden">
                <div 
                  className="bg-green-500 h-4 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${loadingProgress ?? 0}%` }}
                >
                </div>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
                  {Math.round(loadingProgress ?? 0)}%
                </span>
              </div>
            </div>
          ) : (
            'Nueva Partida'
          )}
        </button>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-300 border-b-2 border-gray-700 pb-2 mb-4">
            Partidas Guardadas
          </h2>
          {savedGames.length === 0 ? (
            <p className="text-gray-400 text-center italic py-4">No hay partidas guardadas.</p>
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {savedGames.sort((a,b) => b.createdAt - a.createdAt).map((game) => (
                <li key={game.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between transition-shadow hover:shadow-lg hover:bg-gray-600/50">
                  <div>
                    <p className="font-bold text-lg text-purple-300">{game.mystery.title}</p>
                    <p className="text-sm text-gray-400">
                      Iniciada: {new Date(game.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                     <button
                        onClick={() => onLoadGame(game.id)}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-transform transform hover:scale-105"
                      >
                        Continuar
                      </button>
                      <button
                        onClick={() => onDeleteGame(game.id)}
                        className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-md transition-transform transform hover:scale-105"
                      >
                        Borrar
                      </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
       <footer className="text-center mt-12 text-gray-500 text-sm max-w-2xl mx-auto">
        <p className="mb-2">"Los personajes utilizados tienen solo fines ilustrativos y de esparcimiento. Cualquier referencia incorrecta o negativa es meramente casual e inintencionada."</p>
        <p>Una experiencia generada por IA</p>
      </footer>
    </div>
  );
};

export default HomeScreen;