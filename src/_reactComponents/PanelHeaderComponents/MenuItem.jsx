import React from 'react';
import { useMenuContext } from './Menu';
import { roleAtom } from '../../Tools/DoenetCourse';
import {
  RecoilRoot,
  atom,
  useSetRecoilState,
  useRecoilValue,
  useRecoilState,
} from 'recoil';
export default function MenuItem(props) {
  const setRole = useSetRecoilState(roleAtom);
  const { selection, makeSelection } = useMenuContext();
  const selected = selection.find((current) => current.value === props.value)
    ? true
    : false;
  console.log('selected role >>>', selected);
  return (
    <li
      className="menu-item"
      role="button"
      onClick={(e) => {
        makeSelection({
          value: props.value,
          action: props.onSelect,
          role: setRole,
          event: e,
        });
      }}
    >
      <svg className="menu-item-checkmark" width={12} height={12}>
        {selected && (
          <path
            d="M2,5 L5.5,8.5 L11,2 "
            fill="none"
            stroke="#000"
            strokeWidth={2}
          />
        )}
      </svg>
      <span className="menu-item-value">{props.value}</span>
      <span className="menu-item-icon">{props.icon}</span>
    </li>
  );
}
