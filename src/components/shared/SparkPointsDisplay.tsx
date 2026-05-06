import React, { useEffect, useState } from 'react';
import { sparkPointsService } from '../../services/sparkPoints.service';

interface SparkPointsDisplayProps {
  studentProfileId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SparkPointsDisplay: React.FC<SparkPointsDisplayProps> = ({
  studentProfileId,
  className = '',
  size = 'md',
}) => {
  const [points, setPoints] = useState<number | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!studentProfileId) return;
    sparkPointsService.getBalance(studentProfileId).then((b) => {
      setPoints((prev) => {
        if (prev !== null && b > prev) setAnimate(true);
        return b;
      });
    });
  }, [studentProfileId]);

  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setAnimate(false), 600);
      return () => clearTimeout(t);
    }
  }, [animate]);

  if (points === null) return null;

  const sizes = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full font-bold
        bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700
        border border-amber-200 shadow-sm
        ${sizes[size]} ${animate ? 'badge-fly-in' : ''} ${className}`}
      title={`You have ${points} Spark Points`}
    >
      <span className={animate ? 'badge-shine' : ''}>🪙</span>
      <span>{points.toLocaleString()}</span>
    </div>
  );
};

export default SparkPointsDisplay;
