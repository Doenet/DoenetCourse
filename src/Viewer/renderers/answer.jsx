import React from 'react';
import DoenetRenderer from './DoenetRenderer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faLevelDownAlt,
  faTimes,
  faCloud,
  faPercentage,
} from '@fortawesome/free-solid-svg-icons';

export default class Answer extends DoenetRenderer {
  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    let submitAnswer = this.actions.submitAnswer;
    if (this.doenetSvData.submitAllAnswersAtAncestor) {
      submitAnswer = this.actions.submitAllAnswers;
    }

    if (!this.doenetSvData.delegateCheckWork) {
      let validationState = 'unvalidated';
      if (this.doenetSvData.justSubmittedForSubmitButton) {
        if (this.doenetSvData.creditAchievedForSubmitButton === 1) {
          validationState = 'correct';
        } else if (this.doenetSvData.creditAchievedForSubmitButton === 0) {
          validationState = 'incorrect';
        } else {
          validationState = 'partialcorrect';
        }
      }

      let checkWorkStyle = {
        height: '23px',
        display: 'inline-block',
        backgroundColor: 'rgb(2, 117, 216)',
        padding: '1px 6px 1px 6px',
        color: 'white',
        fontWeight: 'bold',
        //marginBottom: "30px",  //Space after check work
      };

      if (this.doenetSvData.disabled) {
        checkWorkStyle.backgroundColor = 'rgb(200,200,200)';
      }

      let checkWorkText = 'Check Work';
      if (!this.doenetSvData.showCorrectness) {
        checkWorkText = 'Submit Response';
      }
      let checkworkComponent = (
        <button
          id={this.componentName + '_submit'}
          tabIndex="0"
          disabled={this.doenetSvData.disabled}
          style={checkWorkStyle}
          onClick={submitAnswer}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              submitAnswer();
            }
          }}
        >
          <FontAwesomeIcon icon={faLevelDownAlt} transform={{ rotate: 90 }} />
          &nbsp;
          {checkWorkText}
        </button>
      );

      if (this.doenetSvData.showCorrectness) {
        if (validationState === 'correct') {
          checkWorkStyle.backgroundColor = 'rgb(92, 184, 92)';
          checkworkComponent = (
            <span id={this.componentName + '_correct'} style={checkWorkStyle}>
              <FontAwesomeIcon icon={faCheck} />
              &nbsp; Correct
            </span>
          );
        } else if (validationState === 'incorrect') {
          checkWorkStyle.backgroundColor = 'rgb(187, 0, 0)';
          checkworkComponent = (
            <span id={this.componentName + '_incorrect'} style={checkWorkStyle}>
              <FontAwesomeIcon icon={faTimes} />
              &nbsp; Incorrect
            </span>
          );
        } else if (validationState === 'partialcorrect') {
          checkWorkStyle.backgroundColor = '#efab34';
          let percent = Math.round(
            this.doenetSvData.creditAchievedForSubmitButton * 100,
          );
          let partialCreditContents = `${percent}% Correct`;

          checkworkComponent = (
            <span id={this.componentName + '_partial'} style={checkWorkStyle}>
              {partialCreditContents}
            </span>
          );
        }
      } else {
        // showCorrectness is false
        if (validationState !== 'unvalidated') {
          checkWorkStyle.backgroundColor = 'rgb(74, 3, 217)';
          checkworkComponent = (
            <span id={this.componentName + '_saved'} style={checkWorkStyle}>
              <FontAwesomeIcon icon={faCloud} />
              &nbsp; Response Saved
            </span>
          );
        }
      }

      return (
        <span id={this.componentName}>
          <a name={this.componentName} />
          {this.children}
          {checkworkComponent}
        </span>
      );
    } else {
      return (
        <span id={this.componentName}>
          <a name={this.componentName} />
          {this.children}
        </span>
      );
    }
  }
}
