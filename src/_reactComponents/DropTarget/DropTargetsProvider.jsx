import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import DropTargetsContants from './constants';
import { DropTargetsContext } from './context';

export default function DropTargetsProvider({ children }) {
  const [draggedObject, setDraggedObject] = useState(null);
  const [activeDropTargetId, setActiveDropTargetId] = useState(null);
  const dropTargetsRef = useRef({});

  // Refs needed to communicate updates with timer closures
  const timerRef = useRef(null);
  const timerDropTargetId = useRef(null);
  const activeDropTargetIdRef = useRef(null);

  useEffect(() => {
    activeDropTargetIdRef.current = activeDropTargetId;
  }, [activeDropTargetId]);

  const getDropTargetFromCursor = useCallback((x, y, ignoreId = null) => {
    const underCursor = document.elementsFromPoint(x, y);
    const dropTargetIds = Object.keys(dropTargetsRef.current);
    for (let dropTargetId of dropTargetIds) {
      if (dropTargetId === ignoreId) continue;
      const dropTargetsObjs = dropTargetsRef.current[dropTargetId];
      for (let dropTargetObj of dropTargetsObjs) {
        if (underCursor.includes(dropTargetObj.ref))
          return [dropTargetId, dropTargetObj];
      }
    }
    return null;
  }, []);

  const registerDropTarget = useCallback(
    ({ id, ref, onDragOver, onDragHover, onDragEnter, onDragExit, onDrop }) => {
      let dropTargetObj = dropTargetsRef.current[id];
      if (!dropTargetObj) dropTargetObj = [];

      const newDropTarget = {
        ref,
        onDragOver,
        onDragHover,
        onDragEnter,
        onDragExit,
        onDrop,
      };
      dropTargetObj.push(newDropTarget);
      dropTargetsRef.current[id] = dropTargetObj;
    },
    [],
  );

  const unregisterDropTarget = useCallback((id) => {
    // delete dropTargetsRef.current[id];
  }, []);

  const handleDrag = useCallback(
    (x, y, selfId = null) => {
      const dropTarget = getDropTargetFromCursor(x, y, selfId);
      let dropTargetId = '',
        dropTargetObj = {};
      if (dropTarget) [dropTargetId, dropTargetObj] = dropTarget;

      if (dropTargetId) {
        dropTargetObj?.onDragOver({ x, y, dropTargetRef: dropTargetObj.ref });
      }

      if (dropTargetId !== activeDropTargetId) {
        if (!dropTargetId) {
          dropTargetId = DropTargetsContants.INVALID_DROP_AREA_ID;
          dropTargetObj = dropTargetsRef.current[dropTargetId]?.[0];
        }

        /* Trigger onDragExit */
        handleDragExit({ dropTargetId: activeDropTargetId });

        /* Trigger onDragEnter */
        handleDragEnter({ dropTargetId, dropTargetObj });
      }

      setActiveDropTargetId(dropTargetId);
    },
    [activeDropTargetId, getDropTargetFromCursor],
  );

  const handleDragEnter = ({ dropTargetId, dropTargetObj }) => {
    // if timer already set for same dropTargetId, ignore
    if (timerDropTargetId.current === dropTargetId) return;

    if (dropTargetId) {
      dropTargetObj && dropTargetObj.onDragEnter && dropTargetObj.onDragEnter();

      timerDropTargetId.current = dropTargetId;
      timerRef.current = setTimeout(() => {
        if (dropTargetObj.onDragHover && activeDropTargetIdRef.current) {
          dropTargetObj.onDragHover();
        }
        timerRef.current = null;
      }, 1500);
    }
  };

  const handleDragExit = ({ dropTargetId }) => {
    const dropTargetObjs = dropTargetsRef.current[dropTargetId];
    if (dropTargetObjs) {
      for (let dropTargetObj of dropTargetObjs) {
        if (dropTargetObj.onDragExit) dropTargetObj.onDragExit();
      }
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerDropTargetId.current = null;
  };

  const handleDrop = (selfId = null) => {
    if (activeDropTargetId !== null) {
      if (dropTargetsRef.current[activeDropTargetId]?.[0]?.onDrop)
        dropTargetsRef.current[activeDropTargetId][0].onDrop();
    }
    setActiveDropTargetId(null);
  };

  const state = {
    dropState: {
      activeDropTargetId,
      draggedObject,
    },
    dropActions: {
      registerDropTarget,
      unregisterDropTarget,
      handleDrag,
      handleDrop,
      setDraggedObject,
    },
  };

  return (
    <DropTargetsContext.Provider value={state}>
      {children}
    </DropTargetsContext.Provider>
  );
}
