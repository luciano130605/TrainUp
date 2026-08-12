// descansoToastModal.jsx
import { sileo } from "sileo";
import "../tabbars/descanso.css"

const REST_PRESETS = [30, 45, 60, 90, 120, 150, 180, 240];

function formatRest(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const min = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return rest ? `${min}m ${rest}s` : `${min}m`;
}

const stopAll = (e) => {
    e.stopPropagation();
};

export function openDescansoToast({ exerciseName, initialValue, onConfirm }) {
    let toastId;

    const pick = (value, e) => {
        e.stopPropagation();
        onConfirm(value);
        sileo.dismiss(toastId);
    };

    toastId = sileo.action({
        title: exerciseName ? `Descanso — ${exerciseName}` : 'Tiempo de descanso',
        duration: null,
        description: (
            <div
                className="descanso-chips"
                onPointerDown={stopAll}
                onMouseDown={stopAll}
                onClick={stopAll}
            >
                {REST_PRESETS.map((seg) => (
                    <div
                        key={seg}
                        role="button"
                        tabIndex={0}
                        className={`descanso-chip${String(seg) === String(initialValue) ? ' active' : ''}`}
                        onPointerDown={stopAll}
                        onMouseDown={stopAll}
                        onClick={(e) => pick(String(seg), e)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') pick(String(seg), e);
                        }}
                    >
                        {formatRest(seg)}
                    </div>
                ))}
                <div
                    role="button"
                    tabIndex={0}
                    className="descanso-chip descanso-chip-clear"
                    onPointerDown={stopAll}
                    onMouseDown={stopAll}
                    onClick={(e) => pick('', e)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') pick('', e);
                    }}
                >
                    Sin descanso
                </div>
            </div>
        ),
        styles: {
            container: "sileo-cont",
            title: "sileo-title",
            description: "sileo-description",
        },
    });
}