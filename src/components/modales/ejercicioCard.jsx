import { Check, Dumbbell } from "lucide-react";
import { useState } from "react";
import { MoreHorizontal } from "../../icons/icons";

export default function EjercicioCard({ exercise, selected, onSelect }) {
  const [gifFailed, setGifFailed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const subMusculos = exercise.subMusculos || [];

  return (
    <button
      className={`exercise-pick-card${selected ? " selected" : ""}`}
      onClick={onSelect}
    >
      <div className="exercise-pick-media">
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

      <div className="exercise-pick-info">
        <p className="exercise-pick-name">{exercise.nombre}</p>

        <span
          className={`info-btn ${selected ? "selected" : ""}`}
          title={selected ? "Ejercicio seleccionado" : "Información del ejercicio"}
          onClick={(e) => {
            e.stopPropagation();

            if (!selected) {
              setShowTooltip((prev) => !prev);
            }
          }}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {selected ? (
            <Check size={14} strokeWidth={2.5} />
          ) : (
            <>
              <MoreHorizontal size={14} />

              {showTooltip && (
                <div
                  className="info-tooltip"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p>
                    <strong>Músculo:</strong>{" "}
                    {exercise.parteDelCuerpo || "-"}
                  </p>

                  {subMusculos.length > 0 && (
                    <p>
                      <strong>Submúsculos:</strong>{" "}
                      {subMusculos.join(", ")}
                    </p>
                  )}

                  <p>
                    <strong>Equipo:</strong>{" "}
                    {exercise.equipamiento || "-"}
                  </p>
                </div>
              )}
            </>
          )}
        </span>
      </div>
    </button>
  );
}