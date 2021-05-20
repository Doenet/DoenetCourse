import React, { Component } from 'react';
import Core from './core';
import axios from 'axios';
import sha256 from 'crypto-js/sha256';
import CryptoJS from 'crypto-js';
import me from 'math-expressions';
// TODO: dynamic loading of renderers fails if we don't load HotTable
// even though we don't use HotTable anywhere
// What is the cause of this dependency?
// import { HotTable } from '@handsontable/react';

// import { serializedComponentsReplacer, serializedComponentsReviver } from '../Core/utils/serializedStateProcessing';

export function serializedComponentsReplacer(key, value) {
  if (value !== value) {
    return { objectType: 'special-numeric', stringValue: 'NaN' };
  } else if (value === Infinity) {
    return { objectType: 'special-numeric', stringValue: 'Infinity' };
  } else if (value === -Infinity) {
    return { objectType: 'special-numeric', stringValue: '-Infinity' };
  }
  return value;
}

let nanInfinityReviver = function (key, value) {
  if (value && value.objectType === 'special-numeric') {
    if (value.stringValue === 'NaN') {
      return NaN;
    } else if (value.stringValue === 'Infinity') {
      return Infinity;
    } else if (value.stringValue === '-Infinity') {
      return -Infinity;
    }
  }

  return value;
};

export function serializedComponentsReviver(key, value) {
  return me.reviver(key, nanInfinityReviver(key, value));
}

class DoenetViewerChild extends Component {
  constructor(props) {
    super(props);
    this.update = this.update.bind(this);
    this.coreReady = this.coreReady.bind(this);
    this.createCore = this.createCore.bind(this);
    this.haveDoenetML = this.haveDoenetML.bind(this);
    this.loadState = this.loadState.bind(this);
    this.loadDoenetML = this.loadDoenetML.bind(this);
    this.localStateChanged = this.localStateChanged.bind(this);
    this.submitResponse = this.submitResponse.bind(this);
    this.recordSolutionView = this.recordSolutionView.bind(this);
    this.recordEvent = this.recordEvent.bind(this);

    this.rendererUpdateMethods = {};

    this.cumulativeStateVariableChanges = {};

    this.attemptNumber = props.attemptNumber;
    if (this.attemptNumber === undefined) {
      this.attemptNumber = 1;
    }

    this.assignmentId = props.assignmentId;

    // TODO: should we be giving viewer both attemptNumber and requestedVariant?
    // for now, attemptNumber is used for requestedVariant if not specified
    this.requestedVariant = props.requestedVariant;
    if (this.requestedVariant === undefined) {
      this.requestedVariant = { index: this.attemptNumber - 1 };
    }

    this.documentRenderer = <>Loading...</>;

    if (props.contentId === undefined) {
      // use doenetML given via props
      let doenetML = props.doenetML;

      // calculate contentId from doenetML
      this.contentId = sha256(JSON.stringify(doenetML)).toString(
        CryptoJS.enc.Hex,
      );

      this.haveDoenetML({ contentId: this.contentId, doenetML });
    } else {
      this.contentId = props.contentId;
      // load doenetML from database using contentId
      this.loadDoenetML(props.contentId, this.haveDoenetML); //TODO: Does this work?
    }
  }

  haveDoenetML({ contentId, doenetML }) {
    this.contentId = contentId;
    this.doenetML = doenetML;

    // load statevariables/variant if in database from contentId, assignmentId, attemptNumber

    this.loadState(this.createCore);
  }

  createCore({ stateVariables, variant }) {
    if (stateVariables === undefined) {
      console.error(`error loading state variables`);
      this.cumulativeStateVariableChanges = null;
      variant = null;
    } else {
      this.cumulativeStateVariableChanges = JSON.parse(
        stateVariables,
        serializedComponentsReviver,
      );
    }

    // if loaded variant from database,
    // then use that variant rather than requestedVariant from props
    if (variant !== null) {
      this.requestedVariant = JSON.parse(variant, serializedComponentsReviver);
    }

    // TODO: who is responsible for verifying that a contentId matches hash?
    // Core or viewer?
    // Argument for doing it in core: core will have to do it anyway for
    // <copy uri="doenetML:abc" />
    // Best option: viewer and the function passed in to retrieve content
    // should verify hash

    if (this.props.core) {
      this.core = new this.props.core({
        coreReadyCallback: this.coreReady,
        coreUpdatedCallback: this.update,
        doenetML: this.doenetML,
        externalFunctions: {
          localStateChanged: this.localStateChanged,
          submitResponse: this.submitResponse,
          recordSolutionView: this.recordSolutionView,
          recordEvent: this.recordEvent,
        },
        flags: this.props.flags,
        requestedVariant: this.requestedVariant,
      });
    } else {
      this.core = new Core({
        coreReadyCallback: this.coreReady,
        coreUpdatedCallback: this.update,
        doenetML: this.doenetML,
        externalFunctions: {
          localStateChanged: this.localStateChanged,
          submitResponse: this.submitResponse,
          recordSolutionView: this.recordSolutionView,
          recordEvent: this.recordEvent,
        },
        flags: this.props.flags,
        requestedVariant: this.requestedVariant,
      });
    }

    // this.databaseItemsToReload = props.databaseItemsToReload;
  }

  coreReady() {
    this.generatedVariant = this.core.document.state.selectedVariantInfo.value;

    if (this.cumulativeStateVariableChanges) {
      // continue to try setting the state variables to cummulativeStateVariableChanges
      // while there are a positive number of failures
      // and the number of failures is increasing
      let nFailures = Infinity;
      while (nFailures > 0) {
        let result = this.core.executeUpdateStateVariables({
          newStateVariableValues: this.cumulativeStateVariableChanges,
        });
        if (!(result.nFailures && result.nFailures < nFailures)) {
          break;
        }
        nFailures = result.nFailures;
      }
    } else {
      // if database doesn't contain contentId, cumulativeStateVariableChanges is null
      // so change to empty object
      this.cumulativeStateVariableChanges = {};
    }

    // TODO: look up the items and their weights
    // save info to user_assignment_attempt and user_assignment_attempt_item
    // if it is the first time (adds records to database if they don't exist?)
    // this.core.scoredItemWeights = [ weight1, weight2, weight3 ]

    //TODO: Handle if number of items changed. Handle if weights changed

    if (this.assignmentId && !this.props.ignoreDatabase) {
      const payload = {
        weights: this.core.scoredItemWeights,
        contentId: this.contentId,
        assignmentId: this.assignmentId,
        attemptNumber: this.attemptNumber,
      };
      console.log('>>>this.assignmentId', this.assignmentId);
      console.log('>>>this.props.ignoreDatabase', this.props.ignoreDatabase);
      console.log('core ready payload:', payload);
      axios.post('/api/saveAssignmentWeights.php', payload).then((resp) => {
        console.log('saveAssignmentWeights-->>', resp.data);
      });
    }

    let renderPromises = [];
    let rendererClassNames = [];
    // console.log('rendererTypesInDocument');
    // console.log(this.core.rendererTypesInDocument);
    for (let rendererClassName of this.core.rendererTypesInDocument) {
      rendererClassNames.push(rendererClassName);
      // console.log(`>>>dynamic import '${rendererClassName}'`)
      renderPromises.push(import(`./renderers/${rendererClassName}.js`));
    }

    renderersloadComponent(renderPromises, rendererClassNames).then(
      (rendererClasses) => {
        this.rendererClasses = rendererClasses;
        let documentComponentInstructions =
          this.core.renderedComponentInstructions[this.core.documentName];
        let documentRendererClass =
          this.rendererClasses[documentComponentInstructions.rendererType];

        this.documentRenderer = React.createElement(documentRendererClass, {
          key: documentComponentInstructions.componentName,
          componentInstructions: documentComponentInstructions,
          rendererClasses: this.rendererClasses,
          rendererUpdateMethods: this.rendererUpdateMethods,
          flags: this.props.flags,
        });

        this.forceUpdate();
      },
    );

    //Let viewer know we are ready
    if (this.props.onCoreReady) {
      this.props.onCoreReady();
    }
  }

  localStateChanged({
    newStateVariableValues,
    contentId,
    sourceOfUpdate,
    transient = false,
  }) {
    // TODO: what should we do with transient updates?
    if (transient || this.props.ignoreDatabase) {
      return;
    }

    for (let componentName in newStateVariableValues) {
      if (!this.cumulativeStateVariableChanges[componentName]) {
        this.cumulativeStateVariableChanges[componentName] = {};
      }
      for (let varName in newStateVariableValues[componentName]) {
        let cumValues =
          this.cumulativeStateVariableChanges[componentName][varName];
        // if cumValues is an object with mergeObject = true,
        // then merge attributes from newStateVariableValues into cumValues
        if (
          typeof cumValues === 'object' &&
          cumValues !== null &&
          cumValues.mergeObject
        ) {
          Object.assign(
            cumValues,
            newStateVariableValues[componentName][varName],
          );
        } else {
          this.cumulativeStateVariableChanges[componentName][varName] =
            newStateVariableValues[componentName][varName];
        }
      }
    }

    let changeString = JSON.stringify(
      this.cumulativeStateVariableChanges,
      serializedComponentsReplacer,
    );

    let variantString = JSON.stringify(
      this.generatedVariant,
      serializedComponentsReplacer,
    );

    // save to database
    // check the cookie to see if allowed to record
    // display warning if is assignment for class and have returned off recording
    // maybe that's shown when enroll in class, and you cannot turn it off
    // without disenrolling from class

    // if (assignmentId) {
    //   //Save Assignment Info
    //   console.log('assignment')
    // }

    const phpUrl = '/api/recordContentInteraction.php';
    const data = {
      contentId,
      stateVariables: changeString,
      attemptNumber: this.attemptNumber,
      assignmentId: this.assignmentId,
      variant: variantString,
    };

    axios.post(phpUrl, data).then((resp) => {
      console.log('save', resp.data);
    });
  }

  loadDoenetML(contentId, callback) {
    axios.get(`/media/${contentId}.doenet`).then((resp) => {
      if (callback) {
        callback({
          contentId,
          doenetML: resp.data,
        });
      }
    });
  }

  loadState(callback) {
    if (this.props.ignoreDatabase) {
      callback({
        stateVariables: null,
        variant: null,
      });
      return;
    }

    const phpUrl = '/api/loadContentInteractions.php';
    const data = {
      contentId: this.contentId,
      attemptNumber: this.attemptNumber,
      assignmentId: this.assignmentId,
    };
    const payload = {
      params: data,
    };

    axios.get(phpUrl, payload).then((resp) => {
      console.log('load ci', resp.data);
      if (callback) {
        callback({
          stateVariables: resp.data.stateVariables,
          variant: resp.data.variant,
        });
      }
    });
  }

  //offscreen then postpone that one
  update(instructions) {
    for (let instruction of instructions) {
      if (instruction.instructionType === 'updateStateVariable') {
        for (let componentName of instruction.renderersToUpdate.filter(
          (x) => x in this.rendererUpdateMethods,
        )) {
          this.rendererUpdateMethods[componentName].update({
            sourceOfUpdate: instruction.sourceOfUpdate,
          });
        }
      } else if (instruction.instructionType === 'addRenderer') {
        if (instruction.parentName in this.rendererUpdateMethods)
          this.rendererUpdateMethods[instruction.parentName].addChildren(
            instruction,
          );
      } else if (instruction.instructionType === 'deleteRenderers') {
        if (instruction.parentName in this.rendererUpdateMethods)
          this.rendererUpdateMethods[instruction.parentName].removeChildren(
            instruction,
          );
      } else if (instruction.instructionType === 'swapChildRenderers') {
        if (instruction.parentName in this.rendererUpdateMethods)
          this.rendererUpdateMethods[instruction.parentName].swapChildren(
            instruction,
          );
      }
    }
  }

  submitResponse({ itemNumber, itemCreditAchieved, callBack }) {
    // console.log('CALLED!',
    //   itemNumber,
    //   itemCreditAchieved
    // )
    //
    if (this.assignmentId) {
      const payload = {
        assignmentId: this.assignmentId,
        attemptNumber: this.attemptNumber,
        credit: itemCreditAchieved,
        itemNumber,
      };
      axios.post('/api/saveCreditForItem.php', payload).then((resp) => {
        // console.log('saveCreditForItem-->>>',resp.data);
      });
    }

    callBack('submitResponse callback parameter');
  }

  // TODO: if assignmentId, then need to record fact that student
  // viewed solution in user_assignment_attempt_item
  recordSolutionView({ itemNumber, scoredComponent, callBack }) {
    console.log(`reveal solution, ${itemNumber}`);

    if (this.assignmentId) {
      console.warn(`Need to record solution view in the database!!`);

      // TODO: is there a condition where we don't allow solution view?
      // Presumably some setting from course
      // But, should the condition be checked on the server?

      // TODO: call callBack as callBack from php call
      callBack({ allowView: true, message: '', scoredComponent });
    } else {
      // if not an assignment, immediately show solution
      callBack({ allowView: true, message: '', scoredComponent });
    }
  }

  recordEvent(event) {
    if (this.props.ignoreDatabase) {
      return;
    }

    const payload = {
      assignmentId: this.assignmentId,
      contentId: this.contentId,
      attemptNumber: this.attemptNumber,
      variant: JSON.stringify(
        this.generatedVariant,
        serializedComponentsReplacer,
      ),
      verb: event.verb,
      object: JSON.stringify(event.object, serializedComponentsReplacer),
      result: JSON.stringify(event.result, serializedComponentsReplacer),
      context: JSON.stringify(event.context, serializedComponentsReplacer),
      timestamp: event.timestamp,
      version: '0.1.0',
    };

    axios.post('/api/recordEvent.php', payload).then((resp) => {
      // console.log('recordEvent-->>>',resp.data);
    });
  }

  render() {
    return this.documentRenderer;
  }
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMsg: '',
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMsg: error.toString(),
    };
  }

  render() {
    if (this.state.hasError) {
      return <b>{this.state.errorMsg}</b>;
    }

    return this.props.children;
  }
}

function DoenetViewer(props) {
  return (
    <ErrorBoundary>
      <DoenetViewerChild {...props} />
    </ErrorBoundary>
  );
}

export default DoenetViewer;

async function renderersloadComponent(promises, rendererClassNames) {
  var rendererClasses = {};
  for (let [index, promise] of promises.entries()) {
    try {
      let module = await promise;
      rendererClasses[rendererClassNames[index]] = module.default;
    } catch (error) {
      console.log(error);
      console.error(`Error: loading ${rendererClassNames[index]} failed.`);
    }
  }
  return rendererClasses;
}
