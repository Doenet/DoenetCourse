import readOnlyProxyHandler from './ReadOnlyProxyHandler';
import { deepClone, deepCompare } from './utils/deepFunctions';
import {
  ancestorsIncludingComposites,
  gatherDescendants,
} from './utils/descendants';
import { convertComponentTarget } from './utils/serializedStateProcessing';

const dependencyTypeArray = [];

export class DependencyHandler {
  constructor({ _components, componentInfoObjects, core }) {
    this.upstreamDependencies = {};
    this.downstreamDependencies = {};
    this.switchDependencies = {};

    this.circularCheckPassed = {};
    this.circularResolveBlockedCheckPassed = {};

    this.dependencyTypes = {};
    dependencyTypeArray.forEach(
      (dt) => (this.dependencyTypes[dt.dependencyType] = dt),
    );

    this.core = core;
    this._components = _components;
    this.componentInfoObjects = componentInfoObjects;

    this.updateTriggers = {
      descendantDependenciesByAncestor: {},
      ancestorDependenciesByPotentialAncestor: {},
      replacementDependenciesByComposite: {},
      childDependenciesByParent: {},
      parentDependenciesByParent: {},
      dependenciesMissingComponentBySpecifiedName: {},
      dependenciesBasedOnDependenciesOfStateVariables: {},
    };

    this.resolveBlockers = {
      neededToResolve: {},
      resolveBlockedBy: {},
    };
  }

  setUpComponentDependencies(component) {
    // if component already has downstream dependencies
    // delete them, and the corresponding upstream dependencies
    if (this.downstreamDependencies[component.componentName]) {
      this.deleteAllDownstreamDependencies({ component });
    }

    // console.log(`set up component dependencies of ${component.componentName}`)
    this.downstreamDependencies[component.componentName] = {};
    if (!this.upstreamDependencies[component.componentName]) {
      this.upstreamDependencies[component.componentName] = {};
    }

    let stateVariablesToProccess = [];
    let additionalStateVariablesThatWillBeProcessed = [];
    for (let stateVariable in component.state) {
      if (
        !(
          component.state[stateVariable].isArrayEntry ||
          component.state[stateVariable].isAlias ||
          additionalStateVariablesThatWillBeProcessed.includes(stateVariable)
        )
      ) {
        // TODO: if do indeed keep aliases deleted from state, then don't need second check, above
        stateVariablesToProccess.push(stateVariable);
        if (component.state[stateVariable].additionalStateVariablesDefined) {
          additionalStateVariablesThatWillBeProcessed.push(
            ...component.state[stateVariable].additionalStateVariablesDefined,
          );
        }
      }
    }

    for (let stateVariable of stateVariablesToProccess) {
      let allStateVariablesAffected = [stateVariable];
      if (component.state[stateVariable].additionalStateVariablesDefined) {
        allStateVariablesAffected.push(
          ...component.state[stateVariable].additionalStateVariablesDefined,
        );
      }

      this.setUpStateVariableDependencies({
        component,
        stateVariable,
        allStateVariablesAffected,
      });
    }
  }

  setUpStateVariableDependencies({
    component,
    stateVariable,
    allStateVariablesAffected,
  }) {
    let stateVarObj = component.state[stateVariable];
    let dependencies;

    if (
      stateVarObj.stateVariablesDeterminingDependencies ||
      stateVarObj.determineIfShadowData
    ) {
      dependencies = {};

      if (stateVarObj.stateVariablesDeterminingDependencies) {
        dependencies.__determine_dependencies = {
          dependencyType: 'determineDependencies',
          variableNames: stateVarObj.stateVariablesDeterminingDependencies,
        };
      }
      if (stateVarObj.determineIfShadowData) {
        dependencies.__determine_dependencies_shadow_data = {
          dependencyType: 'determineDependencies',
          componentName:
            stateVarObj.determineIfShadowData.targetComponent.componentName,
          variableNames: allStateVariablesAffected,
        };
        if (stateVarObj.determineIfShadowData.arraySizeStateVariableToResolve) {
          // add array size state variable
          // just there to make sure it is resolved to determine
          // if should shadow
          dependencies.__determine_dependencies_shadow_data_array_size = {
            dependencyType: 'determineDependencies',
            variableNames: [
              stateVarObj.determineIfShadowData.arraySizeStateVariableToResolve,
            ],
          };
        }
      }
    } else {
      // Note: arrays now always have a state variable determining dependencies
      // (the array size state variable)
      // so we don't have to deal with them here

      dependencies = stateVarObj.returnDependencies({
        componentInfoObjects: this.componentInfoObjects,
        sharedParameters: component.sharedParameters,
      });
    }

    for (let dependencyName in dependencies) {
      let dependencyDefinition = dependencies[dependencyName];
      if (!(dependencyDefinition.dependencyType in this.dependencyTypes)) {
        throw Error(
          `Unrecognized dependency type ${dependencyDefinition.dependencyType} for ${dependencyName} of ${stateVariable} of ${component.componentName}`,
        );
      }
      let dep = new this.dependencyTypes[dependencyDefinition.dependencyType]({
        component,
        stateVariable,
        allStateVariablesAffected,
        dependencyName,
        dependencyDefinition,
        dependencyHandler: this,
        expandComposites: false,
        forceExpandComposites: false,
      });

      dep.checkForCircular();
    }
  }

  deleteAllDownstreamDependencies({ component, stateVariables = '__all__' }) {
    // console.log(`delete all downstream dependencies of ${component.componentName}, ${stateVariables.toString()}`)
    // console.log(deepClone(this.downstreamDependencies[component.componentName]))
    // console.log(deepClone(this.upstreamDependencies))

    let componentName = component.componentName;

    let stateVariablesToAdddress;
    if (stateVariables === '__all__') {
      stateVariablesToAdddress = Object.keys(
        this.downstreamDependencies[componentName],
      );
    } else {
      stateVariablesToAdddress = stateVariables;
    }

    for (let stateVariable of stateVariablesToAdddress) {
      let downDeps = this.downstreamDependencies[componentName][stateVariable];

      for (let downDepName in downDeps) {
        downDeps[downDepName].deleteDependency();
      }

      delete this.downstreamDependencies[componentName][stateVariable];
    }

    if (
      Object.keys(this.downstreamDependencies[componentName]).length === 0 &&
      !this.components[componentName]
    ) {
      delete this.downstreamDependencies[componentName];
    }
  }

  deleteAllUpstreamDependencies({
    component,
    stateVariables = '__all__',
    completelyDelete = false,
  }) {
    // if completelyDelete is false, then just remove component from dependency

    // console.log(`delete all upstream dependencies of ${component.componentName}, ${stateVariables.toString()}`)
    // console.log(`completelyDelete: ${completelyDelete}`)
    // console.log(deepClone(this.downstreamDependencies))
    // console.log(deepClone(this.upstreamDependencies))

    let componentName = component.componentName;

    let stateVariablesToAdddress;
    if (stateVariables === '__all__') {
      stateVariablesToAdddress = Object.keys(
        this.upstreamDependencies[componentName],
      );
    } else {
      stateVariablesToAdddress = stateVariables;
    }

    for (let stateVariable of stateVariablesToAdddress) {
      if (this.upstreamDependencies[componentName][stateVariable]) {
        // loop over shallow copy, as upstream dependencies are changed in deleteDownstreamDependency
        for (let upDep of [
          ...this.upstreamDependencies[componentName][stateVariable],
        ]) {
          if (completelyDelete) {
            // Note: this completely deletes the dependency even if there
            // were other downstream components involved
            for (let upVarName of upDep.upstreamVariableNames) {
              if (
                this._components[upDep.upstreamComponentName].state[upVarName]
                  .initiallyResolved
              ) {
                this.core.recordActualChangeInStateVariable({
                  componentName: upDep.upstreamComponentName,
                  varName: upVarName,
                });
              }
            }
            upDep.deleteDependency();
          } else {
            // Note: this keeps the downstream dependency in the upstream component
            // even if this is the last downstream component
            upDep.removeDownstreamComponent({
              indexToRemove:
                upDep.downstreamComponentNames.indexOf(componentName),
            });
            upDep.onDownstreamComponentChange();
          }
        }
      }

      // clean up by deleting entries that should now be empty objects
      delete this.upstreamDependencies[componentName][stateVariable];
    }

    if (
      Object.keys(this.upstreamDependencies[componentName]).length === 0 &&
      !this._components[componentName]
    ) {
      delete this.upstreamDependencies[componentName];
    }
  }

  addBlockersFromChangedActiveChildren({ parent, nActiveChildrenChanged }) {
    // console.log(`mark dependencies of active children of ${parent.componentName}`)

    this.collateCountersAndPropagateToAncestors(parent);

    if (this.updateTriggers.childDependenciesByParent[parent.componentName]) {
      for (let dep of this.updateTriggers.childDependenciesByParent[
        parent.componentName
      ]) {
        if (
          !(
            !nActiveChildrenChanged &&
            dep.skipComponentNames &&
            dep.originalDownstreamVariableNames.length === 0
          )
        ) {
          for (let varName of dep.upstreamVariableNames) {
            this.addBlocker({
              blockerComponentName: dep.upstreamComponentName,
              blockerType: 'recalculateDownstreamComponents',
              blockerStateVariable: varName,
              blockerDependency: dep.dependencyName,
              componentNameBlocked: dep.upstreamComponentName,
              typeBlocked: 'stateVariable',
              stateVariableBlocked: varName,
            });
          }
        }
      }
    }

    if (parent.ancestors) {
      if (
        this.updateTriggers.parentDependenciesByParent[parent.componentName]
      ) {
        for (let dep of this.updateTriggers.parentDependenciesByParent[
          parent.componentName
        ]) {
          for (let varName of dep.upstreamVariableNames) {
            this.addBlocker({
              blockerComponentName: dep.upstreamComponentName,
              blockerType: 'recalculateDownstreamComponents',
              blockerStateVariable: varName,
              blockerDependency: dep.dependencyName,
              componentNameBlocked: dep.upstreamComponentName,
              typeBlocked: 'stateVariable',
              stateVariableBlocked: varName,
            });
          }
        }
      }

      for (let ancestorName of [
        parent.componentName,
        ...ancestorsIncludingComposites(parent, this.components),
      ]) {
        this.addDescendantBlockersToAncestor(ancestorName);
      }

      if (
        this.updateTriggers.ancestorDependenciesByPotentialAncestor[
          parent.componentName
        ]
      ) {
        for (let dep of this.updateTriggers
          .ancestorDependenciesByPotentialAncestor[parent.componentName]) {
          for (let varName of dep.upstreamVariableNames) {
            this.addBlocker({
              blockerComponentName: dep.upstreamComponentName,
              blockerType: 'recalculateDownstreamComponents',
              blockerStateVariable: varName,
              blockerDependency: dep.dependencyName,
              componentNameBlocked: dep.upstreamComponentName,
              typeBlocked: 'stateVariable',
              stateVariableBlocked: varName,
            });
          }
        }
      }
    }
  }

  resolveBlockersFromChangedActiveChildren(parent, force = false) {
    // console.log(`mark dependencies of active children of ${parent.componentName}`)

    this.collateCountersAndPropagateToAncestors(parent);

    if (this.updateTriggers.childDependenciesByParent[parent.componentName]) {
      for (let dep of this.updateTriggers.childDependenciesByParent[
        parent.componentName
      ]) {
        this.resolveIfReady({
          componentName: dep.upstreamComponentName,
          type: 'recalculateDownstreamComponents',
          stateVariable: dep.representativeStateVariable,
          dependency: dep.dependencyName,
          force,
          recurseUpstream: true,
        });
      }
    }

    if (parent.ancestors) {
      if (
        this.updateTriggers.parentDependenciesByParent[parent.componentName]
      ) {
        for (let dep of this.updateTriggers.parentDependenciesByParent[
          parent.componentName
        ]) {
          this.resolveIfReady({
            componentName: dep.upstreamComponentName,
            type: 'recalculateDownstreamComponents',
            stateVariable: dep.representativeStateVariable,
            dependency: dep.dependencyName,
            force,
            recurseUpstream: true,
          });
        }
      }

      for (let ancestorName of [
        parent.componentName,
        ...ancestorsIncludingComposites(parent, this.components),
      ]) {
        this.resolveDescendantBlockersToAncestor(ancestorName, force);
      }

      if (
        this.updateTriggers.ancestorDependenciesByPotentialAncestor[
          parent.componentName
        ]
      ) {
        for (let dep of this.updateTriggers
          .ancestorDependenciesByPotentialAncestor[parent.componentName]) {
          this.resolveIfReady({
            componentName: dep.upstreamComponentName,
            type: 'recalculateDownstreamComponents',
            stateVariable: dep.representativeStateVariable,
            dependency: dep.dependencyName,
            force,
            recurseUpstream: true,
          });
        }
      }
    }
  }

  addDescendantBlockersToAncestor(ancestorName) {
    // console.log(`update descendant dependencies for ${ancestorName}`)

    if (this.updateTriggers.descendantDependenciesByAncestor[ancestorName]) {
      for (let dep of this.updateTriggers.descendantDependenciesByAncestor[
        ancestorName
      ]) {
        for (let varName of dep.upstreamVariableNames) {
          this.addBlocker({
            blockerComponentName: dep.upstreamComponentName,
            blockerType: 'recalculateDownstreamComponents',
            blockerStateVariable: varName,
            blockerDependency: dep.dependencyName,
            componentNameBlocked: dep.upstreamComponentName,
            typeBlocked: 'stateVariable',
            stateVariableBlocked: varName,
          });
        }
      }
    }
  }

  resolveDescendantBlockersToAncestor(ancestorName, force = false) {
    // console.log(`update descendant dependencies for ${ancestorName}`)

    if (this.updateTriggers.descendantDependenciesByAncestor[ancestorName]) {
      for (let dep of this.updateTriggers.descendantDependenciesByAncestor[
        ancestorName
      ]) {
        this.resolveIfReady({
          componentName: dep.upstreamComponentName,
          type: 'recalculateDownstreamComponents',
          stateVariable: dep.representativeStateVariable,
          dependency: dep.dependencyName,
          force,
          recurseUpstream: true,
        });
      }
    }
  }

  addBlockersFromChangedReplacements(composite) {
    if (
      this.updateTriggers.replacementDependenciesByComposite[
        composite.componentName
      ]
    ) {
      for (let dep of this.updateTriggers.replacementDependenciesByComposite[
        composite.componentName
      ]) {
        for (let varName of dep.upstreamVariableNames) {
          this.addBlocker({
            blockerComponentName: dep.upstreamComponentName,
            blockerType: 'recalculateDownstreamComponents',
            blockerStateVariable: varName,
            blockerDependency: dep.dependencyName,
            componentNameBlocked: dep.upstreamComponentName,
            typeBlocked: 'stateVariable',
            stateVariableBlocked: varName,
          });
        }
      }
    }

    for (let ancestorName of [
      composite.componentName,
      ...ancestorsIncludingComposites(composite, this.components),
    ]) {
      this.addDescendantBlockersToAncestor(ancestorName);
    }
  }

  checkForCircularDependency({
    componentName,
    varName,
    previouslyVisited = [],
  }) {
    let stateVariableIdentifier = componentName + ':' + varName;

    if (previouslyVisited.includes(stateVariableIdentifier)) {
      // Found circular dependency
      // Create error message with list of component names involved

      console.log('found circular', stateVariableIdentifier, previouslyVisited);

      let componentNameRe = /^(.*):/;
      let componentNamesInvolved = previouslyVisited.map(
        (x) => x.match(componentNameRe)[1],
      );

      // remove internally created component names
      // and deduplicate while keeping order (so don't use Set)
      let uniqueComponentNames = componentNamesInvolved
        .filter((x) => x.slice(0, 2) !== '__')
        .reduce((a, b) => (a.includes(b) ? a : [...a, b]), []);

      // If had only internally created component names, just give first componentName
      if (uniqueComponentNames.length === 0) {
        uniqueComponentNames = [componentNamesInvolved[0]];
      }

      let nameString;
      if (uniqueComponentNames.length === 1) {
        nameString = uniqueComponentNames[0];
      } else if (uniqueComponentNames.length === 2) {
        nameString = uniqueComponentNames.join(' and ');
      } else {
        uniqueComponentNames[uniqueComponentNames.length - 2] =
          uniqueComponentNames
            .slice(uniqueComponentNames.length - 2)
            .join(', and ');
        uniqueComponentNames.pop();
        nameString = uniqueComponentNames.join(', ');
      }

      throw Error(`Circular dependency involving ${nameString}`);
    } else {
      // shallow copy so don't change original
      previouslyVisited = [...previouslyVisited, stateVariableIdentifier];
    }

    if (!this.circularCheckPassed[stateVariableIdentifier]) {
      this.circularCheckPassed[stateVariableIdentifier] = true;

      if (componentName in this.downstreamDependencies) {
        let downDeps = this.downstreamDependencies[componentName][varName];
        for (let dependencyName in downDeps) {
          let dep = downDeps[dependencyName];

          let downstreamComponentNames = dep.downstreamComponentNames;
          if (!downstreamComponentNames) {
            continue;
          }
          let mappedDownstreamVariableNamesByComponent =
            dep.mappedDownstreamVariableNamesByComponent;
          if (!mappedDownstreamVariableNamesByComponent) {
            continue;
          }

          for (let [ind, cname] of downstreamComponentNames.entries()) {
            let varNames = mappedDownstreamVariableNamesByComponent[ind];
            for (let vname of varNames) {
              this.checkForCircularDependency({
                componentName: cname,
                varName: vname,
                previouslyVisited,
              });
            }
          }
        }
      }
    }
  }

  resetCircularCheckPassed(componentName, varName) {
    let stateVariableIdentifier = componentName + ':' + varName;
    if (this.circularCheckPassed[stateVariableIdentifier]) {
      delete this.circularCheckPassed[stateVariableIdentifier];

      let upstream = this.upstreamDependencies[componentName][varName];

      if (upstream) {
        for (let upDep of upstream) {
          for (let vName of upDep.upstreamVariableNames) {
            if (vName !== '__childLogic' && vName !== '__identity') {
              this.resetCircularCheckPassed(upDep.upstreamComponentName, vName);
            }
          }
        }
      }
    }
  }

  updateDependencies({ componentName, stateVariable, dependency }) {
    // console.log(`update dependencies of ${stateVariable} of ${componentName}`)

    let component = this._components[componentName];
    let stateVarObj = component.state[stateVariable];
    let allStateVariablesAffected = [stateVariable];
    if (stateVarObj.additionalStateVariablesDefined) {
      allStateVariablesAffected.push(
        ...stateVarObj.additionalStateVariablesDefined,
      );
    }

    // first check if we should shadow state variable
    if (stateVarObj.determineIfShadowData) {
      let determineIfShadowData = stateVarObj.determineIfShadowData;
      delete stateVarObj.determineIfShadowData;

      let stateVariablesToShadow = [];
      let stateVariablesNotShadowed = [];

      let determinedAllShadows = true;

      for (let varName of allStateVariablesAffected) {
        let stateObj = determineIfShadowData.targetComponent.state[varName];
        let resolved = stateObj.isResolved;

        if (!resolved) {
          let result = this.resolveItem({
            componentName: determineIfShadowData.targetComponent.componentName,
            type: 'stateVariable',
            stateVariable: varName,
          });

          resolved = result.success;
        }

        if (resolved) {
          // since varName of targetComponent is now resolved
          // can evaluate it and then determine if it is essential

          stateObj.value;

          if (
            stateObj.essential ||
            stateObj.alwaysShadow ||
            stateObj.isShadow ||
            (stateObj.isArray &&
              stateObj.getAllArrayKeys(stateObj.arraySize).length > 0 &&
              stateObj
                .getAllArrayKeys(stateObj.arraySize)
                .some((x) => stateObj.essentialByArrayKey[x]))
          ) {
            stateVariablesToShadow.push(varName);
          } else {
            stateVariablesNotShadowed.push(varName);
          }
        } else {
          determinedAllShadows = false;

          for (let vName2 of allStateVariablesAffected) {
            this.addBlocker({
              blockerComponentName:
                determineIfShadowData.targetComponent.componentName,
              blockerType: 'stateVariable',
              blockerStateVariable: varName,
              componentNameBlocked: componentName,
              typeBlocked: 'determineDependencies',
              stateVariableBlocked: vName2,
              dependencyBlocked: dependency,
            });
          }
        }
      }

      if (!determinedAllShadows) {
        return { success: false };
      }

      let updatedAllDependencies = true;

      if (stateVariablesToShadow.length > 0) {
        this.core.modifyStateDefsToBeShadows({
          stateVariablesToShadow,
          stateVariableDefinitions: component.state,
          foundReadyToExpandWhenResolved:
            determineIfShadowData.foundReadyToExpandWhenResolved,
          targetComponent: determineIfShadowData.targetComponent,
        });

        // call update dependencies separately for each shadowed variable
        // (they were removed from additionalStateVariablesDefined
        // and now have separate definitions)
        for (let varName of stateVariablesToShadow) {
          let result = this.updateDependencies({
            componentName,
            stateVariable: varName,
            dependency,
          });

          if (!result.success) {
            updatedAllDependencies = false;
          }
        }
      }

      // call update dependencies for one representative non-shadowed variable
      // (as they are still all defined together)
      if (stateVariablesNotShadowed.length > 0) {
        let result = this.updateDependencies({
          componentName,
          stateVariable: stateVariablesNotShadowed[0],
          dependency,
        });

        if (!result.success) {
          updatedAllDependencies = false;
        }
      }

      return { success: updatedAllDependencies };
    }

    let determineDeps =
      this.downstreamDependencies[componentName][stateVariable]
        .__determine_dependencies;
    let dependencyResult;

    if (determineDeps) {
      let resolvedAll = true;

      // check if can actually resolve all variables of determineDeps
      if (determineDeps.originalDownstreamVariableNames.length > 0) {
        for (let [
          ind,
          cName,
        ] of determineDeps.downstreamComponentNames.entries()) {
          let comp = this._components[cName];
          for (let vName of determineDeps
            .mappedDownstreamVariableNamesByComponent[ind]) {
            let resolved = comp.state[vName].isResolved;

            if (!resolved) {
              let result = this.resolveItem({
                componentName: cName,
                type: 'stateVariable',
                stateVariable: vName,
              });
              resolved = result.success;
            }

            if (!resolved) {
              resolvedAll = false;

              for (let vName2 of allStateVariablesAffected) {
                this.addBlocker({
                  blockerComponentName: cName,
                  blockerType: 'stateVariable',
                  blockerStateVariable: vName,
                  componentNameBlocked: componentName,
                  typeBlocked: 'determineDependencies',
                  stateVariableBlocked: vName2,
                  dependencyBlocked: dependency,
                });
              }
            }
          }
        }
      }

      if (resolvedAll) {
        dependencyResult = determineDeps.getValue();
      } else {
        return { success: false };
      }
    } else {
      dependencyResult = { changes: {}, value: { stateValues: {} } };
    }

    if (
      Object.keys(dependencyResult.changes).length === 0 &&
      stateVarObj._previousValue !== undefined
    ) {
      // console.log(`no changes for ${stateVariable}`)
      // console.log(dependencyResult)
      // console.log(stateVarObj._previousValue);
      // no changes
      return { success: true };
    }

    // TODO: should we change the output of returnDependencies
    // to be an object with one key being dependencies?
    // That way, we could add another attribute to the return value
    // rather than having returnDependencies add the attribute
    // changedDependency to the arguments
    // (Currently array and array entry state variable could set
    // returnDepArgs.changedDependency to true)
    let returnDepArgs = {
      stateValues: Object.assign({}, dependencyResult.value.stateValues),
      componentInfoObjects: this.componentInfoObjects,
      sharedParameters: component.sharedParameters,
    };

    let newDependencies = stateVarObj.returnDependencies(returnDepArgs);

    if (stateVarObj.stateVariablesDeterminingDependencies) {
      // keep the determineDependencies dependency
      newDependencies.__determine_dependencies = {
        dependencyType: 'determineDependencies',
        variableNames: stateVarObj.stateVariablesDeterminingDependencies,
      };
    }

    // console.log("newDependencies")
    // console.log(newDependencies)

    let changeResult = this.replaceDependenciesIfChanged({
      component,
      stateVariable,
      newDependencies,
      allStateVariablesAffected,
    });

    // console.log("changeResult")
    // console.log(changeResult)

    if (!(changeResult.changedDependency || returnDepArgs.changedDependency)) {
      // || arraySizeChanged) {
      // console.log(`didn't actually change a dependency for ${stateVariable} of ${component.componentName}`)
      return { success: true };
    }

    // console.log(`actually did change a dependency for ${stateVariable} of ${component.componentName}`)

    for (let dep of changeResult.newlyCreatedDependencies) {
      dep.checkForCircular();
    }

    for (let varName of allStateVariablesAffected) {
      this.checkForCircularDependency({
        componentName: component.componentName,
        varName,
      });
      component.state[varName].forceRecalculation = true;
    }

    if (stateVarObj.initiallyResolved) {
      // note: markStateVariableAndUpstreamDependentsStale includes
      // any additionalStateVariablesDefined with stateVariable
      this.core.markStateVariableAndUpstreamDependentsStale({
        component,
        varName: stateVariable,
      });
    }

    for (let varName of allStateVariablesAffected) {
      if (component.state[varName].initiallyResolved) {
        this.recordActualChangeInUpstreamDependencies({
          component,
          varName,
        });
      }
    }

    let triggersForComponent =
      this.updateTriggers.dependenciesBasedOnDependenciesOfStateVariables[
        componentName
      ];
    if (triggersForComponent) {
      for (let varName of allStateVariablesAffected) {
        let triggersForVarName = triggersForComponent[varName];
        if (triggersForVarName) {
          for (let dep of triggersForVarName) {
            if (dep.gettingValue) {
              let compWithUpdated = dep.varsWithUpdatedDeps[componentName];
              if (!compWithUpdated) {
                compWithUpdated = dep.varsWithUpdatedDeps[componentName] = [];
              }
              if (!compWithUpdated.includes(varName)) {
                compWithUpdated.push(varName);
              }
            } else {
              for (let vName of dep.upstreamVariableNames) {
                this.addBlocker({
                  blockerComponentName: dep.upstreamComponentName,
                  blockerType: 'recalculateDownstreamComponents',
                  blockerStateVariable: vName,
                  blockerDependency: dep.dependencyName,
                  componentNameBlocked: dep.upstreamComponentName,
                  typeBlocked: 'stateVariable',
                  stateVariableBlocked: vName,
                });
              }
            }
          }
        }
      }
    }

    // console.log(`finished updating dependencies of ${stateVariable} of ${component.componentName}`)

    return { success: true };
  }

  replaceDependenciesIfChanged({
    component,
    stateVariable,
    newDependencies,
    allStateVariablesAffected,
  }) {
    // Note: currentDeps object is downstream dependencies
    // of allStateVariablesAffected
    let currentDeps =
      this.downstreamDependencies[component.componentName][stateVariable];

    let changedDependency = false;

    let newlyCreatedDependencies = [];

    for (let dependencyName in currentDeps) {
      if (!(dependencyName in newDependencies)) {
        changedDependency = true;
        currentDeps[dependencyName].deleteDependency();
      }
    }

    for (let dependencyName in newDependencies) {
      if (dependencyName in currentDeps) {
        let dependencyDefinition = newDependencies[dependencyName];
        let currentDep = currentDeps[dependencyName];
        if (!deepCompare(dependencyDefinition, currentDep.definition)) {
          changedDependency = true;
          currentDeps[dependencyName].deleteDependency();

          let dependencyDefinition = newDependencies[dependencyName];

          let dep = new this.dependencyTypes[
            dependencyDefinition.dependencyType
          ]({
            component,
            stateVariable,
            allStateVariablesAffected,
            dependencyName,
            dependencyDefinition,
            dependencyHandler: this,
          });

          newlyCreatedDependencies.push(dep);
        }
      } else {
        changedDependency = true;
        let dependencyDefinition = newDependencies[dependencyName];
        let dep = new this.dependencyTypes[dependencyDefinition.dependencyType](
          {
            component,
            stateVariable,
            allStateVariablesAffected,
            dependencyName,
            dependencyDefinition,
            dependencyHandler: this,
          },
        );
        newlyCreatedDependencies.push(dep);
      }
    }
    return { changedDependency, newlyCreatedDependencies };
  }

  checkForDependenciesOnNewComponent(componentName) {
    // console.log(`check for dependencies on new component ${componentName}`)

    let variablesChanged = [];

    let variablesJustResolved = {};

    if (
      this.updateTriggers.dependenciesMissingComponentBySpecifiedName[
        componentName
      ]
    ) {
      for (let dep of this.updateTriggers
        .dependenciesMissingComponentBySpecifiedName[componentName]) {
        let upComponent = this._components[dep.upstreamComponentName];

        if (!upComponent) {
          continue;
        }

        let upVarsInUpstreamComponent = true;

        for (let upVar of dep.upstreamVariableNames) {
          if (!(upVar in upComponent.state)) {
            upVarsInUpstreamComponent = false;
            break;
          }
        }

        if (!upVarsInUpstreamComponent) {
          continue;
        }

        for (let varName of dep.upstreamVariableNames) {
          let stateVarObj = upComponent.state[varName];
          if (stateVarObj.initiallyResolved) {
            if (
              !(
                variablesJustResolved[dep.upstreamComponentName] &&
                variablesJustResolved[dep.upstreamComponentName][varName]
              )
            ) {
              // console.log(`****** a variable value changed because have a new component ******`)
              // console.log(`${dep.dependencyName} of ${varName} of ${dep.upstreamComponentName}`)
              variablesChanged.push({
                componentName: dep.upstreamComponentName,
                varName,
              });
            }
          }
        }

        for (let varName of dep.upstreamVariableNames) {
          this.deleteFromNeededToResolve({
            componentNameBlocked: dep.upstreamComponentName,
            typeBlocked: 'recalculateDownstreamComponents',
            stateVariableBlocked: varName,
            dependencyBlocked: dep.dependencyName,
            blockerComponentName: componentName,
            blockerType: 'componentIdentity',
          });
        }

        // resolving for one variable will resolve for all upstreamVariableNames
        let result = this.resolveIfReady({
          componentName: dep.upstreamComponentName,
          type: 'recalculateDownstreamComponents',
          stateVariable: dep.representativeStateVariable,
          dependency: dep.dependencyName,
          expandComposites: false,
          recurseUpstream: true,
        });

        if (result.success) {
          for (let varName of dep.upstreamVariableNames) {
            if (!upComponent.state[varName].initiallyResolved) {
              if (!variablesJustResolved[dep.upstreamComponentName]) {
                variablesJustResolved[dep.upstreamComponentName] = {};
              }
              variablesJustResolved[dep.upstreamComponentName][varName] = true;
            }
          }
        }
      }

      delete this.updateTriggers.dependenciesMissingComponentBySpecifiedName[
        componentName
      ];
    }

    return variablesChanged;
  }

  getStateVariableDependencyValues({ component, stateVariable }) {
    let dependencyValues = {};
    let dependencyChanges = {};
    let dependencyUsedDefault = {};

    let downDeps =
      this.downstreamDependencies[component.componentName][stateVariable];

    for (let dependencyName in downDeps) {
      let { value, changes, usedDefault } = downDeps[dependencyName].getValue();

      dependencyValues[dependencyName] = value;
      if (Object.keys(changes).length > 0) {
        dependencyChanges[dependencyName] = changes;
      }
      if (usedDefault) {
        dependencyUsedDefault[dependencyName] = true;
      }
    }

    return {
      dependencyValues,
      changes: dependencyChanges,
      usedDefault: dependencyUsedDefault,
    };
  }

  recordActualChangeInUpstreamDependencies({ component, varName, changes }) {
    // console.log(`record actual change in ${varName} of ${component.componentName}`)
    // console.log(deepClone(changes))

    let componentName = component.componentName;

    let upstream = this.upstreamDependencies[componentName][varName];

    if (upstream) {
      for (let upDep of upstream) {
        if (upDep.valuesChanged) {
          let ind = upDep.downstreamComponentNames.indexOf(componentName);
          let upValuesChanged = upDep.valuesChanged[ind][varName];

          if (!upValuesChanged) {
            // check if have an alias that maps to varName
            if (component.stateVarAliases) {
              for (let alias in component.stateVarAliases) {
                if (
                  component.stateVarAliases[alias] === varName &&
                  alias in upValuesChangedSub
                ) {
                  upValuesChanged = upValuesChangedSub[alias];
                }
              }
            }
          }

          // if still don't have record of change, create new change object
          // (Should only be needed when have array entry variables,
          // where original change was recorded in array)
          if (!upValuesChanged) {
            if (!component.state[varName].isArrayEntry) {
              throw Error(
                `Something is wrong, as a variable ${varName} of ${component.componentName} actually changed, but wasn't marked with a potential change`,
              );
            }
            upValuesChanged = upValuesChangedSub[varName] = { changed: {} };
          }

          if (component.state[varName] && component.state[varName].isArray) {
            if (upValuesChanged.changed === undefined) {
              upValuesChanged.changed = { arrayKeysChanged: {} };
            } else if (upValuesChanged.changed === true) {
              upValuesChanged.changed = {
                allArrayKeysChanged: true,
                arraySizeChanged: true,
                arrayKeysChanged: {},
              };
            }
            if (changes) {
              if (changes.allArrayKeysChanged) {
                upValuesChanged.changed.allArrayKeysChanged = true;
              }
              if (changes.arraySizeChanged) {
                upValuesChanged.changed.arraySizeChanged = true;
              }
              Object.assign(
                upValuesChanged.changed.arrayKeysChanged,
                changes.arrayKeysChanged,
              );
            }
          } else {
            upValuesChanged.changed = true;
          }
        }
      }
    }
  }

  collateCountersAndPropagateToAncestors(component) {
    let allCounterNames = Object.keys(component.counters);
    for (let childName of component.allChildrenOrdered) {
      let child = this._components[childName];
      for (let counterName in child.counters) {
        if (!allCounterNames.includes(counterName)) {
          allCounterNames.push(counterName);
        }
      }
    }

    let foundChange = false;

    for (let counterName of allCounterNames) {
      let counters = component.counters[counterName];
      if (!counters) {
        counters = component.counters[counterName] = {
          dependencies: [],
          componentList: [],
        };
      }

      let componentList = [];
      if (counters.dependencies.length > 0) {
        // counter is in component itself
        componentList.push(component.componentName);
      }

      for (let childName of component.allChildrenOrdered) {
        let child = this._components[childName];
        let childCounters = child.counters[counterName];
        if (childCounters) {
          componentList.push(...childCounters.componentList);
        }
      }

      if (
        componentList.length !== counters.componentList.length ||
        counters.componentList.some((v, i) => v != componentList[i])
      ) {
        foundChange = true;
        counters.componentList = componentList;
      }
    }

    if (!foundChange) {
      return { foundChange: false };
    }

    if (!component.ancestors[0]) {
      // made it to document
      // set values of counters
      for (let counterName of allCounterNames) {
        let counters = component.counters[counterName];
        for (let [ind, cName] of counters.componentList.entries()) {
          let comp = this._components[cName];
          let compCounter = comp.counters[counterName];
          compCounter.value = ind + 1;
          for (let dep of compCounter.dependencies) {
            if (comp.state[dep.representativeStateVariable].initiallyResolved) {
              // note: markStateVariableAndUpstreamDependentsStale includes
              // any additionalStateVariablesDefined with stateVariable
              this.core.markStateVariableAndUpstreamDependentsStale({
                component: comp,
                varName: dep.representativeStateVariable,
              });

              for (let varName of dep.upstreamVariableNames) {
                // have to force recalculation
                // since counter dep doesn't show values changed
                comp.state[varName].forceRecalculation = true;

                this.recordActualChangeInUpstreamDependencies({
                  component: comp,
                  varName,
                });
              }
            }
          }
        }
      }
      return { foundChange: true, finishedPropagation: true };
    }

    let parent = this._components[component.ancestors[0].componentName];
    if (
      !(parent && parent.allChildrenOrdered.includes(component.componentName))
    ) {
      return { foundChange: true, finishedPropagation: false };
    }

    let parentResult = this.collateCountersAndPropagateToAncestors(parent);

    if (!parentResult.foundChange) {
      console.error(
        `we found a change in propagating counters for ${component.componentName}, but no change for ancestors!`,
      );
    }

    return {
      foundChange: true,
      finishedPropagation: parentResult.finishedPropagation,
    };
  }

  getNeededToResolve({ componentName, type, stateVariable, dependency }) {
    let neededToResolveForComponent =
      this.resolveBlockers.neededToResolve[componentName];
    if (!neededToResolveForComponent) {
      neededToResolveForComponent = this.resolveBlockers.neededToResolve[
        componentName
      ] = {};
    }

    let neededToResolve = neededToResolveForComponent[type];
    if (!neededToResolve) {
      neededToResolve = neededToResolveForComponent[type] = {};
    }

    // have an extra level if include a state variable
    if (stateVariable) {
      let neededToResolveTemp = neededToResolve;
      neededToResolve = neededToResolveTemp[stateVariable];
      if (!neededToResolve) {
        neededToResolve = neededToResolveTemp[stateVariable] = {};
      }

      // have yet another level if include a dependency
      if (dependency) {
        let neededToResolveTemp = neededToResolve;
        neededToResolve = neededToResolveTemp[dependency];
        if (!neededToResolve) {
          neededToResolve = neededToResolveTemp[dependency] = {};
        }
      }
    }

    return neededToResolve;
  }

  deleteFromNeededToResolve({
    componentNameBlocked,
    typeBlocked,
    stateVariableBlocked,
    dependencyBlocked,
    blockerType,
    blockerCode,
    deleteFromReciprocal = true,
  }) {
    // console.log(`delete from needed to resolve ${componentNameBlocked}, ${typeBlocked}, ${stateVariableBlocked}, ${dependencyBlocked}, ${blockerType}, ${blockerCode}`)
    // console.log(JSON.parse(JSON.stringify(this.resolveBlockers)))

    let codeBlocked = componentNameBlocked;
    if (stateVariableBlocked) {
      codeBlocked += '|' + stateVariableBlocked;
      if (dependencyBlocked) {
        codeBlocked += '|' + dependencyBlocked;
      }
    }

    let deleteBlockerTypeAndCode = function (neededObj) {
      if (blockerType) {
        if (neededObj[blockerType]) {
          if (blockerCode) {
            let ind = neededObj[blockerType].indexOf(blockerCode);
            if (ind !== -1) {
              neededObj[blockerType].splice(ind, 1);
            }
            if (neededObj[blockerType].length === 0) {
              delete neededObj[blockerType];
            }
            if (deleteFromReciprocal) {
              let [
                blockerComponentName,
                blockerStateVariable,
                blockerDependency,
              ] = blockerCode.split('|');
              this.deleteFromResolveBlockedBy({
                blockerComponentName,
                blockerType,
                blockerStateVariable,
                blockerDependency,
                typeBlocked,
                codeBlocked,
                deleteFromReciprocal: false,
              });
            }
          } else {
            // no blockerCode given, so deleting all for blockerType
            // Just delete from reciprocal here
            // (can't actually delete originals in this function, as need access to parent object)
            if (deleteFromReciprocal) {
              for (let code of neededObj[blockerType]) {
                let [
                  blockerComponentName,
                  blockerStateVariable,
                  blockerDependency,
                ] = code.split('|');
                this.deleteFromResolveBlockedBy({
                  blockerComponentName,
                  blockerType,
                  blockerStateVariable,
                  blockerDependency,
                  typeBlocked,
                  codeBlocked,
                  deleteFromReciprocal: false,
                });
              }
            }

            delete neededObj[blockerType];
          }
        }
      } else {
        // no blockerType given, so deleting all blockerCodes for all blockerTypes
        if (deleteFromReciprocal) {
          for (let type in neededObj) {
            for (let code of neededObj[type]) {
              let [
                blockerComponentName,
                blockerStateVariable,
                blockerDependency,
              ] = code.split('|');
              this.deleteFromResolveBlockedBy({
                blockerComponentName,
                blockerType: type,
                blockerStateVariable,
                blockerDependency,
                typeBlocked,
                codeBlocked,
                deleteFromReciprocal: false,
              });
            }
          }
        }
      }
    }.bind(this);

    let neededToResolveForComponent =
      this.resolveBlockers.neededToResolve[componentNameBlocked];

    if (neededToResolveForComponent) {
      let neededToResolveForType = neededToResolveForComponent[typeBlocked];

      if (neededToResolveForType) {
        // have an extra level if include a state variable
        if (stateVariableBlocked) {
          let neededToResolveForStateVariable =
            neededToResolveForType[stateVariableBlocked];
          if (neededToResolveForStateVariable) {
            // have yet another level if include a dependency
            if (dependencyBlocked) {
              let neededToResolveForDependency =
                neededToResolveForStateVariable[dependencyBlocked];
              if (neededToResolveForDependency) {
                deleteBlockerTypeAndCode(neededToResolveForDependency);
                if (
                  !blockerType ||
                  Object.keys(neededToResolveForDependency).length === 0
                ) {
                  delete neededToResolveForStateVariable[dependencyBlocked];
                }
              }
              if (Object.keys(neededToResolveForStateVariable).length === 0) {
                delete neededToResolveForType[stateVariableBlocked];
              }
            } else {
              deleteBlockerTypeAndCode(neededToResolveForStateVariable);
              if (
                !blockerType ||
                Object.keys(neededToResolveForStateVariable).length === 0
              ) {
                delete neededToResolveForType[stateVariableBlocked];
              }
            }
          }
          if (Object.keys(neededToResolveForType).length === 0) {
            delete neededToResolveForComponent[typeBlocked];
          }
        } else {
          deleteBlockerTypeAndCode(neededToResolveForType);
          if (
            !blockerType ||
            Object.keys(neededToResolveForType).length === 0
          ) {
            delete neededToResolveForComponent[typeBlocked];
          }
        }
      }

      if (Object.keys(neededToResolveForComponent).length === 0) {
        delete this.resolveBlockers.neededToResolve[componentNameBlocked];
      }
    }

    // console.log(`done deleting from needed to resolve ${componentNameBlocked}, ${typeBlocked}, ${stateVariableBlocked}, ${dependencyBlocked}, ${blockerType}, ${blockerCode}`)
    // console.log(JSON.parse(JSON.stringify(this.resolveBlockers)))
  }

  checkIfHaveNeededToResolve({
    componentName,
    type,
    stateVariable,
    dependency,
  }) {
    let neededToResolveForComponent =
      this.resolveBlockers.neededToResolve[componentName];
    if (!neededToResolveForComponent) {
      return false;
    }

    let neededToResolve = neededToResolveForComponent[type];
    if (!neededToResolve) {
      return false;
    }

    // have an extra level if include a state variable
    if (stateVariable) {
      let neededToResolveTemp = neededToResolve;
      neededToResolve = neededToResolveTemp[stateVariable];
      if (!neededToResolve) {
        return false;
      }

      // have yet another level if include a dependency
      if (dependency) {
        let neededToResolveTemp = neededToResolve;
        neededToResolve = neededToResolveTemp[dependency];
        if (!neededToResolve) {
          return false;
        }
      }
    }

    return Object.keys(neededToResolve).length > 0;
  }

  getResolveBlockedBy({ componentName, type, stateVariable, dependency }) {
    let resolveBlockedByComponent =
      this.resolveBlockers.resolveBlockedBy[componentName];
    if (!resolveBlockedByComponent) {
      resolveBlockedByComponent = this.resolveBlockers.resolveBlockedBy[
        componentName
      ] = {};
    }

    let resolveBlockedBy = resolveBlockedByComponent[type];
    if (!resolveBlockedBy) {
      resolveBlockedBy = resolveBlockedByComponent[type] = {};
    }

    // have an extra level if include a state variable
    if (stateVariable) {
      let resolveBlockedByTemp = resolveBlockedBy;
      resolveBlockedBy = resolveBlockedByTemp[stateVariable];
      if (!resolveBlockedBy) {
        resolveBlockedBy = resolveBlockedByTemp[stateVariable] = {};
      }

      // have yet another level if include a dependency
      if (dependency) {
        let resolveBlockedByTemp = resolveBlockedBy;
        resolveBlockedBy = resolveBlockedByTemp[dependency];
        if (!resolveBlockedBy) {
          resolveBlockedBy = resolveBlockedByTemp[dependency] = {};
        }
      }
    }

    return resolveBlockedBy;
  }

  deleteFromResolveBlockedBy({
    blockerComponentName,
    blockerType,
    blockerStateVariable,
    blockerDependency,
    typeBlocked,
    codeBlocked,
    deleteFromReciprocal = true,
  }) {
    // console.log(`delete from resolve blocked by ${blockerComponentName}, ${blockerType}, ${blockerStateVariable}, ${blockerDependency}, ${typeBlocked}, ${codeBlocked}`)
    // console.log(JSON.parse(JSON.stringify(this.resolveBlockers)))

    let blockerCode = blockerComponentName;
    if (blockerStateVariable) {
      blockerCode += '|' + blockerStateVariable;
      if (blockerDependency) {
        blockerCode += '|' + blockerDependency;
      }
    }

    let deleteTypeAndCodeBlocked = function (neededObj) {
      if (typeBlocked) {
        if (neededObj[typeBlocked]) {
          if (codeBlocked) {
            let ind = neededObj[typeBlocked].indexOf(codeBlocked);
            if (ind !== -1) {
              neededObj[typeBlocked].splice(ind, 1);
            }
            if (neededObj[typeBlocked].length === 0) {
              delete neededObj[typeBlocked];
            }
            if (deleteFromReciprocal) {
              let [
                componentNameBlocked,
                stateVariableBlocked,
                dependencyBlocked,
              ] = codeBlocked.split('|');
              this.deleteFromNeededToResolve({
                componentNameBlocked,
                typeBlocked,
                stateVariableBlocked,
                dependencyBlocked,
                blockerType,
                blockerCode,
                deleteFromReciprocal: false,
              });
            }
          } else {
            // no codeBlocked given, so deleting all for typeBlocked
            if (deleteFromReciprocal) {
              for (let code of neededObj[typeBlocked]) {
                let [
                  componentNameBlocked,
                  stateVariableBlocked,
                  dependencyBlocked,
                ] = code.split('|');
                this.deleteFromNeededToResolve({
                  componentNameBlocked,
                  typeBlocked,
                  stateVariableBlocked,
                  dependencyBlocked,
                  blockerType,
                  blockerCode,
                  deleteFromReciprocal: false,
                });
              }
            }

            delete neededObj[typeBlocked];
          }
        }
      } else {
        // no typeBlocked given, so will delete all codeBlockeds for all typeBlockeds
        // Just delete from reciprocal here
        // (can't actually delete originals in this function, as need access to parent object)
        if (deleteFromReciprocal) {
          for (let type in neededObj) {
            for (let code of neededObj[type]) {
              let [
                componentNameBlocked,
                stateVariableBlocked,
                dependencyBlocked,
              ] = code.split('|');
              this.deleteFromNeededToResolve({
                componentNameBlocked,
                typeBlocked: type,
                stateVariableBlocked,
                dependencyBlocked,
                blockerType,
                blockerCode,
                deleteFromReciprocal: false,
              });
            }
          }
        }
      }
    }.bind(this);

    let resolveBlockedByForComponent =
      this.resolveBlockers.resolveBlockedBy[blockerComponentName];

    if (resolveBlockedByForComponent) {
      let resolveBlockedByForType = resolveBlockedByForComponent[blockerType];

      if (resolveBlockedByForType) {
        // have an extra level if include a state variable
        if (blockerStateVariable) {
          let resolveBlockedByForStateVariable =
            resolveBlockedByForType[blockerStateVariable];
          if (resolveBlockedByForStateVariable) {
            // have yet another level if include a dependency
            if (blockerDependency) {
              let resolveBlockedByForDependency =
                resolveBlockedByForStateVariable[blockerDependency];
              if (resolveBlockedByForDependency) {
                deleteTypeAndCodeBlocked(resolveBlockedByForDependency);
                if (
                  !typeBlocked ||
                  Object.keys(resolveBlockedByForDependency).length === 0
                ) {
                  delete resolveBlockedByForStateVariable[blockerDependency];
                }
              }
              if (Object.keys(resolveBlockedByForStateVariable).length === 0) {
                delete resolveBlockedByForType[blockerStateVariable];
              }
            } else {
              deleteTypeAndCodeBlocked(resolveBlockedByForStateVariable);
              if (
                !typeBlocked ||
                Object.keys(resolveBlockedByForStateVariable).length === 0
              ) {
                delete resolveBlockedByForType[blockerStateVariable];
              }
            }
          }
          if (Object.keys(resolveBlockedByForType).length === 0) {
            delete resolveBlockedByForComponent[blockerType];
          }
        } else {
          deleteTypeAndCodeBlocked(resolveBlockedByForType);
          if (
            !typeBlocked ||
            Object.keys(resolveBlockedByForType).length === 0
          ) {
            delete resolveBlockedByForComponent[blockerType];
          }
        }
      }

      if (Object.keys(resolveBlockedByForComponent).length === 0) {
        delete this.resolveBlockers.resolveBlockedBy[blockerComponentName];
      }
    }

    // console.log(`done deleting from resolve blocked by ${blockerComponentName}, ${blockerType}, ${blockerStateVariable}, ${blockerDependency}, ${typeBlocked}, ${codeBlocked}`)
    // console.log(JSON.parse(JSON.stringify(this.resolveBlockers)))
  }

  addBlocker({
    blockerComponentName,
    blockerType,
    blockerStateVariable,
    blockerDependency,
    componentNameBlocked,
    typeBlocked,
    stateVariableBlocked,
    dependencyBlocked,
  }) {
    let blockerCode = blockerComponentName;
    if (blockerStateVariable) {
      blockerCode += '|' + blockerStateVariable;
      if (blockerDependency) {
        blockerCode += '|' + blockerDependency;
      }
    }

    let codeBlocked = componentNameBlocked;
    if (stateVariableBlocked) {
      codeBlocked += '|' + stateVariableBlocked;
      if (dependencyBlocked) {
        codeBlocked += '|' + dependencyBlocked;
      }
    }

    let neededForBlocked = this.getNeededToResolve({
      componentName: componentNameBlocked,
      type: typeBlocked,
      stateVariable: stateVariableBlocked,
      dependency: dependencyBlocked,
    });

    let neededToResolveBlocked = neededForBlocked[blockerType];
    if (!neededToResolveBlocked) {
      neededToResolveBlocked = neededForBlocked[blockerType] = [];
    }

    // if blockers is already recorded, then nothing to do
    if (neededToResolveBlocked.includes(blockerCode)) {
      return;
    }

    neededToResolveBlocked.push(blockerCode);

    if (typeBlocked === 'stateVariable') {
      let component = this._components[componentNameBlocked];
      let stateVarObj = component.state[stateVariableBlocked];
      stateVarObj.isResolved = false;
      if (stateVarObj.initiallyResolved) {
        // note: markStateVariableAndUpstreamDependentsStale includes
        // any additionalStateVariablesDefined with stateVariable
        this.core.markStateVariableAndUpstreamDependentsStale({
          component,
          varName: stateVariableBlocked,
        });
      }
    }

    // record that blocked by blocker
    let resolvedBlockedByBlocker = this.getResolveBlockedBy({
      componentName: blockerComponentName,
      type: blockerType,
      stateVariable: blockerStateVariable,
      dependency: blockerDependency,
    });

    let blockedByBlocker = resolvedBlockedByBlocker[typeBlocked];
    if (!blockedByBlocker) {
      blockedByBlocker = resolvedBlockedByBlocker[typeBlocked] = [];
    }
    if (!blockedByBlocker.includes(codeBlocked)) {
      blockedByBlocker.push(codeBlocked);
    }

    this.resetCircularResolveBlockerCheckPassed({
      componentName: componentNameBlocked,
      type: typeBlocked,
      stateVariable: stateVariableBlocked,
      dependency: dependencyBlocked,
    });

    this.checkForCircularResolveBlocker({
      componentName: componentNameBlocked,
      type: typeBlocked,
      stateVariable: stateVariableBlocked,
      dependency: dependencyBlocked,
    });
  }

  processNewlyResolved({
    componentNameNewlyResolved,
    typeNewlyResolved,
    stateVariableNewlyResolved,
    dependencyNewlyResolved,
    expandComposites = true,
    force = false,
    recurseUpstream = false,
  }) {
    // console.log(`process newly resolved ${componentNameNewlyResolved}, ${typeNewlyResolved}, ${stateVariableNewlyResolved}`)

    // Note: even if expandComposites=false and force=false
    // we still might expand composites and force evaluate
    // as resolving a determineDependency will call updateDependencies
    // and updateDependencies calls the getters on
    // the state variables determining dependencies

    if (typeNewlyResolved === 'stateVariable') {
      let component = this._components[componentNameNewlyResolved];
      if (component) {
        component.state[stateVariableNewlyResolved].isResolved = true;
        component.state[stateVariableNewlyResolved].initiallyResolved = true;
      }
    } else if (typeNewlyResolved === 'componentIdentity') {
      if (!(componentNameNewlyResolved in this._components || force)) {
        // console.log(`cannot resolve component identity ${componentNameNewlyResolved} as component doesn't exist`);
        return { success: false };
      }
    } else {
      if (typeNewlyResolved === 'recalculateDownstreamComponents') {
        let dep;

        // if dep doesn't exist, ignore this blocker
        // and continue to resolve anything blocked by it
        try {
          dep =
            this.downstreamDependencies[componentNameNewlyResolved][
              stateVariableNewlyResolved
            ][dependencyNewlyResolved];
        } catch (e) {}

        if (dep) {
          let result = dep.recalculateDownstreamComponents();

          if (!(result.success || force)) {
            return result;
          }

          for (let varName of dep.upstreamVariableNames) {
            this.deleteFromNeededToResolve({
              componentNameBlocked: dep.upstreamComponentName,
              typeBlocked: 'stateVariable',
              stateVariableBlocked: varName,
              blockerType: 'recalculateDownstreamComponents',
              blockerCode:
                dep.upstreamComponentName +
                '|' +
                varName +
                '|' +
                dependencyNewlyResolved,
            });
          }
          for (let varName of dep.upstreamVariableNames) {
            this.resolveIfReady({
              componentName: dep.upstreamComponentName,
              type: 'stateVariable',
              stateVariable: varName,
              expandComposites,
              force,
              recurseUpstream,
            });
          }

          // No need to resolve items blocked by the newly resolved (below)
          // as the above did this and even more
          // (resolving all upstream variables of the dependency)
          return { success: true };
        }
      } else if (typeNewlyResolved === 'determineDependencies') {
        let dep;

        // if dep doesn't exist, ignore this blocker
        // and continue to resolve anything blocked by it
        try {
          dep =
            this.downstreamDependencies[componentNameNewlyResolved][
              stateVariableNewlyResolved
            ][dependencyNewlyResolved];
        } catch (e) {}

        if (dep) {
          // check if there are any other determineDependencies blocking state variable
          let neededForItem = this.getNeededToResolve({
            componentName: componentNameNewlyResolved,
            type: 'stateVariable',
            stateVariable: stateVariableNewlyResolved,
          });

          let foundDetermineDependenciesNotResolved = false;
          let determineDepsDependencies = [];
          if (neededForItem.determineDependencies) {
            for (let code of neededForItem.determineDependencies) {
              let [
                blockerComponentName,
                blockerStateVariable,
                blockerDependency,
              ] = code.split('|');

              if (
                this.checkIfHaveNeededToResolve({
                  componentName: componentNameNewlyResolved,
                  type: 'determineDependency',
                  stateVariable: stateVariableNewlyResolved,
                  dependency: blockerDependency,
                })
              ) {
                foundDetermineDependenciesNotResolved = true;
                break;
              }

              determineDepsDependencies.push(blockerDependency);
            }
          }

          if (foundDetermineDependenciesNotResolved) {
            // nothing more to do as still cannot update dependencies
            // of state variable
            return { success: true };
          }

          // if all determine dependences have been resolved
          // recalculate dependencies for state variable
          let result = this.updateDependencies({
            componentName: componentNameNewlyResolved,
            stateVariable: stateVariableNewlyResolved,
            dependency: dependencyNewlyResolved,
          });

          if (!result.success) {
            // console.log(`failing to update dependencies`)
            return { success: false };
          }

          // resolve all state variables defined from dep
          // as they all had their dependencies updated
          for (let varName of dep.upstreamVariableNames) {
            for (let dependency of determineDepsDependencies) {
              this.deleteFromNeededToResolve({
                componentNameBlocked: dep.upstreamComponentName,
                typeBlocked: 'stateVariable',
                stateVariableBlocked: varName,
                blockerType: 'determineDependencies',
                blockerCode:
                  dep.upstreamComponentName + '|' + varName + '|' + dependency,
              });
            }
            this.resolveIfReady({
              componentName: componentNameNewlyResolved,
              type: 'stateVariable',
              stateVariable: varName,
              expandComposites,
              force,
              recurseUpstream,
            });
          }

          // No need to resolve items blocked by the newly resolved (below)
          // as the above did this and even more
          // (resolving all upstream variables of the dependency)
          return { success: true };
        }
      } else if (typeNewlyResolved === 'childLogic') {
        let component = this._components[componentNameNewlyResolved];

        if (component) {
          if (!component.childLogicSatisfied) {
            let result = this.core.deriveChildResultsFromDefiningChildren({
              parent: component,
              expandComposites,
              forceExpandComposites: force,
            });

            if (
              !result.skipping &&
              !(component.childLogicSatisfiedWithPlaceholders || force)
            ) {
              // console.warn(`cannot resolve child logic of ${componentNameNewlyResolved} as child logic isn't satisfied`);
              return { success: false };
            }
          }
        }
      } else if (typeNewlyResolved === 'expandComposite') {
        let composite = this._components[componentNameNewlyResolved];
        if (!composite.isExpanded) {
          if (
            this.core.updateInfo.compositesBeingExpanded.includes(
              componentNameNewlyResolved,
            )
          ) {
            return { success: false };
          }

          this.core.expandCompositeComponent(
            this._components[componentNameNewlyResolved],
          );
        }
      } else {
        throw Error(`Unrecognized type newly resolved: ${typeNewlyResolved}`);
      }
    }

    let resolveBlockedByNewlyResolved = this.getResolveBlockedBy({
      componentName: componentNameNewlyResolved,
      type: typeNewlyResolved,
      stateVariable: stateVariableNewlyResolved,
      dependency: dependencyNewlyResolved,
    });

    // use shallow copies as we are deleting the blockers as we loop through
    resolveBlockedByNewlyResolved = Object.assign(
      {},
      resolveBlockedByNewlyResolved,
    );

    for (let type in resolveBlockedByNewlyResolved) {
      for (let code of [...resolveBlockedByNewlyResolved[type]]) {
        // first delete
        this.deleteFromResolveBlockedBy({
          blockerComponentName: componentNameNewlyResolved,
          blockerType: typeNewlyResolved,
          blockerStateVariable: stateVariableNewlyResolved,
          blockerDependency: dependencyNewlyResolved,
          typeBlocked: type,
          codeBlocked: code,
        });

        if (recurseUpstream) {
          let [cName, vName, depName] = code.split('|');

          this.resolveIfReady({
            componentName: cName,
            type,
            stateVariable: vName,
            dependency: depName,
            expandComposites,
            force,
            recurseUpstream,
          });
        }
      }
    }

    return { success: true };
  }

  resolveStateVariablesIfReady({ component, stateVariables }) {
    // console.log(`resolve state variables if ready for ${component.componentName}`);

    let componentName = component.componentName;

    if (!stateVariables) {
      this.resolveIfReady({
        componentName,
        type: 'componentIdentity',
        expandComposites: false,
        recurseUpstream: true,
      });

      stateVariables = Object.keys(component.state);
    }

    for (let varName of stateVariables) {
      let stateVarObj = component.state[varName];

      if (stateVarObj && stateVarObj.determineDependenciesImmediately) {
        let neededForItem = this.getNeededToResolve({
          componentName,
          type: 'stateVariable',
          stateVariable: varName,
        });

        let determineDepsBlockers = neededForItem.determineDependencies;
        if (determineDepsBlockers) {
          for (let blockerCode of determineDepsBlockers) {
            let [
              blockerComponentName,
              blockerStateVariable,
              blockerDependency,
            ] = blockerCode.split('|');

            this.resolveIfReady({
              componentName: blockerComponentName,
              type: 'determineDependencies',
              stateVariable: blockerStateVariable,
              dependency: blockerDependency,
              expandComposites: true, // TODO: why is this true?
              recurseUpstream: true,
            });
          }
        }
      }
      this.resolveIfReady({
        componentName,
        type: 'stateVariable',
        stateVariable: varName,
        expandComposites: false,
        recurseUpstream: true,
      });
    }

    // console.log(`finished resolving state variables if ready ${component.componentName}`);
    // console.log(JSON.parse(JSON.stringify(this.resolveBlockers)))
  }

  resolveIfReady({
    componentName,
    type,
    stateVariable,
    dependency,
    expandComposites = true,
    force = false,
    recurseUpstream = false,
  }) {
    // console.log(`resolve if ready ${componentName}, ${type}, ${stateVariable}, ${dependency}`)

    let haveNeededToResolve = this.checkIfHaveNeededToResolve({
      componentName,
      type,
      stateVariable,
      dependency,
    });

    if (haveNeededToResolve) {
      return { success: false };
    }

    // Although needed to resolve is empty,
    // running deleteFromNeededToResolve will remove
    // the empty data structures
    this.deleteFromNeededToResolve({
      componentNameBlocked: componentName,
      typeBlocked: type,
      stateVariableBlocked: stateVariable,
      dependencyBlocked: dependency,
    });

    let result = this.processNewlyResolved({
      componentNameNewlyResolved: componentName,
      typeNewlyResolved: type,
      stateVariableNewlyResolved: stateVariable,
      dependencyNewlyResolved: dependency,
      expandComposites,
      force,
      recurseUpstream,
    });

    return result;
  }

  resolveItem({
    componentName,
    type,
    stateVariable,
    dependency,
    force = false,
    recurseUpstream = false,
    expandComposites = true,
    numPreviouslyNeeded,
  }) {
    // if (!this.resolveLevels) {
    //   this.resolveLevels = 0;
    // }
    // this.resolveLevels++;

    // console.log(`${" ".repeat(this.resolveLevels - 1)}${this.resolveLevels}. resolve item ${componentName}, ${type}, ${stateVariable}, ${dependency}, ${expandComposites}, ${force}`)

    // Note: even if expandComposites=false and force=false
    // we still might expand composites and force evaluate
    // as resolving a determineDependency will call updateDependencies
    // and updateDependencies calls the getters on
    // the state variables determining dependencies

    let neededForItem = this.getNeededToResolve({
      componentName,
      type,
      stateVariable,
      dependency,
    });

    // first resolve determine dependencies, if it exists

    let determineDepsBlockers = neededForItem.determineDependencies;

    if (determineDepsBlockers && determineDepsBlockers.length > 0) {
      for (let blockerCode of [...determineDepsBlockers]) {
        let [blockerComponentName, blockerStateVariable, blockerDependency] =
          blockerCode.split('|');

        let result = this.resolveItem({
          componentName: blockerComponentName,
          type: 'determineDependencies',
          stateVariable: blockerStateVariable,
          dependency: blockerDependency,
          force, //recurseUpstream
          expandComposites,
        });

        if (!result.success) {
          // console.log(`${" ".repeat(this.resolveLevels - 1)}${this.resolveLevels}. couldn't resolve ${componentName}, ${type}, ${stateVariable}, ${dependency}`)
          // this.resolveLevels--;
          return result;
        }
      }
    }

    let stateVarObj;
    if (type === 'stateVariable' && this._components[componentName]) {
      stateVarObj = this._components[componentName].state[stateVariable];
      stateVarObj.currentlyResolving = true;
    }

    while (Object.keys(neededForItem).length > 0) {
      for (let blockerType in neededForItem) {
        if (blockerType === 'determineDependencies') {
          throw Error(
            `Shouldn't have determine dependencies blocker after determining dependencies`,
          );
        }

        // shallow copy, as items may be deleted as resolve items
        for (let code of [...neededForItem[blockerType]]) {
          let [blockerComponentName, blockerStateVariable, blockerDependency] =
            code.split('|');

          let result = this.resolveItem({
            componentName: blockerComponentName,
            type: blockerType,
            stateVariable: blockerStateVariable,
            dependency: blockerDependency,
            force, //recurseUpstream
            expandComposites,
          });

          if (!result.success) {
            // console.log(`${" ".repeat(this.resolveLevels - 1)}couldn't resolve ${componentName}, ${type}, ${stateVariable}, ${dependency}`)
            // this.resolveLevels--;
            return result;
          }
        }
      }
    }

    if (stateVarObj) {
      stateVarObj.currentlyResolving = false;
    }

    // item is resolved
    let finalResult = this.resolveIfReady({
      componentName,
      type,
      stateVariable,
      dependency,
      force,
      recurseUpstream,
      expandComposites,
    });

    if (!finalResult.success) {
      // after removing all blockers, we still can't resolve

      let stillNeededForItem = this.getNeededToResolve({
        componentName,
        type,
        stateVariable,
        dependency,
      });

      let numNeeded = Object.keys(stillNeededForItem).length;

      if (numNeeded > 0) {
        if (
          numPreviouslyNeeded === undefined ||
          numNeeded < numPreviouslyNeeded
        ) {
          // if this is the first time or the number needed is decreasing
          // then we can try again

          finalResult = this.resolveItem({
            componentName,
            type,
            stateVariable,
            dependency,
            force,
            recurseUpstream,
            expandComposites,
            numPreviouslyNeeded: numNeeded,
          });
        }
      }
    }

    // console.log(`${" ".repeat(this.resolveLevels - 1)}${this.resolveLevels}. done resolving item ${componentName}, ${type}, ${stateVariable}, ${dependency}, ${expandComposites}, ${force}`)
    // this.resolveLevels--;

    return finalResult;
  }

  checkForCircularResolveBlocker({
    componentName,
    type,
    stateVariable,
    dependency,
    previouslyVisited = [],
  }) {
    let code = componentName;
    if (stateVariable) {
      code += '|' + stateVariable;
      if (dependency) {
        code += '|' + dependency;
      }
    }

    let identifier = code + '|' + type;

    if (previouslyVisited.includes(identifier)) {
      // Found circular dependency
      // Create error message with list of component names involved

      console.log('found circular', identifier, previouslyVisited);

      let componentNameRe = /^([^\|]*)\|/;
      let componentNamesInvolved = previouslyVisited.map(
        (x) => x.match(componentNameRe)[1],
      );

      // remove internally created component names
      // and deduplicate while keeping order (so don't use Set)
      let uniqueComponentNames = componentNamesInvolved
        .filter((x) => x.slice(0, 2) !== '__')
        .reduce((a, b) => (a.includes(b) ? a : [...a, b]), []);

      // If had only internally created component names, just give first componentName
      if (uniqueComponentNames.length === 0) {
        uniqueComponentNames = [componentNamesInvolved[0]];
      }

      let nameString;
      if (uniqueComponentNames.length === 1) {
        nameString = uniqueComponentNames[0];
      } else if (uniqueComponentNames.length === 2) {
        nameString = uniqueComponentNames.join(' and ');
      } else {
        uniqueComponentNames[uniqueComponentNames.length - 2] =
          uniqueComponentNames
            .slice(uniqueComponentNames.length - 2)
            .join(', and ');
        uniqueComponentNames.pop();
        nameString = uniqueComponentNames.join(', ');
      }

      // look for a composite with state variables readyToExpandWhenResolved
      // and needsReplacementsUpdatedWhenStale

      let compositesWithReadyToExpandWhenResolved = [];
      let compositesWithStateVariableToEvaluateAfterReplacements = [];
      for (let identifier of previouslyVisited) {
        let [componentName, stateVariable] = identifier.split('|');
        let component = this._components[componentName];
        if (component) {
          let isComposite = this.componentInfoObjects.isInheritedComponentType({
            inheritedComponentType: component.componentType,
            baseComponentType: '_composite',
          });
          if (isComposite && !component.attributes.componentType) {
            if (stateVariable === 'readyToExpandWhenResolved') {
              compositesWithReadyToExpandWhenResolved.push(componentName);
            } else if (
              stateVariable ===
              component.constructor.stateVariableToEvaluateAfterReplacements
            ) {
              compositesWithStateVariableToEvaluateAfterReplacements.push(
                componentName,
              );
            }
          }
        }
      }

      let foundCompositeWithCombination = false;
      for (let componentName of compositesWithReadyToExpandWhenResolved) {
        if (
          compositesWithStateVariableToEvaluateAfterReplacements.includes(
            componentName,
          )
        ) {
          foundCompositeWithCombination = true;
          break;
        }
      }

      let message = `Circular dependency involving ${nameString}.`;
      if (foundCompositeWithCombination) {
        message +=
          '  Specifying the type of a composite component may address this circular dependency.';
      }
      throw Error(message);
    } else {
      // shallow copy so don't change original
      previouslyVisited = [...previouslyVisited, identifier];
    }

    if (!this.circularResolveBlockedCheckPassed[identifier]) {
      this.circularResolveBlockedCheckPassed[identifier] = true;

      let neededForItem = this.getNeededToResolve({
        componentName,
        type,
        stateVariable,
        dependency,
      });

      for (let blockerType in neededForItem) {
        for (let blockerCode of neededForItem[blockerType]) {
          let [blockerComponentName, blockerStateVariable, blockerDependency] =
            blockerCode.split('|');

          this.checkForCircularResolveBlocker({
            componentName: blockerComponentName,
            type: blockerType,
            stateVariable: blockerStateVariable,
            dependency: blockerDependency,
            previouslyVisited,
          });
        }
      }
    }
  }

  resetCircularResolveBlockerCheckPassed({
    componentName,
    type,
    stateVariable,
    dependency,
  }) {
    let code = componentName;
    if (stateVariable) {
      code += '|' + stateVariable;
      if (dependency) {
        code += '|' + dependency;
      }
    }

    let identifier = code + '|' + type;

    if (this.circularResolveBlockedCheckPassed[identifier]) {
      delete this.circularResolveBlockedCheckPassed[identifier];

      let resolveBlockedBy = this.getResolveBlockedBy({
        componentName,
        type,
        stateVariable,
        dependency,
      });

      for (let typeBlocked in resolveBlockedBy) {
        for (let codeBlocked of resolveBlockedBy[typeBlocked]) {
          let [componentNameBlocked, stateVariableBlocked, dependencyBlocked] =
            codeBlocked.split('|');

          this.resetCircularResolveBlockerCheckPassed({
            componentName: componentNameBlocked,
            type: typeBlocked,
            stateVariable: stateVariableBlocked,
            dependency: dependencyBlocked,
          });
        }
      }
    }
  }

  get components() {
    return new Proxy(this._components, readOnlyProxyHandler);
  }

  set components(value) {
    return null;
  }
}

class Dependency {
  constructor({
    component,
    stateVariable,
    allStateVariablesAffected,
    dependencyName,
    dependencyDefinition,
    dependencyHandler,
  }) {
    this.dependencyName = dependencyName;
    this.dependencyHandler = dependencyHandler;

    this.upstreamComponentName = component.componentName;
    this.upstreamVariableNames = allStateVariablesAffected;

    this.definition = Object.assign({}, dependencyDefinition);
    this.representativeStateVariable = stateVariable;

    if (dependencyDefinition.doNotProxy) {
      this.doNotProxy = true;
    }

    if (dependencyDefinition.variablesOptional) {
      this.variablesOptional = true;
    }

    if (dependencyDefinition.publicStateVariablesOnly) {
      this.publicStateVariablesOnly = true;
    }

    if (dependencyDefinition.caseInsensitiveVariableMatch) {
      this.caseInsensitiveVariableMatch = true;
    }

    if (dependencyDefinition.useMappedVariableNames) {
      this.useMappedVariableNames = true;
    }

    if (Number.isInteger(dependencyDefinition.propIndex)) {
      this.propIndex = dependencyDefinition.propIndex;
    }

    // if returnSingleVariableValue, then
    // return just the value of the state variable when there is
    // exactly one (downstreamComponentName, downstreamVariableName)
    // and return null otherwise
    this.returnSingleVariableValue = false;

    // if returnSingleComponent, then
    // return just the component object (rather than an array) when there
    // is exactly one downstreamComponentName
    // and return null otherwise
    this.returnSingleComponent = false;

    this.originalDownstreamVariableNames = [];

    this.setUpParameters();

    // Note: determineDownstreamComponents has side effects
    // of setting class variables and adding to updateTrigger objects
    let downComponents = this.determineDownstreamComponents();

    // Note: initialize adds dependency to upstreamDependencies and downstreamDependencies
    this.initialize({
      downstreamComponentNames: downComponents.downstreamComponentNames,
      downstreamComponentTypes: downComponents.downstreamComponentTypes,
    });

    // this.checkForCircular();
  }

  static dependencyType = '_base';

  downstreamVariableNameIfNoVariables = '__identity';

  static get rendererType() {
    return this.componentType;
  }

  get dependencyType() {
    return this.constructor.dependencyType;
  }

  setUpParameters() {}

  determineDownstreamComponents() {
    return {
      success: true,
      downstreamComponentNames: [],
      downstreamComponentTypes: [],
    };
  }

  initialize({ downstreamComponentNames, downstreamComponentTypes }) {
    // 1. add this dependency to the downstreamDependencies of the upstream component
    // 2. for each downstreamComponentName, add this dependency to upstreamDependencies
    // 3. map originalDownstreamVariableNames to mappedDownstreamVariableNamesByComponent
    // 4. possibly create array entry variables in downstream components if they don't exist
    // 5. keep track of any unresolved dependencies

    this.componentIdentitiesChanged = true;

    let upCompDownDeps =
      this.dependencyHandler.downstreamDependencies[this.upstreamComponentName];
    if (!upCompDownDeps) {
      upCompDownDeps = this.dependencyHandler.downstreamDependencies[
        this.upstreamComponentName
      ] = {};
    }

    for (let varName of this.upstreamVariableNames) {
      if (!upCompDownDeps[varName]) {
        upCompDownDeps[varName] = {};
      }
      upCompDownDeps[varName][this.dependencyName] = this;
    }

    if (
      this.originalDownstreamVariableNames.length === 0 &&
      !this.originalVariablesByComponent
    ) {
      delete this.mappedDownstreamVariableNamesByComponent;
      delete this.upValuesChanged;
    } else {
      this.mappedDownstreamVariableNamesByComponent = [];
      this.valuesChanged = [];
    }

    this.downstreamComponentNames = [];
    this.downstreamComponentTypes = [];

    for (let [
      index,
      downstreamComponentName,
    ] of downstreamComponentNames.entries()) {
      this.addDownstreamComponent({
        downstreamComponentName,
        downstreamComponentType: downstreamComponentTypes[index],
        index,
      });
    }

    this.onDownstreamComponentChange();
  }

  addDownstreamComponent({
    downstreamComponentName,
    downstreamComponentType,
    index,
  }) {
    this.componentIdentitiesChanged = true;

    this.downstreamComponentNames.splice(index, 0, downstreamComponentName);
    this.downstreamComponentTypes.splice(index, 0, downstreamComponentType);

    let downComponent =
      this.dependencyHandler._components[downstreamComponentName];

    if (downComponent || !this.skipComponentNames) {
      let originalVarNames;

      if (this.originalVariablesByComponent) {
        originalVarNames =
          this.originalDownstreamVariableNamesByComponent[index];
      } else {
        originalVarNames = this.originalDownstreamVariableNames;
      }

      if (this.caseInsensitiveVariableMatch) {
        originalVarNames =
          this.dependencyHandler.core.findCaseInsensitiveMatches({
            stateVariables: originalVarNames,
            componentClass: downComponent.constructor,
          });
      }

      if (this.publicStateVariablesOnly) {
        originalVarNames =
          this.dependencyHandler.core.matchPublicStateVariables({
            stateVariables: originalVarNames,
            componentClass: downComponent.constructor,
          });
      }

      let mappedVarNames = this.dependencyHandler.core.substituteAliases({
        stateVariables: originalVarNames,
        componentClass: downComponent.constructor,
      });

      if (this.constructor.convertToArraySize) {
        mappedVarNames = mappedVarNames.map(function (vName) {
          let stateVarObj = downComponent.state[vName];
          if (stateVarObj) {
            if (stateVarObj.arraySizeStateVariable) {
              return stateVarObj.arraySizeStateVariable;
            } else {
              return `__${vName}_is_not_an_array`;
            }
          }

          // check if vName begins when an arrayEntry
          if (downComponent.arrayEntryPrefixes) {
            let arrayEntryPrefixesLongestToShortest = Object.keys(
              downComponent.arrayEntryPrefixes,
            ).sort((a, b) => b.length - a.length);
            for (let arrayEntryPrefix of arrayEntryPrefixesLongestToShortest) {
              if (
                vName.substring(0, arrayEntryPrefix.length) === arrayEntryPrefix
              ) {
                let arrayVarName =
                  downComponent.arrayEntryPrefixes[arrayEntryPrefix];
                return downComponent.state[arrayVarName].arraySizeStateVariable;
              }
            }
          }
          return `__${vName}_is_not_an_array`;
        });
      }

      if (this.propIndex !== undefined) {
        console.warn(`Need to implement propIndex!`);
        // mappedVarNames = this.dependencyHandler.core.arrayEntryNameFromPropIndex({
        //   stateVariables: mappedVarNames,
        //   component: downComponent,
        //   propIndex: this.propIndex
        // });
      }

      // Note: mappedVarNames contains all original variables mapped with any aliases.
      // If variablesOptional, downVarNames may be filtered to just include
      // variables that exist in the component.
      // (If not variablesOptional and variable doesn't exist, will eventually get an error)
      let downVarNames = mappedVarNames;

      if (originalVarNames.length > 0 || this.originalVariablesByComponent) {
        this.mappedDownstreamVariableNamesByComponent.splice(
          index,
          0,
          mappedVarNames,
        );

        let valsChanged = {};
        for (let downVar of mappedVarNames) {
          valsChanged[downVar] = { changed: true };
        }
        this.valuesChanged.splice(index, 0, valsChanged);

        if (this.variablesOptional) {
          // if variables are optional, then include variables in downVarNames
          // only if the variable exists in the downstream component
          // (or could be created as an array entry)
          downVarNames = downVarNames.filter(
            (downVar) =>
              downVar in downComponent.state ||
              this.dependencyHandler.core.checkIfArrayEntry({
                stateVariable: downVar,
                component: downComponent,
              }),
          );
        }

        for (let downVar of downVarNames) {
          if (!downComponent.state[downVar]) {
            this.dependencyHandler.core.createFromArrayEntry({
              component: downComponent,
              stateVariable: downVar,
            });
          }

          if (!downComponent.state[downVar].isResolved) {
            for (let varName of this.upstreamVariableNames) {
              this.dependencyHandler.addBlocker({
                blockerComponentName: downstreamComponentName,
                blockerType: 'stateVariable',
                blockerStateVariable: downVar,
                componentNameBlocked: this.upstreamComponentName,
                typeBlocked: 'stateVariable',
                stateVariableBlocked: varName,
              });
              if (this.dependencyType === 'determineDependencies') {
                this.dependencyHandler.addBlocker({
                  blockerComponentName: downstreamComponentName,
                  blockerType: 'stateVariable',
                  blockerStateVariable: downVar,
                  componentNameBlocked: this.upstreamComponentName,
                  typeBlocked: 'determineDependencies',
                  stateVariableBlocked: varName,
                  dependencyBlocked: this.dependencyName,
                });
              }
            }
          }
        }
      }

      // if don't have any state variables,
      // then just record the upstream dependencies on the downstream component
      // under "__identity"
      if (downVarNames.length === 0) {
        downVarNames = [this.downstreamVariableNameIfNoVariables];
      }

      let downCompUpDeps =
        this.dependencyHandler.upstreamDependencies[downstreamComponentName];
      if (!downCompUpDeps) {
        downCompUpDeps = this.dependencyHandler.upstreamDependencies[
          downstreamComponentName
        ] = {};
      }

      for (let varName of downVarNames) {
        if (downCompUpDeps[varName] === undefined) {
          downCompUpDeps[varName] = [];
        }
        downCompUpDeps[varName].push(this);

        if (varName !== this.downstreamVariableNameIfNoVariables) {
          for (let upstreamVarName of this.upstreamVariableNames) {
            this.dependencyHandler.resetCircularCheckPassed(
              this.upstreamComponentName,
              upstreamVarName,
            );
          }
        }
      }
    }

    for (let upVarName of this.upstreamVariableNames) {
      if (
        this.dependencyHandler._components[this.upstreamComponentName].state[
          upVarName
        ].initiallyResolved
      ) {
        this.dependencyHandler.core.recordActualChangeInStateVariable({
          componentName: this.upstreamComponentName,
          varName: upVarName,
        });
      }
    }
  }

  removeDownstreamComponent({ indexToRemove, recordChange = true }) {
    // console.log(`remove downstream ${indexToRemove}, ${this.downstreamComponentNames[indexToRemove]} dependency: ${this.dependencyName}`)
    // console.log(this.upstreamComponentName, this.representativeStateVariable);

    // remove downstream component specified by indexToRemove from this dependency

    if (recordChange) {
      this.componentIdentitiesChanged = true;
    }

    let componentName = this.downstreamComponentNames[indexToRemove];

    this.downstreamComponentNames.splice(indexToRemove, 1);
    this.downstreamComponentTypes.splice(indexToRemove, 1);

    if (componentName in this.dependencyHandler._components) {
      let affectedDownstreamVariableNames;

      if (!this.mappedDownstreamVariableNamesByComponent) {
        affectedDownstreamVariableNames = [
          this.downstreamVariableNameIfNoVariables,
        ];
      } else {
        affectedDownstreamVariableNames =
          this.mappedDownstreamVariableNamesByComponent[indexToRemove];
        this.mappedDownstreamVariableNamesByComponent.splice(indexToRemove, 1);
        this.valuesChanged.splice(indexToRemove, 1);

        if (this.variablesOptional) {
          // if variables are optional, it's possble no variables were found
          // so add placeholder variable name just in case
          // (It doesn't matter if extra variables are included,
          // as they will be skipped below.  And, since the component may have
          // been deleted already, we don't want to check its state.)
          affectedDownstreamVariableNames.push(
            this.downstreamVariableNameIfNoVariables,
          );
        }
      }

      // delete from upstream dependencies of downstream component
      for (let vName of affectedDownstreamVariableNames) {
        let downCompUpDeps =
          this.dependencyHandler.upstreamDependencies[componentName][vName];
        if (downCompUpDeps) {
          let ind = downCompUpDeps.indexOf(this);
          // if find an upstream dependency, delete
          if (ind !== -1) {
            if (downCompUpDeps.length === 1) {
              delete this.dependencyHandler.upstreamDependencies[componentName][
                vName
              ];
            } else {
              downCompUpDeps.splice(ind, 1);
            }
          }
        }

        if (vName !== this.downstreamVariableNameIfNoVariables) {
          for (let upstreamVarName of this.upstreamVariableNames) {
            // TODO: check why have to do this when remove a component from a dependency
            this.dependencyHandler.resetCircularCheckPassed(
              this.upstreamComponentName,
              upstreamVarName,
            );
          }
        }
      }
    }

    if (recordChange) {
      for (let upVarName of this.upstreamVariableNames) {
        if (
          this.dependencyHandler._components[this.upstreamComponentName].state[
            upVarName
          ].initiallyResolved
        ) {
          this.dependencyHandler.core.recordActualChangeInStateVariable({
            componentName: this.upstreamComponentName,
            varName: upVarName,
          });
        }
      }
    }
  }

  swapDownstreamComponents(index1, index2) {
    this.componentIdentitiesChanged = true;

    [
      this.downstreamComponentNames[index1],
      this.downstreamComponentNames[index2],
    ] = [
      this.downstreamComponentNames[index2],
      this.downstreamComponentNames[index1],
    ];

    [
      this.downstreamComponentTypes[index1],
      this.downstreamComponentTypes[index2],
    ] = [
      this.downstreamComponentTypes[index2],
      this.downstreamComponentTypes[index1],
    ];

    if (
      this.originalDownstreamVariableNames.length > 0 ||
      this.originalVariablesByComponent
    ) {
      [
        this.mappedDownstreamVariableNamesByComponent[index1],
        this.mappedDownstreamVariableNamesByComponent[index2],
      ] = [
        this.mappedDownstreamVariableNamesByComponent[index2],
        this.mappedDownstreamVariableNamesByComponent[index1],
      ];

      [this.valuesChanged[index1], this.valuesChanged[index2]] = [
        this.valuesChanged[index2],
        this.valuesChanged[index1],
      ];
    }

    for (let upVarName of this.upstreamVariableNames) {
      if (
        this.dependencyHandler._components[this.upstreamComponentName].state[
          upVarName
        ].initiallyResolved
      ) {
        this.dependencyHandler.core.recordActualChangeInStateVariable({
          componentName: this.upstreamComponentName,
          varName: upVarName,
        });
      }
    }
  }

  deleteDependency() {
    // console.log(`deleting dependency: ${this.dependencyName}`)
    // console.log(this.upstreamComponentName, this.representativeStateVariable);

    let affectedDownstreamVariableNamesByUpstreamComponent = [];

    if (!this.mappedDownstreamVariableNamesByComponent) {
      affectedDownstreamVariableNamesByUpstreamComponent = Array(
        this.downstreamComponentNames.length,
      ).fill([this.downstreamVariableNameIfNoVariables]);
    } else {
      affectedDownstreamVariableNamesByUpstreamComponent =
        this.mappedDownstreamVariableNamesByComponent;
      if (this.variablesOptional) {
        let newVarNames = [];
        for (let [ind, cName] of this.downstreamComponentNames.entries()) {
          let varNamesForComponent = [];
          for (let vName of affectedDownstreamVariableNamesByUpstreamComponent[
            ind
          ]) {
            if (this.dependencyHandler.components[cName].state[vName]) {
              varNamesForComponent.push(vName);
            }
          }

          // if variablesOptional, it is possible that no variables were found
          if (varNamesForComponent.length > 0) {
            newVarNames.push(varNamesForComponent);
          } else {
            newVarNames.push([this.downstreamVariableNameIfNoVariables]);
          }
        }
        affectedDownstreamVariableNamesByUpstreamComponent = newVarNames;
      }
    }

    // delete from upstream dependencies of downstream components
    for (let [cInd, downCompName] of this.downstreamComponentNames.entries()) {
      for (let vName of affectedDownstreamVariableNamesByUpstreamComponent[
        cInd
      ]) {
        let downCompUpDeps =
          this.dependencyHandler.upstreamDependencies[downCompName][vName];
        if (downCompUpDeps) {
          let ind = downCompUpDeps.indexOf(this);
          // if find an upstream dependency, delete
          if (ind !== -1) {
            if (downCompUpDeps.length === 1) {
              delete this.dependencyHandler.upstreamDependencies[downCompName][
                vName
              ];
            } else {
              downCompUpDeps.splice(ind, 1);
            }
          }
        }

        if (vName !== this.downstreamVariableNameIfNoVariables) {
          for (let upstreamVarName of this.upstreamVariableNames) {
            // TODO: check why have to do this when delete a dependency
            this.dependencyHandler.resetCircularCheckPassed(
              this.upstreamComponentName,
              upstreamVarName,
            );
          }
        }
      }
    }

    this.deleteFromUpdateTriggers();

    // delete from downstream dependencies of upstream components

    let upCompDownDeps =
      this.dependencyHandler.downstreamDependencies[this.upstreamComponentName];

    for (let varName of this.upstreamVariableNames) {
      delete upCompDownDeps[varName][this.dependencyName];
    }
  }

  deleteFromUpdateTriggers() {}

  getValue({ verbose = false, skipProxy = false } = {}) {
    let value = [];
    let changes = {};
    let usedDefault = false;

    if (this.componentIdentitiesChanged) {
      changes.componentIdentitiesChanged = true;
      this.componentIdentitiesChanged = false;
    }

    for (let [
      componentInd,
      componentName,
    ] of this.downstreamComponentNames.entries()) {
      let depComponent = this.dependencyHandler.components[componentName];

      if (depComponent) {
        let componentObj = {
          componentType: depComponent.componentType,
        };

        if (!this.skipComponentNames) {
          componentObj.componentName = componentName;
        }

        let originalVarNames;
        if (this.originalVariablesByComponent) {
          originalVarNames =
            this.originalDownstreamVariableNamesByComponent[componentInd];
        } else {
          originalVarNames = this.originalDownstreamVariableNames;
        }

        if (originalVarNames.length > 0) {
          componentObj.stateValues = {};

          for (let [varInd, originalVarName] of originalVarNames.entries()) {
            let mappedVarName =
              this.mappedDownstreamVariableNamesByComponent[componentInd][
                varInd
              ];

            let nameForOutput = this.useMappedVariableNames
              ? mappedVarName
              : originalVarName;

            if (
              !this.variablesOptional ||
              mappedVarName in depComponent.state
            ) {
              if (!depComponent.state[mappedVarName].deferred) {
                componentObj.stateValues[nameForOutput] =
                  depComponent.stateValues[mappedVarName];
                if (this.valuesChanged[componentInd][mappedVarName].changed) {
                  if (!changes.valuesChanged) {
                    changes.valuesChanged = {};
                  }
                  if (!changes.valuesChanged[componentInd]) {
                    changes.valuesChanged[componentInd] = {};
                  }
                  changes.valuesChanged[componentInd][nameForOutput] =
                    this.valuesChanged[componentInd][mappedVarName];
                }
                this.valuesChanged[componentInd][mappedVarName] = {};
              }
            }
          }
        }

        value.push(componentObj);
      } else {
        // no component, which means skipComponentNames must be true
        // and we have no variables
        value.push({
          componentType: this.downstreamComponentTypes[componentInd],
        });
      }
    }

    if (!verbose) {
      if (this.returnSingleVariableValue) {
        if (value.length === 1) {
          value = value[0];
          if (changes.valuesChanged && changes.valuesChanged[0]) {
            changes.valuesChanged = changes.valuesChanged[0];
          } else {
            delete changes.valuesChanged;
          }

          let stateVariables = Object.keys(value.stateValues);
          if (stateVariables.length === 1) {
            value = value.stateValues[stateVariables[0]];
            let nameForOutput;

            if (this.useMappedVariableNames) {
              nameForOutput =
                this.mappedDownstreamVariableNamesByComponent[0][0];
            } else {
              if (this.originalVariablesByComponent) {
                nameForOutput =
                  this.originalDownstreamVariableNamesByComponent[0][0];
              } else {
                nameForOutput = this.originalDownstreamVariableNames[0];
              }
            }

            if (changes.valuesChanged && changes.valuesChanged[nameForOutput]) {
              changes.valuesChanged = changes.valuesChanged[nameForOutput];
            }

            usedDefault =
              this.dependencyHandler.components[
                this.downstreamComponentNames[0]
              ].state[this.mappedDownstreamVariableNamesByComponent[0][0]]
                .usedDefault;
          } else {
            value = null;
            changes.valuesChanged = {};
          }
        } else {
          value = null;
          changes.valuesChanged = {};
        }
      } else if (this.returnSingleComponent) {
        if (value.length === 1) {
          value = value[0];
          if (changes.valuesChanged && changes.valuesChanged[0]) {
            changes.valuesChanged = changes.valuesChanged[0];
          } else {
            delete changes.valuesChanged;
          }
        } else {
          value = null;
        }
      }
    }

    if (
      !this.doNotProxy &&
      !skipProxy &&
      value !== null &&
      typeof value === 'object'
    ) {
      value = new Proxy(value, readOnlyProxyHandler);
    }

    return { value, changes, usedDefault };
  }

  checkForCircular() {
    for (let varName of this.upstreamVariableNames) {
      this.dependencyHandler.resetCircularCheckPassed(
        this.upstreamComponentName,
        varName,
      );
    }
    for (let varName of this.upstreamVariableNames) {
      this.dependencyHandler.checkForCircularDependency({
        componentName: this.upstreamComponentName,
        varName,
      });
    }
  }

  recalculateDownstreamComponents() {
    let newDownComponents = this.determineDownstreamComponents();

    // this.downstreamComponentNames = newDownComponents.downstreamComponentNames;
    // this.downstreamComponentTypes = newDownComponents.downstreamComponentTypes;

    let newComponentNames = newDownComponents.downstreamComponentNames;

    let foundChange =
      newComponentNames.length !== this.downstreamComponentNames.length ||
      this.downstreamComponentNames.some((v, i) => v != newComponentNames[i]);

    if (foundChange) {
      this.componentIdentitiesChanged = true;

      // first remove any components that are no longer present

      let nRemoved = 0;
      for (let [ind, downCompName] of [
        ...this.downstreamComponentNames,
      ].entries()) {
        if (!newComponentNames.includes(downCompName)) {
          this.removeDownstreamComponent({ indexToRemove: ind - nRemoved });
          nRemoved++;
        }
      }

      for (let [ind, downCompName] of newComponentNames.entries()) {
        let oldInd = this.downstreamComponentNames.indexOf(downCompName);

        if (oldInd !== -1) {
          if (oldInd !== ind) {
            this.swapDownstreamComponents(oldInd, ind);
          }
        } else {
          this.addDownstreamComponent({
            downstreamComponentName: downCompName,
            downstreamComponentType:
              newDownComponents.downstreamComponentTypes[ind],
            index: ind,
          });
        }
      }
    }

    if (this.originalVariablesByComponent) {
      for (let [ind, downCompName] of [
        ...this.downstreamComponentNames,
      ].entries()) {
        if (
          this.mappedDownstreamVariableNamesByComponent[ind].length !==
            this.originalDownstreamVariableNamesByComponent[ind].length ||
          this.mappedDownstreamVariableNamesByComponent[ind].some(
            (v, i) =>
              this.originalDownstreamVariableNamesByComponent[ind][i] !== v,
          )
        ) {
          // remove and add back downstream component
          // so that the variables are reinitialized

          this.removeDownstreamComponent({ indexToRemove: ind });

          this.addDownstreamComponent({
            downstreamComponentName: downCompName,
            downstreamComponentType:
              newDownComponents.downstreamComponentTypes[ind],
            index: ind,
          });
        }
      }
    }

    this.onDownstreamComponentChange();

    return { success: newDownComponents.success };
  }

  onDownstreamComponentChange() {}
}

class StateVariableDependency extends Dependency {
  static dependencyType = 'stateVariable';

  setUpParameters() {
    if (this.definition.componentName) {
      this.componentName = this.definition.componentName;
      this.specifiedComponentName = this.componentName;
    } else {
      this.componentName = this.upstreamComponentName;
    }

    if (this.definition.variableName === undefined) {
      throw Error(
        `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: variableName is not defined`,
      );
    }
    this.originalDownstreamVariableNames = [this.definition.variableName];

    if (this.definition.returnAsComponentObject) {
      this.returnSingleComponent = true;
    } else {
      this.returnSingleVariableValue = true;
    }
  }

  determineDownstreamComponents() {
    let component = this.dependencyHandler._components[this.componentName];

    if (!component) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.componentName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.componentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.componentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    return {
      success: true,
      downstreamComponentNames: [this.componentName],
      downstreamComponentTypes: [component.componentType],
    };
  }

  deleteFromUpdateTriggers() {
    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }
}

dependencyTypeArray.push(StateVariableDependency);

class MultipleStateVariablesDependency extends Dependency {
  static dependencyType = 'multipleStateVariables';

  setUpParameters() {
    if (this.definition.componentName) {
      this.componentName = this.definition.componentName;
      this.specifiedComponentName = this.componentName;
    } else {
      this.componentName = this.upstreamComponentName;
    }

    if (this.definition.variableNames === undefined) {
      throw Error(
        `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: variableNames is not defined`,
      );
    }
    this.originalDownstreamVariableNames = this.definition.variableNames;

    this.returnSingleComponent = true;
  }

  determineDownstreamComponents() {
    let component = this.dependencyHandler._components[this.componentName];

    if (!component) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.componentName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.componentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.componentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    return {
      success: true,
      downstreamComponentNames: [this.componentName],
      downstreamComponentTypes: [component.componentType],
    };
  }

  deleteFromUpdateTriggers() {
    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }
}

dependencyTypeArray.push(MultipleStateVariablesDependency);

class StateVariableComponentTypeDependency extends StateVariableDependency {
  static dependencyType = 'stateVariableComponentType';

  getValue({ verbose = false } = {}) {
    let value = [];
    let changes = {};

    if (this.staticValue) {
      value = [this.staticValue];
    } else {
      if (this.componentIdentitiesChanged) {
        changes.componentIdentitiesChanged = true;
        this.componentIdentitiesChanged = false;
      }

      if (this.downstreamComponentNames.length === 1) {
        let componentName = this.downstreamComponentNames[0];
        let depComponent = this.dependencyHandler.components[componentName];

        let componentObj = {
          componentName: depComponent.componentName,
          componentType: depComponent.componentType,
        };

        componentObj.stateValues = {};

        let originalVarName = this.originalDownstreamVariableNames[0];
        let mappedVarName = this.mappedDownstreamVariableNamesByComponent[0][0];

        let nameForOutput = this.useMappedVariableNames
          ? mappedVarName
          : originalVarName;

        if (!this.variablesOptional || mappedVarName in depComponent.state) {
          if (!depComponent.state[mappedVarName].deferred) {
            let stateVarObj = depComponent.state[mappedVarName];
            // call getter to make sure component type is set
            stateVarObj.value;
            componentObj.stateValues[nameForOutput] = stateVarObj.componentType;

            if (stateVarObj.isArray) {
              // if array, use componentType from wrapping components, if exist
              if (
                stateVarObj.wrappingComponents &&
                stateVarObj.wrappingComponents.length > 0
              ) {
                let wrapCT =
                  stateVarObj.wrappingComponents[
                    stateVarObj.wrappingComponents.length - 1
                  ][0];
                if (typeof wrapCT === 'object') {
                  wrapCT = wrapCT.componentType;
                }
                componentObj.stateValues[nameForOutput] = wrapCT;
              }
            }

            if (this.valuesChanged[0][mappedVarName].changed) {
              if (!changes.valuesChanged) {
                changes.valuesChanged = {};
              }
              if (!changes.valuesChanged[0]) {
                changes.valuesChanged[0] = {};
              }
              changes.valuesChanged[0][nameForOutput] =
                this.valuesChanged[0][mappedVarName];
            }
            this.valuesChanged[0][mappedVarName] = {};

            let hasVariableComponentType = stateVarObj.hasVariableComponentType;
            if (!hasVariableComponentType && stateVarObj.isArrayEntry) {
              let arrayStateVarObj =
                depComponent.state[stateVarObj.arrayStateVariable];
              hasVariableComponentType =
                arrayStateVarObj.hasVariableComponentType;
            }
            if (!hasVariableComponentType) {
              // since this value won't change,
              // remove the downstream dependency
              // and create static value
              this.staticValue = componentObj;
              this.removeDownstreamComponent({
                indexToRemove: 0,
                recordChange: false,
              });
            }
          }
        }

        value = [componentObj];
      }
    }

    if (!verbose) {
      if (this.returnSingleVariableValue) {
        if (value.length === 1) {
          value = value[0];
          let stateVariables = Object.keys(value.stateValues);
          if (
            changes.valuesChanged &&
            changes.valuesChanged[0] &&
            changes.valuesChanged[0][0]
          ) {
            changes.valuesChanged = changes.valuesChanged[0][0];
          }

          if (stateVariables.length === 1) {
            value = value.stateValues[stateVariables[0]];
          } else {
            value = null;
          }
        } else {
          value = null;
        }
      } else if (this.returnSingleComponent) {
        if (value.length === 1) {
          value = value[0];
          if (changes.valuesChanged && changes.valuesChanged[0]) {
            changes.valuesChanged = changes.valuesChanged[0];
          }
        } else {
          value = null;
        }
      }
    }

    if (!this.doNotProxy && value !== null && typeof value === 'object') {
      value = new Proxy(value, readOnlyProxyHandler);
    }

    return { value, changes, usedDefault: false };
  }
}

dependencyTypeArray.push(StateVariableComponentTypeDependency);

class StateVariableArraySizeDependency extends StateVariableDependency {
  static dependencyType = 'stateVariableArraySize';

  static convertToArraySize = true;
}

dependencyTypeArray.push(StateVariableArraySizeDependency);

class RecursiveDependencyValuesDependency extends Dependency {
  static dependencyType = 'recursiveDependencyValues';

  setUpParameters() {
    if (this.definition.componentName) {
      this.componentName = this.definition.componentName;
      this.specifiedComponentName = this.componentName;
    } else {
      this.componentName = this.upstreamComponentName;
    }

    if (this.definition.variableNames === undefined) {
      throw Error(
        `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: variableNames is not defined`,
      );
    }

    this.startingVariableNames = this.definition.variableNames;

    this.originalVariablesByComponent = true;

    this.includeImmediateValueWithValue =
      this.definition.includeImmediateValueWithValue;

    this.variablesOptional = true;
  }

  determineDownstreamComponents() {
    this.missingComponents = [];
    this.originalDownstreamVariableNamesByComponent = [];

    let result = this.getRecursiveDependencyVariables({
      componentName: this.componentName,
      variableNames: this.startingVariableNames,
    });

    if (!result.success) {
      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    let downstreamComponentNames = [];
    let downstreamComponentTypes = [];

    for (let componentName in result.components) {
      downstreamComponentNames.push(componentName);
      downstreamComponentTypes.push(
        result.components[componentName].componentType,
      );
      this.originalDownstreamVariableNamesByComponent.push(
        result.components[componentName].variableNames,
      );
    }

    return {
      success: true,
      downstreamComponentNames,
      downstreamComponentTypes,
    };
  }

  getRecursiveDependencyVariables({
    componentName,
    variableNames,
    components = {},
  }) {
    let component = this.dependencyHandler._components[componentName];

    if (!component) {
      if (!this.missingComponents.includes(componentName)) {
        let dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers
            .dependenciesMissingComponentBySpecifiedName[componentName];
        if (!dependenciesMissingComponent) {
          dependenciesMissingComponent =
            this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
              componentName
            ] = [];
        }
        if (!dependenciesMissingComponent.includes(this)) {
          dependenciesMissingComponent.push(this);
        }
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: componentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
      };
    }

    if (
      this.includeImmediateValueWithValue &&
      variableNames.includes('value') &&
      !variableNames.includes('immediateValue') &&
      'immediateValue' in component.state
    ) {
      variableNames = [...variableNames, 'immediateValue'];
    }

    let thisComponentObj = components[componentName];
    if (!thisComponentObj) {
      thisComponentObj = components[componentName] = {
        componentName,
        componentType: component.componentType,
        variableNames: [],
      };
    }

    let triggersForComponent =
      this.dependencyHandler.updateTriggers
        .dependenciesBasedOnDependenciesOfStateVariables[componentName];
    if (!triggersForComponent) {
      triggersForComponent =
        this.dependencyHandler.updateTriggers.dependenciesBasedOnDependenciesOfStateVariables[
          componentName
        ] = {};
    }

    for (let varName of variableNames) {
      if (!thisComponentObj.variableNames.includes(varName)) {
        thisComponentObj.variableNames.push(varName);

        let triggersForVarName = triggersForComponent[varName];
        if (!triggersForVarName) {
          triggersForVarName = triggersForComponent[varName] = [];
        }
        if (!triggersForVarName.includes(this)) {
          triggersForVarName.push(this);
        }

        let stateVarObj = component.state[varName];

        if (stateVarObj) {
          if (!stateVarObj.isResolved) {
            for (let vName of this.upstreamVariableNames) {
              this.dependencyHandler.addBlocker({
                blockerComponentName: componentName,
                blockerType: 'stateVariable',
                blockerStateVariable: varName,
                componentNameBlocked: this.upstreamComponentName,
                typeBlocked: 'recalculateDownstreamComponents',
                stateVariableBlocked: vName,
                dependencyBlocked: this.dependencyName,
              });

              this.dependencyHandler.addBlocker({
                blockerComponentName: this.upstreamComponentName,
                blockerType: 'recalculateDownstreamComponents',
                blockerStateVariable: vName,
                blockerDependency: this.dependencyName,
                componentNameBlocked: this.upstreamComponentName,
                typeBlocked: 'stateVariable',
                stateVariableBlocked: vName,
              });
            }

            return { success: false };
          }

          let downDeps =
            this.dependencyHandler.downstreamDependencies[
              component.componentName
            ][varName];

          for (let dependencyName in downDeps) {
            let dep = downDeps[dependencyName];
            for (let [cInd, cName] of dep.downstreamComponentNames.entries()) {
              let varNames = [];
              if (
                dep.originalDownstreamVariableNames.length > 0 ||
                dep.originalVariablesByComponent
              ) {
                varNames = dep.mappedDownstreamVariableNamesByComponent[cInd];
              }
              let result = this.getRecursiveDependencyVariables({
                componentName: cName,
                variableNames: varNames,
                components,
              });

              if (!result.success) {
                return { success: false };
              }
            }
          }
        }
      }
    }

    return {
      success: true,
      components,
    };
  }

  getValue() {
    this.gettingValue = true;
    this.varsWithUpdatedDeps = {};

    let result;
    let accumulatedVarsWithUpdatedDeps = {};

    let foundNewUpdated = true;

    while (foundNewUpdated) {
      foundNewUpdated = false;
      result = super.getValue();

      for (let cName in this.varsWithUpdatedDeps) {
        let compAccumulated = accumulatedVarsWithUpdatedDeps[cName];
        if (!compAccumulated) {
          compAccumulated = accumulatedVarsWithUpdatedDeps[cName] = [];
        }
        for (let vName of this.varsWithUpdatedDeps[cName]) {
          if (!compAccumulated.includes(vName)) {
            compAccumulated.push(vName);
            foundNewUpdated = true;
          }
        }
      }

      if (foundNewUpdated) {
        this.recalculateDownstreamComponents();
      }
    }

    this.gettingValue = false;

    return result;
  }

  deleteFromUpdateTriggers() {
    for (let componentName of this.missingComponents) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[componentName];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }
}

dependencyTypeArray.push(RecursiveDependencyValuesDependency);

class ComponentIdentityDependency extends Dependency {
  static dependencyType = 'componentIdentity';

  setUpParameters() {
    if (this.definition.componentName) {
      this.componentName = this.definition.componentName;
      this.specifiedComponentName = this.componentName;
    } else {
      this.componentName = this.upstreamComponentName;
    }

    this.returnSingleComponent = true;
  }

  determineDownstreamComponents() {
    let component = this.dependencyHandler._components[this.componentName];

    if (!component) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.componentName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.componentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.componentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    return {
      success: true,
      downstreamComponentNames: [this.componentName],
      downstreamComponentTypes: [component.componentType],
    };
  }

  deleteFromUpdateTriggers() {
    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }
}

dependencyTypeArray.push(ComponentIdentityDependency);

class AttributeComponentDependency extends Dependency {
  static dependencyType = 'attributeComponent';

  setUpParameters() {
    if (this.definition.parentName) {
      this.parentName = this.definition.parentName;
      this.specifiedComponentName = this.parentName;
    } else {
      this.parentName = this.upstreamComponentName;
    }

    if (this.definition.variableNames) {
      if (!Array.isArray(this.definition.variableNames)) {
        throw Error(
          `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: variableNames must be an array`,
        );
      }
      this.originalDownstreamVariableNames = this.definition.variableNames;
    } else {
      this.originalDownstreamVariableNames = [];
    }

    this.attributeName = this.definition.attributeName;

    this.returnSingleComponent = true;
  }

  determineDownstreamComponents() {
    let parent = this.dependencyHandler._components[this.parentName];

    if (!parent) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.parentName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.parentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.parentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    let attrComp = parent.attributes[this.attributeName];

    if (attrComp && attrComp.componentType) {
      // have an attribute that is a component
      return {
        success: true,
        downstreamComponentNames: [attrComp.componentName],
        downstreamComponentTypes: [attrComp.componentType],
      };
    } else {
      return {
        success: true,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }
  }

  deleteFromUpdateTriggers() {
    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }
}

dependencyTypeArray.push(AttributeComponentDependency);

class ChildDependency extends Dependency {
  static dependencyType = 'child';

  setUpParameters() {
    if (this.definition.parentName) {
      this.parentName = this.definition.parentName;
      this.specifiedComponentName = this.parentName;
    } else {
      this.parentName = this.upstreamComponentName;
    }

    if (this.definition.variableNames) {
      if (!Array.isArray(this.definition.variableNames)) {
        throw Error(
          `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: variableNames must be an array`,
        );
      }
      this.originalDownstreamVariableNames = this.definition.variableNames;
    } else {
      this.originalDownstreamVariableNames = [];
    }

    this.childLogicName = this.definition.childLogicName;

    if (this.definition.childIndices !== undefined) {
      this.childIndices = this.definition.childIndices.map((x) => Number(x));
    }

    this.skipComponentNames = this.definition.skipComponentNames;
    this.skipPlaceholders = this.definition.skipPlaceholders;
  }

  determineDownstreamComponents() {
    // console.log(`determine downstream components of ${this.dependencyName} of ${this.representativeStateVariable} of ${this.upstreamComponentName}`)

    let parent = this.dependencyHandler._components[this.parentName];

    if (!parent) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.parentName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.parentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.parentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    let childDependencies =
      this.dependencyHandler.updateTriggers.childDependenciesByParent[
        this.parentName
      ];
    if (!childDependencies) {
      childDependencies =
        this.dependencyHandler.updateTriggers.childDependenciesByParent[
          this.parentName
        ] = [];
    }
    if (!childDependencies.includes(this)) {
      childDependencies.push(this);
    }

    let activeChildrenIndices = parent.childLogic.returnMatches(
      this.definition.childLogicName,
    );
    if (activeChildrenIndices === undefined) {
      throw Error(
        `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: childLogicName ${this.definition.childLogicName} does not exist.`,
      );
    }

    // if childIndices specified, filter out just those indices
    // Note: indices are relative to the selected ones
    // (not actual index in activeChildren)
    // so filter uses the i argument, not the x argument
    if (this.childIndices) {
      activeChildrenIndices = activeChildrenIndices.filter((x, i) =>
        this.childIndices.includes(i),
      );
    }

    if (!parent.childLogicSatisfied) {
      let canProceedWithPlaceholders = false;

      if (parent.childLogicSatisfiedWithPlaceholders) {
        if (this.skipPlaceholders) {
          activeChildrenIndices = activeChildrenIndices.filter(
            (x) => !parent.placeholderActiveChildrenIndices.includes(x),
          );
        }

        if (
          this.skipComponentNames &&
          this.originalDownstreamVariableNames.length === 0
        ) {
          // if skipping componentName and there are no variable names,
          // then only information to get is componentTypes of children,
          // which one can do even with placeholders
          canProceedWithPlaceholders = true;
        } else {
          // if need to include componentNames or variables,
          // then we can proceed only if we aren't asking for any placeholder children

          canProceedWithPlaceholders = activeChildrenIndices.every(
            (x) => !parent.placeholderActiveChildrenIndices.includes(x),
          );
        }
      }

      if (!canProceedWithPlaceholders) {
        let haveCompositesNotReady =
          parent.unexpandedCompositesNotReady.length > 0;

        if (
          !haveCompositesNotReady &&
          parent.unexpandedCompositesReady.length > 0
        ) {
          // could make progress just by expanding composites and
          // then recalculating the downstream components,
          for (let varName of this.upstreamVariableNames) {
            this.dependencyHandler.addBlocker({
              blockerComponentName: this.parentName,
              blockerType: 'childLogic',
              blockerStateVariable: varName, // add so that can have different blockers of child logic
              componentNameBlocked: this.upstreamComponentName,
              typeBlocked: 'recalculateDownstreamComponents',
              stateVariableBlocked: varName,
              dependencyBlocked: this.dependencyName,
            });

            this.dependencyHandler.addBlocker({
              blockerComponentName: this.upstreamComponentName,
              blockerType: 'recalculateDownstreamComponents',
              blockerStateVariable: varName,
              blockerDependency: this.dependencyName,
              componentNameBlocked: this.upstreamComponentName,
              typeBlocked: 'stateVariable',
              stateVariableBlocked: varName,
            });
          }

          return {
            success: false,
            downstreamComponentNames: [],
            downstreamComponentTypes: [],
          };
        }

        if (haveCompositesNotReady) {
          for (let varName of this.upstreamVariableNames) {
            this.dependencyHandler.addBlocker({
              blockerComponentName: this.parentName,
              blockerType: 'childLogic',
              blockerStateVariable: varName, // add so that can have different blockers of child logic
              componentNameBlocked: this.upstreamComponentName,
              typeBlocked: 'recalculateDownstreamComponents',
              stateVariableBlocked: varName,
              dependencyBlocked: this.dependencyName,
            });

            this.dependencyHandler.addBlocker({
              blockerComponentName: this.upstreamComponentName,
              blockerType: 'recalculateDownstreamComponents',
              blockerStateVariable: varName,
              blockerDependency: this.dependencyName,
              componentNameBlocked: this.upstreamComponentName,
              typeBlocked: 'stateVariable',
              stateVariableBlocked: varName,
            });
          }

          // mark that child logic is blocked by
          // the readyToExpandWhenResolved state variable of the composites not ready

          for (let compositeNotReady of parent.unexpandedCompositesNotReady) {
            if (parent.childLogicSatisfiedWithPlaceholders) {
              // if child logic is satisifed with placeholders,
              // then we don't need to expand any composites
              // that don't overlap with the active children indices we need
              let inds =
                parent.placeholderActiveChildrenIndicesByComposite[
                  compositeNotReady
                ];
              if (inds.every((x) => !activeChildrenIndices.includes(x))) {
                continue;
              }
            }

            for (let varName of this.upstreamVariableNames) {
              this.dependencyHandler.addBlocker({
                blockerComponentName: compositeNotReady,
                blockerType: 'stateVariable',
                blockerStateVariable: 'readyToExpandWhenResolved',
                componentNameBlocked: this.upstreamComponentName,
                typeBlocked: 'childLogic',
                stateVariableBlocked: varName, // add to just block for this variable
              });
            }
          }

          return {
            success: false,
            downstreamComponentNames: [],
            downstreamComponentTypes: [],
          };
        }
      }
    }

    let activeChildrenMatched = activeChildrenIndices.map(
      (x) => parent.activeChildren[x],
    );
    let downstreamComponentNames = activeChildrenMatched.map((x, i) =>
      x.componentName ? x.componentName : `__placeholder_${i}`,
    );

    return {
      success: true,
      downstreamComponentNames,
      downstreamComponentTypes: activeChildrenMatched.map(
        (x) => x.componentType,
      ),
    };
  }

  getValue({ verbose } = {}) {
    let result = super.getValue({ verbose, skipProxy: true });

    for (let [ind, compositeInd] of this.compositeIndices.entries()) {
      if (compositeInd !== undefined) {
        result.value[ind].compositeInd = compositeInd;
      }
    }

    if (!this.doNotProxy) {
      result.value = new Proxy(result.value, readOnlyProxyHandler);
    }

    return result;
  }

  deleteFromUpdateTriggers() {
    let childDeps =
      this.dependencyHandler.updateTriggers.childDependenciesByParent[
        this.parentName
      ];
    if (childDeps) {
      let ind = childDeps.indexOf(this);
      if (ind !== -1) {
        childDeps.splice(ind, 1);
      }
    }

    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }

  onDownstreamComponentChange() {
    this.compositeIndices = [];

    if (this.downstreamComponentNames.length > 0) {
      let parent = this.dependencyHandler._components[this.parentName];

      for (let [
        definingInd,
        definingChild,
      ] of parent.definingChildren.entries()) {
        if (
          this.dependencyHandler.componentInfoObjects.isInheritedComponentType({
            inheritedComponentType: definingChild.componentType,
            baseComponentType: '_composite',
          })
        ) {
          if (definingChild.isExpanded) {
            let recursiveReplacementAdapterNames =
              definingChild.stateValues.fullRecursiveReplacements
                .map((x) => this.dependencyHandler.components[x.componentName])
                .map((x) => (x.adapterUsed ? x.adapterUsed : x))
                .map((x) => x.componentName);

            for (let [
              ind,
              childName,
            ] of this.downstreamComponentNames.entries()) {
              if (recursiveReplacementAdapterNames.includes(childName)) {
                this.compositeIndices[ind] = definingInd;
              }
            }
          }
        }
      }
    }
  }
}

dependencyTypeArray.push(ChildDependency);

class DescendantDependency extends Dependency {
  static dependencyType = 'descendant';

  setUpParameters() {
    if (this.definition.ancestorName) {
      this.ancestorName = this.definition.ancestorName;
      this.specifiedComponentName = this.ancestorName;
    } else {
      this.ancestorName = this.upstreamComponentName;
    }

    if (this.definition.variableNames) {
      if (!Array.isArray(this.definition.variableNames)) {
        throw Error(
          `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: variableNames must be an array`,
        );
      }
      this.originalDownstreamVariableNames = this.definition.variableNames;
    } else {
      this.originalDownstreamVariableNames = [];
    }

    this.componentTypes = this.definition.componentTypes;
    this.recurseToMatchedChildren = this.definition.recurseToMatchedChildren;
    this.useReplacementsForComposites =
      this.definition.useReplacementsForComposites;
    this.includeNonActiveChildren = this.definition.includeNonActiveChildren;
    this.includeAttributeChildren = this.definition.includeAttributeChildren;
    this.skipOverAdapters = this.definition.skipOverAdapters;
    this.ignoreReplacementsOfMatchedComposites =
      this.definition.ignoreReplacementsOfMatchedComposites;
    this.definingChildrenFirst = this.definition.definingChildrenFirst;
  }

  determineDownstreamComponents() {
    // console.log(`deterine downstream components of descendancy dependency ${this.dependencyName} of ${this.representativeStateVariable} of ${this.upstreamComponentName}`)

    let ancestor = this.dependencyHandler._components[this.ancestorName];

    if (!ancestor) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.ancestorName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.ancestorName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.ancestorName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    let descendantDependencies =
      this.dependencyHandler.updateTriggers.descendantDependenciesByAncestor[
        this.ancestorName
      ];
    if (!descendantDependencies) {
      descendantDependencies =
        this.dependencyHandler.updateTriggers.descendantDependenciesByAncestor[
          this.ancestorName
        ] = [];
    }
    if (!descendantDependencies.includes(this)) {
      descendantDependencies.push(this);
    }

    let result = this.gatherUnexpandedComposites(ancestor);

    if (result.haveCompositesNotReady || result.haveUnexpandedCompositeReady) {
      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });

        for (let parentName in result.unexpandedCompositesReadyByParentName) {
          this.dependencyHandler.addBlocker({
            blockerComponentName: parentName,
            blockerType: 'childLogic',
            blockerStateVariable: varName,
            componentNameBlocked: this.upstreamComponentName,
            typeBlocked: 'recalculateDownstreamComponents',
            stateVariableBlocked: varName,
            dependencyBlocked: this.dependencyName,
          });
        }

        for (let parentName in result.unexpandedCompositesNotReadyByParentName) {
          this.dependencyHandler.addBlocker({
            blockerComponentName: parentName,
            blockerType: 'childLogic',
            blockerStateVariable: varName,
            componentNameBlocked: this.upstreamComponentName,
            typeBlocked: 'recalculateDownstreamComponents',
            stateVariableBlocked: varName,
            dependencyBlocked: this.dependencyName,
          });

          for (let compositeNotReady of result
            .unexpandedCompositesNotReadyByParentName[parentName]) {
            this.dependencyHandler.addBlocker({
              blockerComponentName: compositeNotReady,
              blockerType: 'stateVariable',
              blockerStateVariable: 'readyToExpandWhenResolved',
              componentNameBlocked: this.upstreamComponentName,
              typeBlocked: 'childLogic',
              stateVariableBlocked: varName,
            });
          }
        }
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    // if reached this far, then we have expanded all composites
    // or have placeholders that don't impede

    let descendants = gatherDescendants({
      ancestor,
      descendantTypes: this.componentTypes,
      recurseToMatchedChildren: this.recurseToMatchedChildren,
      useReplacementsForComposites: this.useReplacementsForComposites,
      includeNonActiveChildren: this.includeNonActiveChildren,
      skipOverAdapters: this.skipOverAdapters,
      ignoreReplacementsOfMatchedComposites:
        this.ignoreReplacementsOfMatchedComposites,
      definingChildrenFirst: this.definingChildrenFirst,
      componentInfoObjects: this.dependencyHandler.componentInfoObjects,
    });

    return {
      success: true,
      downstreamComponentNames: descendants.map((x) => x.componentName),
      downstreamComponentTypes: descendants.map((x) => x.componentType),
    };
  }

  gatherUnexpandedComposites(component) {
    let unexpandedCompositesReadyByParentName = {};
    let unexpandedCompositesNotReadyByParentName = {};
    let haveUnexpandedCompositeReady = false;
    let haveCompositesNotReady = false;

    // if we don't need componentNames or variables,
    // then gathering a placeholder descendant is fine
    let placeholdersOKForMatchedDescendants =
      this.skipComponentNames &&
      this.originalDownstreamVariableNames.length === 0;

    if (!component.childLogicSatisfied) {
      if (component.childLogicSatisfiedWithPlaceholders) {
        if (component.unexpandedCompositesReady.length > 0) {
          let unexpandedReady =
            this.unexpandedCompositesAdjustedForPlacedholders(
              component.unexpandedCompositesReady,
              placeholdersOKForMatchedDescendants,
            );
          if (unexpandedReady.length > 0) {
            unexpandedCompositesReadyByParentName[component.componentName] =
              unexpandedReady;
            haveUnexpandedCompositeReady = true;
          }
        }
        if (component.unexpandedCompositesNotReady.length > 0) {
          let unexpandedNotReady =
            this.unexpandedCompositesAdjustedForPlacedholders(
              component.unexpandedCompositesNotReady,
              placeholdersOKForMatchedDescendants,
            );
          if (unexpandedNotReady.length > 0) {
            unexpandedCompositesNotReadyByParentName[component.componentName] =
              unexpandedNotReady;
            haveCompositesNotReady = true;
          }
        }
      } else {
        if (component.unexpandedCompositesReady.length > 0) {
          unexpandedCompositesReadyByParentName[component.componentName] =
            component.unexpandedCompositesReady;
          haveUnexpandedCompositeReady = true;
        }
        if (component.unexpandedCompositesNotReady.length > 0) {
          unexpandedCompositesNotReadyByParentName[component.componentName] =
            component.unexpandedCompositesNotReady;
          haveCompositesNotReady = true;
        }
      }
    }

    for (let childName in component.allChildren) {
      let child = component.allChildren[childName].component;
      let result = this.gatherUnexpandedComposites(child);
      if (result.haveUnexpandedCompositeReady) {
        Object.assign(
          unexpandedCompositesReadyByParentName,
          result.unexpandedCompositesReadyByParentName,
        );
        haveUnexpandedCompositeReady = true;
      }
      if (result.haveCompositesNotReady) {
        Object.assign(
          unexpandedCompositesNotReadyByParentName,
          result.unexpandedCompositesNotReadyByParentName,
        );
        haveCompositesNotReady = true;
      }
    }

    return {
      unexpandedCompositesReadyByParentName,
      haveUnexpandedCompositeReady,
      unexpandedCompositesNotReadyByParentName,
      haveCompositesNotReady,
    };
  }

  unexpandedCompositesAdjustedForPlacedholders(
    unexpandedComposites,
    placeholdersOKForMatchedDescendants,
  ) {
    let adjustedUnexpanded = [];
    for (let compositeName of unexpandedComposites) {
      let composite = this.dependencyHandler._components[compositeName];
      let placeholderType = composite.attributes.componentType;

      let matches = this.componentTypes.some((ct) =>
        this.dependencyHandler.componentInfoObjects.isInheritedComponentType({
          inheritedComponentType: placeholderType,
          baseComponentType: ct,
        }),
      );

      if (matches) {
        if (!placeholdersOKForMatchedDescendants) {
          adjustedUnexpanded.push(compositeName);
        }
      } else {
        adjustedUnexpanded.push(compositeName);
      }
    }

    return adjustedUnexpanded;
  }

  deleteFromUpdateTriggers() {
    let descendantDeps =
      this.dependencyHandler.updateTriggers.descendantDependenciesByAncestor[
        this.ancestorName
      ];
    if (descendantDeps) {
      let ind = descendantDeps.indexOf(this);
      if (ind !== -1) {
        descendantDeps.splice(ind, 1);
      }
    }

    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }
}

dependencyTypeArray.push(DescendantDependency);

class ParentDependency extends Dependency {
  static dependencyType = 'parentStateVariable';

  setUpParameters() {
    if (this.definition.childName) {
      this.childName = this.definition.childName;
      this.specifiedComponentName = this.childName;
    } else {
      this.childName = this.upstreamComponentName;
    }

    if (!this.definition.variableName) {
      throw Error(
        `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: must have a variableName`,
      );
    } else {
      this.originalDownstreamVariableNames = [this.definition.variableName];
    }

    if (this.definition.parentComponentType) {
      this.parentComponentType = this.definition.parentComponentType;
    }

    this.returnSingleVariableValue = true;

    // for parent state variable
    // always make variables optional so that don't get error
    // depending on parent (which a component can't control)
    this.variablesOptional = true;
  }

  determineDownstreamComponents() {
    let child = this.dependencyHandler._components[this.childName];

    if (!child) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.childName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.childName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.childName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    if (!child.parentName) {
      return {
        success: true,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    this.parentName = child.parentName;

    let parent = this.dependencyHandler._components[this.parentName];

    if (!parent) {
      // Note: since parent is created after children,
      // will typically hit this condition first time through
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.parentName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.parentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.parentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    if (
      this.parentComponentType &&
      !this.dependencyHandler.componentInfoObjects.isInheritedComponentType({
        inheritedComponentType: parent.componentType,
        baseComponentType: this.parentComponentType,
      })
    ) {
      // parent didn't match specified componentType
      // so don't include parent
      return {
        success: true,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    let parentDependencies =
      this.dependencyHandler.updateTriggers.parentDependenciesByParent[
        this.parentName
      ];
    if (!parentDependencies) {
      parentDependencies =
        this.dependencyHandler.updateTriggers.parentDependenciesByParent[
          this.parentName
        ] = [];
    }
    if (!parentDependencies.includes(this)) {
      parentDependencies.push(this);
    }

    return {
      success: true,
      downstreamComponentNames: [this.parentName],
      downstreamComponentTypes: [parent.componentType],
    };
  }

  deleteFromUpdateTriggers() {
    let parentDeps =
      this.dependencyHandler.updateTriggers.parentDependenciesByParent[
        this.parentName
      ];
    if (parentDeps) {
      let ind = parentDeps.indexOf(this);
      if (ind !== -1) {
        parentDeps.splice(ind, 1);
      }
    }

    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }

    let dependenciesMissingComponent =
      this.dependencyHandler.updateTriggers
        .dependenciesMissingComponentBySpecifiedName[this.parentName];
    if (dependenciesMissingComponent) {
      let ind = dependenciesMissingComponent.indexOf(this);
      if (ind !== -1) {
        dependenciesMissingComponent.splice(ind, 1);
      }
    }
  }
}

dependencyTypeArray.push(ParentDependency);

class AncestorDependency extends Dependency {
  static dependencyType = 'ancestor';

  setUpParameters() {
    if (this.definition.descendantName) {
      this.descendantName = this.definition.descendantName;
      this.specifiedComponentName = this.descendantName;
    } else {
      this.descendantName = this.upstreamComponentName;
    }

    if (this.definition.variableNames) {
      if (!Array.isArray(this.definition.variableNames)) {
        throw Error(
          `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: variableNames must be an array`,
        );
      }
      this.originalDownstreamVariableNames = this.definition.variableNames;
    } else {
      this.originalDownstreamVariableNames = [];
    }

    this.returnSingleComponent = true;

    if (this.definition.componentType) {
      this.componentType = this.definition.componentType;
    }
  }

  determineDownstreamComponents() {
    let descendant = this.dependencyHandler._components[this.descendantName];

    if (!descendant) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.descendantName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.descendantName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.descendantName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    if (
      !(
        this.dependencyHandler.core.documentName in
        this.dependencyHandler._components
      )
    ) {
      // if document hasn't been created yet, then don't match ancestors
      // until have created document

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.dependencyHandler.core.documentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    let ancestorResults = this.findMatchingAncestor(descendant);

    if (ancestorResults.missingComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          ancestorResults.missingComponentName
        ];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            ancestorResults.missingComponentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: ancestorResults.missingComponentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    for (let ancestorName of ancestorResults.ancestorsExamined) {
      let ancestorDependencies =
        this.dependencyHandler.updateTriggers
          .ancestorDependenciesByPotentialAncestor[ancestorName];
      if (!ancestorDependencies) {
        ancestorDependencies =
          this.dependencyHandler.updateTriggers.ancestorDependenciesByPotentialAncestor[
            ancestorName
          ] = [];
      }
      if (!ancestorDependencies.includes(this)) {
        ancestorDependencies.push(this);
      }
    }
    this.ancestorResults = ancestorResults;

    if (ancestorResults.ancestorFound) {
      return {
        success: true,
        downstreamComponentNames: [ancestorResults.ancestorFound.componentName],
        downstreamComponentTypes: [
          ancestorResults.ancestorFound.componentClass.componentType,
        ],
      };
    } else {
      return {
        success: true,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }
  }

  findMatchingAncestor(descendant) {
    let ancestorsExamined = [];

    if (this.componentType) {
      for (let ancestor of descendant.ancestors) {
        let ancestorComponent =
          this.dependencyHandler._components[ancestor.componentName];
        if (!ancestorComponent) {
          return { missingComponentName: ancestor.componentName };
        }

        ancestorsExamined.push(ancestor.componentName);

        if (
          this.dependencyHandler.componentInfoObjects.isInheritedComponentType({
            inheritedComponentType: ancestorComponent.componentType,
            baseComponentType: this.componentType,
          })
        ) {
          return {
            ancestorsExamined,
            ancestorFound: ancestor,
          };
        }
      }

      return { ancestorsExamined };
    }

    if (this.originalDownstreamVariableNames.length === 0) {
      console.warn(
        `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: must specify componentType or variableNames to find ancestor`,
      );
      return { ancestorsExamined };
    }

    // the state variable definition did not prescribe the component type
    // of the ancestor, but it did give the variableNames to match
    // Search all the state variables of the ancestors to find one
    // that has all the requisite state variables

    let variableNames = this.originalDownstreamVariableNames;

    for (let ancestor of descendant.ancestors) {
      let ancestorComponent =
        this.dependencyHandler._components[ancestor.componentName];
      if (!ancestorComponent) {
        return { missingComponentName: ancestor.componentName };
      }

      ancestorsExamined.push(ancestor.componentName);

      let foundAllVarNames = true;
      for (let vName of variableNames) {
        if (
          !(
            vName in ancestorComponent.state ||
            this.dependencyHandler.core.checkIfArrayEntry({
              stateVariable: vName,
              component: ancestorComponent,
            })
          )
        ) {
          foundAllVarNames = false;
          break;
        }
      }
      if (foundAllVarNames) {
        return {
          ancestorsExamined,
          ancestorFound: ancestor,
        };
      }
    }

    return { ancestorsExamined };
  }

  deleteFromUpdateTriggers() {
    for (let ancestorName of this.ancestorResults.ancestorsExamined) {
      let ancestorDeps =
        this.dependencyHandler.updateTriggers
          .ancestorDependenciesByPotentialAncestor[ancestorName];
      if (ancestorDeps) {
        let ind = ancestorDeps.indexOf(this);
        if (ind !== -1) {
          ancestorDeps.splice(ind, 1);
        }
      }
    }

    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }

    if (this.ancestorResults && this.ancestorResults.missingComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.ancestorResults.missingComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }
}

dependencyTypeArray.push(AncestorDependency);

class ReplacementDependency extends Dependency {
  static dependencyType = 'replacement';

  setUpParameters() {
    if (this.definition.compositeName) {
      this.compositeName = this.definition.compositeName;
      this.specifiedComponentName = this.compositeName;
    } else {
      this.compositeName = this.upstreamComponentName;
    }

    if (this.definition.variableNames) {
      if (!Array.isArray(this.definition.variableNames)) {
        throw Error(
          `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: variableNames must be an array`,
        );
      }
      this.originalDownstreamVariableNames = this.definition.variableNames;
    } else {
      this.originalDownstreamVariableNames = [];
    }

    this.recursive = this.definition.recursive;

    this.recurseNonStandardComposites =
      this.definition.recurseNonStandardComposites;

    if (Number.isInteger(this.definition.componentIndex)) {
      this.componentIndex = this.definition.componentIndex;
    }

    this.expandReplacements = true;
  }

  determineDownstreamComponents() {
    let composite = this.dependencyHandler._components[this.compositeName];

    if (!composite) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.compositeName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.compositeName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.compositeName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    if (!composite.isExpanded) {
      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.compositeName,
          blockerType: 'expandComposite',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });
      }

      if (!composite.state.readyToExpandWhenResolved.isResolved) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.compositeName,
          blockerType: 'stateVariable',
          blockerStateVariable: 'readyToExpandWhenResolved',
          componentNameBlocked: this.compositeName,
          typeBlocked: 'expandComposite',
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    this.compositesFound = [this.compositeName];
    let replacements = composite.replacements;

    if (this.recursive) {
      let result =
        this.dependencyHandler.core.recursivelyReplaceCompositesWithReplacements(
          {
            replacements,
            recurseNonStandardComposites: this.recurseNonStandardComposites,
            expandComposites: false,
          },
        );

      if (
        result.unexpandedCompositesNotReady.length > 0 ||
        result.unexpandedCompositesReady.length > 0
      ) {
        for (let varName of this.upstreamVariableNames) {
          this.dependencyHandler.addBlocker({
            blockerComponentName: this.upstreamComponentName,
            blockerType: 'recalculateDownstreamComponents',
            blockerStateVariable: varName,
            blockerDependency: this.dependencyName,
            componentNameBlocked: this.upstreamComponentName,
            typeBlocked: 'stateVariable',
            stateVariableBlocked: varName,
          });

          for (let compositeName of [
            ...result.unexpandedCompositesReady,
            ...result.unexpandedCompositesNotReady,
          ]) {
            this.dependencyHandler.addBlocker({
              blockerComponentName: compositeName,
              blockerType: 'expandComposite',
              componentNameBlocked: this.upstreamComponentName,
              typeBlocked: 'recalculateDownstreamComponents',
              stateVariableBlocked: varName,
              dependencyBlocked: this.dependencyName,
            });
          }
        }

        for (let compositeName of result.unexpandedCompositesNotReady) {
          this.dependencyHandler.addBlocker({
            blockerComponentName: compositeName,
            blockerType: 'stateVariable',
            blockerStateVariable: 'readyToExpandWhenResolved',
            componentNameBlocked: compositeName,
            typeBlocked: 'expandComposite',
          });
        }

        return {
          success: false,
          downstreamComponentNames: [],
          downstreamComponentTypes: [],
        };
      }

      replacements = result.newReplacements;
      this.compositesFound.push(...result.compositesFound);
    }

    for (let cName of this.compositesFound) {
      let replacementDependencies =
        this.dependencyHandler.updateTriggers
          .replacementDependenciesByComposite[cName];
      if (!replacementDependencies) {
        replacementDependencies =
          this.dependencyHandler.updateTriggers.replacementDependenciesByComposite[
            cName
          ] = [];
      }
      if (!replacementDependencies.includes(this)) {
        replacementDependencies.push(this);
      }
    }

    if (this.componentIndex !== undefined) {
      let theReplacement = replacements[this.componentIndex - 1];
      if (theReplacement) {
        replacements = [theReplacement];
      } else {
        replacements = [];
      }
    }

    return {
      success: true,
      downstreamComponentNames: replacements.map((x) => x.componentName),
      downstreamComponentTypes: replacements.map((x) => x.componentType),
    };
  }

  deleteFromUpdateTriggers() {
    if (this.compositesFound) {
      for (let compositeName of this.compositesFound) {
        let replacementDeps =
          this.dependencyHandler.updateTriggers
            .replacementDependenciesByComposite[compositeName];
        if (replacementDeps) {
          let ind = replacementDeps.indexOf(this);
          if (ind !== -1) {
            replacementDeps.splice(ind, 1);
          }
        }
      }
    }

    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }
}

dependencyTypeArray.push(ReplacementDependency);

class SourceCompositeDependency extends Dependency {
  static dependencyType = 'sourceCompositeStateVariable';

  setUpParameters() {
    if (this.definition.replacementName) {
      this.replacementName = this.definition.replacementName;
      this.specifiedComponentName = this.replacementName;
    } else {
      this.replacementName = this.upstreamComponentName;
    }

    if (!this.definition.variableName) {
      throw Error(
        `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: must have a variableName`,
      );
    } else {
      this.originalDownstreamVariableNames = [this.definition.variableName];
    }

    this.returnSingleVariableValue = true;

    // for source composite state variable
    // always make variables optional so that don't get error
    // depending on source composite (which a component can't control)
    this.variablesOptional = true;
  }

  determineDownstreamComponents() {
    let replacement = this.dependencyHandler._components[this.replacementName];

    if (!replacement) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.replacementName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.replacementName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.replacementName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    if (!replacement.replacementOf) {
      return {
        success: true,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    let sourceComposite = replacement.replacementOf;

    return {
      success: true,
      downstreamComponentNames: [sourceComposite.componentName],
      downstreamComponentTypes: [sourceComposite.componentType],
    };
  }

  deleteFromUpdateTriggers() {
    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }
}

dependencyTypeArray.push(SourceCompositeDependency);

class AdapterSourceDependency extends Dependency {
  static dependencyType = 'adapterSourceDependency';

  setUpParameters() {
    if (this.definition.componentName) {
      this.componentName = this.definition.componentName;
      this.specifiedComponentName = this.componentName;
    } else {
      this.componentName = this.upstreamComponentName;
    }

    if (!this.definition.variableName) {
      throw Error(
        `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: must have a variableName`,
      );
    } else {
      this.originalDownstreamVariableNames = [this.definition.variableName];
    }

    this.returnSingleVariableValue = true;

    // for source composite state variable
    // always make variables optional so that don't get error
    // depending on source composite (which a component can't control)
    this.variablesOptional = true;
  }

  determineDownstreamComponents() {
    let component = this.dependencyHandler._components[this.componentName];

    if (!component) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.componentName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.componentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.componentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    if (!component.adaptedFrom) {
      return {
        success: true,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    let sourceComposite = component.adaptedFrom;

    return {
      success: true,
      downstreamComponentNames: [sourceComposite.componentName],
      downstreamComponentTypes: [sourceComposite.componentType],
    };
  }

  deleteFromUpdateTriggers() {
    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }
}

dependencyTypeArray.push(AdapterSourceDependency);

class CountAmongSiblingsDependency extends Dependency {
  static dependencyType = 'countAmongSiblingsOfSameType';

  setUpParameters() {
    if (this.definition.componentName) {
      this.componentName = this.definition.componentName;
      this.specifiedComponentName = this.componentName;
    } else {
      this.componentName = this.upstreamComponentName;
    }
  }

  determineDownstreamComponents() {
    let component = this.dependencyHandler._components[this.componentName];

    if (!component) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.componentName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.componentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.componentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    if (!component.parentName) {
      console.warn(
        `component ${this.componentName} does not have a parent for state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}.`,
      );
      return {
        success: true,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    this.parentName = component.parentName;
    let parent = this.dependencyHandler._components[this.parentName];

    if (!parent) {
      // Note: since parent is created after children,
      // will typically hit this condition first time through
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.parentName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.parentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.parentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    let childDependencies =
      this.dependencyHandler.updateTriggers.childDependenciesByParent[
        this.parentName
      ];
    if (!childDependencies) {
      childDependencies =
        this.dependencyHandler.updateTriggers.childDependenciesByParent[
          this.parentName
        ] = [];
    }
    if (!childDependencies.includes(this)) {
      childDependencies.push(this);
    }

    if (!parent.childLogicSatisfied) {
      let canProceedWithPlaceholders =
        parent.childLogicSatisfiedWithPlaceholders;

      if (!canProceedWithPlaceholders) {
        let haveCompositesNotReady =
          parent.unexpandedCompositesNotReady.length > 0;

        if (
          !haveCompositesNotReady &&
          parent.unexpandedCompositesReady.length > 0
        ) {
          // could make progress just by expanding composites and
          // then recalculating the downstream components
          for (let varName of this.upstreamVariableNames) {
            this.dependencyHandler.addBlocker({
              blockerComponentName: this.parentName,
              blockerType: 'childLogic',
              blockerStateVariable: varName, // add so that can have different blockers of child logic
              componentNameBlocked: this.upstreamComponentName,
              typeBlocked: 'recalculateDownstreamComponents',
              stateVariableBlocked: varName,
              dependencyBlocked: this.dependencyName,
            });

            this.dependencyHandler.addBlocker({
              blockerComponentName: this.upstreamComponentName,
              blockerType: 'recalculateDownstreamComponents',
              blockerStateVariable: varName,
              blockerDependency: this.dependencyName,
              componentNameBlocked: this.upstreamComponentName,
              typeBlocked: 'stateVariable',
              stateVariableBlocked: varName,
            });
          }

          return {
            success: false,
            downstreamComponentNames: [],
            downstreamComponentTypes: [],
          };
        }

        if (haveCompositesNotReady) {
          for (let varName of this.upstreamVariableNames) {
            this.dependencyHandler.addBlocker({
              blockerComponentName: this.parentName,
              blockerType: 'childLogic',
              blockerStateVariable: varName, // add so that can have different blockers of child logic
              componentNameBlocked: this.upstreamComponentName,
              typeBlocked: 'recalculateDownstreamComponents',
              stateVariableBlocked: varName,
              dependencyBlocked: this.dependencyName,
            });

            this.dependencyHandler.addBlocker({
              blockerComponentName: this.upstreamComponentName,
              blockerType: 'recalculateDownstreamComponents',
              blockerStateVariable: varName,
              blockerDependency: this.dependencyName,
              componentNameBlocked: this.upstreamComponentName,
              typeBlocked: 'stateVariable',
              stateVariableBlocked: varName,
            });
          }

          // mark that child logic is blocked by
          // the readyToExpandWhenResolved state variable of the composites not ready

          for (let compositeNotReady of parent.unexpandedCompositesNotReady) {
            for (let varName of this.upstreamVariableNames) {
              this.dependencyHandler.addBlocker({
                blockerComponentName: compositeNotReady,
                blockerType: 'stateVariable',
                blockerStateVariable: 'readyToExpandWhenResolved',
                componentNameBlocked: this.upstreamComponentName,
                typeBlocked: 'childLogic',
                stateVariableBlocked: varName, // add to just block for this variable
              });
            }
          }

          return {
            success: false,
            downstreamComponentNames: [],
            downstreamComponentTypes: [],
          };
        }
      }
    }

    // TODO: do we need this to actually depend on siblings?
    // Or is the update trigger enough to handle all needed updates?
    return {
      success: true,
      downstreamComponentNames: parent.activeChildren.map(
        (x) => x.componentName,
      ),
      downstreamComponentTypes: parent.activeChildren.map(
        (x) => x.componentType,
      ),
    };
  }

  deleteFromUpdateTriggers() {
    let childDeps =
      this.dependencyHandler.updateTriggers.childDependenciesByParent[
        this.parentName
      ];
    if (childDeps) {
      let ind = childDeps.indexOf(this);
      if (ind !== -1) {
        childDeps.splice(ind, 1);
      }
    }

    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }

    let dependenciesMissingComponent =
      this.dependencyHandler.updateTriggers
        .dependenciesMissingComponentBySpecifiedName[this.parentName];
    if (dependenciesMissingComponent) {
      let ind = dependenciesMissingComponent.indexOf(this);
      if (ind !== -1) {
        dependenciesMissingComponent.splice(ind, 1);
      }
    }
  }

  getValue() {
    let childComponentType =
      this.dependencyHandler.components[this.upstreamComponentName]
        .componentType;
    let childrenOfSameType = this.dependencyHandler.components[
      this.parentName
    ].activeChildren.filter((x) => x.componentType === childComponentType);
    let value =
      childrenOfSameType
        .map((x) => x.componentName)
        .indexOf(this.upstreamComponentName) + 1;

    // don't need changes, as it is changed directly from core
    // and then upstream variables are marked as changed
    return { value, changes: {} };
  }
}

dependencyTypeArray.push(CountAmongSiblingsDependency);

class TargetComponentDependency extends Dependency {
  static dependencyType = 'targetComponent';

  setUpParameters() {
    let component =
      this.dependencyHandler._components[this.upstreamComponentName];

    this.tName = component.doenetAttributes.tName;

    if (this.tName) {
      this.targetComponentName = this.specifiedComponentName =
        component.doenetAttributes.fullTName;
    }

    this.returnSingleComponent = true;
  }

  determineDownstreamComponents() {
    if (!this.tName) {
      return {
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    let targetComponent =
      this.dependencyHandler._components[this.targetComponentName];

    if (!targetComponent) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.targetComponentName
        ];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.targetComponentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.targetComponentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    return {
      success: true,
      downstreamComponentNames: [this.targetComponentName],
      downstreamComponentTypes: [targetComponent.componentType],
    };
  }

  deleteFromUpdateTriggers() {
    let dependenciesMissingComponent =
      this.dependencyHandler.updateTriggers
        .dependenciesMissingComponentBySpecifiedName[
        this.specifiedComponentName
      ];
    if (dependenciesMissingComponent) {
      let ind = dependenciesMissingComponent.indexOf(this);
      if (ind !== -1) {
        dependenciesMissingComponent.splice(ind, 1);
      }
    }
  }
}

dependencyTypeArray.push(TargetComponentDependency);

class ExpandTargetNameDependency extends Dependency {
  static dependencyType = 'expandTargetName';

  setUpParameters() {
    this.parentName = this.upstreamComponentName;

    this.tName = this.definition.tName;
  }

  getValue() {
    let parent = this.dependencyHandler._components[this.parentName];
    let parentCreatesNewNamespace = parent.attributes.newNamespace;

    let namespaceStack = this.parentName
      .split('/')
      .map((x) => ({ namespace: x }));

    if (!parentCreatesNewNamespace) {
      namespaceStack = namespaceStack.slice(0, namespaceStack.length - 1);
    }

    let fullTname;

    try {
      fullTname = convertComponentTarget({
        tName: this.tName,
        namespaceStack,
      });
    } catch (e) {
      fullTname = null;
    }

    return {
      value: fullTname,
      changes: {},
    };
  }
}

dependencyTypeArray.push(ExpandTargetNameDependency);

class ValueDependency extends Dependency {
  static dependencyType = 'value';

  setUpParameters() {
    this.value = this.definition.value;
  }

  getValue() {
    return {
      value: this.value,
      changes: {},
    };
  }
}

dependencyTypeArray.push(ValueDependency);

class FlagDependency extends ValueDependency {
  static dependencyType = 'flag';

  setUpParameters() {
    this.flagName = this.definition.flagName;
    this.value = this.dependencyHandler.core.flags[this.flagName];
  }
}

dependencyTypeArray.push(FlagDependency);

class DoenetAttributeDependency extends StateVariableDependency {
  static dependencyType = 'doenetAttribute';

  setUpParameters() {
    this.attributeName = this.definition.attributeName;

    if (this.definition.componentName) {
      this.componentName = this.definition.componentName;
      this.specifiedComponentName = this.componentName;
    } else {
      this.componentName = this.upstreamComponentName;
    }
  }

  getValue() {
    let value = null;
    let changes = {};

    if (this.componentIdentitiesChanged) {
      changes.componentIdentitiesChanged = true;
      this.componentIdentitiesChanged = false;
    }

    if (this.downstreamComponentNames.length === 1) {
      let depComponent =
        this.dependencyHandler.components[this.downstreamComponentNames[0]];

      value = depComponent.doenetAttributes[this.attributeName];
    }

    if (!this.doNotProxy && value !== null && typeof value === 'object') {
      value = new Proxy(value, readOnlyProxyHandler);
    }

    return { value, changes };
  }
}

dependencyTypeArray.push(DoenetAttributeDependency);

class AttributeDependency extends StateVariableDependency {
  static dependencyType = 'attribute';

  setUpParameters() {
    this.attributeName = this.definition.attributeName;

    if (this.definition.componentName) {
      this.componentName = this.definition.componentName;
      this.specifiedComponentName = this.componentName;
    } else {
      this.componentName = this.upstreamComponentName;
    }
  }

  getValue() {
    let value = null;
    let changes = {};

    if (this.componentIdentitiesChanged) {
      changes.componentIdentitiesChanged = true;
      this.componentIdentitiesChanged = false;
    }

    if (this.downstreamComponentNames.length === 1) {
      let depComponent =
        this.dependencyHandler.components[this.downstreamComponentNames[0]];

      value = depComponent.attributes[this.attributeName];
    }

    if (!this.doNotProxy && value !== null && typeof value === 'object') {
      value = new Proxy(value, readOnlyProxyHandler);
    }

    return { value, changes };
  }
}

dependencyTypeArray.push(AttributeDependency);

class SerializedChildrenDependency extends Dependency {
  static dependencyType = 'serializedChildren';

  setUpParameters() {
    if (this.definition.parentName) {
      this.parentName = this.definition.parentName;
      this.specifiedComponentName = this.parentName;
    } else {
      this.parentName = this.upstreamComponentName;
    }
  }

  determineDownstreamComponents() {
    let parent = this.dependencyHandler._components[this.parentName];

    if (!parent) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.parentName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.parentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.parentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    return {
      success: true,
      downstreamComponentNames: [this.parentName],
      downstreamComponentTypes: [parent.componentType],
    };
  }

  getValue() {
    let parent = this.dependencyHandler._components[this.parentName];

    return {
      value: parent.serializedChildren,
      changes: {},
    };
  }

  deleteFromUpdateTriggers() {
    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }
}

dependencyTypeArray.push(SerializedChildrenDependency);

class VariantsDependency extends Dependency {
  static dependencyType = 'variants';

  setUpParameters() {
    if (this.definition.componentName) {
      this.componentName = this.definition.componentName;
      this.specifiedComponentName = this.componentName;
    } else {
      this.componentName = this.upstreamComponentName;
    }
  }

  determineDownstreamComponents() {
    let component = this.dependencyHandler._components[this.componentName];

    if (!component) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.componentName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.componentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.componentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    return {
      success: true,
      downstreamComponentNames: [this.componentName],
      downstreamComponentTypes: [component.componentType],
    };
  }

  getValue() {
    let component = this.dependencyHandler._components[this.componentName];

    return {
      value: component.variants,
      changes: {},
    };
  }

  deleteFromUpdateTriggers() {
    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }
}

dependencyTypeArray.push(VariantsDependency);

class CounterDependency extends Dependency {
  static dependencyType = 'counter';

  setUpParameters() {
    this.counterName = this.definition.counterName;

    this.componentName = this.upstreamComponentName;
  }

  determineDownstreamComponents() {
    let component = this.dependencyHandler._components[this.componentName];

    let counters = component.counters[this.counterName];
    if (!counters) {
      counters = component.counters[this.counterName] = {
        dependencies: [],
        componentList: [],
        value: null,
      };
    }

    if (!counters.dependencies.includes(this)) {
      counters.dependencies.push(this);
    }

    this.dependencyHandler.collateCountersAndPropagateToAncestors(component);

    return {
      success: true,
      downstreamComponentNames: [],
      downstreamComponentTypes: [],
    };
  }

  getValue() {
    let component = this.dependencyHandler._components[this.componentName];

    return {
      value: component.counters[this.counterName].value,
      changes: {},
    };
  }
}

dependencyTypeArray.push(CounterDependency);

class DetermineDependenciesDependency extends Dependency {
  static dependencyType = 'determineDependencies';

  setUpParameters() {
    // this flag will be turned on with mark stale
    // and turned off after dependencies are recalculated
    this.recalculateDependencies = true;

    if (this.definition.componentName) {
      this.componentName = this.definition.componentName;
    } else {
      this.componentName = this.upstreamComponentName;
    }

    if (this.definition.variableNames === undefined) {
      throw Error(
        `Invalid state variable ${this.representativeStateVariable} of ${this.upstreamComponentName}, dependency ${this.dependencyName}: variableNames is not defined`,
      );
    }
    this.originalDownstreamVariableNames = this.definition.variableNames;

    this.returnSingleComponent = true;
  }

  determineDownstreamComponents() {
    // console.log(`deterine downstream components of determine deps dependency ${this.dependencyName} of ${this.representativeStateVariable} of ${this.upstreamComponentName}`)

    let component = this.dependencyHandler._components[this.componentName];

    if (!component) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[this.componentName];
      if (!dependenciesMissingComponent) {
        dependenciesMissingComponent =
          this.dependencyHandler.updateTriggers.dependenciesMissingComponentBySpecifiedName[
            this.componentName
          ] = [];
      }
      if (!dependenciesMissingComponent.includes(this)) {
        dependenciesMissingComponent.push(this);
      }

      for (let varName of this.upstreamVariableNames) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.componentName,
          blockerType: 'componentIdentity',
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'recalculateDownstreamComponents',
          stateVariableBlocked: varName,
          dependencyBlocked: this.dependencyName,
        });

        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'recalculateDownstreamComponents',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }

      return {
        success: false,
        downstreamComponentNames: [],
        downstreamComponentTypes: [],
      };
    }

    for (let varName of this.upstreamVariableNames) {
      this.dependencyHandler.addBlocker({
        blockerComponentName: this.upstreamComponentName,
        blockerType: 'determineDependencies',
        blockerStateVariable: varName,
        blockerDependency: this.dependencyName,
        componentNameBlocked: this.upstreamComponentName,
        typeBlocked: 'stateVariable',
        stateVariableBlocked: varName,
      });
    }

    return {
      success: true,
      downstreamComponentNames: [this.componentName],
      downstreamComponentTypes: [component.componentType],
    };
  }

  deleteFromUpdateTriggers() {
    if (this.specifiedComponentName) {
      let dependenciesMissingComponent =
        this.dependencyHandler.updateTriggers
          .dependenciesMissingComponentBySpecifiedName[
          this.specifiedComponentName
        ];
      if (dependenciesMissingComponent) {
        let ind = dependenciesMissingComponent.indexOf(this);
        if (ind !== -1) {
          dependenciesMissingComponent.splice(ind, 1);
        }
      }
    }
  }

  markStale() {
    let component =
      this.dependencyHandler._components[this.upstreamComponentName];

    for (let varName of this.upstreamVariableNames) {
      if (
        !(
          component &&
          component.state[varName] &&
          component.state[varName].currentlyResolving
        )
      ) {
        this.dependencyHandler.addBlocker({
          blockerComponentName: this.upstreamComponentName,
          blockerType: 'determineDependencies',
          blockerStateVariable: varName,
          blockerDependency: this.dependencyName,
          componentNameBlocked: this.upstreamComponentName,
          typeBlocked: 'stateVariable',
          stateVariableBlocked: varName,
        });
      }
    }
  }
}

dependencyTypeArray.push(DetermineDependenciesDependency);
