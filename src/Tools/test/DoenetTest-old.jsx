import React, { useState, useEffect, useRef } from 'react';
import DoenetViewer from '../../Viewer/DoenetViewer.jsx';
import testCodeDoenetML from './testCode.doenet';

export default function DoenetTest() {
  //New DoenetViewer when code changes
  useEffect(() => {
    doenetML.current = testCodeDoenetML;
    setUpdateNumber((was) => was + 1);
  }, testCodeDoenetML);

  let doenetML = useRef('');

  const [attemptNumber, setAttemptNumber] = useState(1);
  const [updateNumber, setUpdateNumber] = useState(1);
  const showCorrectness = true;
  const readOnly = false;
  const solutionDisplayMode = 'button';
  const showFeedback = true;
  const showHints = true;
  const ignoreDatabase = true;
  const requestedVariant = { index: 1 };

  //For Cypress Test Use
  window.onmessage = (e) => {
    if (e.data.doenetML !== undefined) {
      doenetML.current = e.data.doenetML;
      setUpdateNumber((was) => was + 1);
    }
  };

  if (doenetML.current === '') {
    return null;
  }

  return (
    <>
      <div style={{ backgroundColor: '#e3e3e3' }}>
        <h3>Test Tool</h3>
        <label>
          Attempt Number: {attemptNumber}{' '}
          <button
            onClick={() => {
              setAttemptNumber((was) => was + 1);
              setUpdateNumber((was) => was + 1);
            }}
          >
            New Attempt
          </button>
        </label>
      </div>
      <DoenetViewer
        key={'doenetviewer' + updateNumber}
        doenetML={doenetML.current}
        // contentId={"185fd09b6939d867d4faee82393d4a879a2051196b476acdca26140864bc967a"}
        flags={{
          showCorrectness,
          readOnly,
          solutionDisplayMode,
          showFeedback,
          showHints,
        }}
        attemptNumber={attemptNumber}
        ignoreDatabase={ignoreDatabase}
        requestedVariant={requestedVariant}
        // collaborate={true}
        // viewerExternalFunctions = {{ allAnswersSubmitted: this.setAnswersSubmittedTrueCallback}}
        // functionsSuppliedByChild = {this.functionsSuppliedByChild}
      />
    </>
  );
}
