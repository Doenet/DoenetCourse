import InlineComponent from './abstract/InlineComponent';
import me from 'math-expressions';
import { latexToAst } from '../utils/math';

export class M extends InlineComponent {
  static componentType = 'm';
  static rendererType = 'math';

  // used when creating new component via adapter or copy prop
  static primaryStateVariableForDefinition = 'latex';

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atLeastZeroStrings = childLogic.newLeaf({
      name: 'atLeastZeroStrings',
      componentType: 'string',
      comparison: 'atLeast',
      number: 0,
    });
    let atLeastZeroTexts = childLogic.newLeaf({
      name: 'atLeastZeroTexts',
      componentType: 'text',
      comparison: 'atLeast',
      number: 0,
    });
    let atLeastZeroMaths = childLogic.newLeaf({
      name: 'atLeastZeroMaths',
      componentType: 'math',
      comparison: 'atLeast',
      number: 0,
    });
    let atLeastZeroMathLists = childLogic.newLeaf({
      name: 'atLeastZeroMathLists',
      componentType: 'mathList',
      comparison: 'atLeast',
      number: 0,
    });

    let atLeastZeroMs = childLogic.newLeaf({
      name: 'atLeastZeroMs',
      componentType: 'm',
      comparison: 'atLeast',
      number: 0,
    });

    let atLeastZeroMathInputs = childLogic.newLeaf({
      name: 'atLeastZeroMathInputs',
      componentType: 'mathInput',
      comparison: 'atLeast',
      number: 0,
    });
    childLogic.newOperator({
      name: 'stringsTextsAndMaths',
      operator: 'and',
      propositions: [
        atLeastZeroStrings,
        atLeastZeroTexts,
        atLeastZeroMaths,
        atLeastZeroMathLists,
        atLeastZeroMs,
        atLeastZeroMathInputs,
      ],
      requireConsecutive: true,
      setAsBase: true,
    });
    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.latex = {
      public: true,
      componentType: 'text',
      defaultValue: '',
      returnDependencies: () => ({
        stringTextMathChildren: {
          dependencyType: 'child',
          childLogicName: 'stringsTextsAndMaths',
          variableNames: ['latex', 'text'],
          variablesOptional: true,
        },
      }),
      definition: function ({ dependencyValues, componentInfoObjects }) {
        if (dependencyValues.stringTextMathChildren.length === 0) {
          return {
            useEssentialOrDefaultValue: {
              latex: { variablesToCheck: 'latex' },
            },
          };
        }

        let latex = '';

        for (let child of dependencyValues.stringTextMathChildren) {
          if (child.stateValues.latex) {
            latex += child.stateValues.latex;
          } else if (child.stateValues.text) {
            latex += child.stateValues.text;
          }
        }

        return { newValues: { latex } };
      },
    };

    stateVariableDefinitions.latexWithInputChildren = {
      forRenderer: true,
      returnDependencies: () => ({
        stringTextMathChildren: {
          dependencyType: 'child',
          childLogicName: 'stringsTextsAndMaths',
          variableNames: ['latex', 'text'],
          variablesOptional: true,
        },
        latex: {
          dependencyType: 'stateVariable',
          variableName: 'latex',
        },
      }),
      definition: function ({ dependencyValues, componentInfoObjects }) {
        if (dependencyValues.stringTextMathChildren.length === 0) {
          return {
            newValues: {
              latexWithInputChildren: [dependencyValues.latex],
            },
          };
        }

        let latexWithInputChildren = [];
        let lastLatex = '';
        let inputInd = 0;
        for (let child of dependencyValues.stringTextMathChildren) {
          if (
            componentInfoObjects.isInheritedComponentType({
              inheritedComponentType: child.componentType,
              baseComponentType: 'mathInput',
            })
          ) {
            if (lastLatex.length > 0) {
              latexWithInputChildren.push(lastLatex);
              lastLatex = '';
            }
            latexWithInputChildren.push(inputInd);
            inputInd++;
          } else {
            if (child.stateValues.latex) {
              lastLatex += child.stateValues.latex;
            } else if (child.stateValues.text) {
              lastLatex += child.stateValues.text;
            }
          }
        }
        if (lastLatex.length > 0) {
          latexWithInputChildren.push(lastLatex);
        }

        return { newValues: { latexWithInputChildren } };
      },
    };

    stateVariableDefinitions.renderMode = {
      forRenderer: true,
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { renderMode: 'inline' } }),
    };

    stateVariableDefinitions.text = {
      returnDependencies: () => ({
        latex: {
          dependencyType: 'stateVariable',
          variableName: 'latex',
        },
      }),
      definition: function ({ dependencyValues }) {
        let expression;
        try {
          expression = me.fromAst(latexToAst.convert(dependencyValues.latex));
        } catch (e) {
          // just return latex if can't parse with math-expressions
          return { newValues: { text: dependencyValues.latex } };
        }
        return { newValues: { text: expression.toString() } };
      },
    };

    return stateVariableDefinitions;
  }
}

export class Me extends M {
  static componentType = 'me';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.renderMode.definition = () => ({
      newValues: { renderMode: 'display' },
    });
    return stateVariableDefinitions;
  }
}

export class Men extends M {
  static componentType = 'men';

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.renderMode.definition = () => ({
      newValues: { renderMode: 'numbered' },
    });

    stateVariableDefinitions.equationTag = {
      public: true,
      componentType: 'text',
      forRenderer: true,
      returnDependencies: () => ({
        equationCounter: {
          dependencyType: 'counter',
          counterName: 'equation',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: { equationTag: String(dependencyValues.equationCounter) },
        };
      },
    };

    return stateVariableDefinitions;
  }
}
