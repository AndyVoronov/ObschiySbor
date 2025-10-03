import { useRef, useEffect } from 'react';
import './Ballpit.css';

const Ballpit = ({
  count = 200,
  gravity = 0.7,
  friction = 0.8,
  wallBounce = 0.95,
  followCursor = true
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const ballsRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initBalls();
    };

    const initBalls = () => {
      ballsRef.current = [];
      const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#96ceb4', '#dfe6e9'];

      for (let i = 0; i < count; i++) {
        ballsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          radius: Math.random() * 20 + 10,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ballsRef.current.forEach((ball) => {
        // Гравитация
        ball.vy += gravity * 0.01;

        // Следование за курсором
        if (followCursor && mouseRef.current.active) {
          const dx = mouseRef.current.x - ball.x;
          const dy = mouseRef.current.y - ball.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ball.vx += dx * 0.001;
            ball.vy += dy * 0.001;
          }
        }

        // Применение трения
        ball.vx *= friction;
        ball.vy *= friction;

        // Обновление позиции
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Отскок от стен
        if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
          ball.vx *= -wallBounce;
          ball.x = ball.x < ball.radius ? ball.radius : canvas.width - ball.radius;
        }
        if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
          ball.vy *= -wallBounce;
          ball.y = ball.y < ball.radius ? ball.radius : canvas.height - ball.radius;
        }

        // Коллизии между шарами
        ballsRef.current.forEach((other) => {
          if (ball === other) return;

          const dx = other.x - ball.x;
          const dy = other.y - ball.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDist = ball.radius + other.radius;

          if (distance < minDist) {
            const angle = Math.atan2(dy, dx);
            const targetX = ball.x + Math.cos(angle) * minDist;
            const targetY = ball.y + Math.sin(angle) * minDist;
            const ax = (targetX - other.x) * 0.5;
            const ay = (targetY - other.y) * 0.5;

            ball.vx -= ax;
            ball.vy -= ay;
            other.vx += ax;
            other.vy += ay;
          }
        });

        // Рисование
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.closePath();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [count, gravity, friction, wallBounce, followCursor]);

  return <canvas ref={canvasRef} className="ballpit-canvas" />;
};

export default Ballpit;
