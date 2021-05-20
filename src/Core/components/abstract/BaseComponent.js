import ChildLogicClass from '../../ChildLogic';
import readOnlyProxyHandler from '../../ReadOnlyProxyHandler';
import createStateProxyHandler from '../../StateProxyHandler';
import { flattenDeep, mapDeep } from '../../utils/array';
import { deepClone } from '../../utils/deepFunctions';

export default class BaseComponent {
  constructor({
    componentName,
    ancestors,
    serializedComponent,
    definingChildren,
    serializedChildren,
    childLogic,
    attributes,
    stateVariableDefinitions,
    componentInfoObjects,
    coreFunctions,
    flags,
    shadow,
    numerics,
    parentSharedParameters,
    sharedParameters,
  }) {
    this.numerics = numerics;
    this.parentSharedParameters = parentSharedParameters;
    this.sharedParameters = sharedParameters;

    this.componentName = componentName;
    this.ancestors = ancestors;
    this.counters = {};

    this.componentInfoObjects = componentInfoObjects;
    this.coreFunctions = coreFunctions;
    this.flags = flags;

    if (shadow === true) {
      this.isShadow = true;
    }

    this.definingChildren = definingChildren;
    if (this.definingChildren === undefined) {
      this.definingChildren = [];
    }

    this.serializedChildren = serializedChildren;

    this.childLogic = childLogic;

    this.attributes = attributes;

    this.state = {};
    for (let stateVariable in stateVariableDefinitions) {
      // need to separately create a shallow copy of each state variable
      // as state variable definitions of multiple variables could be same object
      this.state[stateVariable] = Object.assign(
        {},
        stateVariableDefinitions[stateVariable],
      );
    }
    this.stateValues = new Proxy(this.state, createStateProxyHandler());

    if (serializedComponent.state) {
      this.potentialEssentialState = new Proxy(
        serializedComponent.state,
        readOnlyProxyHandler,
      );
    }

    this.doenetAttributes = {};
    if (serializedComponent.doenetAttributes !== undefined) {
      Object.assign(
        this.doenetAttributes,
        serializedComponent.doenetAttributes,
      );
    }

    if (serializedComponent.variants !== undefined) {
      this.variants = serializedComponent.variants;
    }
  }

  static componentType = '_base';

  static get rendererType() {
    return this.componentType;
  }

  get componentType() {
    return this.constructor.componentType;
  }

  get rendererType() {
    return this.constructor.rendererType;
  }

  get allPotentialRendererTypes() {
    if (!this.rendererType) {
      return [];
    }

    let allPotentialRendererTypes = [this.rendererType];

    // include any potential renderer type that could be
    // created from a public state variable
    for (let varName in this.state) {
      let stateVarObj = this.state[varName];
      if (stateVarObj.public) {
        let componentTypes = stateVarObj.componentType;
        if (!Array.isArray(componentTypes)) {
          componentTypes = [componentTypes];
        }
        if (stateVarObj.wrappingComponents) {
          componentTypes.push(
            ...flattenDeep(stateVarObj.wrappingComponents).map((x) =>
              typeof x === 'object' ? x.componentType : x,
            ),
          );
        }
        for (let componentType of componentTypes) {
          let componentClass =
            this.componentInfoObjects.allComponentClasses[componentType];
          if (componentClass) {
            let rendererType = componentClass.rendererType;
            if (
              rendererType &&
              !allPotentialRendererTypes.includes(rendererType)
            ) {
              allPotentialRendererTypes.push(rendererType);
            }
          }
        }
      }
    }

    // recurse to all children
    for (let childName in this.allChildren) {
      let child = this.allChildren[childName].component;
      for (let rendererType of child.allPotentialRendererTypes) {
        if (!allPotentialRendererTypes.includes(rendererType)) {
          allPotentialRendererTypes.push(rendererType);
        }
      }
    }

    return allPotentialRendererTypes;
  }

  readOnlyProxyHandler = readOnlyProxyHandler;

  potentialRendererTypesFromSerializedComponents(serializedComponents) {
    let potentialRendererTypes = [];

    for (let comp of serializedComponents) {
      let compClass =
        this.componentInfoObjects.allComponentClasses[comp.componentType];
      let rendererType = compClass.rendererType;
      if (rendererType && !potentialRendererTypes.includes(rendererType)) {
        potentialRendererTypes.push(rendererType);
      }

      if (comp.children) {
        let childRenderTypes =
          this.potentialRendererTypesFromSerializedComponents(comp.children);
        for (let rendererType of childRenderTypes) {
          if (!potentialRendererTypes.includes(rendererType)) {
            potentialRendererTypes.push(rendererType);
          }
        }
      }
    }

    return potentialRendererTypes;
  }

  get childLogicSatisfied() {
    return (
      this.childLogic.logicResult &&
      this.childLogic.logicResult.success &&
      !this.placeholderActiveChildrenIndices
    );
  }

  get childLogicSatisfiedWithPlaceholders() {
    return this.childLogic.logicResult && this.childLogic.logicResult.success;
  }

  static createAttributesObject({ flags = {} } = {}) {
    return {
      hide: {
        createComponentOfType: 'boolean',
        createStateVariable: 'hide',
        defaultValue: false,
        public: true,
      },
      disabled: {
        createComponentOfType: 'boolean',
        createStateVariable: 'disabled',
        defaultValue: flags.readOnly ? true : false,
        public: true,
        forRenderer: true,
        propagateToDescendants: true,
      },
      modifyIndirectly: {
        createComponentOfType: 'boolean',
        createStateVariable: 'modifyIndirectly',
        defaultValue: true,
        public: true,
        propagateToProps: true,
      },
      fixed: {
        createComponentOfType: 'boolean',
        createStateVariable: 'fixed',
        defaultValue: false,
        public: true,
        forRenderer: true,
      },
      styleNumber: {
        createComponentOfType: 'number',
        createStateVariable: 'styleNumber',
        defaultValue: 1,
        public: true,
        propagateToDescendants: true,
      },
      isResponse: {
        createComponentOfType: 'boolean',
        createStateVariable: 'isResponse',
        defaultValue: false,
        public: true,
      },

      newNamespace: {
        createPrimitiveOfType: 'boolean',
      },
    };
  }

  static returnSugarInstructions() {
    return [];
  }

  static returnChildLogic({ componentInfoObjects, components }) {
    let childLogic = new ChildLogicClass({
      parentComponentType: this.componentType,
      componentInfoObjects,
      components,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = {};

    stateVariableDefinitions.hidden = {
      public: true,
      componentType: 'boolean',
      forRenderer: true,
      returnDependencies: () => ({
        hide: {
          dependencyType: 'stateVariable',
          variableName: 'hide',
          variablesOptional: true,
        },
        parentHidden: {
          dependencyType: 'parentStateVariable',
          variableName: 'hidden',
        },
        parentOverrideChildHide: {
          dependencyType: 'parentStateVariable',
          variableName: 'overrideChildHide',
        },
        sourceCompositeHidden: {
          dependencyType: 'sourceCompositeStateVariable',
          variableName: 'hidden',
        },
        adapterSourceHidden: {
          dependencyType: 'adapterSourceDependency',
          variableName: 'hidden',
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          // check === true so null gives false
          hidden:
            dependencyValues.parentHidden === true ||
            dependencyValues.sourceCompositeHidden === true ||
            dependencyValues.adapterSourceHidden === true ||
            (dependencyValues.hide === true &&
              !dependencyValues.parentOverrideChildHide),
        },
      }),
    };

    stateVariableDefinitions.isInactiveCompositeReplacement = {
      defaultValue: false,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          isInactiveCompositeReplacement: {
            variablesToCheck: ['isInactiveCompositeReplacement'],
          },
        },
      }),
      inverseDefinition({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: {
                variableName: 'isInactiveCompositeReplacement',
                value:
                  desiredStateVariableValues.isInactiveCompositeReplacement,
              },
            },
          ],
        };
      },
    };

    return stateVariableDefinitions;
  }

  static returnNormalizedStateVariableDefinitions({
    attributeNames,
    numerics,
  }) {
    // return state variable definitions
    // where have added additionalStateVariablesDefined

    //  add state variable definitions from component class
    let newDefinitions = this.returnStateVariableDefinitions({
      attributeNames,
      numerics,
    });

    if (!newDefinitions) {
      throw Error(
        `Error in state variable definitions of ${this.componentType}: returnStateVariableDefinitions did not return anything`,
      );
    }

    let cleanAdditionalStateVariableDefined = function (
      additionalStateVariablesDefined,
    ) {
      for (let [ind, varObj] of additionalStateVariablesDefined.entries()) {
        if (typeof varObj === 'object') {
          additionalStateVariablesDefined[ind] = varObj.variableName;
        }
      }
    };

    let defAttributesToCopy = [
      'returnDependencies',
      'definition',
      'inverseDefinition',
      'stateVariablesDeterminingDependencies',
      'isArray',
      'nDimensions',
      'returnArraySizeDependencies',
      'returnArraySize',
      'returnArrayDependenciesByKey',
      'arrayDefinitionByKey',
      'inverseArrayDefinitionByKey',
      'basedOnArrayKeyStateVariables',
      'markStale',
      'getPreviousDependencyValuesForMarkStale',
      'determineDependenciesImmediately',
      'createWorkspace',
      'workspace',
    ];

    let stateVariableDefinitions = {};

    for (let varName in newDefinitions) {
      let thisDef = newDefinitions[varName];
      stateVariableDefinitions[varName] = thisDef;

      if (thisDef.createWorkspace) {
        thisDef.workspace = {};
      }

      if (thisDef.additionalStateVariablesDefined) {
        for (let [
          ind,
          otherVarObj,
        ] of thisDef.additionalStateVariablesDefined.entries()) {
          let defCopy = {};
          for (let attr of defAttributesToCopy) {
            if (attr in thisDef) {
              defCopy[attr] = thisDef[attr];
            }
          }
          defCopy.additionalStateVariablesDefined = [
            ...thisDef.additionalStateVariablesDefined,
          ];
          defCopy.additionalStateVariablesDefined[ind] = varName;
          cleanAdditionalStateVariableDefined(
            defCopy.additionalStateVariablesDefined,
          );

          let otherVarName = otherVarObj;

          // if otherVarObj is actually an object (rather than a string)
          // then get variableName and assign other attributes
          // to the copied state variable definition
          if (typeof otherVarObj === 'object') {
            otherVarName = otherVarObj.variableName;
            otherVarObj = Object.assign({}, otherVarObj);
            delete otherVarObj.variableName;
            Object.assign(defCopy, otherVarObj);
          }

          stateVariableDefinitions[otherVarName] = defCopy;
        }

        cleanAdditionalStateVariableDefined(
          thisDef.additionalStateVariablesDefined,
        );
      }
    }

    return stateVariableDefinitions;
  }

  static returnStateVariableInfo({ onlyPublic = false, flags }) {
    let attributeObject = this.createAttributesObject({ flags });

    let stateVariableDescriptions = {};
    let arrayEntryPrefixes = {};
    let aliases = {};

    for (let varName in attributeObject) {
      let componentTypeOverride = attributeObject[varName].componentType;
      stateVariableDescriptions[varName] = {
        componentType: componentTypeOverride ? componentTypeOverride : varName,
        public: true,
      };
    }

    let stateDef = this.returnNormalizedStateVariableDefinitions({
      attributeNames: Object.keys(stateVariableDescriptions),
    });

    for (let varName in stateDef) {
      let theStateDef = stateDef[varName];
      if (theStateDef.isAlias) {
        aliases[varName] = theStateDef.targetVariableName;
        continue;
      }
      if (!onlyPublic || theStateDef.public) {
        stateVariableDescriptions[varName] = {
          componentType: theStateDef.componentType,
          public: theStateDef.public,
          containsComponentNamesToCopy:
            theStateDef.containsComponentNamesToCopy,
        };
        if (theStateDef.isArray) {
          stateVariableDescriptions[varName].isArray = true;
          stateVariableDescriptions[varName].nDimensions =
            theStateDef.nDimensions === undefined ? 1 : theStateDef.nDimensions;
          stateVariableDescriptions[varName].wrappingComponents =
            theStateDef.returnWrappingComponents
              ? theStateDef.returnWrappingComponents()
              : [];
          if (theStateDef.entryPrefixes) {
            for (let prefix of theStateDef.entryPrefixes) {
              arrayEntryPrefixes[prefix] = {
                arrayVariableName: varName,
                nDimensions: theStateDef.returnEntryDimensions
                  ? theStateDef.returnEntryDimensions(prefix)
                  : 1,
                wrappingComponents: theStateDef.returnWrappingComponents
                  ? theStateDef.returnWrappingComponents(prefix)
                  : [],
              };
            }
          }
        }
      }
    }

    return { stateVariableDescriptions, arrayEntryPrefixes, aliases };
  }

  get parentName() {
    if (this.ancestors === undefined || this.ancestors.length === 0) {
      return;
    }
    return this.ancestors[0].componentName;
  }

  // TODO: if resurrect this, it would just be componentNames
  // getParentUpstreamComponents(includeInactive = false) {
  //   const parent = this.parent;
  //   let upstream = Object.values(this.upstreamDependencies)
  //   if (includeInactive !== true) {
  //     upstream = upstream.filter(x => x.inactive !== true);
  //   }
  //   upstream = upstream.map(x => x.component);
  //   if (parent === undefined) {
  //     return upstream;
  //   } else {
  //     return [parent, ...upstream];
  //   }
  // }

  getAllChildrenDownstreamComponentNames(includeInactive = false) {
    const childrenNames = Object.keys(this.allChildren);
    let downstreamNames = Object.keys(this.downstreamDependencies);
    if (includeInactive !== true) {
      downstreamNames = downstreamNames.filter(
        (x) => this.downstreamDependencies[x].inactive !== true,
      );
    }
    return [...childrenNames, ...downstreamNames];
  }

  get allDescendants() {
    let descendants = [];
    for (let name in this.allChildren) {
      let child = this.allChildren[name].component;
      descendants = [...descendants, name, ...child.allDescendants];
    }
    return descendants;
  }

  static useChildrenForReference = true;

  static get stateVariablesShadowedForReference() {
    return [];
  }

  returnSerializeInstructions() {
    return {};
  }

  serialize(parameters = {}) {
    // TODO: this function is converted only for the case with the parameter
    // forCopy set

    // TODO: not serializing attribute children (as don't need them with forCopy)

    let includeDefiningChildren = true;
    let stateVariablesToInclude = [];

    if (parameters.forCopy) {
      includeDefiningChildren = true; //this.constructor.useChildrenForReference;
    } else {
      let instructions = this.returnSerializeInstructions();
      if (instructions.skipChildren) {
        includeDefiningChildren = false;
      }
      if (instructions.stateVariables) {
        stateVariablesToInclude = instructions.stateVariables;
      }
    }

    let serializedComponent = {
      componentType: this.componentType,
    };

    let serializedChildren = [];

    if (includeDefiningChildren) {
      for (let child of this.definingChildren) {
        serializedChildren.push(child.serialize(parameters));
      }

      if (this.serializedChildren !== undefined) {
        for (let child of this.serializedChildren) {
          serializedChildren.push(
            this.copySerializedComponent({
              serializedComponent: child,
              parameters: parameters,
            }),
          );
        }
      }

      if (serializedChildren.length > 0) {
        serializedComponent.children = serializedChildren;
      }
    }

    let attributesObject = this.constructor.createAttributesObject({
      flags: this.flags,
    });

    serializedComponent.attributes = {};

    for (let attr in this.attributes) {
      let attrVal = this.attributes[attr];
      if (attrVal.componentType) {
        // only copy attribute components if attributes object specifies
        let attrInfo = attributesObject[attr];
        if (attrInfo.copyComponentOnReference) {
          serializedComponent.attributes[attr] = attrVal.serialize(parameters);
        }
      } else {
        // always copy primitives
        serializedComponent.attributes[attr] = attrVal;
      }
    }

    if (parameters.forCopy) {
      serializedComponent.originalName = this.componentName;
      serializedComponent.originalDoenetAttributes = deepClone(
        this.doenetAttributes,
      );
      serializedComponent.doenetAttributes = deepClone(this.doenetAttributes);
      for (let attr in this.attributes) {
      }
      serializedComponent.originalAttributes = deepClone(
        serializedComponent.attributes,
      );

      delete serializedComponent.doenetAttributes.prescribedName;
      delete serializedComponent.doenetAttributes.assignNames;
    } else {
      console.warn(
        'serializing a component without forCopy set is not yet converted!!!!',
      );
      let additionalState = {};
      for (let item in this._state) {
        if (
          this.state[item].essential ||
          stateVariablesToInclude.includes(item)
        ) {
          // evaluate state variable first so that usedDefault attribute is populated
          let value = this.state[item].value;

          if (!this.state[item].usedDefault) {
            additionalState[item] = value;
          }
        }
      }

      if (Object.keys(additionalState).length > 0) {
        serializedComponent.state = additionalState;
      }

      let doenetAttributes = Object.assign({}, this.doenetAttributes);
      if (Object.keys(doenetAttributes).length > 0) {
        serializedComponent.doenetAttributes = doenetAttributes;
      }
    }

    return serializedComponent;
  }

  copySerializedComponent({ serializedComponent, parameters }) {
    let serializedChildren = [];
    if (serializedComponent.children !== undefined) {
      for (let child of serializedComponent.children) {
        serializedChildren.push(
          this.copySerializedComponent({
            serializedComponent: child,
            parameters: parameters,
          }),
        );
      }
    }

    let serializedCopy = {
      componentType: serializedComponent.componentType,
      originalName: serializedComponent.componentName,
      originalNameFromSerializedComponent: true,
      children: serializedChildren,
      state: {},
      doenetAttributes: {},
    };

    if (
      //parameters.forCopy !== true &&
      serializedComponent.doenetAttributes !== undefined
    ) {
      serializedCopy.originalDoenetAttributes = deepClone(
        serializedComponent.doenetAttributes,
      );
      serializedCopy.doenetAttributes = deepClone(
        serializedComponent.doenetAttributes,
      );
      serializedCopy.originalAttributes = deepClone(
        serializedComponent.attributes,
      );
      serializedCopy.attributes = deepClone(serializedComponent.attributes);
      delete serializedCopy.doenetAttributes.prescribedName;
      delete serializedCopy.doenetAttributes.assignNames;
    }

    if (serializedComponent.state !== undefined) {
      // shallow copy of state
      Object.assign(serializedCopy.state, serializedComponent.state);
    }

    return serializedCopy;
  }

  static adapters = [];

  static get nAdapters() {
    return this.adapters.length;
  }

  getAdapter(ind) {
    if (ind >= this.constructor.adapters.length) {
      return;
    }

    let adapter = this.constructor.adapters[ind];

    let adapterStateVariable;
    let adapterComponentType;

    // adapter could be either
    // - a string specifying a public state variable, or
    // - an object specify a public state variable and, optionally
    //   a component type and a state variable for the new component
    if (typeof adapter === 'string') {
      adapterStateVariable = adapter;
    } else {
      adapterStateVariable = adapter.stateVariable;
      adapterComponentType = adapter.componentType;
    }

    // look in state for matching public value
    let stateFromAdapter = this.state[adapterStateVariable];
    if (
      stateFromAdapter === undefined ||
      (!stateFromAdapter.public && !adapterComponentType)
    ) {
      throw Error(
        'Invalid adapter ' + adapterStateVariable + ' in ' + this.componentType,
      );
    }

    if (adapterComponentType === undefined) {
      // if didn't override componentType, use componentType from state variable
      adapterComponentType = stateFromAdapter.componentType;
    }

    return {
      componentType: adapterComponentType,
      downstreamDependencies: {
        [this.componentName]: [
          {
            dependencyType: 'adapter',
            adapterVariable: adapterStateVariable,
            adapterTargetIdentity: {
              componentName: this.componentName,
              componentType: this.componentType,
            },
          },
        ],
      },
    };
  }

  static getAdapterComponentType(ind, publicStateVariableInfo) {
    if (ind >= this.adapters.length) {
      return;
    }

    let adapter = this.adapters[ind];

    let adapterStateVariable;
    let adapterComponentType;

    // adapter could be either
    // - a string specifying a public state variable, or
    // - an object specify a public state variable and, optionally
    //   a component type and a state variable for the new component
    if (typeof adapter === 'string') {
      adapterStateVariable = adapter;
    } else {
      adapterStateVariable = adapter.stateVariable;
      adapterComponentType = adapter.componentType;
    }

    if (adapterComponentType === undefined) {
      // if didn't override componentType, use componentType from state variable

      let stateVarInfo = publicStateVariableInfo[this.componentType];

      let varInfo =
        stateVarInfo.stateVariableDescriptions[adapterStateVariable];
      if (!varInfo) {
        throw Error(
          'Invalid adapter ' +
            adapterStateVariable +
            ' in ' +
            this.componentType,
        );
      }

      adapterComponentType = varInfo.componentType;

      if (!adapterComponentType) {
        throw Error(
          `Couldn't get adapter component type for ${adapterStateVariable} of componentType ${this.componentType}`,
        );
      }
    }

    return adapterComponentType;
  }
}
