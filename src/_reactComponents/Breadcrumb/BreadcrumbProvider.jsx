import React, { createContext, useCallback, useRef } from 'react';

export const BreadcrumbContext = createContext({});

export const BreadcrumbProvider = ({ children }) => {
  const itemsRef = useRef([]);
  const listernersRef = useRef([]);
  const addItem = useCallback((item) => {
    const index = itemsRef.current.findIndex((i) => i.to === item.to);

    if (index > -1) {
      return item;
    }

    itemsRef.current = [...itemsRef.current, item];
    listernersRef.current.forEach((listener) => listener(itemsRef.current));

    return item;
  }, []);

  const removeItem = useCallback((item) => {
    itemsRef.current = itemsRef.current.filter((i) => i.to !== item.to);
    listernersRef.current.forEach((listener) => listener(itemsRef.current));
  }, []);

  const clearItems = useCallback(() => {
    itemsRef.current = [];
    listernersRef.current.forEach((listener) => listener(itemsRef.current));
  }, []);

  const subscribe = useCallback((listener) => {
    listernersRef.current.push(listener);

    listener(itemsRef.current);

    return {
      unsubscribe() {
        const index = listernersRef.current.findIndex((l) => l === listener);
        listernersRef.current.splice(index, 1);
      },
    };
  }, []);
  return (
    <BreadcrumbContext.Provider
      value={{ addItem, removeItem, clearItems, subscribe }}
    >
      {children}
    </BreadcrumbContext.Provider>
  );
};
