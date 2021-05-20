import React from 'react';
import ReactDOM from 'react-dom';
import DoenetRenderer from './DoenetRenderer';
import me from 'math-expressions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faLevelDownAlt,
  faTimes,
  faCloud,
  faPercentage,
} from '@fortawesome/free-solid-svg-icons';
import styled from 'styled-components';
// import MathJax from 'react-mathjax2';
//snowpack is not a fan of destructing here for some reason?
import mathquill from 'react-mathquill';
// import { latexToAst, substituteUnicodeInLatexString } from '../../Core/utils/math';
//  /Doenet/utils/math';
mathquill.addStyles(); //Styling for react-mathquill input field
let EditableMathField = mathquill.EditableMathField;

// const Prev = styled.div`
//   font-size: 23px;
//   // min-height: 30px;
//   background: rgba(0, 0, 0, 0.8);
//   width: auto;
//   display: inline-block;
//   border-radius: 5px;
//   color: white;
//   // line-height: 0px;
//   z-index: 10;
//   padding: 3px;
//   // position: absolute;
//   user-select: none;
//   // left: ${props => `${props.left}px`};
//   // top: ${props => `${props.top}px`};
// `;

export default class MathInput extends DoenetRenderer {
  constructor(props) {
    super(props);

    this.state = { latex: '' };
    // const [latex, setLatex] = useState("");
    // const config = {
    //   autoCommands: "sqrt pi theta",
    //   autoOperatorNames: "cos sin"
    // };

    this.handlePressEnter = this.handlePressEnter.bind(this);
    // this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.onChangeHandler = this.onChangeHandler.bind(this);
    // this.handleDragEnter = this.handleDragEnter.bind(this);
    // this.handleDragThrough = this.handleDragThrough.bind(this);
    // this.handleDragExit = this.handleDragExit.bind(this);

    this.mathExpression = this.doenetSvData.valueForDisplay;
    this.latexValue = stripLatex(this.doenetSvData.valueForDisplay.toLatex());

    // this.state = {isDragging: false, previewLeftOffset: this.doenetSvData.size * 10 + 80, previewTopOffset: 0, clickXOffset: 0, clickYOffset: 0};
    // this.inputRef = React.createRef();
    // this.mathInputRef = React.createRef();

    this.valueToRevertTo = this.doenetSvData.value;
    this.valueForDisplayToRevertTo = this.doenetSvData.valueForDisplay;
    // this.latexValueToRevertTo = this.latexValue;
    // this.previewValue = "";

    //Remove __ value so it doesn't show
    if (this.latexValue === '\uFF3F') {
      this.latexValue = '';
    }
  }

  static initializeChildrenOnConstruction = false;

  componentDidMount() {
    // if (this && this.mathInputRef){
    //   let rect = this.mathInputRef.current.getBoundingClientRect();
    // // this.setState({previewLeftOffset: rect.width + rect.left + 2, previewTopOffset: rect.top -17});
    // this.setState({previewLeftOffset: rect.left, previewTopOffset: rect.height + rect.top - 2 });
    // }
  }

  calculateMathExpressionFromLatex(text) {
    let expression;

    text = substituteUnicodeInLatexString(text);
    let fromLatex = getCustomFromLatex({
      functionSymbols: this.doenetSvData.functionSymbols,
    });
    try {
      expression = fromLatex(text);
    } catch (e) {
      // TODO: error on bad text
      expression = me.fromAst('\uFF3F');
    }
    return expression;
  }

  updateImmediateValueFromLatex(text) {
    // update immediateValue to the math expression corresponding to text
    // if the math expression corresponding to text is different
    // from the current math expression

    // to detect changes only due to a different value
    // (and not to other differences, in particular to representation of scientific notation)
    // convert the latexValue to a math expression rather than using the current math expression
    let currentMathExpressionNormalized = this.calculateMathExpressionFromLatex(
      this.latexValue,
    );

    this.latexValue = text;
    let newMathExpression = this.calculateMathExpressionFromLatex(text);
    if (!newMathExpression.equalsViaSyntax(currentMathExpressionNormalized)) {
      this.mathExpression = newMathExpression;
      this.actions.updateImmediateValue({
        mathExpression: newMathExpression,
      });
    }

    // //evalute math expression
    //   let nextPreviewValue = newMathExpression.toLatex();

    //   if (nextPreviewValue === "＿"){
    //     //Error
    //     clearTimeout(this.timer)
    //     this.timer = setTimeout(()=>{
    //       this.previewValue = "Err";
    //       this.forceUpdate();
    //     },1000)
    //   }else{
    //     //No Error
    //     clearTimeout(this.timer)
    //     this.previewValue = nextPreviewValue;
    //   }
  }

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

  // handleDragEnter(e) {
  //   this.setState({
  //     isDragging: true,
  //     clickXOffset: e.pageX - this.state.previewLeftOffset,
  //     clickYOffset: e.pageY - this.state.previewTopOffset,
  //   })
  // }

  // handleDragThrough(e) {
  //   if(this.state.isDragging){
  //     // console.log();
  //     this.setState({previewLeftOffset: e.pageX - this.state.clickXOffset, previewTopOffset: e.pageY - this.state.clickYOffset});
  //   }
  // }

  // handleDragExit(e){
  //   this.setState({
  //     isDragging: false,
  //     clickXOffset: 0,
  //     clickYOffset: 0,
  //   })
  // }

  handlePressEnter(e) {
    this.valueToRevertTo = this.doenetSvData.immediateValue;
    this.valueForDisplayToRevertTo = this.mathExpression;

    // this.latexValueToRevertTo = this.latexValue;
    if (
      !this.doenetSvData.value.equalsViaSyntax(this.doenetSvData.immediateValue)
    ) {
      this.actions.updateValue();
    }
    if (
      this.doenetSvData.includeCheckWork &&
      this.validationState === 'unvalidated'
    ) {
      this.actions.submitAnswer();
    }
    this.forceUpdate();
  }

  // handleKeyDown(e) {
  //   if (e.key === "Escape") {
  //     if (!this.mathExpression.equalsViaSyntax(this.valueForDisplayToRevertTo)) {
  //       this.mathExpression = this.valueForDisplayToRevertTo;
  //       this.actions.updateImmediateValue({
  //         mathExpression: this.valueToRevertTo
  //       });
  //       this.forceUpdate();
  //     }
  //   }
  // }

  handleFocus(e) {
    this.focused = true;
    this.forceUpdate();
  }

  handleBlur(e) {
    this.focused = false;
    this.valueToRevertTo = this.doenetSvData.immediateValue;
    this.valueForDisplayToRevertTo = this.mathExpression;
    // this.latexValueToRevertTo = this.latexValue;
    if (
      !this.doenetSvData.value.equalsViaSyntax(this.doenetSvData.immediateValue)
    ) {
      this.actions.updateValue();
    }
    this.forceUpdate();
  }

  onChangeHandler(e) {
    this.updateImmediateValueFromLatex(e);
    this.forceUpdate();
  }

  render() {
    if (this.doenetSvData.hidden) {
      return null;
    }

    this.updateValidationState();

    // const inputKey = this.componentName + '_input';

    let surroundingBorderColor = '#efefef';
    if (this.focused) {
      surroundingBorderColor = '#82a5ff';
    }

    if (
      !this.valueForDisplayToRevertTo.equalsViaSyntax(
        this.doenetSvData.valueForDisplay,
      )
    ) {
      // The valueForDisplay coming from the mathInput component
      // is not the same as the renderer's value
      // so we change the renderer's value to match

      this.mathExpression = this.doenetSvData.valueForDisplay;
      this.latexValue = stripLatex(this.mathExpression.toLatex());
      if (this.latexValue === '\uFF3F') {
        this.latexValue = '';
      }
      this.valueToRevertTo = this.doenetSvData.value;
      this.valueForDisplayToRevertTo = this.doenetSvData.valueForDisplay;
      // this.latexValueToRevertTo = this.latexValue;
    }

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
      zIndex: '0',
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
        <a name={this.componentName} />

        <span className="textInputSurroundingBox" id={this.componentName}>
          {/* <input
        key={inputKey}
        id={inputKey}
        ref = {this.inputRef}
        value={this.textValue}
        disabled={this.doenetSvData.disabled}
        onChange={this.onChangeHandler}
        onKeyPress={this.handleKeyPress}
        onKeyDown={this.handleKeyDown}
        onBlur={this.handleBlur}
        onFocus={this.handleFocus}
        style={{
          width: `${this.doenetSvData.size * 10}px`,
          height: "22px",
          fontSize: "14px",
          borderWidth: "1px",
          borderColor: surroundingBorderColor,
          padding: "4px",
          // position: "absolute",
        }}
      /> */}
          <span style={{ margin: '10px' }}>
            <EditableMathField
              latex={this.latexValue}
              config={{
                autoCommands: 'sqrt pi theta integral',
                handlers: {
                  enter: this.handlePressEnter,
                },
              }} //more commands go here
              onChange={(mathField) => {
                this.onChangeHandler(mathField.latex());
              }}
              onBlur={this.handleBlur}
              onFocus={this.handleFocus}
            />
            {/* <p>{this.mathExpression.toLatex()}</p> */}
          </span>
          {checkWorkButton}
          {/* {this.textValue ? 
      <Prev style = {{top: this.state.previewTopOffset+"px", left: this.state.previewLeftOffset+"px"}} onMouseDown = {this.handleDragEnter} onMouseMove = {this.handleDragThrough} onMouseUp = {this.handleDragExit} onMouseLeave = {this.handleDragExit}>
        <div>
          <MathJax.Context input='tex'>
              <div>
                  <MathJax.Node inline>{this.textValue ? this.previewValue : ''}</MathJax.Node>
              </div>
          </MathJax.Context>
        </div>
      </Prev> : 
      null} */}
        </span>
      </React.Fragment>
    );
  }
}

function stripLatex(latex) {
  let s = latex.replaceAll(`\\,`, '');

  return s;
}

// TODO: how to fix case where have readyonly?
// need to revert mathExpression in that case

// else if(!this.mathExpression.equalsViaSyntax(this.doenetSvData.immediateValue)) {
//   console.log(`for ${this.componentName}`)
//   console.log(`math expression: ${this.mathExpression.toString()}`)
//   console.log(`immediateValue: ${this.doenetSvData.immediateValue.toString()}`)

//   this.mathExpression = this.doenetSvData.value;
//   this.textValue = this.mathExpression.toString();
//   if (this.textValue === '\uFF3F') {
//     this.textValue = "";
//   }
//   this.valueToRevertTo = this.doenetSvData.value;
//   this.textValueToRevertTo = this.textValue;

// }

//---------------------------------------------------------------

// since can't import this from core/utils/math.js
// include functions here

// TODO: determine how to import so don't repeat code

var appliedFunctionSymbols = [
  'abs',
  'exp',
  'log',
  'ln',
  'log10',
  'sign',
  'sqrt',
  'erf',
  'acos',
  'acosh',
  'acot',
  'acoth',
  'acsc',
  'acsch',
  'asec',
  'asech',
  'asin',
  'asinh',
  'atan',
  'atanh',
  'cos',
  'cosh',
  'cot',
  'coth',
  'csc',
  'csch',
  'sec',
  'sech',
  'sin',
  'sinh',
  'tan',
  'tanh',
  'arcsin',
  'arccos',
  'arctan',
  'arccsc',
  'arcsec',
  'arccot',
  'cosec',
  'arg',
  'min',
  'max',
  'mean',
  'median',
  'floor',
  'ceil',
  'round',
  'sum',
  'prod',
  'var',
  'std',
  'count',
  'mod',
];

function getCustomFromLatex({ functionSymbols }) {
  return (x) =>
    me.fromAst(
      new me.converters.latexToAstObj({
        appliedFunctionSymbols,
        functionSymbols,
      }).convert(x),
    );
}

function substituteUnicodeInLatexString(latexString) {
  let substitutions = [
    ['\u03B1', '\\alpha '], // 'α'
    ['\u03B2', '\\beta '], // 'β'
    ['\u03D0', '\\beta '], // 'ϐ'
    ['\u0393', '\\Gamma '], // 'Γ'
    ['\u03B3', '\\gamma '], // 'γ'
    ['\u0394', '\\Delta '], // 'Δ'
    ['\u03B4', '\\delta '], // 'δ'
    ['\u03B5', '\\epsilon '], // 'ε' should this be varepsilon?
    ['\u03F5', '\\epsilon '], // 'ϵ'
    ['\u03B6', '\\zeta '], // 'ζ'
    ['\u03B7', '\\eta '], // 'η'
    ['\u0398', '\\Theta '], // 'Θ'
    ['\u03F4', '\\Theta '], // 'ϴ'
    ['\u03B8', '\\theta '], // 'θ'
    ['\u1DBF', '\\theta '], // 'ᶿ'
    ['\u03D1', '\\theta '], // 'ϑ'
    ['\u03B9', '\\iota '], // 'ι'
    ['\u03BA', '\\kappa '], // 'κ'
    ['\u039B', '\\Lambda '], // 'Λ'
    ['\u03BB', '\\lambda '], // 'λ'
    ['\u03BC', '\\mu '], // 'μ'
    ['\u00B5', '\\mu '], // 'µ' should this be micro?
    ['\u03BD', '\\nu '], // 'ν'
    ['\u039E', '\\Xi '], // 'Ξ'
    ['\u03BE', '\\xi '], // 'ξ'
    ['\u03A0', '\\Pi '], // 'Π'
    ['\u03C0', '\\pi '], // 'π'
    ['\u03D6', '\\pi '], // 'ϖ' should this be varpi?
    ['\u03C1', '\\rho '], // 'ρ'
    ['\u03F1', '\\rho '], // 'ϱ' should this be varrho?
    ['\u03A3', '\\Sigma '], // 'Σ'
    ['\u03C3', '\\sigma '], // 'σ'
    ['\u03C2', '\\sigma '], // 'ς' should this be varsigma?
    ['\u03C4', '\\tau '], // 'τ'
    ['\u03A5', '\\Upsilon '], // 'Υ'
    ['\u03C5', '\\upsilon '], // 'υ'
    ['\u03A6', '\\Phi '], // 'Φ'
    ['\u03C6', '\\phi '], // 'φ' should this be varphi?
    ['\u03D5', '\\phi '], // 'ϕ'
    ['\u03A8', '\\Psi '], // 'Ψ'
    ['\u03C8', '\\psi '], // 'ψ'
    ['\u03A9', '\\Omega '], // 'Ω'
    ['\u03C9', '\\omega '], // 'ω'
  ];

  for (let sub of substitutions) {
    latexString = latexString.replaceAll(sub[0], sub[1]);
  }

  return latexString;
}
