import BaseComponent from './abstract/BaseComponent';

export default class Column extends BaseComponent {
  static componentType = 'column';
  static rendererType = 'container';
  static renderChildren = true;

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.colNum = { default: null };

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroCells',
      componentType: 'cell',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.prescribedCellsWithRowNum = {
      returnDependencies: () => ({
        cellChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroCells',
          variableNames: ['rowNum'],
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            prescribedCellsWithRowNum: dependencyValues.cellChildren,
          },
        };
      },
    };

    // stateVariableDefinitions.cellMaths = {
    //   isArray: true,
    //   entryPrefixes: ["cellMath"],
    //   public: true,
    //   componentType: "math",
    //   returnDependencies: function ({ arrayKeys }) {

    //     if (arrayKeys === undefined) {
    //       return {
    //         cellChildren: {
    //           dependencyType: "child",
    //           childLogicName: "atLeastZeroCells",
    //           variableNames: ["math"],
    //         }
    //       }
    //     } else {
    //       let arrayKey = Number(arrayKeys[0]);

    //       return {
    //         cellChild: {
    //           dependencyType: "child",
    //           childLogicName: "atLeastZeroCells",
    //           variableNames: ["math"],
    //           childIndices: [arrayKey]
    //         }
    //       }
    //     }
    //   },
    //   markStale: function ({ freshnessInfo, changes, arrayKeys }) {
    //     // console.log('mark stale for cellMaths of row')
    //     // console.log(changes);
    //     // console.log(arrayKeys);

    //     let freshByKey = freshnessInfo.cellMaths.freshByKey;

    //     let arrayKey;
    //     if (arrayKeys) {
    //       arrayKey = Number(arrayKeys[0]);
    //     }

    //     if (arrayKey === undefined) {
    //       if (changes.cellChildren) {
    //         if (changes.cellChildren.componentIdentitiesChanged) {
    //           for (let key in freshByKey) {
    //             delete freshByKey[key];
    //           }
    //         } else {
    //           for (let key in changes.cellChildren.valuesChanged) {
    //             delete freshByKey[key];
    //           }
    //         }
    //       }

    //       if (Object.keys(freshByKey).length === 0) {
    //         // asked for entire array and it is all stale
    //         return { fresh: { cellMaths: false } }
    //       } else {
    //         // asked for entire array, but it has some fresh elements
    //         // (we don't know here how many elements cellMaths has,
    //         // so can't determine if completely fresh)
    //         return { partiallyFresh: { cellMaths: true } }
    //       }
    //     } else {

    //       // have arrayKey
    //       // so asked for just one component

    //       if (changes.cellChild) {
    //         if (changes.cellChild.componentIdentitiesChanged) {
    //           delete freshByKey[arrayKey];
    //         } else {
    //           if (changes.cellChild.valuesChanged[0]) {
    //             delete freshByKey[arrayKey];
    //           }
    //         }
    //       }

    //       return { fresh: { cellMaths: freshByKey[arrayKey] === true } };
    //     }

    //   },
    //   definition({ dependencyValues, arrayKeys, freshnessInfo, changes }) {

    //     let freshByKey = freshnessInfo.cellMaths.freshByKey;

    //     // console.log('definition of cellMaths of row')
    //     // console.log(JSON.parse(JSON.stringify(freshByKey)));
    //     // console.log(JSON.parse(JSON.stringify(dependencyValues)))
    //     // console.log(JSON.parse(JSON.stringify(changes)))
    //     // console.log(arrayKeys);

    //     let arrayKey;
    //     if (arrayKeys) {
    //       arrayKey = Number(arrayKeys[0]);
    //     }

    //     if (arrayKey === undefined) {
    //       if (changes.cellChildren && changes.cellChildren.componentIdentitiesChanged) {
    //         // send array so that now should overwrite entire array
    //         for (let key in dependencyValues.cellChildren) {
    //           freshByKey[key] = true;
    //         }

    //         return {
    //           newValues: { cellMaths: dependencyValues.cellChildren.map(x => x.stateValues.math) }
    //         }
    //       }

    //       let newCellMaths = {};
    //       for (let arrayKey in dependencyValues.cellChildren) {
    //         if (!freshByKey[arrayKey]) {
    //           freshByKey[arrayKey] = true;
    //           newCellMaths[arrayKey] = dependencyValues.cellChildren[arrayKey].stateValues.math;
    //         }
    //       }
    //       return { newValues: { cellMaths: newCellMaths } }
    //     } else {

    //       // have arrayKey

    //       if (!freshByKey[arrayKey]) {
    //         freshByKey[arrayKey] = true;
    //         let cellMath;
    //         if (dependencyValues.cellChild.length === 1) {
    //           cellMath = dependencyValues.cellChild[0].stateValues.math;
    //         }
    //         return {
    //           newValues: {
    //             cellMaths: {
    //               [arrayKey]: cellMath
    //             }
    //           }
    //         }
    //       } else {
    //         // arrayKey asked for didn't change
    //         // don't need to report noChanges for array state variable
    //         return {};
    //       }
    //     }
    //   },
    //   inverseDefinition: function ({ desiredStateVariableValues, arrayKeys }) {

    //     // console.log('inverse definition of cellMaths of row')
    //     // console.log(desiredStateVariableValues)
    //     // console.log(arrayKeys);

    //     let arrayKey;
    //     if (arrayKeys) {
    //       arrayKey = Number(arrayKeys[0]);
    //     }

    //     if (arrayKey === undefined) {
    //       // working with entire array

    //       let instructions = [];
    //       for (let key in desiredStateVariableValues.cellMaths) {
    //         instructions.push({
    //           setDependency: "cellChildren",
    //           desiredValue: desiredStateVariableValues.cellMaths[key],
    //           childIndex: key,
    //           variableIndex: 0
    //         })
    //       }

    //       return {
    //         success: true,
    //         instructions
    //       }
    //     } else {

    //       // just have one arrayKey
    //       return {
    //         success: true,
    //         instructions: [{
    //           setDependency: "cellChild",
    //           desiredValue: desiredStateVariableValues.cellMaths[arrayKey],
    //           childIndex: 0,
    //           variableIndex: 0
    //         }]
    //       }

    //     }

    //   }
    // }

    // stateVariableDefinitions.cellNumbers = {
    //   isArray: true,
    //   entryPrefixes: ["cellNumber"],
    //   public: true,
    //   componentType: "number",
    //   returnDependencies: function ({ arrayKeys }) {

    //     if (arrayKeys === undefined) {
    //       return {
    //         cellChildren: {
    //           dependencyType: "child",
    //           childLogicName: "atLeastZeroCells",
    //           variableNames: ["number"],
    //         }
    //       }
    //     } else {
    //       let arrayKey = Number(arrayKeys[0]);

    //       return {
    //         cellChild: {
    //           dependencyType: "child",
    //           childLogicName: "atLeastZeroCells",
    //           variableNames: ["number"],
    //           childIndices: [arrayKey]
    //         }
    //       }
    //     }
    //   },
    //   markStale: function ({ freshnessInfo, changes, arrayKeys }) {
    //     // console.log('mark stale for cellNumbers of row')
    //     // console.log(changes);
    //     // console.log(arrayKeys);

    //     let freshByKey = freshnessInfo.cellNumbers.freshByKey;

    //     let arrayKey;
    //     if (arrayKeys) {
    //       arrayKey = Number(arrayKeys[0]);
    //     }

    //     if (arrayKey === undefined) {
    //       if (changes.cellChildren) {
    //         if (changes.cellChildren.componentIdentitiesChanged) {
    //           for (let key in freshByKey) {
    //             delete freshByKey[key];
    //           }
    //         } else {
    //           for (let key in changes.cellChildren.valuesChanged) {
    //             delete freshByKey[key];
    //           }
    //         }
    //       }

    //       if (Object.keys(freshByKey).length === 0) {
    //         // asked for entire array and it is all stale
    //         return { fresh: { cellNumbers: false } }
    //       } else {
    //         // asked for entire array, but it has some fresh elements
    //         // (we don't know here how many elements cellNumbers has,
    //         // so can't determine if completely fresh)
    //         return { partiallyFresh: { cellNumbers: true } }
    //       }
    //     } else {

    //       // have arrayKey
    //       // so asked for just one component

    //       if (changes.cellChild) {
    //         if (changes.cellChild.componentIdentitiesChanged) {
    //           delete freshByKey[arrayKey];
    //         } else {
    //           if (changes.cellChild.valuesChanged[0]) {
    //             delete freshByKey[arrayKey];
    //           }
    //         }
    //       }

    //       return { fresh: { cellNumbers: freshByKey[arrayKey] === true } };
    //     }

    //   },
    //   definition({ dependencyValues, arrayKeys, freshnessInfo, changes }) {

    //     let freshByKey = freshnessInfo.cellNumbers.freshByKey;

    //     // console.log('definition of cellNumbers of row')
    //     // console.log(JSON.parse(JSON.stringify(freshByKey)));
    //     // console.log(JSON.parse(JSON.stringify(dependencyValues)))
    //     // console.log(JSON.parse(JSON.stringify(changes)))
    //     // console.log(arrayKeys);

    //     let arrayKey;
    //     if (arrayKeys) {
    //       arrayKey = Number(arrayKeys[0]);
    //     }

    //     if (arrayKey === undefined) {
    //       if (changes.cellChildren && changes.cellChildren.componentIdentitiesChanged) {
    //         // send array so that now should overwrite entire array
    //         for (let key in dependencyValues.cellChildren) {
    //           freshByKey[key] = true;
    //         }

    //         return {
    //           newValues: { cellNumbers: dependencyValues.cellChildren.map(x => x.stateValues.number) }
    //         }
    //       }

    //       let newcellNumbers = {};
    //       for (let arrayKey in dependencyValues.cellChildren) {
    //         if (!freshByKey[arrayKey]) {
    //           freshByKey[arrayKey] = true;
    //           newcellNumbers[arrayKey] = dependencyValues.cellChildren[arrayKey].stateValues.number;
    //         }
    //       }
    //       return { newValues: { cellNumbers: newcellNumbers } }
    //     } else {

    //       // have arrayKey

    //       if (!freshByKey[arrayKey]) {
    //         freshByKey[arrayKey] = true;
    //         let cellNumber;
    //         if (dependencyValues.cellChild.length === 1) {
    //           cellNumber = dependencyValues.cellChild[0].stateValues.number;
    //         }
    //         return {
    //           newValues: {
    //             cellNumbers: {
    //               [arrayKey]: cellNumber
    //             }
    //           }
    //         }
    //       } else {
    //         // arrayKey asked for didn't change
    //         // don't need to report noChanges for array state variable
    //         return {};
    //       }
    //     }
    //   },
    //   inverseDefinition: function ({ desiredStateVariableValues, arrayKeys }) {

    //     // console.log('inverse definition of cellNumbers of row')
    //     // console.log(desiredStateVariableValues)
    //     // console.log(arrayKeys);

    //     let arrayKey;
    //     if (arrayKeys) {
    //       arrayKey = Number(arrayKeys[0]);
    //     }

    //     if (arrayKey === undefined) {
    //       // working with entire array

    //       let instructions = [];
    //       for (let key in desiredStateVariableValues.cellNumbers) {
    //         instructions.push({
    //           setDependency: "cellChildren",
    //           desiredValue: desiredStateVariableValues.cellNumbers[key],
    //           childIndex: key,
    //           variableIndex: 0
    //         })
    //       }

    //       return {
    //         success: true,
    //         instructions
    //       }
    //     } else {

    //       // just have one arrayKey
    //       return {
    //         success: true,
    //         instructions: [{
    //           setDependency: "cellChild",
    //           desiredValue: desiredStateVariableValues.cellNumbers[arrayKey],
    //           childIndex: 0,
    //           variableIndex: 0
    //         }]
    //       }

    //     }

    //   }
    // }

    // stateVariableDefinitions.cellTexts = {
    //   isArray: true,
    //   entryPrefixes: ["cellText"],
    //   public: true,
    //   componentType: "text",
    //   returnDependencies: function ({ arrayKeys }) {

    //     if (arrayKeys === undefined) {
    //       return {
    //         cellChildren: {
    //           dependencyType: "child",
    //           childLogicName: "atLeastZeroCells",
    //           variableNames: ["text"],
    //         }
    //       }
    //     } else {
    //       let arrayKey = Number(arrayKeys[0]);

    //       return {
    //         cellChild: {
    //           dependencyType: "child",
    //           childLogicName: "atLeastZeroCells",
    //           variableNames: ["text"],
    //           childIndices: [arrayKey]
    //         }
    //       }
    //     }
    //   },
    //   markStale: function ({ freshnessInfo, changes, arrayKeys }) {
    //     // console.log('mark stale for cellTexts of row')
    //     // console.log(changes);
    //     // console.log(arrayKeys);

    //     let freshByKey = freshnessInfo.cellTexts.freshByKey;

    //     let arrayKey;
    //     if (arrayKeys) {
    //       arrayKey = Number(arrayKeys[0]);
    //     }

    //     if (arrayKey === undefined) {
    //       if (changes.cellChildren) {
    //         if (changes.cellChildren.componentIdentitiesChanged) {
    //           for (let key in freshByKey) {
    //             delete freshByKey[key];
    //           }
    //         } else {
    //           for (let key in changes.cellChildren.valuesChanged) {
    //             delete freshByKey[key];
    //           }
    //         }
    //       }

    //       if (Object.keys(freshByKey).length === 0) {
    //         // asked for entire array and it is all stale
    //         return { fresh: { cellTexts: false } }
    //       } else {
    //         // asked for entire array, but it has some fresh elements
    //         // (we don't know here how many elements cellTexts has,
    //         // so can't determine if completely fresh)
    //         return { partiallyFresh: { cellTexts: true } }
    //       }
    //     } else {

    //       // have arrayKey
    //       // so asked for just one component

    //       if (changes.cellChild) {
    //         if (changes.cellChild.componentIdentitiesChanged) {
    //           delete freshByKey[arrayKey];
    //         } else {
    //           if (changes.cellChild.valuesChanged[0]) {
    //             delete freshByKey[arrayKey];
    //           }
    //         }
    //       }

    //       return { fresh: { cellTexts: freshByKey[arrayKey] === true } };
    //     }

    //   },
    //   definition({ dependencyValues, arrayKeys, freshnessInfo, changes }) {

    //     let freshByKey = freshnessInfo.cellTexts.freshByKey;

    //     // console.log('definition of cellTexts of row')
    //     // console.log(JSON.parse(JSON.stringify(freshByKey)));
    //     // console.log(JSON.parse(JSON.stringify(dependencyValues)))
    //     // console.log(JSON.parse(JSON.stringify(changes)))
    //     // console.log(arrayKeys);

    //     let arrayKey;
    //     if (arrayKeys) {
    //       arrayKey = Number(arrayKeys[0]);
    //     }

    //     if (arrayKey === undefined) {
    //       if (changes.cellChildren && changes.cellChildren.componentIdentitiesChanged) {
    //         // send array so that now should overwrite entire array
    //         for (let key in dependencyValues.cellChildren) {
    //           freshByKey[key] = true;
    //         }

    //         return {
    //           newValues: { cellTexts: dependencyValues.cellChildren.map(x => x.stateValues.text) }
    //         }
    //       }

    //       let newcellTexts = {};
    //       for (let arrayKey in dependencyValues.cellChildren) {
    //         if (!freshByKey[arrayKey]) {
    //           freshByKey[arrayKey] = true;
    //           newcellTexts[arrayKey] = dependencyValues.cellChildren[arrayKey].stateValues.text;
    //         }
    //       }
    //       return { newValues: { cellTexts: newcellTexts } }
    //     } else {

    //       // have arrayKey

    //       if (!freshByKey[arrayKey]) {
    //         freshByKey[arrayKey] = true;
    //         let cellText;
    //         if (dependencyValues.cellChild.length === 1) {
    //           cellText = dependencyValues.cellChild[0].stateValues.text;
    //         }
    //         return {
    //           newValues: {
    //             cellTexts: {
    //               [arrayKey]: cellText
    //             }
    //           }
    //         }
    //       } else {
    //         // arrayKey asked for didn't change
    //         // don't need to report noChanges for array state variable
    //         return {};
    //       }
    //     }
    //   },
    //   inverseDefinition: function ({ desiredStateVariableValues, arrayKeys }) {

    //     // console.log('inverse definition of cellTexts of row')
    //     // console.log(desiredStateVariableValues)
    //     // console.log(arrayKeys);

    //     let arrayKey;
    //     if (arrayKeys) {
    //       arrayKey = Number(arrayKeys[0]);
    //     }

    //     if (arrayKey === undefined) {
    //       // working with entire array

    //       let instructions = [];
    //       for (let key in desiredStateVariableValues.cellTexts) {
    //         instructions.push({
    //           setDependency: "cellChildren",
    //           desiredValue: desiredStateVariableValues.cellTexts[key],
    //           childIndex: key,
    //           variableIndex: 0
    //         })
    //       }

    //       return {
    //         success: true,
    //         instructions
    //       }
    //     } else {

    //       // just have one arrayKey
    //       return {
    //         success: true,
    //         instructions: [{
    //           setDependency: "cellChild",
    //           desiredValue: desiredStateVariableValues.cellTexts[arrayKey],
    //           childIndex: 0,
    //           variableIndex: 0
    //         }]
    //       }

    //     }

    //   }
    // }

    return stateVariableDefinitions;
  }
}
