import React, { useState, useEffect, useRef } from 'react';
import type { GameState, ChatMessage } from '../types';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { getNextStep, generateImage, checkSolution } from '../services/geminiService';
import BookOpenIcon from './icons/BookOpenIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import MicIcon from './icons/MicIcon';
import LoadingSpinner from './LoadingSpinner';
import TutorialOverlay from './TutorialOverlay';
import HelpCircleIcon from './icons/HelpCircleIcon';

type View = 'narration' | 'clues';

const SOLVE_PREFIX = "SOLUCIÓN:";

interface GameScreenProps {
  initialState: GameState;
  onSave: (state: GameState) => void;
  onExit: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ initialState, onSave, onExit }) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [playerInput, setPlayerInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<View>('narration');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      onSave(gameStateRef.current);
    }, 120000); // Autosave every 2 minutes

    return () => clearInterval(intervalId);
  }, [onSave]);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(`tutorial_seen_${initialState.id}`);
    if (!hasSeenTutorial) {
      setShowTutorial(true);
      localStorage.setItem(`tutorial_seen_${initialState.id}`, 'true');
    }
  }, [initialState.id]);

  useEffect(() => {
      if (activeView === 'narration' || activeView === 'clues') {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [gameState.currentNarration, gameState.clues, activeView]);

  const handleVoiceResult = (transcript: string) => {
    setPlayerInput(transcript);
  };
  const { isListening, toggleListening, hasRecognitionSupport } = useVoiceRecognition(handleVoiceResult);
  
  const triggerSaveConfirmation = () => {
    // Avoid resetting the timer if it's already active
    if (showSaveConfirmation) return;
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 2500);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerInput.trim() || isLoading || gameState.isSolved) return;

    setIsLoading(true);
    setError(null);
    setLoadingProgress(10);

    const newHistory: ChatMessage[] = [...gameState.chatHistory, { role: 'user', text: playerInput }];

    try {
      let updatedState: Partial<GameState> = {};

      if (playerInput.toUpperCase().startsWith(SOLVE_PREFIX)) {
        const proposedSolution = playerInput.substring(SOLVE_PREFIX.length).trim();
        setLoadingProgress(30);
        const result = await checkSolution(gameState.chatHistory, proposedSolution, gameState.mystery.secretSolution, navigator.language);
        setLoadingProgress(90);
        const modelResponseText = `Evaluación de la solución: ${result.explanation}`;
        
        updatedState = {
            isSolved: result.isCorrect,
            currentNarration: `${gameState.currentNarration}\n\n${modelResponseText}`,
            chatHistory: [...newHistory, {role: 'model', text: modelResponseText}]
        }

      } else {
        setLoadingProgress(25);
        const result = await getNextStep(gameState.chatHistory, playerInput, navigator.language);
        setLoadingProgress(50);
        const newNarration = `${gameState.currentNarration}\n\n${result.narration}`;

        updatedState = {
            currentNarration: newNarration,
            chatHistory: [...newHistory, { role: 'model', text: result.narration }],
        };
        
        if (result.newClue) {
           updatedState.clues = [...gameState.clues, result.newClue];
        }

        setLoadingProgress(60);
        const newImage = await generateImage(result.imagePrompt);
        setLoadingProgress(90);
        updatedState.currentImage = newImage;
      }
      
      setLoadingProgress(100);
      const newState: GameState = { ...gameState, ...updatedState };
      setGameState(newState);
      onSave(newState); // Auto-save on every action
      triggerSaveConfirmation();

    } catch (err) {
      console.error(err);
      setError('Hubo un error al procesar tu acción. Inténtalo de nuevo.');
    } finally {
      setPlayerInput('');
      setTimeout(() => {
        setIsLoading(false);
        setLoadingProgress(null);
      }, 500);
    }
  };
  
  const handleManualSave = () => {
    onSave(gameState);
    triggerSaveConfirmation();
  };

  const handleExit = () => {
    onSave(gameState); // Save before exiting
    onExit();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-gray-200 font-sans">
       {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
      <header className="flex-shrink-0 bg-gray-800 p-3 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold text-purple-400">{gameState.mystery.title}</h1>
        <div className="flex items-center gap-4">
            <span className={`text-green-400 transition-opacity duration-300 ${showSaveConfirmation ? 'opacity-100' : 'opacity-0'}`}>
                Progreso guardado ✓
            </span>
             <button onClick={() => setShowTutorial(true)} className="p-2 rounded-full hover:bg-gray-700 transition-colors" title="Mostrar tutorial">
                <HelpCircleIcon className="h-6 w-6" />
            </button>
            <button onClick={handleManualSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">Guardar</button>
            <button onClick={handleExit} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors">Volver</button>
        </div>
      </header>

      <main className="flex-grow flex flex-col md:flex-row overflow-hidden">
        {/* Main Content: Image and Narration/Clues */}
        <div className="w-full md:w-3/5 flex flex-col overflow-hidden">
            <div id="narration-panel" className="relative h-1/2 bg-black group">
                {isLoading && !gameState.currentImage && <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10"><LoadingSpinner /></div>}
                <img src={gameState.currentImage || "https://picsum.photos/1280/720?grayscale"} alt="Escena del misterio" className="w-full h-full object-cover transition-opacity duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
            </div>
          <div className="h-1/2 flex flex-col p-4 bg-gray-800/50 backdrop-blur-sm overflow-hidden">
            <div id="view-tabs" className="flex-shrink-0 flex border-b border-gray-700 mb-4">
              <button onClick={() => setActiveView('narration')} className={`px-4 py-2 text-lg font-semibold transition-colors ${activeView === 'narration' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}><BookOpenIcon className="inline-block mr-2 h-5 w-5"/>Narración</button>
              <button onClick={() => setActiveView('clues')} className={`px-4 py-2 text-lg font-semibold transition-colors ${activeView === 'clues' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}><ClipboardListIcon className="inline-block mr-2 h-5 w-5"/>Pistas ({gameState.clues.length})</button>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 text-base leading-relaxed">
              {activeView === 'narration' ? (
                <p id="narration-text" className="whitespace-pre-wrap font-serif">{gameState.currentNarration}</p>
              ) : (
                <div id="clues-panel">
                  {gameState.clues.length === 0 ? (
                    <p className="text-gray-400 italic">Aún no has encontrado ninguna pista.</p>
                  ) : (
                    <ul className="list-disc list-inside space-y-2">
                      {gameState.clues.map((clue, index) => <li key={index}>{clue}</li>)}
                    </ul>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div id="input-area" className="w-full md:w-2/5 flex flex-col p-4 bg-gray-800 border-l border-gray-700">
           <form onSubmit={handleSubmit} className="mt-auto">
            <label htmlFor="player-input" className="block mb-2 text-sm font-medium text-gray-400">¿Qué quieres hacer, detective? Para resolver, escribe: {SOLVE_PREFIX} [tu solución]</label>
            
            {isLoading ? (
                <div className="h-24 flex flex-col justify-center items-center gap-2">
                    <div className="w-full">
                        <span className="text-base font-semibold mb-2 block text-center">Procesando tu jugada...</span>
                        <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden">
                            <div 
                                className="bg-purple-500 h-4 rounded-full transition-all duration-500 ease-out" 
                                style={{ width: `${loadingProgress ?? 0}%` }}
                            >
                            </div>
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
                                {Math.round(loadingProgress ?? 0)}%
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex gap-2">
                  <textarea
                    id="player-input"
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
                    className="flex-grow bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500 transition-colors h-24 resize-none"
                    placeholder="Ej: 'Inspeccionar el escritorio de la víctima...'"
                    disabled={gameState.isSolved}
                  />
                  <div className="flex flex-col gap-2">
                    {hasRecognitionSupport && (
                      <button type="button" id="mic-button" onClick={toggleListening} disabled={gameState.isSolved} className={`p-3 rounded-md transition-colors ${isListening ? 'bg-red-600 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        <MicIcon className="h-6 w-6" />
                      </button>
                    )}
                    <button type="submit" id="submit-button" disabled={gameState.isSolved} className="flex-grow p-3 bg-purple-600 text-white font-bold rounded-md hover:bg-purple-700 disabled:bg-gray-500 transition-colors">
                      Enviar
                    </button>
                  </div>
                </div>
            )}
             {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
             {gameState.isSolved && <p className="text-green-400 mt-2 font-bold text-center text-lg">¡Misterio resuelto!</p>}
           </form>
        </div>
      </main>
    </div>
  );
};

export default GameScreen;