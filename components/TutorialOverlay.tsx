
import React, { useState } from 'react';

interface TutorialStep {
  targetId: string;
  text: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const steps: TutorialStep[] = [
  { targetId: 'narration-panel', text: 'Aquí verás la historia y las imágenes del misterio. Lee con atención cada detalle.', position: 'bottom' },
  { targetId: 'view-tabs', text: 'Usa estas pestañas para cambiar entre la narración y tus pistas guardadas.', position: 'top' },
  { targetId: 'clues-panel', text: 'Cuando encuentres pistas, aparecerán aquí para que puedas consultarlas en cualquier momento.', position: 'top' },
  { targetId: 'input-area', text: 'Escribe tus preguntas, acciones o la solución final aquí.', position: 'top' },
  { targetId: 'mic-button', text: 'Usa el micrófono para dictar tus acciones si lo prefieres.', position: 'left' },
  { targetId: 'submit-button', text: 'Envía tu acción para avanzar en la investigación.', position: 'left' },
];

const TutorialOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onClose();
    }
  };

  const currentStep = steps[stepIndex];
  const targetElement = document.getElementById(currentStep.targetId);
  if (!targetElement) return null;

  const rect = targetElement.getBoundingClientRect();
  const highlightStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${rect.left - 8}px`,
    top: `${rect.top - 8}px`,
    width: `${rect.width + 16}px`,
    height: `${rect.height + 16}px`,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
    border: '2px solid #8B5CF6',
    borderRadius: '8px',
    zIndex: 1000,
    transition: 'all 0.3s ease-in-out',
  };
  
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    background: '#374151',
    color: 'white',
    padding: '12px',
    borderRadius: '6px',
    zIndex: 1001,
    maxWidth: '300px',
    transform: 'translate(-50%, 0)',
  };

  if (currentStep.position === 'bottom') {
    tooltipStyle.top = `${rect.bottom + 16}px`;
    tooltipStyle.left = `${rect.left + rect.width / 2}px`;
  } else if (currentStep.position === 'top') {
    tooltipStyle.bottom = `${window.innerHeight - rect.top + 16}px`;
    tooltipStyle.left = `${rect.left + rect.width / 2}px`;
  } else if (currentStep.position === 'left') {
    tooltipStyle.top = `${rect.top + rect.height / 2}px`;
    tooltipStyle.right = `${window.innerWidth - rect.left + 16}px`;
    tooltipStyle.transform = 'translate(0, -50%)';
  } else if (currentStep.position === 'right') {
    tooltipStyle.top = `${rect.top + rect.height / 2}px`;
    tooltipStyle.left = `${rect.right + 16}px`;
    tooltipStyle.transform = 'translate(0, -50%)';
  }

  return (
    <div className="fixed inset-0 z-50">
      <div style={highlightStyle} />
      <div style={tooltipStyle}>
        <p className="text-sm mb-4">{currentStep.text}</p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">{stepIndex + 1} / {steps.length}</span>
          <button
            onClick={handleNext}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded text-sm"
          >
            {stepIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
