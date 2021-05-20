import InlineComponent from './abstract/InlineComponent';

export default class BooleanList extends InlineComponent {
  static componentType = 'booleanList';
  static rendererType = 'asList';
  static renderChildren = true;

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.unordered = {
      createComponentOfType: 'boolean',
      createStateVariable: 'unordered',
      defaultValue: false,
      public: true,
    };
    attributes.maximumNumber = {
      createComponentOfType: 'boolean',
      createStateVariable: 'maximumNumber',
      defaultValue: undefined,
      public: true,
    };
    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    let breakStringsIntoBooleansBySpaces = function ({ matchedChildren }) {
      // break any string by white space and wrap pieces with boolean

      let newChildren = matchedChildren.reduce(function (a, c) {
        if (c.componentType === 'string') {
          return [
            ...a,
            ...c.state.value
              .split(/\s+/)
              .filter((s) => s)
              .map((s) => ({
                componentType: 'boolean',
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
      replacementFunction: breakStringsIntoBooleansBySpaces,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atLeastZeroBooleans = childLogic.newLeaf({
      name: 'atLeastZeroBooleans',
      componentType: 'boolean',
      comparison: 'atLeast',
      number: 0,
    });

    let atLeastZeroBooleanLists = childLogic.newLeaf({
      name: 'atLeastZeroBooleanLists',
      componentType: 'booleanList',
      comparison: 'atLeast',
      number: 0,
    });

    childLogic.newOperator({
      name: 'booleanAndBooleanLists',
      operator: 'and',
      propositions: [atLeastZeroBooleans, atLeastZeroBooleanLists],
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
      additionalStateVariablesDefined: ['childIndexByArrayKey'],
      returnDependencies() {
        return {
          maximumNumber: {
            dependencyType: 'stateVariable',
            variableName: 'maximumNumber',
          },
          booleanListChildren: {
            dependencyType: 'child',
            childLogicName: 'atLeastZeroBooleanLists',
            variableNames: ['nComponents'],
          },
          booleanAndBooleanListChildren: {
            dependencyType: 'child',
            childLogicName: 'booleanAndBooleanLists',
            skipComponentNames: true,
          },
        };
      },
      definition: function ({ dependencyValues, componentInfoObjects }) {
        let nComponents = 0;
        let childIndexByArrayKey = [];

        let nBooleanLists = 0;
        for (let [
          childInd,
          child,
        ] of dependencyValues.booleanAndBooleanListChildren.entries()) {
          if (
            componentInfoObjects.isInheritedComponentType({
              inheritedComponentType: child.componentType,
              baseComponentType: 'booleanList',
            })
          ) {
            let booleanListChild =
              dependencyValues.booleanListChildren[nBooleanLists];
            nBooleanLists++;
            for (let i = 0; i < booleanListChild.stateValues.nComponents; i++) {
              childIndexByArrayKey[nComponents + i] = [childInd, i];
            }
            nComponents += booleanListChild.stateValues.nComponents;
          } else {
            childIndexByArrayKey[nComponents] = [childInd, 0];
            nComponents += 1;
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

    stateVariableDefinitions.booleans = {
      public: true,
      componentType: 'boolean',
      isArray: true,
      entryPrefixes: ['boolean'],
      stateVariablesDeterminingDependencies: ['childIndexByArrayKey'],
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
          childIndexByArrayKey: {
            dependencyType: 'stateVariable',
            variableName: 'childIndexByArrayKey',
          },
        };

        for (let arrayKey of arrayKeys) {
          let childIndices = [];
          let booleanIndex = '1';
          if (stateValues.childIndexByArrayKey[arrayKey]) {
            childIndices = [stateValues.childIndexByArrayKey[arrayKey][0]];
            booleanIndex = stateValues.childIndexByArrayKey[arrayKey][1] + 1;
          }
          dependenciesByKey[arrayKey] = {
            booleanAndBooleanListChildren: {
              dependencyType: 'child',
              childLogicName: 'booleanAndBooleanLists',
              variableNames: ['value', 'boolean' + booleanIndex],
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
        let booleans = {};

        for (let arrayKey of arrayKeys) {
          let child =
            dependencyValuesByKey[arrayKey].booleanAndBooleanListChildren[0];

          if (child) {
            if (child.stateValues.value !== undefined) {
              booleans[arrayKey] = child.stateValues.value;
            } else {
              let booleanIndex =
                globalDependencyValues.childIndexByArrayKey[arrayKey][1] + 1;
              booleans[arrayKey] = child.stateValues['boolean' + booleanIndex];
            }
          }
        }

        return { newValues: { booleans } };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        globalDependencyValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
        arraySize,
      }) {
        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.booleans) {
          if (!dependencyValuesByKey[arrayKey]) {
            continue;
          }

          let child =
            dependencyValuesByKey[arrayKey].booleanAndBooleanListChildren[0];

          if (child) {
            if (child.stateValues.value !== undefined) {
              instructions.push({
                setDependency:
                  dependencyNamesByKey[arrayKey].booleanAndBooleanListChildren,
                desiredValue: desiredStateVariableValues.booleans[arrayKey],
                childIndex: 0,
                variableIndex: 0,
              });
            } else {
              instructions.push({
                setDependency:
                  dependencyNamesByKey[arrayKey].booleanAndBooleanListChildren,
                desiredValue: desiredStateVariableValues.booleans[arrayKey],
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
      targetVariableName: 'booleans',
    };

    // stateVariableDefinitions.childrenToRender = {
    //   returnDependencies: () => ({
    //     booleanAndBooleanListChildren: {
    //       dependencyType: "child",
    //       childLogicName: "booleanAndBooleanLists",
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

    //     for (let child of dependencyValues.booleanAndBooleanListChildren) {
    //       if (componentInfoObjects.isInheritedComponentType({
    //         inheritedComponentType: child.componentType,
    //         baseComponentType: "booleanList"
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
