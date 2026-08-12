import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import AjustesDropdown from '../ajustes/ajustes';
import "./tabBar.css";
import { House, Dumbbell, History as HistoryIcon, MessageCircle, Settings } from 'lucide-react';
import HomeIcon from "../../icons/home"
import Rutina from "../../icons/rutinas"
import Historial from "../../icons/historial"
import Msj from "../../icons/msj"
import SettingFill from "../../icons/settingFill"



const TABS = [
  { key: "home", label: "Inicio", Icon: HomeIcon },
  { key: "routines", label: "Rutinas", Icon: Rutina },
  { key: "history", label: "Historial", Icon: Historial },
  { key: "mensajes", label: "Mensajes", Icon: Msj },
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
    <div className="tabbar-dock">
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
          {TABS.map(({ key, label, Icon }) => {
            const active = screen === key;
            return (
              <div
                key={key}
                ref={(el) => (itemRefs.current[key] = el)}
                className={`tabbar-item ${active ? 'activo' : ''}`}
                onClick={() => onNavigate(key)}
              >
                <Icon size={21} strokeWidth={active ? 2.3 : 1.8} className="tabbar-icon" />
                <span className="tabbar-label">{label}</span>
              </div>
            );
          })}
        </div>

        <div className="tabbar-divider" />

        <div className="tabbar-item-wrap" ref={wrapRef}>
          <div
            className={`tabbar-item settings noHover ${openSettings ? 'activo' : ''}`}
            onClick={() => setOpenSettings((v) => !v)}
          >
            <SettingFill size={19} strokeWidth={openSettings ? 2.2 : 1.8} className="tabbar-icon" />
          </div>
          <AjustesDropdown
            onNavigate={onNavigate}
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
    </div>
  );
}