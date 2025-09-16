
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Mystery {
  title: string;
  initialScene: string;
  initialImagePrompt: string;
  secretSolution: string;
}

export interface GameState {
  id: string;
  mystery: Mystery;
  chatHistory: ChatMessage[];
  clues: string[];
  currentImage: string;
  currentNarration: string;
  isSolved: boolean;
  createdAt: number;
}
