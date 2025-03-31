import React, { useEffect, useState, useMemo } from 'react';
import './Fireworks.css';

declare global {
    interface Window {
        confetti?: {
            maxCount: number;
            speed: number;
            frameInterval: number;
            alpha: number;
            gradient: boolean;
            start: (timeout?: number, min?: number, max?: number) => void;
            stop: () => void;
            toggle: () => void;
            pause: () => void;
            resume: () => void;
            togglePause: () => void;
            remove: () => void;
            isPaused: () => boolean;
            isRunning: () => boolean;
        };
    }
}

interface Particle {
    id: string;
    x: number;
    y: number;
    tx: number;
    ty: number;
    color: string;
    size: number;
    duration: number;
    rotation: number;
    scale: number;
    drift: number;
}

const Fireworks = () => {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [count, setCount] = useState(0);
    const colors = ['#c8aa6e', '#cdfafa', '#f0e6d2', '#0acb6e', '#f0a326'];

    // Zredukowana liczba cząsteczek dla lepszej wydajności
    const MAX_PARTICLES = 300;
    const PARTICLES_PER_FIREWORK = 15; // Zmniejszona liczba cząsteczek na fajerwerk
    const SHAPES = ['particle', 'firework-shape', 'firework-shape-alt'];
    const FIREWORK_INTERVAL = 1000; // Zwiększony interwał między fajerwerkami
    const CONFETTI_INTERVAL = 7000; // Confetti tylko co 7 sekund
    const FIREWORK_DURATION = 7000; // Czas trwania fajerwerków - 7 sekund

    const createParticle = (x?: number, y?: number): Particle[] => {
        const baseX = x || Math.random() * 100;
        const baseY = y || 50;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 4 + 2;
        const duration = Math.random() * 1 + 0.5; // Skrócony czas trwania cząsteczek
        const rotationSpeed = Math.random() * 5 - 2.5;
        const initialScale = Math.random() * 0.5 + 0.5;
        const drift = Math.random() * 2 - 1;

        return Array.from({ length: PARTICLES_PER_FIREWORK }, (_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 50 + 30;
            return {
                id: `${count}-${i}`,
                x: baseX,
                y: baseY,
                tx: Math.cos(angle) * speed,
                ty: Math.sin(angle) * speed,
                color,
                size,
                duration,
                rotation: rotationSpeed,
                scale: initialScale,
                drift
            };
        });
    };

    // Animacja cząstek - zoptymalizowana
    useEffect(() => {
        let animationFrameId: number;
        let lastTime = 0;
        const FPS = 30; // Ograniczenie FPS dla lepszej wydajności
        const frameTime = 1000 / FPS;

        const updateParticles = (timestamp: number) => {
            if (timestamp - lastTime > frameTime) {
                lastTime = timestamp;

                setParticles(prev =>
                    prev.map(p => ({
                        ...p,
                        tx: p.tx + p.drift * 0.5, // Wolniejszy dryft
                        ty: p.ty + (Math.sin(Date.now() * 0.0005) * 1), // Wolniejsza animacja
                        rotation: p.rotation + 0.05, // Wolniejsza rotacja
                        scale: p.scale * 0.98 // Wolniejsze zmniejszanie
                    })).filter(p => p.scale > 0.1)
                );
            }

            animationFrameId = requestAnimationFrame(updateParticles);
        };

        animationFrameId = requestAnimationFrame(updateParticles);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    // Automatyczne generowanie fajerwerków z limitem czasowym
    useEffect(() => {
        const timeout = setTimeout(() => {
            // Zatrzymanie generowania fajerwerków po określonym czasie
            return;
        }, FIREWORK_DURATION);

        const interval = setInterval(() => {
            setCount(c => c + 1);
            setParticles(prev =>
                [...prev.slice(-MAX_PARTICLES), ...createParticle()]
            );
        }, FIREWORK_INTERVAL);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, []);

    // Integracja z Confetti - z limitem czasowym
    useEffect(() => {
        // Uruchom confetti na starcie
        if (window.confetti && typeof window.confetti.start === 'function') {
            window.confetti.start(FIREWORK_DURATION, 30, 50); // Mniej konfetti
        }

        // Ustaw timeout na zatrzymanie confetti
        const stopTimeout = setTimeout(() => {
            if (window.confetti && typeof window.confetti.stop === 'function') {
                window.confetti.stop();
            }
        }, FIREWORK_DURATION);

        return () => {
            clearTimeout(stopTimeout);
            if (window.confetti && typeof window.confetti.stop === 'function') {
                window.confetti.stop();
            }
        };
    }, []);

    // Interakcja z kliknięciem
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth) * 100;
            const y = (e.clientY / window.innerHeight) * 100;

            // Ograniczenie liczby cząsteczek przy kliknięciu
            setParticles(prev => {
                const newParticles = createParticle(x, y);
                return [...prev.slice(-(MAX_PARTICLES - newParticles.length)), ...newParticles];
            });
        };

        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [count]); // Dodano zależność od count

    // Użycie useMemo dla lepszej wydajności
    const memoizedParticles = useMemo(() => particles, [particles]);

    return (
        <div className="fireworks-container">
            {memoizedParticles.map(particle => {
                // Zamiast losowania kształtu dla każdej cząsteczki, używamy id do deterministycznego wyboru
                const shapeIndex = parseInt(particle.id.split('-')[1]) % SHAPES.length;
                const shapeClass = SHAPES[shapeIndex];

                return (
                    <div
                        key={particle.id}
                        className={`firework-particle ${shapeClass}`}
                        style={{
                            '--tx': `${particle.tx}px`,
                            '--ty': `${particle.ty}px`,
                            '--rotation': `${particle.rotation}deg`,
                            '--scale': particle.scale,
                            left: `${particle.x}%`,
                            top: `${particle.y}%`,
                            backgroundColor: particle.color,
                            width: `${particle.size}px`,
                            height: `${particle.size}px`,
                            transition: `all ${particle.duration}s ease-out`,
                            animation: `firework-fade ${particle.duration}s forwards`
                        } as React.CSSProperties}
                    />
                );
            })}
        </div>
    );
};

export default Fireworks;