import { useContext, useRef, useState } from 'react';
import { BreadcrumbContext } from '../BreadcrumbProvider';
import { useImmediateEffect } from './useImmediateEffect';
import { useWillUnmount } from './useWillUnmount';

export const useBreadcrumbItems = () => {
  const subscriptionRef = useRef();
  const [items, setItems] = useState([]);
  const { subscribe } = useContext(BreadcrumbContext);

  useImmediateEffect(() => {
    subscriptionRef.current = subscribe(setItems);
  }, []);

  useWillUnmount(() => {
    subscriptionRef.current.unsubscribe();
  });

  return items;
};
