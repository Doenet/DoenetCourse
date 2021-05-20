import React, { useState } from 'react';
import {
  doenetComponentForegroundInactive,
  doenetComponentForegroundActive,
} from './theme.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';

export default function Searchbar(props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelShown, setCancelShown] = useState('hidden');
  var searchBar = {
    margin: '0px',
    height: '24px',
    border: `2px solid black`,
    borderRadius: '5px',
    position: 'relative',
    padding: '0px 70px 0px 30px',
    color: '#000',
    overflow: 'hidden',
    width: '220px',
  };
  var searchIcon = {
    margin: '6px 0px 0px 6px',
    position: 'absolute',
    zIndex: '1',
    color: '#000',
    overflow: 'hidden',
  };
  var cancelButton = {
    float: 'right',
    margin: '6px 0px 0px 172px',
    position: 'absolute',
    zIndex: '2',
    border: '0px',
    backgroundColor: '#FFF',
    visibility: `${cancelShown}`,
    color: '#000',
    overflow: 'hidden',
    outline: 'none',
  };
  var submitButton = {
    position: 'absolute',
    display: 'inline',
    margin: '2px 0px 0px -58px',
    zIndex: '2',
    height: '24px',
    border: `2px hidden`,
    backgroundColor: `${doenetComponentForegroundActive}`,
    color: '#FFFFFF',
    borderRadius: '0px 3px 3px 0px',
    cursor: 'pointer',
    fontSize: '12px',
    overflow: 'hidden',
  };
  // if (props.action) {
  //     function searchSubmitAction() {
  //         props.action
  //     }
  // } else {
  //     function searchSubmitAction() {
  //         window.alert("You hit Submit!")
  //     }
  // }

  if (props.width) {
    searchBar.width = props.width;
  }
  function clearInput() {
    document.getElementById('search').value = '';
    setCancelShown('hidden');
  }
  function changeSearchTerm() {
    setSearchTerm(document.getElementById('search').value);
    setCancelShown('visible');
  }
  return (
    <div
      style={{ display: 'table-cell' }}
      onClick={() => {
        clearInput();
      }}
    >
      <FontAwesomeIcon icon={faSearch} style={searchIcon} />
      <button
        style={cancelButton}
        onClick={() => {
          clearInput();
        }}
      >
        <FontAwesomeIcon icon={faTimes} />
      </button>
      <input
        id="search"
        type="text"
        defaultValue="Search..."
        style={searchBar}
        onKeyUp={() => {
          changeSearchTerm();
        }}
      />
      <div style={{ padding: '3px', display: 'inline' }}></div>
      <button
        style={submitButton}
        onClick={() => {
          searchSubmitAction();
        }}
      >
        Search
      </button>
    </div>
  );
}
