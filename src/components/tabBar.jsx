import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import AjustesDropdown from './ajustes';
import "./tabBar.css";
import { Settings } from 'lucide-react';

const TABS = [
  { key: 'home', label: 'Inicio' },
  { key: 'routines', label: 'Rutinas' },
  { key: 'history', label: 'Historial' },
  { key: 'proximamente', label: 'Perfil' },
];

export default function TabBar({
  screen,
  onNavigate,
  modoOscuro,
  onToggleModo,
  acento,
  onChangeAcento,
  toasterPosition,
  onChangeToasterPosition,
  reminderTime,
  onChangeReminderTime,
  reminderEnabled,
  onToggleReminder,
  swipeGestures,
  onToggleSwipeGestures,
  swipeLeftAction,
  onChangeSwipeLeftAction,
  swipeRightAction,
  onChangeSwipeRightAction,
}) {
  const [openSettings, setOpenSettings] = useState(false);
  const wrapRef = useRef(null);
  const trackRef = useRef(null);
  const itemRefs = useRef({});
  const [rudderStyle, setRudderStyle] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    if (!openSettings) return;
    const handleOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpenSettings(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [openSettings]);

  useEffect(() => {
    setOpenSettings(false);
  }, [screen]);

  const updateRudder = () => {
    const activeEl = itemRefs.current[screen];
    const trackEl = trackRef.current;
    if (!activeEl || !trackEl) {
      setRudderStyle((s) => ({ ...s, opacity: 0 }));
      return;
    }
    const trackBox = trackEl.getBoundingClientRect();
    const itemBox = activeEl.getBoundingClientRect();
    setRudderStyle({
      left: itemBox.left - trackBox.left,
      width: itemBox.width,
      opacity: 1,
    });
  };

  useLayoutEffect(() => {
    updateRudder();
  }, [screen]);

  useEffect(() => {
    window.addEventListener('resize', updateRudder);
    return () => window.removeEventListener('resize', updateRudder);
  }, []);

  return (
    <div className="tabbar">
      <div className="tabbar-track" ref={trackRef}>
        <div
          className="tabbar-rudder"
          style={{
            transform: `translateX(${rudderStyle.left}px)`,
            width: rudderStyle.width,
            opacity: rudderStyle.opacity,
          }}
        />
        {TABS.map((tab) => (
          <div
            key={tab.key}
            ref={(el) => (itemRefs.current[tab.key] = el)}
            className={`tabbar-item ${screen === tab.key ? 'activo' : ''}`}
            onClick={() => onNavigate(tab.key)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      <div className="tabbar-item-wrap" ref={wrapRef}>
        <div
          className="tabbar-item noHover"
          onClick={() => setOpenSettings((v) => !v)}
        >
          <Settings size={14} />
        </div>
        <AjustesDropdown
          open={openSettings}
          modoOscuro={modoOscuro}
          onToggleModo={onToggleModo}
          acento={acento}
          onChangeAcento={onChangeAcento}
          toasterPosition={toasterPosition}
          onChangeToasterPosition={onChangeToasterPosition}
          reminderTime={reminderTime}
          onChangeReminderTime={onChangeReminderTime}
          reminderEnabled={reminderEnabled}
          onToggleReminder={onToggleReminder}
          swipeGestures={swipeGestures}
          onToggleSwipeGestures={onToggleSwipeGestures}
          swipeLeftAction={swipeLeftAction}
          onChangeSwipeLeftAction={onChangeSwipeLeftAction}
          swipeRightAction={swipeRightAction}
          onChangeSwipeRightAction={onChangeSwipeRightAction}
        />
      </div>
    </div>
  );
}