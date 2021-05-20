import CompositeComponent from './abstract/CompositeComponent';
import { postProcessCopy } from '../utils/copy';
import { processAssignNames } from '../utils/serializedStateProcessing';
import { replacementFromProp } from './Copy';
import { deepClone } from '../utils/deepFunctions';

export default class Collect extends CompositeComponent {
  static componentType = 'collect';

  static assignNamesToReplacements = true;

  static acceptTname = true;

  static get stateVariablesShadowedForReference() {
    return ['targetComponent', 'propName', 'componentTypesToCollect'];
  }

  static stateVariableToEvaluateAfterReplacements =
    'needsReplacementsUpdatedWhenStale';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.prop = {
      createPrimitiveOfType: 'string',
    };
    attributes.maximumNumber = {
      createComponentOfType: 'number',
      createStateVariable: 'maximumNumber',
      defaultValue: null,
      public: true,
    };
    attributes.componentIndex = {
      createComponentOfType: 'number',
      createStateVariable: 'componentIndex',
      defaultValue: null,
      public: true,
    };

    attributes.propIndex = {
      createComponentOfType: 'number',
      createStateVariable: 'propIndex',
      defaultValue: null,
      public: true,
    };

    attributes.targetAttributesToIgnore = {
      createComponentOfType: 'textList',
      createStateVariable: 'targetAttributesToIgnore',
      defaultValue: ['hide'],
      public: true,
    };

    attributes.componentTypes = {
      createComponentOfType: 'textList',
    };

    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.targetComponent = {
      returnDependencies: () => ({
        targetComponent: {
          dependencyType: 'targetComponent',
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            targetComponent: dependencyValues.targetComponent,
          },
        };
      },
    };

    stateVariableDefinitions.targetInactive = {
      stateVariablesDeterminingDependencies: ['targetComponent'],
      returnDependencies({ stateValues }) {
        if (stateValues.targetComponent) {
          return {
            targetIsInactiveCompositeReplacement: {
              dependencyType: 'stateVariable',
              componentName: stateValues.targetComponent.componentName,
              variableName: 'isInactiveCompositeReplacement',
            },
          };
        } else {
          return {};
        }
      },
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            targetInactive: Boolean(
              dependencyValues.targetIsInactiveCompositeReplacement,
            ),
          },
        };
      },
    };

    stateVariableDefinitions.targetName = {
      returnDependencies: () => ({
        targetComponent: {
          dependencyType: 'stateVariable',
          variableName: 'targetComponent',
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.targetComponent === null) {
          console.warn(`No copy target`);
          return { newValues: { targetName: '' } };
        }
        return {
          newValues: {
            targetName: dependencyValues.targetComponent.componentName,
          },
        };
      },
    };

    stateVariableDefinitions.propName = {
      returnDependencies: () => ({
        propName: {
          dependencyType: 'attribute',
          attributeName: 'prop',
        },
      }),
      definition: function ({ dependencyValues }) {
        return { newValues: { propName: dependencyValues.propName } };
      },
    };

    stateVariableDefinitions.componentTypesToCollect = {
      additionalStateVariablesDefined: ['componentClassesToCollect'],
      returnDependencies: () => ({
        componentTypesAttr: {
          dependencyType: 'attributeComponent',
          attributeName: 'componentTypes',
          variableNames: ['texts'],
        },
      }),
      definition: function ({ dependencyValues, componentInfoObjects }) {
        let componentTypesToCollect = [];
        let componentClassesToCollect = [];

        if (dependencyValues.componentTypesAttr !== null) {
          for (let cType of dependencyValues.componentTypesAttr.stateValues
            .texts) {
            let componentType =
              componentInfoObjects.componentTypeLowerCaseMapping[
                cType.toLowerCase()
              ];
            let cClass =
              componentInfoObjects.allComponentClasses[componentType];

            if (cClass) {
              componentTypesToCollect.push(componentType);
              componentClassesToCollect.push(cClass);
            } else {
              let message =
                'Cannot collect component type ' +
                cType +
                '. Component type not found.';
              console.warn(message);
            }
          }
        }

        return {
          newValues: {
            componentTypesToCollect,
            componentClassesToCollect,
          },
        };
      },
    };

    stateVariableDefinitions.collectedComponents = {
      stateVariablesDeterminingDependencies: [
        'componentTypesToCollect',
        'targetName',
        'propName',
        'componentIndex',
        'propIndex',
      ],
      returnDependencies: function ({ stateValues }) {
        if (!stateValues.targetName) {
          return {};
        }

        let descendants = {
          dependencyType: 'descendant',
          ancestorName: stateValues.targetName,
          componentTypes: stateValues.componentTypesToCollect,
          useReplacementsForComposites: true,
          includeNonActiveChildren: true,
          recurseToMatchedChildren: false,
          componentIndex: stateValues.componentIndex,
        };

        if (stateValues.propName) {
          descendants.variableNames = [stateValues.propName];
          descendants.variablesOptional = true;
          descendants.componentIndex = stateValues.componentIndex;
          descendants.propIndex = stateValues.propIndex;
          descendants.publicCaseInsensitiveVariableMatch = true;
          descendants.useMappedVariableNames = true;
        }

        return {
          descendants,
          maximumNumber: {
            dependencyType: 'stateVariable',
            variableName: 'maximumNumber',
          },
        };
      },
      definition: function ({ dependencyValues }) {
        // console.log(`definition of collectedComponents for ${componentName}`)
        // console.log(dependencyValues)

        let collectedComponents = dependencyValues.descendants;
        if (!collectedComponents) {
          collectedComponents = [];
        }

        if (
          dependencyValues.maximumNumber !== null &&
          collectedComponents.length > dependencyValues.maximumNumber
        ) {
          let maxnum = Math.max(0, Math.floor(dependencyValues.maximumNumber));
          collectedComponents = collectedComponents.slice(0, maxnum);
        }

        return {
          newValues: { collectedComponents },
        };
      },
    };

    stateVariableDefinitions.readyToExpandWhenResolved = {
      returnDependencies: () => ({
        collectedComponents: {
          dependencyType: 'stateVariable',
          variableName: 'collectedComponents',
        },
        needsReplacementsUpdatedWhenStale: {
          dependencyType: 'stateVariable',
          variableName: 'needsReplacementsUpdatedWhenStale',
        },
      }),
      definition: () => ({
        newValues: { readyToExpandWhenResolved: true },
      }),
    };

    stateVariableDefinitions.needsReplacementsUpdatedWhenStale = {
      returnDependencies() {
        return {
          collectedComponents: {
            dependencyType: 'stateVariable',
            variableName: 'collectedComponents',
          },
        };
      },
      // the whole point of this state variable is to return updateReplacements
      // on mark stale
      markStale() {
        return { updateReplacements: true };
      },
      definition() {
        return { newValues: { needsReplacementsUpdatedWhenStale: true } };
      },
    };

    return stateVariableDefinitions;
  }

  static createSerializedReplacements({
    component,
    components,
    workspace,
    componentInfoObjects,
    nComponentsForSource,
    publicCaseInsensitiveAliasSubstitutions,
  }) {
    // console.log(`create serialized replacements for ${component.componentName}`)
    // console.log(component.stateValues.collectedComponents)

    if (!component.stateValues.targetComponent) {
      return { replacements: [] };
    }

    let replacements = [];

    let numReplacementsByCollected = [];
    let numReplacementsSoFar = 0;
    let replacementNamesByCollected = [];

    workspace.propVariablesCopiedByCollected = [];

    workspace.uniqueIdentifiersUsedByCollected = {};

    let compositeAttributesObj = this.createAttributesObject({});

    for (
      let collectedNum = 0;
      collectedNum < component.stateValues.collectedComponents.length;
      collectedNum++
    ) {
      if (component.stateValues.collectedComponents[collectedNum]) {
        let uniqueIdentifiersUsed = (workspace.uniqueIdentifiersUsedByCollected[
          collectedNum
        ] = []);
        let results = this.createReplacementForCollected({
          component,
          collectedNum,
          components,
          numReplacementsSoFar,
          uniqueIdentifiersUsed,
          componentInfoObjects,
          compositeAttributesObj,
          nComponentsForSource,
          publicCaseInsensitiveAliasSubstitutions,
        });

        workspace.propVariablesCopiedByCollected[collectedNum] =
          results.propVariablesCopiedByReplacement;

        let collectedReplacements = results.serializedReplacements;
        numReplacementsByCollected[collectedNum] = collectedReplacements.length;
        numReplacementsSoFar += collectedReplacements.length;
        replacements.push(...collectedReplacements);
        replacementNamesByCollected[collectedNum] = collectedReplacements.map(
          (x) => x.componentName,
        );
      } else {
        numReplacementsByCollected[collectedNum] = 0;
        replacementNamesByCollected[collectedNum] = [];
        workspace.propVariablesCopiedByCollected[collectedNum] = [];
      }
    }

    workspace.numReplacementsByCollected = numReplacementsByCollected;
    workspace.collectedNames = component.stateValues.collectedComponents.map(
      (x) => x.componentName,
    );
    workspace.replacementNamesByCollected = replacementNamesByCollected;
    return { replacements };
  }

  static createReplacementForCollected({
    component,
    components,
    collectedNum,
    numReplacementsSoFar,
    uniqueIdentifiersUsed,
    componentInfoObjects,
    compositeAttributesObj,
    nComponentsForSource,
    publicCaseInsensitiveAliasSubstitutions,
  }) {
    // console.log(`create replacement for collected ${collectedNum}, ${numReplacementsSoFar}`)

    let collectedObj = component.stateValues.collectedComponents[collectedNum];
    let collectedName = collectedObj.componentName;
    let collectedComponent = components[collectedName];

    let serializedReplacements = [];
    let propVariablesCopiedByReplacement = [];

    // since we delayed recalculating descendants,
    // it's possible that a collectedComponent no longer exists
    // but hasn't been removed from the state variable
    // In this case, skip
    if (!collectedComponent) {
      return { serializedReplacements, propVariablesCopiedByReplacement };
    }

    if (component.stateValues.propName) {
      let results = replacementFromProp({
        component,
        components,
        replacementSource: collectedObj,
        propName: component.stateValues.propName,
        // numReplacementsSoFar,
        uniqueIdentifiersUsed,
        compositeAttributesObj,
        componentInfoObjects,
        nComponentsForSource,
        publicCaseInsensitiveAliasSubstitutions,
      });

      serializedReplacements = results.serializedReplacements;
      propVariablesCopiedByReplacement =
        results.propVariablesCopiedByReplacement;
    } else {
      let serializedCopy = [collectedComponent.serialize({ forCopy: true })];

      serializedReplacements = postProcessCopy({
        serializedComponents: serializedCopy,
        componentName: component.componentName,
        uniqueIdentifiersUsed,
        identifierPrefix: collectedNum + '|',
      });
    }

    let processResult = processAssignNames({
      assignNames: component.doenetAttributes.assignNames,
      serializedComponents: serializedReplacements,
      parentName: component.componentName,
      indOffset: numReplacementsSoFar,
      parentCreatesNewNamespace: component.attributes.newNamespace,
      componentInfoObjects,
    });

    serializedReplacements = processResult.serializedComponents;

    return { serializedReplacements, propVariablesCopiedByReplacement };
  }

  static calculateReplacementChanges({
    component,
    componentChanges,
    components,
    workspace,
    componentInfoObjects,
    nComponentsForSource,
    publicCaseInsensitiveAliasSubstitutions,
  }) {
    // console.log("Calculating replacement changes for " + component.componentName);
    // console.log(component.stateValues.collectedComponents.map(x => x.componentName))
    // console.log(deepClone(workspace));
    // console.log(component.replacements.map(x => x.componentName))

    let numReplacementsFoundSoFar = 0;

    // adjust workspace variables by any replacements that were deleted
    for (
      let collectedNum = 0;
      collectedNum < workspace.numReplacementsByCollected.length;
      collectedNum++
    ) {
      let indsDeleted = [];
      for (let [ind, repName] of workspace.replacementNamesByCollected[
        collectedNum
      ].entries()) {
        if (
          !component.replacements[numReplacementsFoundSoFar] ||
          component.replacements[numReplacementsFoundSoFar].componentName !==
            repName
        ) {
          indsDeleted.push(ind);
        } else {
          numReplacementsFoundSoFar++;
        }
      }

      for (let ind of indsDeleted.reverse()) {
        workspace.replacementNamesByCollected[collectedNum].splice(ind, 1);
        workspace.propVariablesCopiedByCollected[collectedNum].splice(ind, 1);
      }
      workspace.numReplacementsByCollected[collectedNum] -= indsDeleted.length;
    }

    let replacementChanges = [];

    let numReplacementsSoFar = 0;

    let numReplacementsByCollected = [];
    let propVariablesCopiedByCollected = [];
    let replacementNamesByCollected = [];

    let maxCollectedLength = Math.max(
      component.stateValues.collectedComponents.length,
      workspace.numReplacementsByCollected.length,
    );

    let recreateRemaining = false;

    let compositeAttributesObj = this.createAttributesObject({});

    for (
      let collectedNum = 0;
      collectedNum < maxCollectedLength;
      collectedNum++
    ) {
      let collected = component.stateValues.collectedComponents[collectedNum];
      if (collected === undefined) {
        if (workspace.numReplacementsByCollected[collectedNum] > 0) {
          if (!recreateRemaining) {
            // since deleting replacement will shift the remaining replacements
            // and change resulting names,
            // delete all remaining and mark to be recreated

            let numberReplacementsLeft = workspace.numReplacementsByCollected
              .slice(collectedNum)
              .reduce((a, c) => a + c, 0);

            if (numberReplacementsLeft > 0) {
              let replacementInstruction = {
                changeType: 'delete',
                changeTopLevelReplacements: true,
                firstReplacementInd: numReplacementsSoFar,
                numberReplacementsToDelete: numberReplacementsLeft,
              };
              replacementChanges.push(replacementInstruction);
            }

            recreateRemaining = true;

            // since deleted remaining, change in workspace
            // so that don't attempt to delete again
            workspace.numReplacementsByCollected
              .slice(collectedNum)
              .forEach((v, i) => (workspace.numReplacementsByCollected[i] = 0));
          }

          workspace.uniqueIdentifiersUsedByCollected[collectedNum] = [];
        }

        numReplacementsByCollected[collectedNum] = 0;
        propVariablesCopiedByCollected.push([]);
        replacementNamesByCollected.push([]);

        continue;
      }

      let prevCollectedName = workspace.collectedNames[collectedNum];

      // check if collected has changed
      if (
        prevCollectedName === undefined ||
        collected.componentName !== prevCollectedName ||
        recreateRemaining
      ) {
        let prevNumReplacements = 0;
        if (prevCollectedName !== undefined) {
          prevNumReplacements =
            workspace.numReplacementsByCollected[collectedNum];
        }

        let numReplacementsToDelete = prevNumReplacements;
        if (recreateRemaining) {
          // already deleted old replacements
          numReplacementsToDelete = 0;
        }

        let uniqueIdentifiersUsed = (workspace.uniqueIdentifiersUsedByCollected[
          collectedNum
        ] = []);
        let results = this.recreateReplacements({
          component,
          collectedNum,
          numReplacementsSoFar,
          numReplacementsToDelete,
          components,
          uniqueIdentifiersUsed,
          componentInfoObjects,
          compositeAttributesObj,
          nComponentsForSource,
          publicCaseInsensitiveAliasSubstitutions,
        });

        numReplacementsSoFar += results.numReplacements;

        numReplacementsByCollected[collectedNum] = results.numReplacements;

        propVariablesCopiedByCollected[collectedNum] =
          results.propVariablesCopiedByReplacement;

        let replacementInstruction = results.replacementInstruction;

        replacementNamesByCollected[collectedNum] =
          replacementInstruction.serializedReplacements.map(
            (x) => x.componentName,
          );

        if (!recreateRemaining) {
          if (results.numReplacements !== prevNumReplacements) {
            // we changed the number of replacements which shifts remaining ones
            // since names won't match, we need to delete
            // all the remaining replacements and recreate them

            let numberReplacementsLeft = workspace.numReplacementsByCollected
              .slice(collectedNum)
              .reduce((a, c) => a + c, 0);

            replacementInstruction.numberReplacementsToReplace =
              numberReplacementsLeft;

            recreateRemaining = true;

            // since deleted remaining, change in workspace
            // so that don't attempt to delete again
            workspace.numReplacementsByCollected
              .slice(collectedNum)
              .forEach((v, i) => (workspace.numReplacementsByCollected[i] = 0));
          }
        }

        replacementChanges.push(replacementInstruction);

        continue;
      }

      if (!component.stateValues.propName) {
        numReplacementsSoFar +=
          workspace.numReplacementsByCollected[collectedNum];
        numReplacementsByCollected[collectedNum] =
          workspace.numReplacementsByCollected[collectedNum];
        replacementNamesByCollected[collectedNum] =
          workspace.replacementNamesByCollected[collectedNum];
        propVariablesCopiedByCollected[collectedNum] = [];
        continue;
      }

      // use new uniqueIdentifiersUsed
      // so will get the same names for pieces that match
      let uniqueIdentifiersUsed = (workspace.uniqueIdentifiersUsedByCollected[
        collectedNum
      ] = []);
      let results = this.createReplacementForCollected({
        component,
        collectedNum,
        components,
        numReplacementsSoFar,
        uniqueIdentifiersUsed,
        componentInfoObjects,
        compositeAttributesObj,
        nComponentsForSource,
        publicCaseInsensitiveAliasSubstitutions,
      });

      let propVariablesCopiedByReplacement =
        results.propVariablesCopiedByReplacement;

      let newSerializedReplacements = results.serializedReplacements;

      let nNewReplacements = newSerializedReplacements.length;
      let nOldReplacements = workspace.numReplacementsByCollected[collectedNum];

      if (nNewReplacements !== nOldReplacements) {
        // changing the number of replacements will shift the remaining replacements
        // and change resulting names,
        // delete all remaining and mark to be recreated

        let numberReplacementsLeft = workspace.numReplacementsByCollected
          .slice(collectedNum)
          .reduce((a, c) => a + c, 0);

        let replacementInstruction = {
          changeType: 'add',
          changeTopLevelReplacements: true,
          firstReplacementInd: numReplacementsSoFar,
          numberReplacementsToReplace: numberReplacementsLeft,
          serializedReplacements: newSerializedReplacements,
          assignNamesOffset: numReplacementsSoFar,
        };

        replacementChanges.push(replacementInstruction);

        recreateRemaining = true;

        // since deleted remaining, change in workspace
        // so that don't attempt to delete again
        workspace.numReplacementsByCollected
          .slice(collectedNum)
          .forEach((v, i) => (workspace.numReplacementsByCollected[i] = 0));
      } else {
        for (let ind = 0; ind < nNewReplacements; ind++) {
          if (
            propVariablesCopiedByReplacement[ind].length !==
              workspace.propVariablesCopiedByCollected[collectedNum][ind]
                .length ||
            workspace.propVariablesCopiedByCollected[collectedNum][ind].some(
              (v, i) => v !== propVariablesCopiedByReplacement[ind][i],
            )
          ) {
            let replacementInstruction = {
              changeType: 'add',
              changeTopLevelReplacements: true,
              firstReplacementInd: numReplacementsSoFar + ind,
              numberReplacementsToReplace: 1,
              serializedReplacements: [newSerializedReplacements[ind]],
              assignNamesOffset: numReplacementsSoFar + ind,
            };
            replacementChanges.push(replacementInstruction);
          }
        }
      }

      numReplacementsSoFar += nNewReplacements;

      numReplacementsByCollected[collectedNum] = nNewReplacements;

      propVariablesCopiedByCollected[collectedNum] =
        propVariablesCopiedByReplacement;

      replacementNamesByCollected[collectedNum] = newSerializedReplacements.map(
        (x) => x.componentName,
      );
    }

    workspace.numReplacementsByCollected = numReplacementsByCollected;
    workspace.collectedNames = component.stateValues.collectedComponents.map(
      (x) => x.componentName,
    );
    workspace.propVariablesCopiedByCollected = propVariablesCopiedByCollected;
    workspace.replacementNamesByCollected = replacementNamesByCollected;

    return replacementChanges;
  }

  static recreateReplacements({
    component,
    collectedNum,
    numReplacementsSoFar,
    numReplacementsToDelete,
    uniqueIdentifiersUsed,
    components,
    componentInfoObjects,
    compositeAttributesObj,
    nComponentsForSource,
    publicCaseInsensitiveAliasSubstitutions,
  }) {
    let results = this.createReplacementForCollected({
      component,
      collectedNum,
      components,
      numReplacementsSoFar,
      uniqueIdentifiersUsed,
      componentInfoObjects,
      compositeAttributesObj,
      nComponentsForSource,
      publicCaseInsensitiveAliasSubstitutions,
    });

    let propVariablesCopiedByReplacement =
      results.propVariablesCopiedByReplacement;

    let newSerializedChildren = results.serializedReplacements;

    let replacementInstruction = {
      changeType: 'add',
      changeTopLevelReplacements: true,
      firstReplacementInd: numReplacementsSoFar,
      numberReplacementsToReplace: numReplacementsToDelete,
      serializedReplacements: newSerializedChildren,
      assignNamesOffset: numReplacementsSoFar,
    };

    return {
      numReplacements: newSerializedChildren.length,
      propVariablesCopiedByReplacement,
      replacementInstruction,
    };
  }
}
