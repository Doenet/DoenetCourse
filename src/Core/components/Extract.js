import CompositeComponent from './abstract/CompositeComponent';
import { flattenDeep } from '../utils/array';
import { getUniqueIdentifierFromBase } from '../utils/naming';
import { processAssignNames } from '../utils/serializedStateProcessing';
import { replacementFromProp } from './Copy';

export default class Extract extends CompositeComponent {
  static componentType = 'extract';

  static assignNamesToReplacements = true;

  static acceptAnyAttribute = true;

  static get stateVariablesShadowedForReference() {
    return ['propName'];
  }

  static stateVariableToEvaluateAfterReplacements =
    'needsReplacementsUpdatedWhenStale';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    // delete off attributes from base component that should apply to replacements instead
    // (using acceptAnyAttribute)
    delete attributes.disabled;
    delete attributes.modifyIndirectly;
    delete attributes.fixed;
    delete attributes.styleNumber;
    delete attributes.isResponse;

    attributes.prop = {
      createPrimitiveOfType: 'string',
    };
    attributes.componentType = {
      createPrimitiveOfType: 'string',
    };
    attributes.nComponents = {
      createPrimitiveOfType: 'number',
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
    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'anything',
      componentType: '_base',
      comparison: 'atLeast',
      excludeComponentTypes: ['_composite'],
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

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

    stateVariableDefinitions.sourceComponents = {
      stateVariablesDeterminingDependencies: [
        'propName',
        'componentIndex',
        'propIndex',
      ],
      returnDependencies: ({ stateValues }) => ({
        children: {
          dependencyType: 'child',
          childLogicName: 'anything',
          variableNames: [stateValues.propName],
          variablesOptional: true,
          componentIndex: stateValues.componentIndex,
          propIndex: stateValues.propIndex,
          publicCaseInsensitiveVariableMatch: true,
          useMappedVariableNames: true,
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          sourceComponents: dependencyValues.children,
        },
      }),
    };

    stateVariableDefinitions.readyToExpandWhenResolved = {
      returnDependencies: () => ({
        replacementClasses: {
          dependencyType: 'stateVariable',
          variableName: 'sourceComponents',
        },
        needsReplacementsUpdatedWhenStale: {
          dependencyType: 'stateVariable',
          variableName: 'needsReplacementsUpdatedWhenStale',
        },
      }),
      definition() {
        return { newValues: { readyToExpandWhenResolved: true } };
      },
    };

    stateVariableDefinitions.needsReplacementsUpdatedWhenStale = {
      returnDependencies() {
        return {
          sourceComponents: {
            dependencyType: 'stateVariable',
            variableName: 'sourceComponents',
          },
        };
      },
      // the whole point of this state variable is to return updateReplacements
      // on mark stale
      markStale: () => ({ updateReplacements: true }),
      definition: () => ({
        newValues: { needsReplacementsUpdatedWhenStale: true },
      }),
    };

    return stateVariableDefinitions;
  }

  get allPotentialRendererTypes() {
    let allPotentialRendererTypes = [];

    // let allReplacementClasses = [
    //   ...this.stateValues.replacementClasses,
    //   ...this.stateValues.replacementClassesForProp,
    //   ...this.stateValues.potentialReplacementClasses,
    // ]

    // for (let replacementClass of allReplacementClasses) {
    //   let rendererType = replacementClass.rendererType;
    //   if (rendererType && !allPotentialRendererTypes.includes(rendererType)) {
    //     allPotentialRendererTypes.push(rendererType);
    //   }
    // }

    if (this.replacements) {
      for (let replacement of this.replacements) {
        for (let rendererType of replacement.allPotentialRendererTypes) {
          if (!allPotentialRendererTypes.includes(rendererType)) {
            allPotentialRendererTypes.push(rendererType);
          }
        }
      }
    }

    return allPotentialRendererTypes;
  }

  static createSerializedReplacements({
    component,
    components,
    workspace,
    componentInfoObjects,
    flags,
    publicCaseInsensitiveAliasSubstitutions,
  }) {
    // console.log(`calculating replacements for ${component.componentName}`);

    let replacements = [];

    let numReplacementsBySource = [];
    let numReplacementsSoFar = 0;

    workspace.propVariablesCopiedBySource = [];

    workspace.uniqueIdentifiersUsedBySource = {};

    let compositeAttributesObj = this.createAttributesObject({ flags });

    for (
      let sourceNum = 0;
      sourceNum < component.stateValues.sourceComponents.length;
      sourceNum++
    ) {
      if (component.stateValues.sourceComponents[sourceNum] !== undefined) {
        let uniqueIdentifiersUsed = (workspace.uniqueIdentifiersUsedBySource[
          sourceNum
        ] = []);
        let results = this.createReplacementForSource({
          component,
          sourceNum,
          components,
          numReplacementsSoFar,
          uniqueIdentifiersUsed,
          componentInfoObjects,
          compositeAttributesObj,
          publicCaseInsensitiveAliasSubstitutions,
        });

        workspace.propVariablesCopiedBySource[sourceNum] =
          results.propVariablesCopiedByReplacement;

        let sourceReplacements = results.serializedReplacements;
        numReplacementsBySource[sourceNum] = sourceReplacements.length;
        numReplacementsSoFar += sourceReplacements.length;
        replacements.push(...sourceReplacements);
      } else {
        numReplacementsBySource[sourceNum] = 0;
      }
    }

    workspace.numReplacementsBySource = numReplacementsBySource;
    workspace.sourceNames = component.stateValues.sourceComponents.map(
      (x) => x.componentName,
    );

    return { replacements };
  }

  static createReplacementForSource({
    component,
    components,
    sourceNum,
    numReplacementsSoFar,
    uniqueIdentifiersUsed,
    componentInfoObjects,
    compositeAttributesObj,
    publicCaseInsensitiveAliasSubstitutions,
  }) {
    // console.log(`create replacement for source ${sourceNum}, ${numReplacementsSoFar} of ${component.componentName}`)

    let results = replacementFromProp({
      component,
      components,
      replacementSource: component.stateValues.sourceComponents[sourceNum],
      propName: component.stateValues.propName,
      // numReplacementsSoFar,
      uniqueIdentifiersUsed,
      compositeAttributesObj,
      componentInfoObjects,
      publicCaseInsensitiveAliasSubstitutions,
    });

    let serializedReplacements = results.serializedReplacements;
    let propVariablesCopiedByReplacement =
      results.propVariablesCopiedByReplacement;

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
    components,
    workspace,
    componentInfoObjects,
    flags,
    publicCaseInsensitiveAliasSubstitutions,
  }) {
    // console.log(`calculating replacement changes for ${component.componentName}`);
    // console.log(workspace.numReplacementsBySource);
    // console.log(component.replacements);

    let replacementChanges = [];

    let numReplacementsSoFar = 0;

    let numReplacementsBySource = [];
    let propVariablesCopiedBySource = [];

    let compositeAttributesObj = this.createAttributesObject({ flags });

    let maxSourceLength = Math.max(
      component.stateValues.sourceComponents.length,
      workspace.numReplacementsBySource.length,
    );

    let recreateRemaining = false;

    for (let sourceNum = 0; sourceNum < maxSourceLength; sourceNum++) {
      let source = component.stateValues.sourceComponents[sourceNum];
      if (source === undefined) {
        if (workspace.numReplacementsBySource[sourceNum] > 0) {
          if (!recreateRemaining) {
            // since deleting replacement will shift the remaining replacements
            // and change resulting names,
            // delete all remaining and mark to be recreated

            let numberReplacementsLeft = workspace.numReplacementsBySource
              .slice(sourceNum)
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
            workspace.numReplacementsBySource
              .slice(sourceNum)
              .forEach((v, i) => (workspace.numReplacementsBySource[i] = 0));
          }

          workspace.uniqueIdentifiersUsedBySource[sourceNum] = [];
        }

        numReplacementsBySource[sourceNum] = 0;
        propVariablesCopiedBySource.push([]);

        continue;
      }

      let prevSourceName = workspace.sourceNames[sourceNum];

      // check if source has changed
      let needToRecreate =
        prevSourceName === undefined ||
        source.componentName !== prevSourceName ||
        recreateRemaining;

      if (!needToRecreate) {
        // make sure the current replacements still shadow the replacement source
        for (
          let ind = 0;
          ind < workspace.numReplacementsBySource[sourceNum];
          ind++
        ) {
          let currentReplacement =
            component.replacements[numReplacementsSoFar + ind];
          if (!currentReplacement) {
            needToRecreate = true;
            break;
          }
        }
      }

      if (needToRecreate) {
        let prevNumReplacements = 0;
        if (prevSourceName !== undefined) {
          prevNumReplacements = workspace.numReplacementsBySource[sourceNum];
        }

        let numReplacementsToDelete = prevNumReplacements;
        if (recreateRemaining) {
          // already deleted old replacements
          numReplacementsToDelete = 0;
        }

        let uniqueIdentifiersUsed = (workspace.uniqueIdentifiersUsedBySource[
          sourceNum
        ] = []);
        let results = this.recreateReplacements({
          component,
          sourceNum,
          numReplacementsSoFar,
          numReplacementsToDelete,
          components,
          uniqueIdentifiersUsed,
          componentInfoObjects,
          compositeAttributesObj,
          publicCaseInsensitiveAliasSubstitutions,
        });

        numReplacementsSoFar += results.numReplacements;

        numReplacementsBySource[sourceNum] = results.numReplacements;

        propVariablesCopiedBySource[sourceNum] =
          results.propVariablesCopiedByReplacement;

        let replacementInstruction = results.replacementInstruction;

        if (!recreateRemaining) {
          if (results.numReplacements !== prevNumReplacements) {
            // we changed the number of replacements which shifts remaining ones
            // since names won't match, we need to delete
            // all the remaining replacements and recreate them

            let numberReplacementsLeft = workspace.numReplacementsBySource
              .slice(sourceNum)
              .reduce((a, c) => a + c, 0);

            replacementInstruction.numberReplacementsToReplace =
              numberReplacementsLeft;

            recreateRemaining = true;

            // since deleted remaining, change in workspace
            // so that don't attempt to delete again
            workspace.numReplacementsBySource
              .slice(sourceNum)
              .forEach((v, i) => (workspace.numReplacementsBySource[i] = 0));
          }
        }

        replacementChanges.push(replacementInstruction);

        continue;
      }

      // use new uniqueIdentifiersUsed
      // so will get the same names for pieces that match
      let uniqueIdentifiersUsed = (workspace.uniqueIdentifiersUsedBySource[
        sourceNum
      ] = []);

      let results = this.createReplacementForSource({
        component,
        sourceNum,
        components,
        numReplacementsSoFar,
        uniqueIdentifiersUsed,
        componentInfoObjects,
        compositeAttributesObj,
        publicCaseInsensitiveAliasSubstitutions,
      });

      let propVariablesCopiedByReplacement =
        results.propVariablesCopiedByReplacement;

      let newSerializedReplacements = results.serializedReplacements;

      let nNewReplacements = newSerializedReplacements.length;
      let nOldReplacements = workspace.numReplacementsBySource[sourceNum];

      if (nNewReplacements !== nOldReplacements) {
        // changing the number of replacements will shift the remaining replacements
        // and change resulting names,
        // delete all remaining and mark to be recreated

        let numberReplacementsLeft = workspace.numReplacementsBySource
          .slice(sourceNum)
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
        workspace.numReplacementsBySource
          .slice(sourceNum)
          .forEach((v, i) => (workspace.numReplacementsBySource[i] = 0));
      } else {
        for (let ind = 0; ind < nNewReplacements; ind++) {
          if (
            propVariablesCopiedByReplacement[ind].length !==
              workspace.propVariablesCopiedBySource[sourceNum][ind].length ||
            workspace.propVariablesCopiedBySource[sourceNum][ind].some(
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

      numReplacementsBySource[sourceNum] = nNewReplacements;

      propVariablesCopiedBySource[sourceNum] = propVariablesCopiedByReplacement;
    }

    workspace.numReplacementsBySource = numReplacementsBySource;
    workspace.sourceNames = component.stateValues.sourceComponents.map(
      (x) => x.componentName,
    );
    workspace.propVariablesCopiedBySource = propVariablesCopiedBySource;

    // console.log("replacementChanges");
    // console.log(replacementChanges);

    return replacementChanges;
  }

  static recreateReplacements({
    component,
    sourceNum,
    numReplacementsSoFar,
    numReplacementsToDelete,
    uniqueIdentifiersUsed,
    components,
    componentInfoObjects,
    compositeAttributesObj,
    publicCaseInsensitiveAliasSubstitutions,
  }) {
    let results = this.createReplacementForSource({
      component,
      sourceNum,
      numReplacementsSoFar,
      components,
      uniqueIdentifiersUsed,
      componentInfoObjects,
      compositeAttributesObj,
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
