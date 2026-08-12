import { useState, useEffect, useRef, useMemo } from "react";
import { X, Search, ChevronLeft, ChevronRight, Check } from "lucide-react";
import EjercicioCard from "./ejercicioCard";
import ejerciciosLocal from "../../data/ejerciciosData";

const PAGE_SIZE = 12;

export default function EjercicioModal({
  isOpen = true,
  onClose = () => { },
  onSelect = () => { },
}) {
  const [filters, setFilters] = useState({
    parteDelCuerpo: "",
    equipamiento: "",
    search: "",
  });

  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [selectedExercise, setSelectedExercise] = useState(null);

  const searchDebounce = useRef(null);
  const searchInputRef = useRef(null);

  const filterOptions = useMemo(() => {
    const partes = new Set();
    const equipos = new Set();
    ejerciciosLocal.forEach((e) => {
      if (e.parteDelCuerpo) partes.add(e.parteDelCuerpo);
      if (e.equipamiento) equipos.add(e.equipamiento);
    });
    return {
      partesDelCuerpo: [...partes].sort((a, b) => a.localeCompare(b, "es")),
      equipamientos: [...equipos].sort((a, b) => a.localeCompare(b, "es")),
    };
  }, []);

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return ejerciciosLocal.filter((e) => {
      const matchParte = !filters.parteDelCuerpo || e.parteDelCuerpo === filters.parteDelCuerpo;
      const matchEquipo = !filters.equipamiento || e.equipamiento === filters.equipamiento;
      const matchBusqueda = !term || e.nombre.toLowerCase().includes(term);
      return matchParte && matchEquipo && matchBusqueda;
    });
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = !!(filters.parteDelCuerpo || filters.equipamiento);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);



  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, []);
  if (!isOpen) return null;

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilter = (key) => updateFilter(key, "");

  const handleSearchChange = (value) => {
    setSearchValue(value);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => updateFilter("search", value), 400);
  };

  const handleCardClick = (exercise) => {
    setSelectedExercise((prev) => (prev?.id === exercise.id ? null : exercise));
  };

  const handleSaveSelection = () => {
    if (!selectedExercise) return;
    onSelect?.(selectedExercise);
  };

  return (
    <div
      className="modal-overlay fixed flex justifyContentCenter"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="ejercicio-modal borderRadiusCards">
        <div className="modal-head">
          <h3 className="fontSize1-4" style={{ margin: 0 }}>Ejercicios</h3>
          <div className="flex gap8">
            {selectedExercise && (
              <button
                className="btn-circle small acento"
                onClick={handleSaveSelection}
                aria-label="Confirmar selección"
                title={`Guardar ${selectedExercise.nombre}`}
              >
                <Check size={16} />
              </button>
            )}
            <button className="btn-circle small" onClick={onClose} aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-search-row">
          <div className="modal-search">
            <Search size={15} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar ejercicio..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-filter-row">
          <select
            className="filter-pill"
            value={filters.parteDelCuerpo}
            onChange={(e) => updateFilter("parteDelCuerpo", e.target.value)}
          >
            <option value="">Parte del cuerpo</option>
            {filterOptions.partesDelCuerpo.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          <select
            className="filter-pill"
            value={filters.equipamiento}
            onChange={(e) => updateFilter("equipamiento", e.target.value)}
          >
            <option value="">Equipamiento</option>
            {filterOptions.equipamientos.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <div className="modal-active-filters">
            {filters.parteDelCuerpo && (
              <button type="button" className="active-filter-chip" onClick={() => clearFilter("parteDelCuerpo")}>
                {filters.parteDelCuerpo} <X size={11} />
              </button>
            )}
            {filters.equipamiento && (
              <button type="button" className="active-filter-chip" onClick={() => clearFilter("equipamiento")}>
                {filters.equipamiento} <X size={11} />
              </button>
            )}
          </div>
        )}

        <div className="modal-body-scroll">
          {items.length === 0 && (
            <div className="modal-empty">
              No se encontraron ejercicios con esos filtros.
            </div>
          )}

          {items.length > 0 && (
            <div className="modal-grid">
              {items.map((exercise) => (
                <EjercicioCard
                  key={exercise.id}
                  exercise={exercise}
                  selected={selectedExercise?.id === exercise.id}
                  onSelect={() => handleCardClick(exercise)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <span className="modal-count">
            {filtered.length} ejercicio{filtered.length === 1 ? "" : "s"}
          </span>
          <div className="modal-pagination">
            <button className="mini-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={14} />
            </button>
            <span className="modal-page-count">{page} / {totalPages}</span>
            <button className="mini-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}