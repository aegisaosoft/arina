import { useEffect, useRef } from 'react';

const vividColors = [
  '#ff33cc', '#00ffff', '#66ff99', '#ffff66', '#ff66ff',
  '#33ffff', '#ff9966', '#ff3399', '#00ffcc', '#ffcc33',
  '#ccff66', '#ff99ff', '#0da3cd'
];

export default function KandinskyCanvas() {
  const canvasRef = useRef(null);
  const shapesRef = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    const createShape = () => {
      const type = Math.floor(Math.random() * 4);
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 40 + Math.random() * 60,
        color: vividColors[Math.floor(Math.random() * vividColors.length)] + 'd0',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.006,
        pulse: Math.random() * 0.1 + 0.95,
        type
      };
    };
    
    resize();
    window.addEventListener('resize', resize);
    
    // Initialize shapes
    if (shapesRef.current.length === 0) {
      for (let i = 0; i < 18; i++) {
        shapesRef.current.push(createShape());
      }
    }
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      shapesRef.current.forEach(shape => {
        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.rotate(shape.rotation);
        ctx.globalAlpha = 0.85;
        
        ctx.fillStyle = shape.color;
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = 3;
        
        const pulseSize = shape.size * shape.pulse;
        
        if (shape.type === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape.type === 1) {
          ctx.fillRect(-pulseSize, -pulseSize, pulseSize * 2, pulseSize * 2);
        } else if (shape.type === 2) {
          ctx.fillRect(-pulseSize * 1.5, -pulseSize / 2, pulseSize * 3, pulseSize);
        } else if (shape.type === 3) {
          ctx.beginPath();
          ctx.moveTo(-pulseSize * 1.5, 0);
          ctx.lineTo(pulseSize * 1.5, 0);
          ctx.stroke();
        }
        
        ctx.restore();
        
        // Update position
        shape.x += shape.vx;
        shape.y += shape.vy;
        shape.rotation += shape.rotSpeed;
        shape.pulse = 0.95 + Math.sin(Date.now() * 0.001 + shape.size) * 0.1;
        
        // Wrap around screen
        if (shape.x < -100) shape.x = canvas.width + 100;
        if (shape.x > canvas.width + 100) shape.x = -100;
        if (shape.y < -100) shape.y = canvas.height + 100;
        if (shape.y > canvas.height + 100) shape.y = -100;
      });
      
      // Occasionally add new shape
      if (Math.random() < 0.005) {
        shapesRef.current.push(createShape());
      }
      
      // Limit total shapes
      if (shapesRef.current.length > 25) {
        shapesRef.current.shift();
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="kandinsky-bg"
      aria-hidden="true"
    />
  );
}
