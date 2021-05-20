import InlineComponent from './abstract/InlineComponent';
import me from 'math-expressions';

export default class MathList extends InlineComponent {
  static componentType = 'mathList';
  static rendererType = 'asList';
  static renderChildren = true;

  // when another component has a attribute that is a mathList,
  // use the maths state variable to populate that attribute
  static stateVariableForAttributeValue = 'maths';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.simplify = {
      propagateToDescendants: true,
      createComponentOfType: 'text',
      createStateVariable: 'simplify',
      defaultValue: 'none',
      public: true,
      toLowerCase: true,
      valueTransformations: { true: 'full' },
      validValues: ['none', 'full', 'numbers', 'numberspreserveorder'],
    };

    attributes.unordered = {
      createComponentOfType: 'boolean',
      createStateVariable: 'unordered',
      defaultValue: false,
      public: true,
    };
    attributes.maximumNumber = {
      createComponentOfType: 'number',
      createStateVariable: 'maximumNumber',
      defaultValue: null,
      public: true,
    };
    attributes.mergeMathLists = {
      createComponentOfType: 'boolean',
      createStateVariable: 'mergeMathLists',
      defaultValue: false,
      public: true,
    };

    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    let breakStringsIntoMathsBySpaces = function ({ matchedChildren }) {
      // break any string by white space and wrap pieces with math

      let newChildren = matchedChildren.reduce(function (a, c) {
        if (c.componentType === 'string') {
          return [
            ...a,
            ...c.state.value
              .split(/\s+/)
              .filter((s) => s)
              .map((s) => ({
                componentType: 'math',
                children: [{ componentType: 'string', state: { value: s } }],
              })),
          ];
        } else {
          return [...a, c];
        }
      }, []);

      return {
        success: true,
        newChildren: newChildren,
      };
    };

    sugarInstructions.push({
      replacementFunction: breakStringsIntoMathsBySpaces,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

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

    childLogic.newOperator({
      name: 'mathAndMathLists',
      operator: 'and',
      propositions: [atLeastZeroMaths, atLeastZeroMathLists],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    // set overrideChildHide so that children are hidden
    // only based on whether or not the list is hidden
    // so that can't have a list with partially hidden components
    stateVariableDefinitions.overrideChildHide = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { overrideChildHide: true } }),
    };

    stateVariableDefinitions.nComponents = {
      public: true,
      componentType: 'number',
      stateVariablesDeterminingDependencies: ['mergeMathLists'],
      additionalStateVariablesDefined: ['childIndexByArrayKey'],
      returnDependencies({ stateValues }) {
        let dependencies = {
          maximumNumber: {
            dependencyType: 'stateVariable',
            variableName: 'maximumNumber',
          },
          mergeMathLists: {
            dependencyType: 'stateVariable',
            variableName: 'mergeMathLists',
          },
        };

        if (stateValues.mergeMathLists) {
          dependencies.mathAndMathListChildren = {
            dependencyType: 'child',
            childLogicName: 'mathAndMathLists',
            variableNames: ['value', 'nComponents'],
            variablesOptional: true,
          };
        } else {
          dependencies.mathListChildren = {
            dependencyType: 'child',
            childLogicName: 'atLeastZeroMathLists',
            variableNames: ['nComponents'],
          };
          dependencies.mathAndMathListChildren = {
            dependencyType: 'child',
            childLogicName: 'mathAndMathLists',
            skipComponentNames: true,
          };
        }

        return dependencies;
      },
      definition: function ({ dependencyValues, componentInfoObjects }) {
        let nComponents = 0;
        let childIndexByArrayKey = [];

        if (dependencyValues.mergeMathLists) {
          for (let [
            childInd,
            child,
          ] of dependencyValues.mathAndMathListChildren.entries()) {
            if (
              componentInfoObjects.isInheritedComponentType({
                inheritedComponentType: child.componentType,
                baseComponentType: 'mathList',
              })
            ) {
              for (let i = 0; i < child.stateValues.nComponents; i++) {
                childIndexByArrayKey[nComponents + i] = [childInd, i];
              }
              nComponents += child.stateValues.nComponents;
            } else {
              let childValue = child.stateValues.value;

              if (
                childValue &&
                Array.isArray(childValue.tree) &&
                childValue.tree[0] === 'list'
              ) {
                let nPieces = childValue.tree.length - 1;
                for (let i = 0; i < nPieces; i++) {
                  childIndexByArrayKey[i + nComponents] = [childInd, i];
                }
                nComponents += nPieces;
              } else {
                childIndexByArrayKey[nComponents] = [childInd, 0];
                nComponents += 1;
              }
            }
          }
        } else {
          let nMathLists = 0;
          for (let [
            childInd,
            child,
          ] of dependencyValues.mathAndMathListChildren.entries()) {
            if (
              componentInfoObjects.isInheritedComponentType({
                inheritedComponentType: child.componentType,
                baseComponentType: 'mathList',
              })
            ) {
              let mathListChild = dependencyValues.mathListChildren[nMathLists];
              nMathLists++;
              for (let i = 0; i < mathListChild.stateValues.nComponents; i++) {
                childIndexByArrayKey[nComponents + i] = [childInd, i];
              }
              nComponents += mathListChild.stateValues.nComponents;
            } else {
              childIndexByArrayKey[nComponents] = [childInd, 0];
              nComponents += 1;
            }
          }
        }

        let maxNum = dependencyValues.maximumNumber;
        if (maxNum !== null && nComponents > maxNum) {
          nComponents = maxNum;
          childIndexByArrayKey = childIndexByArrayKey.slice(0, maxNum);
        }

        return {
          newValues: { nComponents, childIndexByArrayKey },
          checkForActualChange: { nComponents: true },
        };
      },
    };

    stateVariableDefinitions.maths = {
      public: true,
      componentType: 'math',
      isArray: true,
      entryPrefixes: ['math'],
      stateVariablesDeterminingDependencies: [
        'mergeMathLists',
        'childIndexByArrayKey',
      ],
      returnArraySizeDependencies: () => ({
        nComponents: {
          dependencyType: 'stateVariable',
          variableName: 'nComponents',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nComponents];
      },

      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {
        let dependenciesByKey = {};
        let globalDependencies = {
          mergeMathLists: {
            dependencyType: 'stateVariable',
            variableName: 'mergeMathLists',
          },
          childIndexByArrayKey: {
            dependencyType: 'stateVariable',
            variableName: 'childIndexByArrayKey',
          },
        };

        for (let arrayKey of arrayKeys) {
          let childIndices = [];
          let mathIndex = '1';
          if (stateValues.childIndexByArrayKey[arrayKey]) {
            childIndices = [stateValues.childIndexByArrayKey[arrayKey][0]];
            mathIndex = stateValues.childIndexByArrayKey[arrayKey][1] + 1;
          }
          dependenciesByKey[arrayKey] = {
            mathAndMathListChildren: {
              dependencyType: 'child',
              childLogicName: 'mathAndMathLists',
              variableNames: ['value', 'math' + mathIndex],
              variablesOptional: true,
              childIndices,
            },
          };
        }
        return { globalDependencies, dependenciesByKey };
      },
      arrayDefinitionByKey({
        globalDependencyValues,
        dependencyValuesByKey,
        arrayKeys,
      }) {
        let maths = {};

        for (let arrayKey of arrayKeys) {
          let child =
            dependencyValuesByKey[arrayKey].mathAndMathListChildren[0];

          if (child) {
            if (child.stateValues.value !== undefined) {
              let childValue = child.stateValues.value;
              if (
                globalDependencyValues.mergeMathLists &&
                Array.isArray(childValue.tree) &&
                childValue.tree[0] === 'list'
              ) {
                let ind2 =
                  globalDependencyValues.childIndexByArrayKey[arrayKey][1];
                maths[arrayKey] = childValue.get_component(ind2);
              } else {
                maths[arrayKey] = childValue;
              }
            } else {
              let mathIndex =
                globalDependencyValues.childIndexByArrayKey[arrayKey][1] + 1;
              maths[arrayKey] = child.stateValues['math' + mathIndex];
            }
          }
        }

        return { newValues: { maths } };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        globalDependencyValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
        arraySize,
      }) {
        if (globalDependencyValues.mergeMathLists) {
          console.log(
            'Have not implemented inverse definition for math list with mergeMathLists=true',
          );
          return { success: false };
        }

        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.maths) {
          if (!dependencyValuesByKey[arrayKey]) {
            continue;
          }

          let child =
            dependencyValuesByKey[arrayKey].mathAndMathListChildren[0];

          if (child) {
            if (child.stateValues.value !== undefined) {
              instructions.push({
                setDependency:
                  dependencyNamesByKey[arrayKey].mathAndMathListChildren,
                desiredValue: desiredStateVariableValues.maths[arrayKey],
                childIndex: 0,
                variableIndex: 0,
              });
            } else {
              instructions.push({
                setDependency:
                  dependencyNamesByKey[arrayKey].mathAndMathListChildren,
                desiredValue: desiredStateVariableValues.maths[arrayKey],
                childIndex: 0,
                variableIndex: 1,
              });
            }
          }
        }

        return {
          success: true,
          instructions,
        };
      },
    };

    stateVariableDefinitions.nValues = {
      isAlias: true,
      targetVariableName: 'nComponents',
    };

    stateVariableDefinitions.values = {
      isAlias: true,
      targetVariableName: 'maths',
    };

    stateVariableDefinitions.latex = {
      additionalStateVariablesDefined: ['latexs'],
      public: true,
      componentType: 'text',
      returnDependencies: () => ({
        mathAndMathListChildren: {
          dependencyType: 'child',
          childLogicName: 'mathAndMathLists',
          variableNames: ['valueForDisplay', 'latex', 'latexs'],
          variablesOptional: true,
        },
        maximumNumber: {
          dependencyType: 'stateVariable',
          variableName: 'maximumNumber',
        },
        mergeMathLists: {
          dependencyType: 'stateVariable',
          variableName: 'mergeMathLists',
        },
      }),
      definition: function ({ dependencyValues }) {
        let latexs = [];

        for (let child of dependencyValues.mathAndMathListChildren) {
          if (child.stateValues.valueForDisplay) {
            let childValue = child.stateValues.valueForDisplay;

            if (
              dependencyValues.mergeMathLists &&
              Array.isArray(childValue.tree) &&
              childValue.tree[0] === 'list'
            ) {
              for (let i = 0; i < childValue.tree.length - 1; i++) {
                latexs.push(childValue.get_component(i).toLatex());
              }
            } else {
              latexs.push(child.stateValues.latex);
            }
          } else {
            latexs.push(...child.stateValues.latexs);
          }
        }

        let maxNum = dependencyValues.maximumNumber;
        if (maxNum !== null && latexs.length > maxNum) {
          maxNum = Math.max(0, Math.floor(maxNum));
          latexs = latexs.slice(0, maxNum);
        }

        let latex = latexs.join(', ');

        return { newValues: { latex, latexs } };
      },
    };

    stateVariableDefinitions.text = {
      public: true,
      componentType: 'text',
      additionalStateVariablesDefined: ['texts'],
      returnDependencies: () => ({
        mathAndMathListChildren: {
          dependencyType: 'child',
          childLogicName: 'mathAndMathLists',
          variableNames: ['valueForDisplay', 'text', 'texts'],
          variablesOptional: true,
        },
        maximumNumber: {
          dependencyType: 'stateVariable',
          variableName: 'maximumNumber',
        },
        mergeMathLists: {
          dependencyType: 'stateVariable',
          variableName: 'mergeMathLists',
        },
      }),
      definition: function ({ dependencyValues }) {
        let texts = [];

        for (let child of dependencyValues.mathAndMathListChildren) {
          if (child.stateValues.valueForDisplay) {
            let childValue = child.stateValues.valueForDisplay;

            if (
              dependencyValues.mergeMathLists &&
              Array.isArray(childValue.tree) &&
              childValue.tree[0] === 'list'
            ) {
              for (let i = 0; i < childValue.tree.length - 1; i++) {
                texts.push(childValue.get_component(i).toString());
              }
            } else {
              texts.push(child.stateValues.text);
            }
          } else {
            texts.push(...child.stateValues.texts);
          }
        }

        let maxNum = dependencyValues.maximumNumber;
        if (maxNum !== null && texts.length > maxNum) {
          maxNum = Math.max(0, Math.floor(maxNum));
          texts = texts.slice(0, maxNum);
        }

        let text = texts.join(', ');

        return { newValues: { text, texts } };
      },
    };

    // stateVariableDefinitions.childrenToRender = {
    //   returnDependencies: () => ({
    //     mathAndMathListChildren: {
    //       dependencyType: "child",
    //       childLogicName: "mathAndMathLists",
    //       variableNames: ["childrenToRender"],
    //       variablesOptional: true,
    //     },
    //     maximumNumber: {
    //       dependencyType: "stateVariable",
    //       variableName: "maximumNumber",
    //     },
    //   }),
    //   definition: function ({ dependencyValues, componentInfoObjects }) {
    //     let childrenToRender = [];

    //     for (let child of dependencyValues.mathAndMathListChildren) {
    //       if (componentInfoObjects.isInheritedComponentType({
    //         inheritedComponentType: child.componentType,
    //         baseComponentType: "mathList"
    //       })) {
    //         childrenToRender.push(...child.stateValues.childrenToRender);
    //       } else {
    //         childrenToRender.push(child.componentName);
    //       }
    //     }

    //     let maxNum = dependencyValues.maximumNumber;
    //     if (maxNum !== null && childrenToRender.length > maxNum) {
    //       maxNum = Math.max(0, Math.floor(maxNum));
    //       childrenToRender = childrenToRender.slice(0, maxNum)
    //     }

    //     return { newValues: { childrenToRender } }

    //   }
    // }

    return stateVariableDefinitions;
  }
}
