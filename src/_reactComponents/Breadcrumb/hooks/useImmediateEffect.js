import { useRef } from 'react';

export const useImmediateEffect = (effectFn, deps) => {
  const previousDeps = useRef();

  if (
    typeof deps === 'undefined' ||
    !previousDeps.current ||
    !compareArrays(previousDeps.current, deps)
  ) {
    effectFn();
    previousDeps.current = deps;
  }
};

const compareArrays = (arr1, arr2) => {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (let i in arr1) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
};
