import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface FormulaBlockProps {
  children?: React.ReactNode;
  text?: string;
  label?: string;
  delay?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function FormulaBlock({ children, text, label, delay = 0, size = 'md', className = '' }: FormulaBlockProps) {
  const [copied, setCopied] = useState(false);
  const sizeClasses = {
    sm: 'text-sm py-3 px-4',
    md: 'text-base py-4 px-5',
    lg: 'text-lg py-5 px-6',
  };

  const processedChildren = typeof children === 'string' ? children.replace(/__GT__/g, '>') : children;
  const displayText = text ? text.replace(/__GT__/g, '>') : (typeof children === 'string' ? children.replace(/__GT__/g, '>') : '');

  const handleCopy = () => {
    if (displayText) {
      navigator.clipboard.writeText(displayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay }}
      className={`relative group ${className}`}
    >
      {label && (
        <div className="label-tracked mb-2">{label}</div>
      )}
      <div className={`glass-panel rounded-xl ${sizeClasses[size]} font-mono text-white/80 tracking-wide overflow-x-auto`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 whitespace-pre-wrap">
            {text ? displayText : processedChildren}
          </div>
          {displayText && (
            <button
              onClick={handleCopy}
              className="shrink-0 p-1.5 rounded-lg hover:bg-white/5 text-white/20 hover:text-blue transition-colors"
              title="Copiar"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
