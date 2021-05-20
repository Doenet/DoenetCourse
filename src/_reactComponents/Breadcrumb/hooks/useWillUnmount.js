import { useEffect, useRef } from 'react';

export const useWillUnmount = (callback) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      callbackRef.current();
    },
    [],
  );
};
