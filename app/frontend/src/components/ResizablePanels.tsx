import React, { useState, useEffect, useCallback } from 'react';

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  initialLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
}

const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  leftPanel,
  rightPanel,
  initialLeftWidth = 400,
  minLeftWidth = 300,
  maxLeftWidth = 800
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setStartWidth(leftWidth);
    e.preventDefault();
  };

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const diff = e.clientX - startX;
    const newWidth = Math.min(Math.max(startWidth + diff, minLeftWidth), maxLeftWidth);
    setLeftWidth(newWidth);
  }, [isDragging, startX, startWidth, minLeftWidth, maxLeftWidth]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex flex-row h-full relative">
      <div style={{ width: leftWidth, minWidth: minLeftWidth }} className="flex-shrink-0">
        {leftPanel}
      </div>
      <div
        className="w-1 cursor-col-resize select-none flex-shrink-0 relative group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-arch-orange/20 group-active:bg-arch-orange/40" />
        <div className="absolute inset-y-0 left-0 w-px bg-arch-gray/20 group-hover:bg-arch-orange/50 group-active:bg-arch-orange" />
      </div>
      <div className="flex-grow min-w-0">
        {rightPanel}
      </div>
    </div>
  );
};

export default ResizablePanels;