import InlineComponent from './abstract/InlineComponent';
import me from 'math-expressions';
import {
  getCustomFromText,
  getCustomFromLatex,
  convertValueToMathExpression,
  normalizeMathExpression,
  roundForDisplay,
} from '../utils/math';
import { flattenDeep } from '../utils/array';

export default class MathComponent extends InlineComponent {
  static componentType = 'math';

  // used when creating new component via adapter or copy prop
  static primaryStateVariableForDefinition = 'unnormalizedValue';

  // used when referencing this component without prop
  static useChildrenForReference = false;
  static get stateVariablesShadowedForReference() {
    return ['unnormalizedValue'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.format = {
      createComponentOfType: 'text',
      createStateVariable: 'format',
      defaultValue: 'text',
      public: true,
      validValues: ['text', 'latex'],
    };
    // let simplify="" or simplify="true" be full simplify
    attributes.simplify = {
      createComponentOfType: 'text',
      createStateVariable: 'simplify',
      defaultValue: 'none',
      public: true,
      toLowerCase: true,
      valueTransformations: { true: 'full' },
      validValues: ['none', 'full', 'numbers', 'numberspreserveorder'],
    };
    attributes.expand = {
      createComponentOfType: 'boolean',
      createStateVariable: 'expand',
      defaultValue: false,
      public: true,
    };

    attributes.displayDigits = {
      createComponentOfType: 'number',
      createStateVariable: 'displayDigits',
      defaultValue: 10,
      public: true,
    };

    attributes.displayDecimals = {
      createComponentOfType: 'number',
      createStateVariable: 'displayDecimals',
      defaultValue: null,
      public: true,
    };
    attributes.displaySmallAsZero = {
      createComponentOfType: 'boolean',
      createStateVariable: 'displaySmallAsZero',
      defaultValue: false,
      public: true,
    };
    attributes.renderMode = {
      createComponentOfType: 'text',
      createStateVariable: 'renderMode',
      defaultValue: 'inline',
      public: true,
      forRenderer: true,
    };
    attributes.unordered = {
      createComponentOfType: 'boolean',
      createStateVariable: 'unordered',
      defaultValue: false,
      public: true,
    };
    attributes.createVectors = {
      createComponentOfType: 'boolean',
      createStateVariable: 'createVectors',
      defaultValue: false,
      public: true,
    };
    attributes.createIntervals = {
      createComponentOfType: 'boolean',
      createStateVariable: 'createIntervals',
      defaultValue: false,
      public: true,
    };

    attributes.functionSymbols = {
      createComponentOfType: 'textList',
      createStateVariable: 'functionSymbols',
      defaultValue: ['f', 'g'],
      public: true,
    };

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atLeastZeroStrings = childLogic.newLeaf({
      name: 'atLeastZeroStrings',
      componentType: 'string',
      comparison: 'atLeast',
      number: 0,
    });
    let atLeastZeroMaths = childLogic.newLeaf({
      name: 'atLeastZeroMaths',
      componentType: 'math',
      comparison: 'atLeast',
      number: 0,
    });
    childLogic.newOperator({
      name: 'stringsAndMaths',
      operator: 'and',
      propositions: [atLeastZeroStrings, atLeastZeroMaths],
      requireConsecutive: true,
      setAsBase: true,
    });
    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    // valueShadow will be long underscore unless math was created
    // from serialized state with value
    stateVariableDefinitions.valueShadow = {
      defaultValue: me.fromAst('\uff3f'), // long underscore
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          valueShadow: { variablesToCheck: ['value', 'valueShadow'] },
        },
      }),
      inverseDefinition: function ({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'valueShadow',
              value: desiredStateVariableValues.valueShadow,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.codePre = {
      // deferCalculation: false,
      returnDependencies: () => ({
        stringChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroStrings',
          variableNames: ['value'],
        },
      }),
      definition: calculateCodePre,
    };

    stateVariableDefinitions.expressionWithCodes = {
      // deferCalculation: false,
      returnDependencies: () => ({
        stringMathChildren: {
          dependencyType: 'child',
          childLogicName: 'stringsAndMaths',
          variableNames: ['value'],
        },
        format: {
          dependencyType: 'stateVariable',
          variableName: 'format',
        },
        codePre: {
          dependencyType: 'stateVariable',
          variableName: 'codePre',
        },
        createVectors: {
          dependencyType: 'stateVariable',
          variableName: 'createVectors',
        },
        createIntervals: {
          dependencyType: 'stateVariable',
          variableName: 'createIntervals',
        },
        functionSymbols: {
          dependencyType: 'stateVariable',
          variableName: 'functionSymbols',
        },
      }),
      definition: calculateExpressionWithCodes,
      inverseDefinition({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'expressionWithCodes',
              value: desiredStateVariableValues.expressionWithCodes,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.unnormalizedValue = {
      returnDependencies: () => ({
        mathChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroMaths',
          variableNames: ['value', 'canBeModified'],
        },
        stringChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroStrings',
          variableNames: ['value'],
        },
        expressionWithCodes: {
          dependencyType: 'stateVariable',
          variableName: 'expressionWithCodes',
        },
        codePre: {
          dependencyType: 'stateVariable',
          variableName: 'codePre',
        },
        valueShadow: {
          dependencyType: 'stateVariable',
          variableName: 'valueShadow',
        },
      }),
      set: convertValueToMathExpression,
      defaultValue: me.fromAst('\uff3f'), // long underscore
      definition: calculateMathValue,
      inverseDefinition: invertMath,
    };

    stateVariableDefinitions.value = {
      public: true,
      componentType: this.componentType,
      returnDependencies: () => ({
        unnormalizedValue: {
          dependencyType: 'stateVariable',
          variableName: 'unnormalizedValue',
        },
        simplify: {
          dependencyType: 'stateVariable',
          variableName: 'simplify',
        },
        expand: {
          dependencyType: 'stateVariable',
          variableName: 'expand',
        },
        createVectors: {
          dependencyType: 'stateVariable',
          variableName: 'createVectors',
        },
        createIntervals: {
          dependencyType: 'stateVariable',
          variableName: 'createIntervals',
        },
      }),
      definition: function ({ dependencyValues }) {
        let value = dependencyValues.unnormalizedValue;

        let { simplify, expand, createVectors, createIntervals } =
          dependencyValues;

        value = normalizeMathExpression({
          value,
          simplify,
          expand,
          createVectors,
          createIntervals,
        });

        return { newValues: { value } };
      },
      inverseDefinition: function ({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setDependency: 'unnormalizedValue',
              desiredValue: desiredStateVariableValues.value,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.number = {
      public: true,
      componentType: 'number',
      returnDependencies: () => ({
        value: {
          dependencyType: 'stateVariable',
          variableName: 'value',
        },
      }),
      definition: function ({ dependencyValues }) {
        let number = dependencyValues.value.evaluate_to_constant();
        if (number === null) {
          number = NaN;
        }
        return { newValues: { number } };
      },
      inverseDefinition: function ({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setDependency: 'value',
              desiredValue: me.fromAst(desiredStateVariableValues.number),
            },
          ],
        };
      },
    };

    // isNumber is true if the value of the math is an actual number
    stateVariableDefinitions.isNumber = {
      public: true,
      componentType: 'boolean',
      returnDependencies: () => ({
        value: {
          dependencyType: 'stateVariable',
          variableName: 'value',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            isNumber: Number.isFinite(dependencyValues.value.tree),
          },
        };
      },
    };

    // isNumeric is weaker than isNumber
    // isNumeric is true if the value can be evaluated as a number,
    // i.e., if the number state variable is a number
    stateVariableDefinitions.isNumeric = {
      public: true,
      componentType: 'boolean',
      returnDependencies: () => ({
        number: {
          dependencyType: 'stateVariable',
          variableName: 'number',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            isNumeric: Number.isFinite(dependencyValues.number),
          },
        };
      },
    };

    stateVariableDefinitions.valueForDisplay = {
      returnDependencies: () => ({
        value: {
          dependencyType: 'stateVariable',
          variableName: 'value',
        },
        displayDigits: {
          dependencyType: 'stateVariable',
          variableName: 'displayDigits',
        },
        displayDecimals: {
          dependencyType: 'stateVariable',
          variableName: 'displayDecimals',
        },
        displaySmallAsZero: {
          dependencyType: 'stateVariable',
          variableName: 'displaySmallAsZero',
        },
        simplify: {
          dependencyType: 'stateVariable',
          variableName: 'simplify',
        },
        expand: {
          dependencyType: 'stateVariable',
          variableName: 'expand',
        },
      }),
      definition: function ({ dependencyValues, usedDefault }) {
        // for display via latex and text, round any decimal numbers to the significant digits
        // determined by displaydigits or displaydecimals
        let rounded = roundForDisplay({
          value: dependencyValues.value,
          dependencyValues,
          usedDefault,
        });

        return {
          newValues: {
            valueForDisplay: normalizeMathExpression({
              value: rounded,
              simplify: dependencyValues.simplify,
              expand: dependencyValues.expand,
            }),
          },
        };
      },
    };

    stateVariableDefinitions.latex = {
      public: true,
      componentType: 'text',
      returnDependencies: () => ({
        valueForDisplay: {
          dependencyType: 'stateVariable',
          variableName: 'valueForDisplay',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: { latex: dependencyValues.valueForDisplay.toLatex() },
        };
      },
    };

    stateVariableDefinitions.latexWithInputChildren = {
      forRenderer: true,
      returnDependencies: () => ({
        latex: {
          dependencyType: 'stateVariable',
          variableName: 'latex',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: { latexWithInputChildren: [dependencyValues.latex] },
        };
      },
    };

    stateVariableDefinitions.text = {
      public: true,
      componentType: 'text',
      returnDependencies: () => ({
        valueForDisplay: {
          dependencyType: 'stateVariable',
          variableName: 'valueForDisplay',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: { text: dependencyValues.valueForDisplay.toString() },
        };
      },
    };

    stateVariableDefinitions.codesAdjacentToStrings = {
      returnDependencies: () => ({
        stringMathChildren: {
          dependencyType: 'child',
          childLogicName: 'stringsAndMaths',
        },
        codePre: {
          dependencyType: 'stateVariable',
          variableName: 'codePre',
        },
        format: {
          dependencyType: 'stateVariable',
          variableName: 'format',
        },
      }),
      definition: calculateCodesAdjacentToStrings,
    };

    stateVariableDefinitions.canBeModified = {
      additionalStateVariablesDefined: [
        'constantChildIndices',
        'codeForExpression',
        'inverseMaps',
        'template',
        'mathChildrenMapped',
      ],
      returnDependencies: () => ({
        mathChildrenModifiable: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroMaths',
          variableNames: ['canBeModified'],
        },
        expressionWithCodes: {
          dependencyType: 'stateVariable',
          variableName: 'expressionWithCodes',
        },
        modifyIndirectly: {
          dependencyType: 'stateVariable',
          variableName: 'modifyIndirectly',
        },
        fixed: {
          dependencyType: 'stateVariable',
          variableName: 'fixed',
        },
        codePre: {
          dependencyType: 'stateVariable',
          variableName: 'codePre',
        },
      }),
      definition: determineCanBeModified,
    };

    stateVariableDefinitions.mathChildrenByArrayComponent = {
      returnDependencies: () => ({
        codePre: {
          dependencyType: 'stateVariable',
          variableName: 'codePre',
        },
        mathChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroMaths',
        },
        expressionWithCodes: {
          dependencyType: 'stateVariable',
          variableName: 'expressionWithCodes',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.expressionWithCodes === null) {
          return { newValues: { mathChildrenByArrayComponent: null } };
        }
        let expressionWithCodesTree = dependencyValues.expressionWithCodes.tree;
        let nMathChildren = dependencyValues.mathChildren.length;

        if (
          nMathChildren === 0 ||
          !Array.isArray(expressionWithCodesTree) ||
          !['tuple', 'vector'].includes(expressionWithCodesTree[0])
        ) {
          return { newValues: { mathChildrenByArrayComponent: null } };
        }

        let mathChildrenByArrayComponent = {};

        let childInd = 0;
        let childCode = dependencyValues.codePre + childInd;

        for (let ind = 1; ind < expressionWithCodesTree.length; ind++) {
          let exprComp = expressionWithCodesTree[ind];
          let mc = (mathChildrenByArrayComponent[ind] = []);

          if (Array.isArray(exprComp)) {
            let flattenedComp = flattenDeep(exprComp);
            while (childCode in flattenedComp) {
              mc.push(childInd);
              childInd++;
              childCode = dependencyValues.codePre + childInd;
            }
          } else {
            if (exprComp === childCode) {
              mc.push(childInd);
              childInd++;
              childCode = dependencyValues.codePre + childInd;
            }
          }

          if (childInd >= nMathChildren) {
            break;
          }
        }

        return { newValues: { mathChildrenByArrayComponent } };
      },
    };

    return stateVariableDefinitions;
  }

  // returnSerializeInstructions() {
  //   let skipChildren = this.childLogic.returnMatches("atLeastZeroStrings").length === 1 &&
  //     this.childLogic.returnMatches("atLeastZeroMaths").length === 0;
  //   if (skipChildren) {
  //     let stateVariables = ["unnormalizedValue"];
  //     return { skipChildren, stateVariables };
  //   }
  //   return {};
  // }

  static adapters = ['number', 'text'];
}

function calculateCodePre({ dependencyValues }) {
  let codePre = 'math';

  // make sure that codePre is not in any string piece
  let foundInString = false;
  do {
    foundInString = false;

    for (let child of dependencyValues.stringChildren) {
      if (
        child.componentType === 'string' &&
        child.stateValues.value.includes(codePre) === true
      ) {
        // found codePre in a string, so extend codePre and try again
        foundInString = true;
        codePre += 'm';
        break;
      }
    }
  } while (foundInString);

  return { newValues: { codePre } };
}

function calculateExpressionWithCodes({ dependencyValues, changes }) {
  if (
    !(
      ('stringMathChildren' in changes &&
        changes.stringMathChildren.componentIdentitiesChanged) ||
      'format' in changes ||
      'createIntervals' in changes ||
      'createVectors' in changes
    )
  ) {
    // if component identities of stringMathChildren didn't change
    // and format didn't change
    // then expressionWithCodes remains unchanged.
    // (We assume that the value of string children cannot change on their own.)
    return { noChanges: ['expressionWithCodes'] };
  }

  // if don't have any string or math children,
  // set expressionWithCodes to be null,
  // which will indicate that value should use its essential or default value
  if (dependencyValues.stringMathChildren.length === 0) {
    return { newValues: { expressionWithCodes: null } };
  }

  let inputString = '';
  let mathInd = 0;
  let lastCompositeInd;
  let compositeGroupString = '';
  let nComponentsInGroup = 0;

  for (let child of dependencyValues.stringMathChildren) {
    if (nComponentsInGroup > 0 && child.compositeInd !== lastCompositeInd) {
      // found end of composite group
      if (nComponentsInGroup > 1) {
        // compositeGroupString contains components separated by commas
        // will wrap in parenthesis unless already contains
        // delimeters before and after
        // TODO: \rangle and \langle?
        let iString = inputString.trimEnd();
        let wrap = false;
        if (iString.length === 0) {
          wrap = true;
        } else {
          let lastChar = iString[iString.length - 1];
          if (!['{', '[', '(', '|', ','].includes(lastChar)) {
            wrap = true;
          } else if (child.componentType !== 'string') {
            wrap = true;
          } else {
            let nextString = child.stateValues.value.trimStart();
            if (nextString.length === 0) {
              wrap = true;
            } else {
              let nextChar = nextString[0];
              if (
                dependencyValues.format === 'latex' &&
                nextChar === '\\' &&
                nextString.length > 1
              ) {
                nextChar = nextString[1];
              }
              if (!['}', ']', ')', '|', ','].includes(nextChar)) {
                wrap = true;
              }
            }
          }
        }

        if (wrap) {
          compositeGroupString = '(' + compositeGroupString + ')';
        }
      }

      inputString += compositeGroupString;
      compositeGroupString = '';
      nComponentsInGroup = 0;
    }

    if (child.componentType === 'string') {
      inputString += ' ' + child.stateValues.value + ' ';
      compositeGroupString = '';
      nComponentsInGroup = 0;
    } else {
      // a math
      let code = dependencyValues.codePre + mathInd;
      mathInd++;

      let nextString;
      if (dependencyValues.format === 'latex') {
        // for latex, must explicitly denote that code
        // is a multicharacter variable
        nextString = '\\var{' + code + '}';
      } else {
        // for text, just make sure code is surrounded by spaces
        // (the presence of numbers inside code will ensure that
        // it is parsed as a multicharcter variable)
        nextString = ' ' + code + ' ';
      }

      if (child.compositeInd !== undefined) {
        if (child.compositeInd === lastCompositeInd) {
          // continuing a composite group
          compositeGroupString += ',';
        }
        compositeGroupString += nextString;
        nComponentsInGroup++;
      } else {
        inputString += nextString;
        compositeGroupString = '';
        nComponentsInGroup = 0;
      }
    }

    lastCompositeInd = child.compositeInd;
  }

  // if ended with a composite, wrap in parens and append
  if (nComponentsInGroup > 0) {
    if (nComponentsInGroup > 1) {
      compositeGroupString = '(' + compositeGroupString + ')';
    }
    inputString += compositeGroupString;
  }

  let expressionWithCodes = null;

  if (inputString === '') {
    expressionWithCodes = me.fromAst('\uFF3F'); // long underscore
  } else {
    if (dependencyValues.format === 'text') {
      let fromText = getCustomFromText({
        functionSymbols: dependencyValues.functionSymbols,
      });
      try {
        expressionWithCodes = fromText(inputString);
      } catch (e) {
        expressionWithCodes = me.fromAst('\uFF3F'); // long underscore
        console.log('Invalid value for a math of text format: ' + inputString);
      }
    } else if (dependencyValues.format === 'latex') {
      let fromLatex = getCustomFromLatex({
        functionSymbols: dependencyValues.functionSymbols,
      });
      try {
        expressionWithCodes = fromLatex(inputString);
      } catch (e) {
        expressionWithCodes = me.fromAst('\uFF3F'); // long underscore
        console.log('Invalid value for a math of latex format: ' + inputString);
      }
    }
    if (dependencyValues.createVectors) {
      expressionWithCodes = expressionWithCodes.tuples_to_vectors();
    }
    if (dependencyValues.createIntervals) {
      expressionWithCodes = expressionWithCodes.to_intervals();
    }
  }

  return {
    newValues: { expressionWithCodes },
    makeEssential: { expressionWithCodes: true },
  };
}

function calculateMathValue({ dependencyValues } = {}) {
  // if expressionWithCodes is null, there were no string or math children
  if (dependencyValues.expressionWithCodes === null) {
    return {
      newValues: { unnormalizedValue: dependencyValues.valueShadow },
      makeEssential: { unnormalizedValue: true }, // make essential since inverseDef sets it
    };
  }

  let subsMapping = {};
  for (let [ind, child] of dependencyValues.mathChildren.entries()) {
    subsMapping[dependencyValues.codePre + ind] = child.stateValues.value;
  }

  let value = dependencyValues.expressionWithCodes;
  if (dependencyValues.mathChildren.length > 0) {
    value = value.substitute(subsMapping);
  }

  return {
    newValues: { unnormalizedValue: value },
    makeEssential: { unnormalizedValue: true }, // make essential since inverseDef sets it
  };
}

function calculateCodesAdjacentToStrings({ dependencyValues }) {
  // create codesAdjacentToStrings object that gives substitution codes
  // that are just before and after each string child
  let codesAdjacentToStrings = [];
  let mathInd;
  for (let [ind, child] of dependencyValues.stringMathChildren.entries()) {
    if (child.componentType === 'string') {
      let nextChild = dependencyValues.stringMathChildren[ind + 1];
      if (nextChild !== undefined && nextChild.componentType === 'string') {
        // if following child is also a string, we'll skip the first string
        // which means, when inverting, the first string will just be set to blank
        continue;
      }

      let subCodes = {};
      if (mathInd !== undefined) {
        if (dependencyValues.format === 'latex') {
          subCodes.prevCode =
            '\\var{' + dependencyValues.codePre + mathInd + '}';
        } else {
          subCodes.prevCode = dependencyValues.codePre + mathInd;
        }
      }

      if (nextChild !== undefined) {
        // next child is a math
        let nextInd = 0;
        if (mathInd !== undefined) {
          nextInd = mathInd + 1;
        }

        if (dependencyValues.format === 'latex') {
          subCodes.nextCode =
            '\\var{' + dependencyValues.codePre + nextInd + '}';
        } else {
          subCodes.nextCode = dependencyValues.codePre + nextInd;
        }
      }

      codesAdjacentToStrings.push(subCodes);
    } else {
      // have a mathChild, so increment mathInd
      if (mathInd === undefined) {
        mathInd = 0;
      } else {
        mathInd++;
      }
    }
  }

  return { newValues: { codesAdjacentToStrings } };
}

function determineCanBeModified({ dependencyValues }) {
  if (!dependencyValues.modifyIndirectly || dependencyValues.fixed) {
    return {
      newValues: {
        canBeModified: false,
        constantChildIndices: null,
        codeForExpression: null,
        inverseMaps: null,
        template: null,
        mathChildrenMapped: null,
      },
    };
  }

  // if have no math children, then can directly set value
  // to any specified expression
  if (dependencyValues.mathChildrenModifiable.length === 0) {
    return {
      newValues: {
        canBeModified: true,
        constantChildIndices: null,
        codeForExpression: null,
        inverseMaps: null,
        template: null,
        mathChildrenMapped: null,
      },
    };
  }

  // determine if can calculate value of activeChildren from
  // any specified value of expression

  // categorize all math activeChildren as variables or constants
  let variableInds = [];
  let variables = [];
  // let constantInds = [];
  let constants = [];

  let constantChildIndices = {};

  for (let [
    ind,
    childModifiable,
  ] of dependencyValues.mathChildrenModifiable.entries()) {
    let substitutionCode = dependencyValues.codePre + ind;

    if (childModifiable.stateValues.canBeModified === true) {
      variableInds.push(ind);
      variables.push(substitutionCode);
    } else {
      // constantInds.push(ind);
      constants.push(substitutionCode);
      constantChildIndices[substitutionCode] = ind;
    }
  }

  // include codePre in code for whole expression, as we know codePre is not in math expression
  let codeForExpression = dependencyValues.codePre + 'expr';
  let tree = me.utils.unflattenLeft(dependencyValues.expressionWithCodes.tree);

  let result = checkForLinearExpression(
    tree,
    variables,
    codeForExpression,
    constants,
  );

  if (result.foundLinear) {
    let inverseMaps = {};
    let template = result.template;
    let mathChildrenMapped = new Set();

    for (let key in result.mappings) {
      inverseMaps[key] = result.mappings[key];

      // if component was due to a math child, add Ind of the math child
      let mathChildSub = inverseMaps[key].mathChildSub;
      if (mathChildSub) {
        let mathChildInd = variableInds[variables.indexOf(mathChildSub)];
        inverseMaps[key].mathChildInd = mathChildInd;
        mathChildrenMapped.add(Number(mathChildInd));
      }
    }

    mathChildrenMapped.has = mathChildrenMapped.has.bind(mathChildrenMapped);

    // found an inverse
    return {
      newValues: {
        canBeModified: true,
        constantChildIndices,
        codeForExpression,
        inverseMaps,
        template,
        mathChildrenMapped,
      },
    };
  }

  // if not linear, can't find an inverse
  return {
    newValues: {
      canBeModified: false,
      constantChildIndices: null,
      codeForExpression: null,
      inverseMaps: null,
      template: null,
      mathChildrenMapped: null,
    },
  };
}

function checkForLinearExpression(
  tree,
  variables,
  inverseTree,
  constants = [],
  components = [],
) {
  // Check if tree is a linear expression in variables.
  // Each component of container must be a linear expression in just one variable.
  // Haven't implemented inversion of a multivariable linear map

  let tree_variables = me.variables(tree);
  if (tree_variables.every((v) => !variables.includes(v))) {
    if (tree_variables.every((v) => !constants.includes(v))) {
      // if there are no variable or constant math activeChildren, then consider it linear
      let mappings = {};
      let key = 'x' + components.join('_');
      mappings[key] = {
        result: me.fromAst(inverseTree).simplify(),
        components: components,
      };
      //let modifiableStrings = {[key]: components};
      return { foundLinear: true, mappings: mappings, template: key };
      //modifiableStrings: modifiableStrings };
    }
  }

  // if not an array, check if is a variable
  if (!Array.isArray(tree)) {
    return checkForScalarLinearExpression(
      tree,
      variables,
      inverseTree,
      components,
    );
  }

  let operator = tree[0];
  let operands = tree.slice(1);

  // for container, check if at least one component is a linear expression
  if (operator === 'tuple' || operator === 'vector' || operator === 'list') {
    let result = { mappings: {}, template: [operator] }; //, modifiableStrings: {}};
    let numLinear = 0;
    for (let ind = 0; ind < operands.length; ind++) {
      let new_components = [...components, ind];
      let res = checkForLinearExpression(
        operands[ind],
        variables,
        inverseTree,
        constants,
        new_components,
      );
      if (res.foundLinear) {
        numLinear++;

        // append mappings found for the component
        result.mappings = Object.assign(result.mappings, res.mappings);

        // // append modifiableStrings found for the component
        // result.modifiableStrings = Object.assign(result.modifiableStrings, res.modifiableStrings);

        // append template
        result.template.push(res.template);
      } else {
        result.template.push('x' + new_components.join('_'));
      }
    }

    // if no components are linear, view whole container as nonlinear
    if (numLinear === 0) {
      return { foundLinear: false };
    }

    // if at least one componen is a linear functions, view as linear
    result.foundLinear = true;
    return result;
  } else {
    // if not a container, check if is a scalar linear function
    return checkForScalarLinearExpression(
      tree,
      variables,
      inverseTree,
      components,
    );
  }
}

// check if tree is a scalar linear function in one of the variables
function checkForScalarLinearExpression(
  tree,
  variables,
  inverseTree,
  components = [],
) {
  if (typeof tree === 'string' && variables.includes(tree)) {
    let mappings = {};
    let template = 'x' + components.join('_');
    mappings[template] = {
      result: me.fromAst(inverseTree).simplify(),
      components: components,
      mathChildSub: tree,
    };
    return { foundLinear: true, mappings: mappings, template: template };
  }

  if (!Array.isArray(tree)) {
    return { foundLinear: false };
  }

  let operator = tree[0];
  let operands = tree.slice(1);

  if (operator === '-') {
    inverseTree = ['-', inverseTree];
    return checkForScalarLinearExpression(
      operands[0],
      variables,
      inverseTree,
      components,
    );
  }
  if (operator === '+') {
    if (me.variables(operands[0]).every((v) => !variables.includes(v))) {
      // if none of the variables appear in the first operand, subtract off operand from inverseTree
      inverseTree = ['+', inverseTree, ['-', operands[0]]];
      return checkForScalarLinearExpression(
        operands[1],
        variables,
        inverseTree,
        components,
      );
    } else if (me.variables(operands[1]).every((v) => !variables.includes(v))) {
      // if none of the variables appear in the second operand, subtract off operand from inverseTree
      inverseTree = ['+', inverseTree, ['-', operands[1]]];
      return checkForScalarLinearExpression(
        operands[0],
        variables,
        inverseTree,
        components,
      );
    } else {
      // neither operand was a constant
      return { foundLinear: false };
    }
  }
  if (operator === '*') {
    if (me.variables(operands[0]).every((v) => !variables.includes(v))) {
      // if none of the variables appear in the first operand, divide inverseTree by operand
      inverseTree = ['/', inverseTree, operands[0]];
      return checkForScalarLinearExpression(
        operands[1],
        variables,
        inverseTree,
        components,
      );
    } else if (me.variables(operands[1]).every((v) => !variables.includes(v))) {
      // if none of the variables appear in the second operand, divide inverseTree by operand
      inverseTree = ['/', inverseTree, operands[1]];
      return checkForScalarLinearExpression(
        operands[0],
        variables,
        inverseTree,
        components,
      );
    } else {
      // neither operand was a constant
      return { foundLinear: false };
    }
  }
  if (operator === '/') {
    if (me.variables(operands[1]).every((v) => !variables.includes(v))) {
      // if none of the variables appear in the second operand, multiply inverseTree by operand
      inverseTree = ['*', inverseTree, operands[1]];
      return checkForScalarLinearExpression(
        operands[0],
        variables,
        inverseTree,
        components,
      );
    } else {
      // second operand was not a constant
      return { foundLinear: false };
    }
  }

  // any other operator means not linear
  return { foundLinear: false };
}

function invertMath({
  desiredStateVariableValues,
  dependencyValues,
  stateValues,
  workspace,
  overrideFixed,
}) {
  if (!stateValues.canBeModified && !overrideFixed) {
    return { success: false };
  }

  let desiredExpression = convertValueToMathExpression(
    desiredStateVariableValues.unnormalizedValue,
  );
  let currentValue = stateValues.value;

  let arrayEntriesNotAffected;

  if (
    desiredExpression.tree[0] === 'tuple' ||
    desiredExpression.tree[0] === 'vector'
  ) {
    if (currentValue && currentValue.tree[0] === desiredExpression.tree[0]) {
      // have vectors
      // merge desiredExpression into current expression
      let expressionAst;

      if (workspace.desiredExpressionAst) {
        // if have desired expresson from workspace, use that instead of currentValue
        expressionAst = workspace.desiredExpressionAst.slice(0);
      } else {
        expressionAst = currentValue.tree.slice(0);
      }

      let notAffected = [];
      let foundNotAffected = false;
      for (let [ind, value] of desiredExpression.tree.entries()) {
        if (value === undefined) {
          foundNotAffected = true;
          notAffected.push(ind);
        } else {
          expressionAst[ind] = value;
        }
      }
      desiredExpression = me.fromAst(expressionAst);
      workspace.desiredExpressionAst = expressionAst;

      if (foundNotAffected) {
        arrayEntriesNotAffected = notAffected;
      }
    }
  }

  let mathChildren = dependencyValues.mathChildren;
  let stringChildren = dependencyValues.stringChildren;

  if (mathChildren.length === 0) {
    let instructions = [];

    for (let ind = 0; ind < stringChildren.length; ind++) {
      instructions.push({
        deferSettingDependency: 'stringChildren',
        inverseDefinition: finishInvertMathForStringChildren,
        childIndex: ind,
        variableIndex: 0,
        dependencyValues: {
          mathChildren: dependencyValues.mathChildren,
          stringChildren: dependencyValues.stringChildren,
        },
      });
    }

    instructions.push({
      setStateVariable: 'unnormalizedValue',
      value: desiredExpression,
    });

    if (stringChildren.length === 0) {
      instructions.push({
        setDependency: 'valueShadow',
        desiredValue: desiredExpression,
      });
    }
    return {
      success: true,
      instructions,
    };
  }

  if (mathChildren.length === 1 && stringChildren.length === 0) {
    return {
      success: true,
      instructions: [
        {
          setDependency: 'mathChildren',
          desiredValue: desiredExpression,
          childIndex: 0,
          variableIndex: 0,
        },
      ],
    };
  }

  // first calculate expression pieces to make sure really can update
  let expressionPieces = getExpressionPieces({
    expression: desiredExpression,
    stateValues,
  });
  if (!expressionPieces) {
    return { success: false };
  }

  let instructions = [];

  let childrenToSkip = [];
  if (arrayEntriesNotAffected && stateValues.mathChildrenByArrayComponent) {
    for (let ind of arrayEntriesNotAffected) {
      if (stateValues.mathChildrenByArrayComponent[ind]) {
        childrenToSkip.push(...stateValues.mathChildrenByArrayComponent[ind]);
      }
    }
  }

  // update math children where have inversemap and canBeModified is true
  for (let [childInd, mathChild] of mathChildren.entries()) {
    if (
      stateValues.mathChildrenMapped.has(childInd) &&
      mathChild.stateValues.canBeModified
    ) {
      if (!childrenToSkip.includes(childInd)) {
        let childValue = expressionPieces[childInd];
        let subsMap = {};
        let foundConst = false;
        for (let code in stateValues.constantChildIndices) {
          let constInd = stateValues.constantChildIndices[code];
          subsMap[code] = mathChildren[constInd].stateValues.value;
          foundConst = true;
        }
        if (foundConst) {
          // substitute values of any math children that are constant
          // (i.e., that are marked as not modifiable from above)
          childValue = childValue.substitute(subsMap);
        }
        childValue = childValue.simplify();
        instructions.push({
          setDependency: 'mathChildren',
          desiredValue: childValue,
          childIndex: childInd,
          variableIndex: 0,
        });
      }

      delete expressionPieces[childInd];
    }
  }

  // if there are any string children,
  // need to update expressionWithCodes with new values
  // and then update the string children based on it

  // TODO: the only time a string child could change is if it
  // entirely contains a component of a vector.
  // Can we easily determine if this is the case and skip processing
  // string children and expression with codes if it is not the case?

  if (stringChildren.length > 0) {
    let newExpressionWithCodes = stateValues.expressionWithCodes;

    for (let piece in expressionPieces) {
      let inverseMap = stateValues.inverseMaps[piece];
      // skip math children
      if (inverseMap.mathChildInd !== undefined) {
        continue;
      }
      let components = inverseMap.components;
      newExpressionWithCodes = newExpressionWithCodes.substitute_component(
        components,
        expressionPieces[piece],
      );
    }

    instructions.push({
      setDependency: 'expressionWithCodes',
      desiredValue: newExpressionWithCodes,
    });

    for (let ind = 0; ind < stringChildren.length; ind++) {
      instructions.push({
        deferSettingDependency: 'stringChildren',
        inverseDefinition: finishInvertMathForStringChildren,
        childIndex: ind,
        variableIndex: 0,
        dependencyValues: {
          mathChildren: dependencyValues.mathChildren,
          stringChildren: dependencyValues.stringChildren,
        },
      });
    }
  }

  return {
    success: true,
    instructions,
  };
}

function finishInvertMathForStringChildren({ dependencyValues, stateValues }) {
  // console.log("finishInvertMathForStringChildren")

  let mathChildren = dependencyValues.mathChildren;
  let stringChildren = dependencyValues.stringChildren;

  if (mathChildren.length === 0) {
    // just string children.  Set first to value, the rest to empty strings
    let stringValue;
    if (stateValues.format === 'latex') {
      stringValue = stateValues.value.toLatex();
    } else {
      stringValue = stateValues.value.toString();
    }
    let instructions = [
      {
        setDependency: 'stringChildren',
        desiredValue: stringValue,
        childIndex: 0,
        variableIndex: 0,
      },
    ];
    for (let ind = 1; ind < stringChildren.length; ind++) {
      instructions.push({
        setDependency: 'stringChildren',
        desiredValue: '',
        childIndex: ind,
        variableIndex: 0,
      });
    }
    return {
      success: true,
      instructions,
    };
  }

  // TODO: see TODO about string children in invertMath

  let instructions = [];

  // if there are any string children,
  // need to update expressionWithCodes with new values
  // and then update the string children based on it
  if (stringChildren.length > 0) {
    let stringExpr;
    if (stateValues.format === 'latex') {
      stringExpr = stateValues.expressionWithCodes.toLatex();
    } else {
      stringExpr = stateValues.expressionWithCodes.toString();
    }

    for (let [
      ind,
      stringCodes,
    ] of stateValues.codesAdjacentToStrings.entries()) {
      let thisString = stringExpr;
      if (Object.keys(stringCodes).length === 0) {
        // string was skipped, so set it to an empty string
        instructions.push({
          setDependency: 'stringChildren',
          desiredValue: '',
          childIndex: ind,
          variableIndex: 0,
        });
      } else {
        if (stringCodes.prevCode) {
          thisString = thisString.split(stringCodes.prevCode)[1];
        }
        if (stringCodes.nextCode) {
          thisString = thisString.split(stringCodes.nextCode)[0];
        }
        instructions.push({
          setDependency: 'stringChildren',
          desiredValue: thisString,
          childIndex: ind,
          variableIndex: 0,
        });
      }
    }
  }

  return {
    success: true,
    instructions,
  };
}

function getExpressionPieces({ expression, stateValues }) {
  let matching = me.utils.match(expression.tree, stateValues.template);

  // if doesn't match, trying matching, by converting vectors, intervals, or both
  if (!matching) {
    matching = me.utils.match(
      expression.tuples_to_vectors().tree,
      me.fromAst(stateValues.template).tuples_to_vectors().tree,
    );
    if (!matching) {
      matching = me.utils.match(
        expression.to_intervals().tree,
        me.fromAst(stateValues.template).to_intervals().tree,
      );
      if (!matching) {
        matching = me.utils.match(
          expression.tuples_to_vectors().to_intervals().tree,
          me.fromAst(stateValues.template).tuples_to_vectors().to_intervals()
            .tree,
        );
        if (!matching) {
          return false;
        }
      }
    }
  }

  let pieces = {};
  for (let x in matching) {
    let subMap = {};
    subMap[stateValues.codeForExpression] = matching[x];
    let inverseMap = stateValues.inverseMaps[x];
    if (inverseMap !== undefined) {
      let id = x;
      if (inverseMap.mathChildInd !== undefined) {
        id = inverseMap.mathChildInd;
      }
      pieces[id] = inverseMap.result.substitute(subMap);

      pieces[id] = normalizeMathExpression({
        value: pieces[id],
        simplify: stateValues.simplify,
        expand: stateValues.expand,
        createvectors: stateValues.createvectors,
        createintervals: stateValues.createintervals,
      });
    }
  }
  return pieces;
}
