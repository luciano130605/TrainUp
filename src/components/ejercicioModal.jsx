import { useState, useEffect, useRef, useMemo } from "react";
import { X, Search, ChevronLeft, ChevronRight, Check } from "lucide-react";
import Select from "./select";
import EjercicioCard from "./ejercicioCard";
import ejerciciosLocal from "../data/ejerciciosData";
import { SearchIcon } from "../icons/icons";

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

  const [searchOpen, setSearchOpen] = useState(false);
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

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
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="ejercicio-modal">
        <div className="modal-topbar">
          <div className="modal-titulo">
            <span>Ejercicios</span>
          </div>
          <button className="mini-btn" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="modal-filters">
          <div className="modal-searchbar">
            <div className="modal-searchbar-inner">
              <SearchIcon size={14} className="modal-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por nombre..."
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>

            <Select
              label="Parte del cuerpo"
              value={filters.parteDelCuerpo}
              options={filterOptions.partesDelCuerpo}
              onChange={(v) => updateFilter("parteDelCuerpo", v)}
            />
            <Select
              label="Equipamiento"
              value={filters.equipamiento}
              options={filterOptions.equipamientos}
              onChange={(v) => updateFilter("equipamiento", v)}
            />
          </div>


        <div className="modal-results">
          {items.length === 0 && (
            <div className="modal-state">
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

        {selectedExercise && (
          <div className="modal-confirm-bar">
            <div className="modal-confirm-info">
              <span className="modal-confirm-label">Seleccionado</span>
              <strong>{selectedExercise.nombre}</strong>
            </div>
            <button className="btns primario ejercicio" onClick={handleSaveSelection}>
              Guardar
            </button>
          </div>
        )}

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