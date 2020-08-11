import ComponentWithSelectableType from './ComponentWithSelectableType';

export default class ComponentListWithSelectableType extends ComponentWithSelectableType {
  static componentType = "_componentlistwithselectabletype";

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);
    let standardComponentClasses = args.standardComponentClasses;

    childLogic.deleteAllLogic();

    function breakIntoTypesByCommas({ activeChildrenMatched, dependencyValues }) {
      let stringChild = dependencyValues.stringChild[0];
      let stringPieces = stringChild.stateValues.value.split(",").map(s => s.trim());

      let selectedType = dependencyValues.type;
      if (selectedType === null) {
        if (stringPieces.every(s => /^[a-zA-Z]+$/.test(s))) {
          selectedType = "letters";
        } else if (stringPieces.every(s => Number.isFinite(Number(s)))) {
          selectedType = "number";
        } else {
          selectedType = "text";
        }
      }

      let newChildren = stringPieces.map(x => ({
        componentType: selectedType,
        children: [{
          componentType: "string",
          state: { value: x.trim() }
        }]
      }));

      return {
        success: true,
        newChildren: newChildren,
        toDelete: [stringChild.componentName],
      }
    }

    let exactlyOneString = childLogic.newLeaf({
      name: 'exactlyOneString',
      componentType: 'string',
      number: 1,
      isSugar: true,
      returnSugarDependencies: () => ({
        type: {
          dependencyType: "stateVariable",
          variableName: "type",
        },
        stringChild: {
          dependencyType: "childStateVariables",
          childLogicName: "exactlyOneString",
          variableNames: ["value"],
        }
      }),
      logicToWaitOnSugar: ["anythingForSelectedType"],
      replacementFunction: breakIntoTypesByCommas,
    });

    function addType({ activeChildrenMatched, dependencyValues }) {

      let selectedType = dependencyValues.type;
      if (selectedType === null) {
        if (activeChildrenMatched.length === 1) {
          let child = activeChildrenMatched[0];
          if (child.componentType === "string") {
            let s = child.stateValues.value.trim();
            if (/^[a-zA-Z]+$/.test(s)) {
              selectedType = "letters";
            } else if (Number.isFinite(Number(s))) {
              selectedType = "number";
            } else {
              selectedType = "text";
            }
          } else {
            // have a single non-string child.
            // Don't match sugar: child will be matched by anythingForSelectedType.
            return { success: false };
          }
        } else {
          // have more than one child, but don't know what type to create
          return { success: false }
        }
      }

      // if already have a single child of the correct type, don't match sugar
      // the one child will be matched by anythingForSelectedType
      if (activeChildrenMatched.length === 1 && activeChildrenMatched[0].componentType === selectedType) {
        return { success: false }
      }

      if (!(selectedType in standardComponentClasses)) {
        // if didn't get a valid type and component is string
        // set to selected type to text
        if (activeChildrenMatched.length === 1 && activeChildrenMatched[0].componentType === "string") {
          selectedType = 'text';
        } else {
          // else don't match sugar
          // which means
          // - if there is only one component, that will become the type
          // - if there are more than one component, child logic will fail
          return { success: false }
        }
      }

      let typeChildren = [];
      for (let child of activeChildrenMatched) {
        typeChildren.push({
          createdComponent: true,
          componentName: child.componentName
        });
      }

      return {
        success: true,
        newChildren: [{ componentType: selectedType, children: typeChildren }],
      }
    }

    let anythingAsSugar = childLogic.newLeaf({
      name: 'anythingAsSugar',
      componentType: '_base',
      excludeComponentTypes: ["_composite"],
      comparison: 'atLeast',
      number: 1,
      isSugar: true,
      returnSugarDependencies: () => ({
        type: {
          dependencyType: "stateVariable",
          variableName: "type",
        }
      }),
      logicToWaitOnSugar: ["anythingForSelectedType"],
      replacementFunction: addType,
    });

    let anythingForSelectedType = childLogic.newLeaf({
      name: 'anythingForSelectedType',
      componentType: "_base",
      excludeComponentTypes: ["_composite"],
      comparison: 'atLeast',
      number: 1,
    });

    childLogic.newOperator({
      name: "sugarXorNot",
      operator: "xor",
      propositions: [exactlyOneString, anythingAsSugar, anythingForSelectedType],
      setAsBase: true,
    })

    childLogic.excludeMultipleSugar = true;

    return childLogic;
  }



  static returnStateVariableDefinitions() {

    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    delete stateVariableDefinitions.value;

    stateVariableDefinitions.selectedType = {
      public: true,
      componentType: "text",
      returnDependencies: () => ({
        anythingForSelectedType: {
          dependencyType: "childIdentity",
          childLogicName: "anythingForSelectedType",
        },
      }),
      definition: function ({ dependencyValues }) {

        if (dependencyValues.anythingForSelectedType.length === 0) {
          return {
            newValues: { selectedType: "number" } // placeholder
          };
        } else {
          return {
            newValues: { selectedType: dependencyValues.anythingForSelectedType[0].componentType }
          };
        }
      }
    }

    stateVariableDefinitions.nValues = {
      returnDependencies: () => ({
        anythingForSelectedType: {
          dependencyType: "childIdentity",
          childLogicName: "anythingForSelectedType",
        },
      }),
      definition({ dependencyValues }) {
        return { newValues: { nValues: dependencyValues.anythingForSelectedType.length } }
      }
    }

    stateVariableDefinitions.values = {
      public: true,
      isArray: true,
      entryPrefixes: ["value"],
      returnArraySizeDependencies: () => ({
        nValues: {
          dependencyType: "stateVariable",
          variableName: "nValues",
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nValues];
      },
      returnArrayDependenciesByKey({ arrayKeys }) {
        let globalDependencies = {
          selectedType: {
            dependencyType: "stateVariable",
            variableName: "selectedType"
          }
        }

        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          dependenciesByKey[arrayKey] = {
            anythingForSelectedType: {
              dependencyType: "childStateVariables",
              childLogicName: "anythingForSelectedType",
              variableNames: ["value"],
              childIndices: [arrayKey]
            },
          }
        }

        return { globalDependencies, dependenciesByKey }

      },
      arrayDefinitionByKey({ globalDependencyValues, dependencyValuesByKey, arrayKeys }) {

        // console.log(`array definition for value of component list with selectable type`)
        // console.log(globalDependencyValues)
        // console.log(dependencyValuesByKey);
        // console.log(arrayKeys)

        let values = {};

        for (let arrayKey of arrayKeys) {
          if (dependencyValuesByKey[arrayKey].anythingForSelectedType &&
            dependencyValuesByKey[arrayKey].anythingForSelectedType.length === 1
          ) {
            values[arrayKey] = dependencyValuesByKey[arrayKey].anythingForSelectedType[0].stateValues.value
          }
        }

        return {
          newValues: { values },
          setComponentType: { values: globalDependencyValues.selectedType },
        };
      }
    }


    return stateVariableDefinitions;
  }

}
