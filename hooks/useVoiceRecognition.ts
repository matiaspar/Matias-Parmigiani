
import { useState, useEffect, useCallback } from 'react';

// Polyfill for browsers that use webkitSpeechRecognition
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useVoiceRecognition = (onResult: (transcript: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any | null>(null);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser.");
      return;
    }
    
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.lang = navigator.language || 'es-ES';
    rec.interimResults = false;
    
    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    setRecognition(rec);
  }, [onResult]);

  const toggleListening = useCallback(() => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }, [isListening, recognition]);

  return {
    isListening,
    toggleListening,
    hasRecognitionSupport: !!SpeechRecognition,
  };
};
