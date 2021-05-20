import React, { useState, useEffect, useRef } from 'react';
import DoenetViewer from '../../Viewer/DoenetViewer.jsx';
import testCodeDoenetML from './testCode.doenet';
import core from '../../Core/Core';

function Test() {
  console.log('===Test');

  // const [doenetML,setDoenetML] = useState("");
  let doenetML = useRef('');

  //New DoenetViewer when code changes
  useEffect(() => {
    doenetML.current = testCodeDoenetML;
    setUpdateNumber((was) => was + 1);
  }, [testCodeDoenetML]);

  const [attemptNumber, setAttemptNumber] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [showCorrectness, setShowCorrectness] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [showFeedback, setShowFeedback] = useState(true);
  const [showHints, setShowHints] = useState(true);
  const [ignoreDatabase, setIgnoreDatabase] = useState(true);
  const [bundledCore, setBundledCore] = useState(false);
  const solutionDisplayMode = 'button';

  // let requestedVariant = useRef({ index: 0 });
  // requestedVariant is undefined by default so that viewer
  // will use attemptNumber for variant
  // unless get a message (from cypress) to select a particular variant
  let requestedVariant = useRef(undefined);

  const [updateNumber, setUpdateNumber] = useState(1);

  //For Cypress Test Use
  window.onmessage = (e) => {
    if (e.data.doenetML !== undefined) {
      doenetML.current = e.data.doenetML;
      //Only if defined
      if (e.data.requestedVariant) {
        requestedVariant.current = e.data.requestedVariant;
      }
      setUpdateNumber((was) => was + 1);
    }
  };

  if (doenetML === '') {
    return null;
  }
  let controls = null;
  let buttonText = 'show';
  if (controlsVisible) {
    buttonText = 'hide';
    controls = (
      <div>
        <div>
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

        <div>
          <label>
            {' '}
            <input
              type="checkbox"
              checked={showCorrectness}
              onChange={() => {
                setShowCorrectness((was) => !was);
                setUpdateNumber((was) => was + 1);
              }}
            />
            Show Correctness
          </label>
        </div>
        <div>
          <label>
            {' '}
            <input
              type="checkbox"
              checked={readOnly}
              onChange={() => {
                setReadOnly((was) => !was);
                setUpdateNumber((was) => was + 1);
              }}
            />
            Read Only
          </label>
        </div>
        <div>
          <label>
            {' '}
            <input
              type="checkbox"
              checked={showFeedback}
              onChange={() => {
                setShowFeedback((was) => !was);
                setUpdateNumber((was) => was + 1);
              }}
            />
            Show Feedback
          </label>
        </div>
        <div>
          <label>
            {' '}
            <input
              type="checkbox"
              checked={showHints}
              onChange={() => {
                setShowHints((was) => !was);
                setUpdateNumber((was) => was + 1);
              }}
            />
            Show Hints
          </label>
        </div>
        <div>
          <label>
            {' '}
            <input
              type="checkbox"
              checked={ignoreDatabase}
              onChange={() => {
                setIgnoreDatabase((was) => !was);
                setUpdateNumber((was) => was + 1);
              }}
            />
            Ignore Database
          </label>
        </div>
        <div>
          <label>
            {' '}
            <input
              type="checkbox"
              checked={bundledCore}
              onChange={() => {
                setBundledCore((was) => !was);
                setUpdateNumber((was) => was + 1);
              }}
            />
            Bundled Core
          </label>
        </div>
      </div>
    );
  }

  let coreProp = core;
  if (bundledCore) {
    coreProp = null;
  }

  return (
    <>
      <div style={{ backgroundColor: '#e3e3e3' }}>
        <h3>
          <button onClick={() => setControlsVisible((was) => !was)}>
            {buttonText} controls
          </button>
          Test Viewer and Core
        </h3>
        {controls}
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
        requestedVariant={requestedVariant.current}
        core={coreProp}
        // collaborate={true}
        // viewerExternalFunctions = {{ allAnswersSubmitted: this.setAnswersSubmittedTrueCallback}}
        // functionsSuppliedByChild = {this.functionsSuppliedByChild}
      />
    </>
  );
}

if (import.meta.hot) {
  import.meta.hot.accept();
  // import.meta.hot.accept(({module}) => {
  //   Test = module.default;
  //   console.log(">>>ACCEPT CALLED in test!!!!!!!!!",module.default)
  //   console.log(">>>module",module)
  // }
  // );
}

export default Test;
