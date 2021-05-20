import InlineComponent from './abstract/InlineComponent';

export default class TextList extends InlineComponent {
  static componentType = 'textList';
  static rendererType = 'asList';
  static renderChildren = true;

  // when another component has a attribute that is a textList,
  // use the texts state variable to populate that attribute
  static stateVariableForAttributeValue = 'texts';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

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

    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    let breakStringsIntoTextsBySpaces = function ({ matchedChildren }) {
      // break any string by white space and wrap pieces with text

      let newChildren = matchedChildren.reduce(function (a, c) {
        if (c.componentType === 'string') {
          return [
            ...a,
            ...c.state.value
              .split(/\s+/)
              .filter((s) => s)
              .map((s) => ({
                componentType: 'text',
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
      replacementFunction: breakStringsIntoTextsBySpaces,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atLeastZeroTexts = childLogic.newLeaf({
      name: 'atLeastZeroTexts',
      componentType: 'text',
      comparison: 'atLeast',
      number: 0,
    });

    let atLeastZeroTextLists = childLogic.newLeaf({
      name: 'atLeastZeroTextLists',
      componentType: 'textList',
      comparison: 'atLeast',
      number: 0,
    });

    childLogic.newOperator({
      name: 'textAndTextLists',
      operator: 'and',
      propositions: [atLeastZeroTexts, atLeastZeroTextLists],
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
          textListChildren: {
            dependencyType: 'child',
            childLogicName: 'atLeastZeroTextLists',
            variableNames: ['nComponents'],
          },
          textAndTextListChildren: {
            dependencyType: 'child',
            childLogicName: 'textAndTextLists',
            skipComponentNames: true,
          },
        };
      },
      definition: function ({ dependencyValues, componentInfoObjects }) {
        let nComponents = 0;
        let childIndexByArrayKey = [];

        let nTextLists = 0;
        for (let [
          childInd,
          child,
        ] of dependencyValues.textAndTextListChildren.entries()) {
          if (
            componentInfoObjects.isInheritedComponentType({
              inheritedComponentType: child.componentType,
              baseComponentType: 'textList',
            })
          ) {
            let textListChild = dependencyValues.textListChildren[nTextLists];
            nTextLists++;
            for (let i = 0; i < textListChild.stateValues.nComponents; i++) {
              childIndexByArrayKey[nComponents + i] = [childInd, i];
            }
            nComponents += textListChild.stateValues.nComponents;
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

    stateVariableDefinitions.texts = {
      public: true,
      componentType: 'text',
      isArray: true,
      entryPrefixes: ['text'],
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
          let textIndex = '1';
          if (stateValues.childIndexByArrayKey[arrayKey]) {
            childIndices = [stateValues.childIndexByArrayKey[arrayKey][0]];
            textIndex = stateValues.childIndexByArrayKey[arrayKey][1] + 1;
          }
          dependenciesByKey[arrayKey] = {
            textAndTextListChildren: {
              dependencyType: 'child',
              childLogicName: 'textAndTextLists',
              variableNames: ['value', 'text' + textIndex],
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
        let texts = {};

        for (let arrayKey of arrayKeys) {
          let child =
            dependencyValuesByKey[arrayKey].textAndTextListChildren[0];

          if (child) {
            if (child.stateValues.value !== undefined) {
              texts[arrayKey] = child.stateValues.value;
            } else {
              let textIndex =
                globalDependencyValues.childIndexByArrayKey[arrayKey][1] + 1;
              texts[arrayKey] = child.stateValues['text' + textIndex];
            }
          }
        }

        return { newValues: { texts } };
      },
      inverseArrayDefinitionByKey({
        desiredStateVariableValues,
        globalDependencyValues,
        dependencyValuesByKey,
        dependencyNamesByKey,
        arraySize,
      }) {
        let instructions = [];

        for (let arrayKey in desiredStateVariableValues.texts) {
          if (!dependencyValuesByKey[arrayKey]) {
            continue;
          }

          let child =
            dependencyValuesByKey[arrayKey].textAndTextListChildren[0];

          if (child) {
            if (child.stateValues.value !== undefined) {
              instructions.push({
                setDependency:
                  dependencyNamesByKey[arrayKey].textAndTextListChildren,
                desiredValue: desiredStateVariableValues.texts[arrayKey],
                childIndex: 0,
                variableIndex: 0,
              });
            } else {
              instructions.push({
                setDependency:
                  dependencyNamesByKey[arrayKey].textAndTextListChildren,
                desiredValue: desiredStateVariableValues.texts[arrayKey],
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
      targetVariableName: 'texts',
    };

    stateVariableDefinitions.text = {
      public: true,
      componentType: 'text',
      returnDependencies: () => ({
        texts: {
          dependencyType: 'stateVariable',
          variableName: 'texts',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: { text: dependencyValues.texts.join(', ') },
      }),
    };

    // stateVariableDefinitions.childrenToRender = {
    //   returnDependencies: () => ({
    //     textAndTextListChildren: {
    //       dependencyType: "child",
    //       childLogicName: "textAndTextLists",
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

    //     for (let child of dependencyValues.textAndTextListChildren) {
    //       if (componentInfoObjects.isInheritedComponentType({
    //         inheritedComponentType: child.componentType,
    //         baseComponentType: "textList"
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
