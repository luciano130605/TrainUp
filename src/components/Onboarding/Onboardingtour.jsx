import React, { useState, useRef } from 'react';
import { Dumbbell, Flame, Bell, PlayCircle, ChevronRight, Play } from 'lucide-react';
import './OnboardingTour.css';
import { NotificationIcon, PlayIcon } from '../../icons/icons';

// Contenido de las 4 pantallas del tour. Cambiá el texto/ícono acá nomás.
const SLIDES = [
    {
        icon: Dumbbell,
        title: 'Armá tus rutinas',
        text: 'Creá rutinas a tu medida: ejercicios, series, pesos y reps. Todo queda guardado y listo para la próxima.',
    },
    {
        icon: PlayIcon,
        title: 'Entrená sin distracciones',
        text: 'Arrancá una sesión y anotá cada serie en el momento. El descanso entre series se controla solo.',
    },
    {
        icon: Flame,
        title: 'Seguí tu progreso',
        text: 'Cada entrenamiento queda en tu historial: volumen, series y racha de días seguidos entrenando.',
    },
    {
        icon: NotificationIcon,
        title: 'No te olvides de entrenar',
        text: 'Elegí los días de cada rutina y activá recordatorios para que TrainUp te avise a la hora que quieras.',
    },
];

export default function OnboardingTour({ onFinish }) {
    const [step, setStep] = useState(0);
    const touchStartX = useRef(null);

    const isLast = step === SLIDES.length - 1;

    function goNext() {
        if (isLast) {
            onFinish();
            return;
        }
        setStep(s => Math.min(s + 1, SLIDES.length - 1));
    }

    function goTo(i) {
        setStep(i);
    }

    function handleTouchStart(e) {
        touchStartX.current = e.touches[0].clientX;
    }
    function handleTouchEnd(e) {
        if (touchStartX.current == null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < 40) return;
        if (delta < 0 && !isLast) setStep(s => Math.min(s + 1, SLIDES.length - 1));
        if (delta > 0 && step > 0) setStep(s => Math.max(s - 1, 0));
    }

    const Slide = SLIDES[step].icon;

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-skip" onClick={onFinish}>Saltar</div>

            <div
                className="onboarding-body"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <div className="onboarding-icon-cont" key={step}>
                    <Slide size={48} />
                </div>

                <h2 className="onboarding-titulo">{SLIDES[step].title}</h2>
                <p className="sub slide">{SLIDES[step].text}</p>
            </div>

            <div className="onboarding-footer">
                <div className="onboarding-dots">
                    {SLIDES.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`onboarding-dot ${i === step ? 'activo' : ''}`}
                            aria-label={`Ir al paso ${i + 1} de ${SLIDES.length}`}
                            onClick={() => goTo(i)}
                        />
                    ))}
                </div>

                <button className="btn-login flex justifyContentSpaceBet" onClick={goNext}style={{ width:"100%"}}>
                    {isLast ? <>Empezar <ChevronRight size={16} /></> : (
                        <>
                            Siguiente <ChevronRight size={16} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}