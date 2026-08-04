import { Check, Dumbbell, Info } from "lucide-react";
import { useState } from "react";
import { MoreHorizontal } from "../icons/icons";

export default function EjercicioCard({ exercise, selected, onSelect }) {
    const [gifFailed, setGifFailed] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    const subMusculos = exercise.subMusculos || [];

    return (
        <button
            className={`ejercicio-card${selected ? " selected" : ""}`}
            onClick={onSelect}
        >
            <div className="ejercicio-card-cont">
                {gifFailed && (
                    <div className="ejercicio-placeholder visible">
                        <Dumbbell size={22} strokeWidth={1.5} />
                    </div>
                )}
                {!gifFailed && (
                    <img
                        src={exercise.gif}
                        alt={exercise.nombre}
                        loading="lazy"
                        className="ejercicio-gif"
                        onError={() => setGifFailed(true)}
                    />
                )}
                {selected && (
                    <div className="ejercicio-check">
                        <Check size={13} />
                    </div>
                )}
            </div>

            <div className="ejercicio-info">

                <div>
                    <p className="ejercicio-name">{exercise.nombre}</p>

                    <span
                        className="info-btn"
                        title="Infomarcion del ejercicio"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowTooltip((prev) => !prev);
                        }}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <MoreHorizontal size={14} />
                        {showTooltip && (
                            <div className="info-tooltip">
                                <p>
                                    <strong>Musculo:</strong>{" "}
                                    {exercise.parteDelCuerpo || "-"}
                                </p>
                                {subMusculos.length > 0 && (
                                    <p>
                                        <strong className="sub">Submúsculos:</strong>{" "}
                                        {subMusculos.join(", ")}
                                    </p>
                                )}
                                <p>
                                    <strong>Equipo:</strong>{" "}
                                    {exercise.equipamiento || "-"}
                                </p>
                            </div>
                        )}
                    </span>
                </div>

            </div>
        </button >
    );
}