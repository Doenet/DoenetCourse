import React, { useState, useEffect, useRef } from 'react';
import './selectbox.css';
import cloneDeep from 'lodash/cloneDeep';

function SelectBox({ items }) {
  const node = useRef();
  const [item, setItem] = useState(items);
  const [value, setValue] = useState('');
  const [showItems, setShowItems] = useState(false);

  useEffect(() => {
    document.addEventListener('click', handleClick, false);
    return () => {
      document.removeEventListener('click', handleClick, false);
    };
  });

  const handleClick = (event) => {
    if (node.current.contains(event.target)) {
      setShowItems(!showItems);
    } else {
      setShowItems(false);
    }
  };

  const selectChild = (child, parent) => {
    setValue(child.label);
    child.callback(child, parent);
  };

  const filter = (ev) => {
    let itemsCopy = cloneDeep(items);
    console.log(itemsCopy);
    // let itemsCopy = JSON.parse(JSON.stringify(items));
    setValue(ev.target.value);
    if (!!ev && !!ev.target && !!ev.target.value) {
      itemsCopy.map((i) => {
        let match = i.children.filter(
          (c) =>
            c.label.toLowerCase().indexOf(ev.target.value.toLowerCase()) > -1,
        );
        i.children = match;
        return i;
      });
    }
    setItem(itemsCopy);
  };

  const noResults = !item.filter((i) => !!i.children.length).length;

  return (
    <div className="select-box-box" ref={node}>
      <div className="select-box-container">
        <div className="select-box-selected-item">
          <input type="text" value={value} onChange={filter.bind(this)}></input>
        </div>
        <div className="select-box-arrow">
          <span
            className={`${
              showItems ? 'select-box-arrow-up' : 'select-box-arrow-down'
            }`}
          />
        </div>

        <div
          style={{ display: showItems ? 'block' : 'none' }}
          className={'select-box-items'}
        >
          {item.map((i) => (
            <>
              {!!i.children.length && (
                <div className="parent">{i.parent.title}</div>
              )}
              {i.children.map((child) => (
                <div className="child-container">
                  {/* {!!child.icon && <FontAwesomeIcon icon={child.icon} style={{ paddingRight: "8px", fontSize: "15px"}}/>} */}
                  <div
                    key={child.value}
                    onClick={selectChild.bind(this, child, i)}
                  >
                    {child.label}
                  </div>
                </div>
              ))}
            </>
          ))}
          {noResults && <div className="parent">No match found</div>}
        </div>
      </div>
    </div>
  );
}

export default SelectBox;
