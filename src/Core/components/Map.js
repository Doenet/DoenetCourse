import CompositeComponent from './abstract/CompositeComponent';
import { deepClone } from '../utils/deepFunctions';
import { processAssignNames } from '../utils/serializedStateProcessing';

export default class Map extends CompositeComponent {
  static componentType = 'map';

  static assignNamesToReplacements = true;

  static stateVariableToEvaluateAfterReplacements = 'readyToExpandWhenResolved';

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    attributes.behavior = {
      createComponentOfType: 'text',
      createStateVariable: 'behavior',
      defaultValue: 'combination',
      public: true,
      trim: true,
    };

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let exactlyOneTemplate = childLogic.newLeaf({
      name: 'exactlyOneTemplate',
      componentType: 'template',
      number: 1,
    });

    let atLeastOneSources = childLogic.newLeaf({
      name: 'atLeastOneSources',
      componentType: 'sources',
      comparison: 'atLeast',
      number: 1,
    });

    childLogic.newOperator({
      name: 'templateSources',
      operator: 'and',
      propositions: [exactlyOneTemplate, atLeastOneSources],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.nSources = {
      additionalStateVariablesDefined: [
        'sourcesNames',
        'sourceAliases',
        'sourceIndexAliases',
      ],
      returnDependencies: () => ({
        sourcesChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastOneSources',
          variableNames: ['alias', 'indexAlias'],
        },
      }),
      definition: function ({ dependencyValues }) {
        return {
          newValues: {
            nSources: dependencyValues.sourcesChildren.length,
            sourcesNames: dependencyValues.sourcesChildren.map(
              (x) => x.componentName,
            ),
            sourceAliases: dependencyValues.sourcesChildren.map(
              (x) => x.stateValues.alias,
            ),
            sourceIndexAliases: dependencyValues.sourcesChildren.map(
              (x) => x.stateValues.indexAlias,
            ),
          },
        };
      },
    };

    stateVariableDefinitions.nIterates = {
      additionalStateVariablesDefined: ['minNIterates', 'sourcesChildNames'],
      returnDependencies: () => ({
        sourcesChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastOneSources',
          variableNames: ['numberOfChildren', 'childComponentNames'],
        },
      }),
      definition: function ({ dependencyValues }) {
        let nIterates = dependencyValues.sourcesChildren.map(
          (x) => x.stateValues.numberOfChildren,
        );

        // calculate scalar minNIterates, a scalar holding the minimum value
        let minNIterates = Math.min(...nIterates);

        let sourcesChildNames = dependencyValues.sourcesChildren.map((x) => [
          ...x.stateValues.childComponentNames,
        ]);

        return { newValues: { nIterates, minNIterates, sourcesChildNames } };
      },
    };

    stateVariableDefinitions.template = {
      returnDependencies: () => ({
        templateChild: {
          dependencyType: 'child',
          childLogicName: 'exactlyOneTemplate',
          variableNames: ['serializedChildren', 'newNamespace'],
        },
      }),
      definition: function ({ dependencyValues }) {
        let templateChild = dependencyValues.templateChild[0];
        if (!templateChild) {
          return {
            newValues: { template: null },
          };
        }
        let childrenOfTemplate = templateChild.stateValues.serializedChildren;
        let template = {
          componentType: 'template',
          state: { rendered: true },
          children: childrenOfTemplate,
          originalName: templateChild.componentName,
        };
        if (templateChild.stateValues.newNamespace) {
          template.attributes = { newNamespace: true };
        }
        return {
          newValues: {
            template,
          },
        };
      },
    };

    stateVariableDefinitions.validBehavior = {
      returnDependencies: () => ({
        behavior: {
          dependencyType: 'stateVariable',
          variableName: 'behavior',
        },
        nIterates: {
          dependencyType: 'stateVariable',
          variableName: 'nIterates',
        },
      }),
      definition: function ({ dependencyValues }) {
        let validBehavior = true;

        if (dependencyValues.behavior === 'parallel') {
          // display warning if some sources activeChildren have differ numbers of iterates
          if (
            dependencyValues.nIterates
              .slice(1)
              .some((x) => x != dependencyValues.nIterates[0])
          ) {
            console.warn(
              'Warning: map with parallel behavior and different numbers of iterates in sources activeChildren.' +
                ' Extra iterates will be ignored.',
            );
          }
        } else if (dependencyValues.behavior !== 'combination') {
          console.warn('Invalid map behavior: ' + dependencyValues.behavior);
          validBehavior = false;
        }

        return { newValues: { validBehavior } };
      },
    };

    stateVariableDefinitions.readyToExpandWhenResolved = {
      returnDependencies: () => ({
        validBehavior: {
          dependencyType: 'stateVariable',
          variableName: 'validBehavior',
        },
      }),
      // when this state variable is marked stale
      // it indicates we should update replacement
      // For this to work, must get value in replacement functions
      // so that the variable is marked fresh
      markStale: () => ({ updateReplacements: true }),
      definition: function () {
        // even with invalid behavior, still ready to expand
        // (it will just expand with zero replacements)
        return { newValues: { readyToExpandWhenResolved: true } };
      },
    };

    return stateVariableDefinitions;
  }

  static createSerializedReplacements({
    component,
    workspace,
    componentInfoObjects,
  }) {
    // console.log(`create serialized replacements for ${component.componentName}`);

    if (!component.stateValues.validBehavior) {
      workspace.lastReplacementParameters = {
        sourcesNames: [],
        sourcesChildNames: [],
        behavior: undefined,
        nIterates: undefined,
        minNIterates: undefined,
      };
      return { replacements: [] };
    }

    workspace.lastReplacementParameters = {
      sourcesNames: component.stateValues.sourcesNames,
      sourcesChildNames: component.stateValues.sourcesChildNames,
      behavior: component.stateValues.behavior,
      nIterates: component.stateValues.nIterates,
      minNIterates: component.stateValues.minNIterates,
      replacementsToWithhold: 0,
      withheldSubstitutionChildNames: [],
    };

    let replacements = [];

    if (component.stateValues.behavior === 'parallel') {
      for (let iter = 0; iter < component.stateValues.minNIterates; iter++) {
        replacements.push(
          ...this.parallelReplacement({
            component,
            iter,
            componentInfoObjects,
          }),
        );
      }
    } else {
      //behavior is combination
      // A better solution here?
      // https://stackoverflow.com/a/51470002
      let results = this.recurseThroughCombinations({
        component,
        sourcesNumber: 0,
        iterateNumber: -1,
        componentInfoObjects,
      });
      replacements = results.replacements;
    }

    // console.log(`replacements of map`)
    // console.log(JSON.parse(JSON.stringify(replacements)));
    return { replacements };
  }

  static parallelReplacement({ component, iter, componentInfoObjects }) {
    let replacements = [deepClone(component.stateValues.template)];

    let processResult = processAssignNames({
      assignNames: component.doenetAttributes.assignNames,
      serializedComponents: replacements,
      parentName: component.componentName,
      parentCreatesNewNamespace: component.attributes.newNamespace,
      componentInfoObjects,
      indOffset: iter,
    });

    replacements = processResult.serializedComponents;

    addSharedParameters(
      replacements[0],
      component,
      Array(component.stateValues.nSources).fill(iter),
    );

    return replacements;
  }

  static recurseThroughCombinations({
    component,
    sourcesNumber,
    childnumberArray = [],
    iterateNumber,
    componentInfoObjects,
  }) {
    let replacements = [];
    let newChildnumberArray = [...childnumberArray, 0];

    for (
      let iter = 0;
      iter < component.stateValues.nIterates[sourcesNumber];
      iter++
    ) {
      newChildnumberArray[sourcesNumber] = iter;
      if (sourcesNumber >= component.stateValues.nSources - 1) {
        iterateNumber++;

        let serializedComponents = [deepClone(component.stateValues.template)];

        let processResult = processAssignNames({
          assignNames: component.doenetAttributes.assignNames,
          serializedComponents,
          parentName: component.componentName,
          parentCreatesNewNamespace: component.attributes.newNamespace,
          componentInfoObjects,
          indOffset: iterateNumber,
        });

        let thisRepl = processResult.serializedComponents[0];

        addSharedParameters(thisRepl, component, newChildnumberArray);

        replacements.push(thisRepl);
      } else {
        let results = this.recurseThroughCombinations({
          component,
          sourcesNumber: sourcesNumber + 1,
          childnumberArray: newChildnumberArray,
          iterateNumber,
          componentInfoObjects,
        });
        replacements.push(...results.replacements);
        iterateNumber = results.iterateNumber;
      }
    }

    return { replacements, iterateNumber };
  }

  static calculateReplacementChanges({
    component,
    components,
    workspace,
    componentInfoObjects,
  }) {
    // console.log(`calculate replacement changes for ${component.componentName}`)

    let replacementChanges = [];

    // if invalid behavior, have no replacements
    if (!component.stateValues.validBehavior) {
      workspace.lastReplacementParameters = {
        sourcesNames: [],
        sourcesChildNames: [],
        behavior: undefined,
        nIterates: undefined,
        minNIterates: undefined,
        replacementsToWithhold: 0,
        withheldSubstitutionChildNames: [],
      };

      if (component.replacements.length > 0) {
        let replacementInstruction = {
          changeType: 'delete',
          changeTopLevelReplacements: true,
          firstReplacementInd: 0,
          numberReplacementsToDelete: component.replacements.length,
          replacementsToWithhold: 0,
        };

        replacementChanges.push(replacementInstruction);
      }
      return replacementChanges;
    }

    let lrp = workspace.lastReplacementParameters;
    let recreateReplacements = false;

    let allSameSourcesNames = true;

    if (component.stateValues.nSources !== lrp.sourcesNames.length) {
      allSameSourcesNames = false;
    } else {
      for (let ind = 0; ind < component.stateValues.nSources; ind++) {
        if (component.stateValues.sourcesNames[ind] !== lrp.sourcesNames[ind]) {
          allSameSourcesNames = false;
          break;
        }
      }
    }

    // if sources names or behavior changed,
    // need to recalculate all replacements

    if (
      !allSameSourcesNames ||
      lrp.behavior !== component.stateValues.behavior
    ) {
      recreateReplacements = true;
    } else {
      // same substitution names and behavior

      let allSameChildSubstitutionNames = true;

      if (lrp.nIterates === undefined) {
        recreateReplacements = true;
      } else {
        for (let ind = 0; ind < component.stateValues.nSources; ind++) {
          let currentNIters = component.stateValues.nIterates[ind];
          let prevNIters = lrp.nIterates[ind];
          if (currentNIters !== prevNIters) {
            allSameChildSubstitutionNames = false;
          }
          let minNiters = Math.min(currentNIters, prevNIters);
          for (let ind2 = 0; ind2 < minNiters; ind2++) {
            if (
              component.stateValues.sourcesChildNames[ind][ind2] !=
              lrp.sourcesChildNames[ind][ind2]
            ) {
              recreateReplacements = true;
              allSameChildSubstitutionNames = false;
              break;
            }
          }
          if (recreateReplacements) {
            break;
          }
        }
      }

      if (allSameChildSubstitutionNames) {
        // if all childSubstitutionNames are unchanged, don't do anything
        return [];
      }

      // for combinations with more than one substitution,
      // just recreate everything if iterates have changed
      // TODO: actually calculate changes in this case rather than completely redoing
      if (
        component.stateValues.behavior === 'combination' &&
        component.stateValues.nSources > 1
      ) {
        recreateReplacements = true;
      }
    }

    if (recreateReplacements) {
      let newSerializedReplacements = this.createSerializedReplacements({
        component,
        workspace,
        componentInfoObjects,
      }).replacements;

      let replacementInstruction = {
        changeType: 'add',
        changeTopLevelReplacements: true,
        firstReplacementInd: 0,
        numberReplacementsToReplace: component.replacements.length,
        serializedReplacements: newSerializedReplacements,
        replacementsToWithhold: 0,
      };

      replacementChanges.push(replacementInstruction);

      workspace.lastReplacementParameters = {
        sourcesNames: component.stateValues.sourcesNames,
        sourcesChildNames: component.stateValues.sourcesChildNames,
        behavior: component.stateValues.behavior,
        nIterates: component.stateValues.nIterates,
        minNIterates: component.stateValues.minNIterates,
        replacementsToWithhold: 0,
        withheldSubstitutionChildNames: [],
      };

      return replacementChanges;
    }

    // parallel or combination with just one sources (which behaves as parallel)

    let currentMinNIterates = component.stateValues.minNIterates;
    let prevMinNIterates = lrp.minNIterates;
    let newReplacementsToWithhold = 0;
    let currentReplacementsToWithhold = component.replacementsToWithhold;
    if (!currentReplacementsToWithhold) {
      currentReplacementsToWithhold = 0;
    }
    let withheldSubstitutionChildNames = lrp.withheldSubstitutionChildNames;

    // Check if any previous substitution child names
    // or any previously withheld child names
    // correspond to components that are now deleted

    let foundDeletedSourcesChild = false;
    if (currentMinNIterates < prevMinNIterates) {
      for (let ind = 0; ind < component.stateValues.nSources; ind++) {
        for (let ind2 = currentMinNIterates; ind2 < prevMinNIterates; ind2++) {
          if (components[lrp.sourcesChildNames[ind][ind2]] === undefined) {
            foundDeletedSourcesChild = true;
          }
        }
      }

      if (!foundDeletedSourcesChild) {
        // check if any of the previously withheld substitutionChildNames are deleted
        for (let nameArray of lrp.withheldSubstitutionChildNames) {
          for (let name of nameArray) {
            if (components[name] === undefined) {
              foundDeletedSourcesChild = true;
            }
          }
        }
      }
    }

    if (foundDeletedSourcesChild) {
      // delete all the extra replacements
      let firstReplacementToDelete = Math.min(
        currentMinNIterates,
        prevMinNIterates,
      );
      let numberReplacementsToDelete =
        component.replacements.length - firstReplacementToDelete;
      let replacementInstruction = {
        changeType: 'delete',
        changeTopLevelReplacements: true,
        firstReplacementInd: firstReplacementToDelete,
        numberReplacementsToDelete,
        replacementsToWithhold: 0,
      };
      replacementChanges.push(replacementInstruction);

      withheldSubstitutionChildNames = [];
      currentReplacementsToWithhold = 0;
    }

    // if have fewer iterates than before
    // mark old replacements as hidden
    // unless one of the former sources child names does not exist
    if (currentMinNIterates < prevMinNIterates) {
      if (!foundDeletedSourcesChild) {
        newReplacementsToWithhold =
          component.replacements.length - currentMinNIterates;

        let replacementInstruction = {
          changeType: 'changeReplacementsToWithhold',
          replacementsToWithhold: newReplacementsToWithhold,
        };
        replacementChanges.push(replacementInstruction);

        for (let ind = 0; ind < component.stateValues.nSources; ind++) {
          let withheldNames = lrp.withheldSubstitutionChildNames[ind];
          if (withheldNames) {
            withheldNames = [...withheldNames];
          } else {
            withheldNames = [];
          }
          withheldNames = new Set([
            ...lrp.sourcesChildNames[ind].slice(currentMinNIterates),
            ...withheldNames,
          ]);

          withheldSubstitutionChildNames[ind] = withheldNames;
        }
      }
    } else if (currentMinNIterates > prevMinNIterates) {
      let numReplacementsToAdd = currentMinNIterates - prevMinNIterates;

      if (currentReplacementsToWithhold > 0) {
        if (currentReplacementsToWithhold >= numReplacementsToAdd) {
          newReplacementsToWithhold =
            currentReplacementsToWithhold - numReplacementsToAdd;
          numReplacementsToAdd = 0;

          let replacementInstruction = {
            changeType: 'changeReplacementsToWithhold',
            replacementsToWithhold: newReplacementsToWithhold,
          };
          replacementChanges.push(replacementInstruction);
        } else {
          numReplacementsToAdd -= currentReplacementsToWithhold;
          prevMinNIterates += currentReplacementsToWithhold;
          newReplacementsToWithhold = 0;
          // don't need to send changedReplacementsToWithold instructions
          // since will send add instructions,
          // which will also recalculate replacements in parent
        }
      }

      if (numReplacementsToAdd > 0) {
        let replacements = [];

        for (let iter = prevMinNIterates; iter < currentMinNIterates; iter++) {
          replacements.push(
            ...this.parallelReplacement({
              component,
              iter,
              componentInfoObjects,
            }),
          );
        }

        let nAssignNames = 0;
        if (component.doenetAttributes.assignNames) {
          nAssignNames = component.doenetAttributes.assignNames.length;
        }

        let replacementInstruction = {
          changeType: 'add',
          changeTopLevelReplacements: true,
          firstReplacementInd: prevMinNIterates,
          serializedReplacements: replacements,
          replacementsToWithhold: 0,
          assignNamesOffset: prevMinNIterates,
        };
        replacementChanges.push(replacementInstruction);
      }
    }

    workspace.lastReplacementParameters = {
      sourcesNames: component.stateValues.sourcesNames,
      sourcesChildNames: component.stateValues.sourcesChildNames,
      behavior: component.stateValues.behavior,
      nIterates: component.stateValues.nIterates,
      minNIterates: currentMinNIterates,
      replacementsToWithhold: newReplacementsToWithhold,
      withheldSubstitutionChildNames,
    };

    // console.log("replacementChanges");
    // console.log(replacementChanges);
    return replacementChanges;
  }

  static determineNumberOfUniqueVariants({ serializedComponent }) {
    // TODO: if template has only one unique variant
    // could treat as a normal component
    return { success: false };
  }

  get allPotentialRendererTypes() {
    let allPotentialRendererTypes = [];

    for (let childName in this.allChildren) {
      let child = this.allChildren[childName].component;
      for (let rendererType of child.allPotentialRendererTypes) {
        if (!allPotentialRendererTypes.includes(rendererType)) {
          allPotentialRendererTypes.push(rendererType);
        }
      }
    }

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
}
function addSharedParameters(thisRepl, component, newChildnumberArray) {
  let addToPars = (thisRepl.doenetAttributes.addToSharedParameters = []);

  for (let [ind, alias] of component.stateValues.sourceAliases.entries()) {
    if (alias) {
      let sourcesName = component.stateValues.sourcesNames[ind];

      addToPars.push({
        parameterName: 'sourceNameMappings',
        key: alias,
        value: {
          name: sourcesName,
          childNumber: newChildnumberArray[ind],
        },
      });
    }
  }

  for (let [
    ind,
    indexAlias,
  ] of component.stateValues.sourceIndexAliases.entries()) {
    if (indexAlias) {
      addToPars.push({
        parameterName: 'sourceIndexMappings',
        key: indexAlias,
        value: newChildnumberArray[ind] + 1,
      });
    }
  }
}
