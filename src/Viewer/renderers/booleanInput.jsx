import React from 'react';
import ReactDOM from 'react-dom';
import DoenetRenderer from './DoenetRenderer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faLevelDownAlt,
  faTimes,
  faCloud,
  faPercentage,
} from '@fortawesome/free-solid-svg-icons';

export default class BooleanInput extends DoenetRenderer {
  constructor(props) {
    super(props);

    this.onChangeHandler = this.onChangeHandler.bind(this);
  }

  static initializeChildrenOnConstruction = false;

  updateValidationState() {
    this.validationState = 'unvalidated';
    if (this.doenetSvData.valueHasBeenValidated) {
      if (this.doenetSvData.creditAchievedForSubmitButton === 1) {
        this.validationState = 'correct';
      } else if (this.doenetSvData.creditAchievedForSubmitButton === 0) {
        this.validationState = 'incorrect';
      } else {
        this.validationState = 'partialcorrect';
      }
    }
  }

  onChangeHandler(e) {
    this.actions.updateBoolean({
      boolean: e.target.checked,
    });
    this.forceUpdate();
  }

  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    this.updateValidationState();

    const inputKey = this.componentName + '_input';

    let checkWorkStyle = {
      position: 'relative',
      width: '30px',
      height: '24px',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#ffffff',
      display: 'inline-block',
      textAlign: 'center',
      top: '3px',
      padding: '2px',
    };

    //Assume we don't have a check work button
    let checkWorkButton = null;
    if (this.doenetSvData.includeCheckWork) {
      if (this.validationState === 'unvalidated') {
        checkWorkStyle.backgroundColor = 'rgb(2, 117, 216)';
        checkWorkButton = (
          <button
            id={this.componentName + '_submit'}
            tabIndex="0"
            ref={(c) => {
              this.target = c && ReactDOM.findDOMNode(c);
            }}
            style={checkWorkStyle}
            onClick={this.actions.submitAnswer}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                this.actions.submitAnswer();
              }
            }}
          >
            <FontAwesomeIcon icon={faLevelDownAlt} transform={{ rotate: 90 }} />
          </button>
        );
      } else {
        if (this.doenetSvData.showCorrectness) {
          if (this.validationState === 'correct') {
            checkWorkStyle.backgroundColor = 'rgb(92, 184, 92)';
            checkWorkButton = (
              <span
                id={this.componentName + '_correct'}
                style={checkWorkStyle}
                ref={(c) => {
                  this.target = c && ReactDOM.findDOMNode(c);
                }}
              >
                <FontAwesomeIcon icon={faCheck} />
              </span>
            );
          } else if (this.validationState === 'partialcorrect') {
            //partial credit

            let percent = Math.round(
              this.doenetSvData.creditAchievedForSubmitButton * 100,
            );
            let partialCreditContents = `${percent} %`;
            checkWorkStyle.width = '50px';

            checkWorkStyle.backgroundColor = '#efab34';
            checkWorkButton = (
              <span
                id={this.componentName + '_partial'}
                style={checkWorkStyle}
                ref={(c) => {
                  this.target = c && ReactDOM.findDOMNode(c);
                }}
              >
                {partialCreditContents}
              </span>
            );
          } else {
            //incorrect
            checkWorkStyle.backgroundColor = 'rgb(187, 0, 0)';
            checkWorkButton = (
              <span
                id={this.componentName + '_incorrect'}
                style={checkWorkStyle}
                ref={(c) => {
                  this.target = c && ReactDOM.findDOMNode(c);
                }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </span>
            );
          }
        } else {
          // showCorrectness is false
          checkWorkStyle.backgroundColor = 'rgb(74, 3, 217)';
          checkWorkButton = (
            <span
              id={this.componentName + '_saved'}
              style={checkWorkStyle}
              ref={(c) => {
                this.target = c && ReactDOM.findDOMNode(c);
              }}
            >
              <FontAwesomeIcon icon={faCloud} />
            </span>
          );
        }
      }
    }

    return (
      <React.Fragment>
        <span id={this.componentName}>
          <a name={this.componentName} />
          <label>
            <input
              type="checkbox"
              key={inputKey}
              id={inputKey}
              checked={this.doenetSvData.value}
              onChange={this.onChangeHandler}
            />
            {this.doenetSvData.label}
          </label>
          {checkWorkButton}
        </span>
      </React.Fragment>
    );
  }
}
