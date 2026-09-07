import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import useStore from '../store/useStore';

function extractInfo(children, id) {
  const type = children.type;
  const componentName = type?.name || type?.displayName || 'Element';
  const source = children.props?.__source;
  let file = null;
  let line = null;
  if (source) {
    file = source.fileName?.split('/').pop() || source.fileName;
    line = source.lineNumber;
  }
  return { id, componentName, file, line };
}

function formatInfo(info) {
  if (!info.file && !info.line) return info.componentName;
  const parts = [info.componentName];
  if (info.file) parts.push(info.file);
  if (info.line) parts[parts.length - 1] += `:${info.line}`;
  return parts.join(' · ');
}

export default function Inspect({ id, children }) {
  const inspectMode = useStore((s) => s.inspectMode);
  const setInspectTarget = useStore((s) => s.setInspectTarget);
  const clearInspectTarget = useStore((s) => s.clearInspectTarget);
  const setInspectCopied = useStore((s) => s.setInspectCopied);
  const setInspectInfo = useStore((s) => s.setInspectInfo);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  if (!inspectMode) return children;
  if (!React.isValidElement(children)) return children;

  const childProps = children.props;
  const info = extractInfo(children, id);

  const startHover = (e) => {
    childProps.onPointerEnter?.(e);
    childProps.onMouseEnter?.(e);
    childProps.onPressIn?.(e);
    setInspectTarget(id);
    setInspectInfo(info);
    copyTimerRef.current = setTimeout(() => {
      if (Platform.OS === 'web' && navigator.clipboard) {
        navigator.clipboard.writeText(id);
      } else {
        try { require('expo-clipboard').setStringAsync(id); } catch (_) {}
      }
      setInspectCopied(true);
      clearInspectTarget();
      setTimeout(() => setInspectCopied(false), 1500);
    }, 2000);
  };

  const endHover = (e) => {
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    childProps.onPointerLeave?.(e);
    childProps.onMouseLeave?.(e);
    childProps.onPressOut?.(e);
    clearInspectTarget();
    setInspectInfo(null);
  };

  return React.cloneElement(children, {
    onPointerEnter: startHover,
    onPointerLeave: endHover,
    onMouseEnter: startHover,
    onMouseLeave: endHover,
    onPressIn: startHover,
    onPressOut: endHover,
  });
}