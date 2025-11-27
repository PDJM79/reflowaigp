/**
 * React Singleton Module
 * Forces a single React instance across the entire application to prevent
 * "Cannot read properties of null (reading 'useState')" errors caused by
 * multiple React instances being bundled.
 */
import * as React from 'react';

// Export all commonly used React hooks and utilities
export const {
  useState,
  useEffect,
  useContext,
  createContext,
  useCallback,
  useMemo,
  useRef,
  useReducer,
  useLayoutEffect,
  useImperativeHandle,
  useDebugValue,
  StrictMode
} = React;

// Export React itself as default
export default React;
