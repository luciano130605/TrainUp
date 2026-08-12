import { useEffect, useRef, useState } from "react";

export default function useCountUp(target, duration = 700) {
    const [value, setValue] = useState(0);
    const fromRef = useRef(0);
    const rafRef = useRef(null);

    const numericTarget = Number(target);

    useEffect(() => {
        cancelAnimationFrame(rafRef.current);

        // Si no es un número válido, no animamos
        if (!Number.isFinite(numericTarget)) {
            setValue(0);
            return;
        }

        const from = fromRef.current;
        const start = performance.now();

        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);

            const eased =
                t === 1
                    ? 1
                    : 1 - Math.pow(2, -10 * t);

            const current = Math.round(
                from + (numericTarget - from) * eased
            );

            setValue(current);

            if (t < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                fromRef.current = numericTarget;
            }
        };

        rafRef.current = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(rafRef.current);
    }, [numericTarget, duration]);

    return value;
}


export function StatNumber({ value }) {


    const stringValue = String(value ?? "");

    // Extraemos el número inicial
    const match = stringValue.match(/^-?\d+(?:\.\d+)?/);

    if (!match) {
        return <div className="stat-num">-</div>;
    }

    const numericValue = Number(match[0]);
    const suffix = stringValue.slice(match[0].length);

    const n = useCountUp(numericValue);

    return (
        <div className="stat-num">
            {n}
            {suffix}
        </div>
    );
}