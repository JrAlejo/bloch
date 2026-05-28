import { motion } from 'framer-motion';

interface MatrixDisplayProps {
  matrix: (string | number)[][];
  label?: string;
  bracketColor?: string;
  delay?: number;
  highlight?: [number, number]; // [row, col] to highlight
}

export default function MatrixDisplay({ 
  matrix, 
  label, 
  bracketColor = '#0066FF', 
  delay = 0,
  highlight 
}: MatrixDisplayProps) {
  const cols = matrix[0]?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay }}
      className="inline-flex flex-col items-center"
    >
      {label && (
        <div className="label-tracked mb-3 text-center">{label}</div>
      )}
      <div className="relative inline-flex items-center">
        {/* Left bracket */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-sm"
          style={{ background: bracketColor, opacity: 0.5 }}
        />
        <div 
          className="absolute left-0 top-0 bottom-0 w-4 rounded-l-md border-l-2 border-t-2 border-b-2"
          style={{ borderColor: bracketColor }}
        />
        
        {/* Matrix cells */}
        <div className="ml-5 mr-5">
          {matrix.map((row, i) => (
            <div key={i} className="flex gap-4">
              {row.map((cell, j) => {
                const isHighlighted = highlight && highlight[0] === i && highlight[1] === j;
                return (
                  <motion.div
                    key={j}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: delay + (i * cols + j) * 0.08 }}
                    className={`font-mono text-sm px-3 py-2 rounded-lg min-w-[60px] text-center ${
                      isHighlighted 
                        ? 'bg-blue/10 text-blue border border-blue/30' 
                        : 'text-white/70'
                    }`}
                  >
                    {cell}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Right bracket */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-4 rounded-r-md border-r-2 border-t-2 border-b-2"
          style={{ borderColor: bracketColor }}
        />
      </div>
    </motion.div>
  );
}
