import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface ManimStepProps {
  stepNumber: number;
  title: string;
  description: React.ReactNode;
  formula?: React.ReactNode;
  matrix?: React.ReactNode;
  delay?: number;
  isActive?: boolean;
  onClick?: () => void;
}

export function ManimStep({ 
  stepNumber, 
  title, 
  description, 
  formula, 
  matrix,
  delay = 0,
  isActive = false,
  onClick
}: ManimStepProps) {
  const [expanded, setExpanded] = useState(isActive);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay }}
      className={`rounded-2xl border transition-all duration-500 ${
        isActive || expanded 
          ? 'bg-blue/[0.04] border-blue/20' 
          : 'bg-white/[0.01] border-white/5 hover:border-white/10'
      }`}
    >
      <button
        onClick={() => { setExpanded(!expanded); onClick?.(); }}
        className="w-full text-left p-5 flex items-start gap-4"
      >
        {/* Step number circle */}
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm font-bold transition-all ${
          isActive || expanded 
            ? 'bg-blue text-white' 
            : 'bg-white/5 text-white/30'
        }`}>
          {stepNumber}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`font-serif text-lg transition-colors ${
              isActive || expanded ? 'text-white' : 'text-white/60'
            }`}>
              {title}
            </h4>
            <ChevronDown className={`w-4 h-4 text-white/30 shrink-0 transition-transform duration-300 ${
              expanded ? 'rotate-180' : ''
            }`} />
          </div>
        </div>
      </button>

      {/* Expandable content */}
      <motion.div
        initial={false}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="px-5 pb-5 pl-[72px]">
          <div className="text-sm text-white/50 leading-relaxed mb-4">
            {description}
          </div>
          {formula && (
            <div className="mb-4">{formula}</div>
          )}
          {matrix && (
            <div className="mb-4">{matrix}</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ManimSequenceProps {
  steps: ManimStepProps[];
  activeStep?: number;
  onStepChange?: (step: number) => void;
}

export function ManimSequence({ steps, activeStep = 0, onStepChange }: ManimSequenceProps) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <ManimStep
          key={i}
          {...step}
          isActive={i === activeStep}
          onClick={() => onStepChange?.(i)}
        />
      ))}
    </div>
  );
}
