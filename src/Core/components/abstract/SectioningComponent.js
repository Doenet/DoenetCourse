import BlockComponent from './BlockComponent';
import { getVariantsForDescendants } from '../../utils/variants';

export default class SectioningComponent extends BlockComponent {
  static componentType = '_sectioningComponent';
  static renderChildren = true;

  static setUpVariantIfVariantControlChild = true;

  static get stateVariablesShadowedForReference() {
    return ['title'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.aggregateScores = {
      createComponentOfType: 'boolean',
      createStateVariable: 'aggregateScores',
      defaultValue: false,
      public: true,
    };
    attributes.weight = {
      createComponentOfType: 'number',
      createStateVariable: 'weight',
      defaultValue: 1,
      public: true,
    };
    attributes.sectionWideCheckWork = {
      createComponentOfType: 'boolean',
      createStateVariable: 'sectionWideCheckWork',
      defaultValue: false,
      public: true,
    };
    attributes.delegateCheckWorkToAnswerNumber = {
      createComponentOfType: 'boolean',
      createStateVariable: 'delegateCheckWorkToAnswerNumber',
      defaultValue: null,
      forRenderer: true,
      public: true,
    };
    // attributes.possiblepoints = {default: undefined};
    // attributes.aggregatebypoints = {default: false};
    attributes.feedbackDefinitions = {
      createComponentOfType: 'feedbackDefinitions',
      createStateVariable: 'feedbackDefinitions',
      propagateToDescendants: true,
      mergeArrays: true,
      public: true,
    };
    attributes.styleDefinitions = {
      createComponentOfType: 'styleDefinitions',
      createStateVariable: 'styleDefinitions',
      propagateToDescendants: true,
      mergeArrays: true,
      public: true,
    };
    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let atMostOneVariantControl = childLogic.newLeaf({
      name: 'atMostOneVariantControl',
      componentType: 'variantControl',
      comparison: 'atMost',
      number: 1,
      allowSpillover: false,
    });

    let atMostOneTitle = childLogic.newLeaf({
      name: 'atMostOneTitle',
      componentType: 'title',
      comparison: 'atMost',
      number: 1,
    });

    let anything = childLogic.newLeaf({
      name: 'anything',
      componentType: '_base',
      comparison: 'atLeast',
      number: 0,
    });

    childLogic.newOperator({
      name: 'variantTitleAndAnything',
      operator: 'and',
      propositions: [atMostOneVariantControl, atMostOneTitle, anything],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let sectioningClass = this;

    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.enumeration = {
      forRenderer: true,
      returnDependencies: () => ({
        countAmongSiblings: {
          dependencyType: 'countAmongSiblingsOfSameType',
        },
        sectionAncestor: {
          dependencyType: 'ancestor',
          componentType: '_sectioningComponent',
          variableNames: ['enumeration'],
        },
      }),
      definition({ dependencyValues }) {
        let enumeration = [];
        if (dependencyValues.sectionAncestor) {
          enumeration.push(
            ...dependencyValues.sectionAncestor.stateValues.enumeration,
          );
        }

        enumeration.push(dependencyValues.countAmongSiblings);
        return { newValues: { enumeration } };
      },
    };

    stateVariableDefinitions.sectionName = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { sectionName: 'Section' } }),
    };

    stateVariableDefinitions.titleChildName = {
      forRenderer: true,
      returnDependencies: () => ({
        titleChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneTitle',
        },
      }),
      definition({ dependencyValues }) {
        let titleChildName = null;
        if (dependencyValues.titleChild.length === 1) {
          titleChildName = dependencyValues.titleChild[0].componentName;
        }
        return {
          newValues: { titleChildName },
        };
      },
    };

    stateVariableDefinitions.title = {
      public: true,
      componentType: 'text',
      forRenderer: true,
      returnDependencies: () => ({
        titleChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneTitle',
          variableNames: ['text'],
        },
        sectionName: {
          dependencyType: 'stateVariable',
          variableName: 'sectionName',
        },
        enumeration: {
          dependencyType: 'stateVariable',
          variableName: 'enumeration',
        },
      }),
      definition({ dependencyValues }) {
        if (dependencyValues.titleChild.length === 0) {
          let title = sectioningClass.defaultTitle;

          if (!title) {
            title =
              dependencyValues.sectionName +
              ' ' +
              dependencyValues.enumeration.join('.');
          }

          return { newValues: { title } };
        } else {
          return {
            newValues: {
              title: dependencyValues.titleChild[0].stateValues.text,
            },
          };
        }
      },
    };

    stateVariableDefinitions.containerTag = {
      forRenderer: true,
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { containerTag: 'section' } }),
    };

    stateVariableDefinitions.level = {
      forRenderer: true,
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { level: 1 } }),
    };

    stateVariableDefinitions.viewedSolution = {
      defaultValue: false,
      returnDependencies: () => ({}),
      definition: () => ({
        useEssentialOrDefaultValue: {
          viewedSolution: { variablesToCheck: ['viewedSolution'] },
        },
      }),
      inverseDefinition({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'viewedSolution',
              value: desiredStateVariableValues.viewedSolution,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.scoredDescendants = {
      returnDependencies: () => ({
        scoredDescendants: {
          dependencyType: 'descendant',
          componentTypes: ['_sectioningComponent', 'answer'],
          variableNames: ['scoredDescendants', 'aggregateScores', 'weight'],
          recurseToMatchedChildren: false,
          variablesOptional: true,
        },
      }),
      definition({ dependencyValues }) {
        let scoredDescendants = [];
        for (let descendant of dependencyValues.scoredDescendants) {
          if (
            descendant.stateValues.aggregateScores ||
            descendant.stateValues.scoredDescendants === undefined
          ) {
            scoredDescendants.push(descendant);
          } else {
            scoredDescendants.push(...descendant.stateValues.scoredDescendants);
          }
        }

        return { newValues: { scoredDescendants } };
      },
    };

    stateVariableDefinitions.answerDescendants = {
      returnDependencies: () => ({
        answerDescendants: {
          dependencyType: 'descendant',
          componentTypes: ['answer'],
          recurseToMatchedChildren: false,
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: { answerDescendants: dependencyValues.answerDescendants },
        };
      },
    };

    stateVariableDefinitions.justSubmitted = {
      forRenderer: true,
      returnDependencies: () => ({
        answerDescendants: {
          dependencyType: 'descendant',
          componentTypes: ['answer'],
          variableNames: ['justSubmitted'],
          recurseToMatchedChildren: false,
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            justSubmitted: dependencyValues.answerDescendants.every(
              (x) => x.stateValues.justSubmitted,
            ),
          },
        };
      },
    };

    stateVariableDefinitions.showCorrectness = {
      forRenderer: true,
      returnDependencies: () => ({
        showCorrectnessFlag: {
          dependencyType: 'flag',
          flagName: 'showCorrectness',
        },
      }),
      definition({ dependencyValues }) {
        let showCorrectness = dependencyValues.showCorrectnessFlag !== false;
        return { newValues: { showCorrectness } };
      },
    };

    stateVariableDefinitions.displayDigitsForCreditAchieved = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { displayDigitsForCreditAchieved: 3 } }),
    };

    stateVariableDefinitions.creditAchieved = {
      public: true,
      componentType: 'number',
      forRenderer: true,
      defaultValue: 0,
      stateVariablesPrescribingAdditionalAttributes: {
        displayDigits: 'displayDigitsForCreditAchieved',
      },
      additionalStateVariablesDefined: [
        {
          variableName: 'percentCreditAchieved',
          public: true,
          componentType: 'number',
          stateVariablesPrescribingAdditionalAttributes: {
            displayDigits: 'displayDigitsForCreditAchieved',
          },
        },
      ],
      stateVariablesDeterminingDependencies: [
        'aggregateScores',
        'scoredDescendants',
      ],
      returnDependencies({ stateValues }) {
        let dependencies = {
          aggregateScores: {
            dependencyType: 'stateVariable',
            variableName: 'aggregateScores',
          },
        };
        if (stateValues.aggregateScores) {
          dependencies.scoredDescendants = {
            dependencyType: 'stateVariable',
            variableName: 'scoredDescendants',
          };
          for (let [
            ind,
            descendant,
          ] of stateValues.scoredDescendants.entries()) {
            dependencies['creditAchieved' + ind] = {
              dependencyType: 'stateVariable',
              componentName: descendant.componentName,
              variableName: 'creditAchieved',
            };
          }
        }

        return dependencies;
      },
      definition({ dependencyValues }) {
        if (!dependencyValues.aggregateScores) {
          return {
            newValues: {
              creditAchieved: 0,
              percentCreditAchieved: 0,
            },
          };
        }

        let creditSum = 0;
        let totalWeight = 0;

        for (let [
          ind,
          component,
        ] of dependencyValues.scoredDescendants.entries()) {
          let weight = component.stateValues.weight;
          creditSum += dependencyValues['creditAchieved' + ind] * weight;
          totalWeight += weight;
        }
        let creditAchieved = creditSum / totalWeight;
        let percentCreditAchieved = creditAchieved * 100;

        return { newValues: { creditAchieved, percentCreditAchieved } };
      },
    };

    stateVariableDefinitions.creditAchievedIfSubmit = {
      defaultValue: 0,
      stateVariablesDeterminingDependencies: [
        'aggregateScores',
        'scoredDescendants',
      ],
      returnDependencies({ stateValues }) {
        let dependencies = {
          aggregateScores: {
            dependencyType: 'stateVariable',
            variableName: 'aggregateScores',
          },
        };
        if (stateValues.aggregateScores) {
          dependencies.scoredDescendants = {
            dependencyType: 'stateVariable',
            variableName: 'scoredDescendants',
          };
          for (let [
            ind,
            descendant,
          ] of stateValues.scoredDescendants.entries()) {
            dependencies['creditAchievedIfSubmit' + ind] = {
              dependencyType: 'stateVariable',
              componentName: descendant.componentName,
              variableName: 'creditAchievedIfSubmit',
            };
          }
        }

        return dependencies;
      },
      definition({ dependencyValues }) {
        if (!dependencyValues.aggregateScores) {
          return {
            newValues: {
              creditAchievedIfSubmit: 0,
            },
          };
        }

        let creditSum = 0;
        let totalWeight = 0;

        for (let [
          ind,
          component,
        ] of dependencyValues.scoredDescendants.entries()) {
          let weight = component.stateValues.weight;
          creditSum +=
            dependencyValues['creditAchievedIfSubmit' + ind] * weight;
          totalWeight += weight;
        }
        let creditAchievedIfSubmit = creditSum / totalWeight;

        return { newValues: { creditAchievedIfSubmit } };
      },
    };

    stateVariableDefinitions.selectedVariantInfo = {
      additionalStateVariablesDefined: ['isVariantComponent'],
      returnDependencies: ({ componentInfoObjects }) => ({
        variantControlChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneVariantControl',
          variableNames: ['selectedVariantNumber'],
        },
        variantDescendants: {
          dependencyType: 'descendant',
          componentTypes: Object.keys(
            componentInfoObjects.componentTypeWithPotentialVariants,
          ),
          variableNames: ['isVariantComponent', 'selectedVariantInfo'],
          recurseToMatchedChildren: false,
          variablesOptional: true,
          includeNonActiveChildren: true,
          ignoreReplacementsOfMatchedComposites: true,
          definingChildrenFirst: true,
        },
      }),
      definition({ dependencyValues }) {
        let isVariantComponent;
        let selectedVariantInfo = {};
        if (dependencyValues.variantControlChild.length === 1) {
          isVariantComponent = true;
          selectedVariantInfo.index =
            dependencyValues.variantControlChild[0].stateValues.selectedVariantNumber;
        } else {
          isVariantComponent = false;
        }

        let subvariants = (selectedVariantInfo.subvariants = []);

        for (let descendant of dependencyValues.variantDescendants) {
          if (descendant.stateValues.isVariantComponent) {
            subvariants.push(descendant.stateValues.selectedVariantInfo);
          } else if (descendant.stateValues.selectedVariantInfo) {
            subvariants.push(
              ...descendant.stateValues.selectedVariantInfo.subvariants,
            );
          }
        }
        return { newValues: { selectedVariantInfo, isVariantComponent } };
      },
    };

    stateVariableDefinitions.collapsible = {
      componentType: 'boolean',
      forRenderer: true,
      returnDependencies: () => ({}),
      definition() {
        return { newValues: { collapsible: false } };
      },
    };

    stateVariableDefinitions.open = {
      public: true,
      componentType: 'boolean',
      forRenderer: true,
      defaultValue: true,
      returnDependencies: () => ({}),
      definition() {
        return {
          useEssentialOrDefaultValue: {
            open: {
              variablesToCheck: ['open'],
            },
          },
        };
      },
      inverseDefinition({ desiredStateVariableValues }) {
        return {
          success: true,
          instructions: [
            {
              setStateVariable: 'open',
              value: desiredStateVariableValues.open,
            },
          ],
        };
      },
    };

    stateVariableDefinitions.createSubmitAllButton = {
      forRenderer: true,
      additionalStateVariablesDefined: ['createSubmitAllButtonOnAnswer'],
      returnDependencies: () => ({
        sectionWideCheckWork: {
          dependencyType: 'stateVariable',
          variableName: 'sectionWideCheckWork',
        },
        delegateCheckWorkToAnswerNumber: {
          dependencyType: 'stateVariable',
          variableName: 'delegateCheckWorkToAnswerNumber',
        },
        aggregateScores: {
          dependencyType: 'stateVariable',
          variableName: 'aggregateScores',
        },
        answerDescendants: {
          dependencyType: 'stateVariable',
          variableName: 'answerDescendants',
        },
      }),
      definition({ dependencyValues, componentName }) {
        let createSubmitAllButton = false;
        let createSubmitAllButtonOnAnswer = null;

        if (dependencyValues.sectionWideCheckWork) {
          if (!dependencyValues.aggregateScores) {
            console.warn(
              `Cannot create submit all button for ${componentName} because it doesn't aggegrate scores`,
            );
          } else {
            let chosenAnswer = null;
            if (dependencyValues.delegateCheckWorkToAnswerNumber > 0) {
              chosenAnswer =
                dependencyValues.answerDescendants[
                  dependencyValues.delegateCheckWorkToAnswerNumber - 1
                ];
            } else if (dependencyValues.delegateCheckWorkToAnswerNumber < 0) {
              let answerInd =
                dependencyValues.answerDescendants.length +
                dependencyValues.delegateCheckWorkToAnswerNumber;
              chosenAnswer = dependencyValues.answerDescendants[answerInd];
            }
            if (chosenAnswer) {
              createSubmitAllButtonOnAnswer = chosenAnswer.componentName;
            } else {
              createSubmitAllButton = true;
            }
          }
        }

        return {
          newValues: { createSubmitAllButton, createSubmitAllButtonOnAnswer },
        };
      },
    };

    stateVariableDefinitions.suppressAnswerSubmitButtons = {
      additionalStateVariablesDefined: [
        'answerDelegatedForSubmitAll',
        'componentNameForSubmitAll',
        'justSubmittedForSubmitAll',
        'creditAchievedForSubmitAll',
      ],
      forRenderer: true,
      returnDependencies: () => ({
        createSubmitAllButton: {
          dependencyType: 'stateVariable',
          variableName: 'createSubmitAllButton',
        },
        createSubmitAllButtonOnAnswer: {
          dependencyType: 'stateVariable',
          variableName: 'createSubmitAllButtonOnAnswer',
        },
        justSubmitted: {
          dependencyType: 'stateVariable',
          variableName: 'justSubmitted',
        },
        creditAchieved: {
          dependencyType: 'stateVariable',
          variableName: 'creditAchieved',
        },
        sectionAncestor: {
          dependencyType: 'ancestor',
          componentType: '_sectioningComponent',
          variableNames: [
            'suppressAnswerSubmitButtons',
            'answerDelegatedForSubmitAll',
            'componentNameForSubmitAll',
            'justSubmittedForSubmitAll',
            'creditAchievedForSubmitAll',
          ],
        },
      }),
      definition({ dependencyValues, componentName }) {
        let suppressAnswerSubmitButtons = false;
        let answerDelegatedForSubmitAll = null;
        let componentNameForSubmitAll = null;
        let justSubmittedForSubmitAll = null;
        let creditAchievedForSubmitAll = null;

        if (
          dependencyValues.createSubmitAllButton ||
          dependencyValues.createSubmitAllButtonOnAnswer
        ) {
          componentNameForSubmitAll = componentName;
          suppressAnswerSubmitButtons = true;
          if (dependencyValues.createSubmitAllButtonOnAnswer) {
            answerDelegatedForSubmitAll =
              dependencyValues.createSubmitAllButtonOnAnswer;
            justSubmittedForSubmitAll = dependencyValues.justSubmitted;
            creditAchievedForSubmitAll = dependencyValues.creditAchieved;
          }
        } else if (dependencyValues.sectionAncestor) {
          let ancestorStateValues =
            dependencyValues.sectionAncestor.stateValues;
          suppressAnswerSubmitButtons =
            ancestorStateValues.suppressAnswerSubmitButtons;
          componentNameForSubmitAll =
            ancestorStateValues.componentNameForSubmitAll;
          answerDelegatedForSubmitAll =
            ancestorStateValues.answerDelegatedForSubmitAll;
          justSubmittedForSubmitAll =
            ancestorStateValues.justSubmittedForSubmitAll;
          creditAchievedForSubmitAll =
            ancestorStateValues.creditAchievedForSubmitAll;
        }

        return {
          newValues: {
            suppressAnswerSubmitButtons,
            componentNameForSubmitAll,
            answerDelegatedForSubmitAll,
            justSubmittedForSubmitAll,
            creditAchievedForSubmitAll,
          },
        };
      },
    };

    return stateVariableDefinitions;
  }

  actions = {
    submitAllAnswers: this.submitAllAnswers.bind(this),
    revealSection: this.revealSection.bind(this),
    closeSection: this.closeSection.bind(this),
  };

  submitAllAnswers() {
    this.coreFunctions.requestRecordEvent({
      verb: 'submitted',
      object: {
        componentName: this.componentName,
        componentType: this.componentType,
      },
      result: {
        creditAchieved: this.stateValues.creditAchievedIfSubmit,
      },
    });
    for (let answer of this.stateValues.answerDescendants) {
      this.coreFunctions.requestAction({
        componentName: answer.componentName,
        actionName: 'submitAnswer',
      });
    }
  }

  revealSection() {
    this.coreFunctions.requestUpdate({
      updateInstructions: [
        {
          updateType: 'updateValue',
          componentName: this.componentName,
          stateVariable: 'open',
          value: true,
        },
      ],
      event: {
        verb: 'viewed',
        object: {
          componentName: this.componentName,
          componentType: this.componentType,
        },
      },
    });
  }

  closeSection() {
    this.coreFunctions.requestUpdate({
      updateInstructions: [
        {
          updateType: 'updateValue',
          componentName: this.componentName,
          stateVariable: 'open',
          value: false,
        },
      ],
      event: {
        verb: 'closed',
        object: {
          componentName: this.componentName,
          componentType: this.componentType,
        },
      },
    });
  }

  static setUpVariant({
    serializedComponent,
    sharedParameters,
    definingChildrenSoFar,
    allComponentClasses,
  }) {
    let variantcontrolChild;
    for (let child of definingChildrenSoFar) {
      if (child !== undefined && child.componentType === 'variantControl') {
        variantcontrolChild = child;
        break;
      }
    }
    sharedParameters.variant = variantcontrolChild.state.selectedVariant.value;
    sharedParameters.variantNumber =
      variantcontrolChild.state.selectedVariantNumber.value;
    sharedParameters.selectRng = variantcontrolChild.state.selectRng.value;
    sharedParameters.allPossibleVariants =
      variantcontrolChild.state.variants.value;

    // console.log("****Variant for sectioning component****")
    // console.log("Selected seed: " + variantcontrolChild.state.selectedSeed);
    console.log(
      'Variant for ' + this.componentType + ': ' + sharedParameters.variant,
    );

    // if subvariants were specified, add those the corresponding descendants
    let desiredVariant = serializedComponent.variants.desiredVariant;

    if (desiredVariant === undefined) {
      desiredVariant = {};
    }

    // if subvariants aren't defined but we have uniqueVariants specified
    // then calculate variant information for the descendant variant component
    if (
      desiredVariant.subvariants === undefined &&
      serializedComponent.variants.uniqueVariants
    ) {
      let variantInfo = this.getUniqueVariant({
        serializedComponent: serializedComponent,
        variantNumber: sharedParameters.variantNumber,
        allComponentClasses: allComponentClasses,
      });
      if (variantInfo.success) {
        Object.assign(desiredVariant, variantInfo.desiredVariant);
      }
    }

    if (
      desiredVariant !== undefined &&
      desiredVariant.subvariants !== undefined &&
      serializedComponent.variants.descendantVariantComponents !== undefined
    ) {
      for (let ind in desiredVariant.subvariants) {
        let subvariant = desiredVariant.subvariants[ind];
        let variantComponent =
          serializedComponent.variants.descendantVariantComponents[ind];
        if (variantComponent === undefined) {
          break;
        }
        variantComponent.variants.desiredVariant = subvariant;
      }
    }
  }

  static determineNumberOfUniqueVariants({ serializedComponent }) {
    if (serializedComponent.children === undefined) {
      return { success: true };
    }

    let variantControlInd;
    let variantControlChild;
    for (let [ind, child] of serializedComponent.children.entries()) {
      if (
        child.componentType === 'variantControl' ||
        (child.createdComponent &&
          components[child.componentName].componentType === 'variantControl')
      ) {
        variantControlInd = ind;
        variantControlChild = child;
        break;
      }
    }

    if (variantControlInd === undefined) {
      return { success: true };
    }

    // Find number of variants from variantControl
    let numberOfVariants = 100;
    if (
      variantControlChild.attributes &&
      variantControlChild.attributes.nVariants !== undefined
    ) {
      let nVariantsComp = variantControlChild.attributes.nVariants;
      // calculate nVariants only if has its value set directly
      // or if has a single child that is a string
      let foundValid = false;
      if (
        nVariantsComp.state !== undefined &&
        nVariantsComp.state.value !== undefined
      ) {
        numberOfVariants = Math.round(Number(nVariantsComp.state.value));
        foundValid = true;
      }
      // children overwrite state
      if (
        nVariantsComp.children !== undefined &&
        nVariantsComp.children.length === 1 &&
        nVariantsComp.children[0].componentType === 'string'
      ) {
        numberOfVariants = Math.round(
          Number(nVariantsComp.children[0].state.value),
        );
        foundValid = true;
      }
      if (!foundValid) {
        return { success: false };
      }
    }

    // check if uniqueVariants is already be defined in variants
    if (serializedComponent.variants === undefined) {
      serializedComponent.variants = {};
    }

    let uniqueVariantData;
    if (serializedComponent.variants.uniqueVariants) {
      // max number of variants is the product of
      // number of variants for each descendantVariantComponent
      let maxNumberOfVariants = 1;
      let numberOfVariantsByDescendant = [];
      if (
        serializedComponent.variants.descendantVariantComponents !== undefined
      ) {
        numberOfVariantsByDescendant =
          serializedComponent.variants.descendantVariantComponents.map(
            (x) => x.variants.numberOfVariants,
          );
        maxNumberOfVariants = numberOfVariantsByDescendant.reduce(
          (a, c) => a * c,
          1,
        );
        uniqueVariantData = {
          numberOfVariantsByDescendant: numberOfVariantsByDescendant,
        };
      }

      numberOfVariants = Math.min(maxNumberOfVariants, numberOfVariants);
    }

    return {
      success: true,
      numberOfVariants: numberOfVariants,
      uniqueVariantData: uniqueVariantData,
    };
  }

  static getUniqueVariant({
    serializedComponent,
    variantNumber,
    allComponentClasses,
  }) {
    if (serializedComponent.variants === undefined) {
      return { succes: false };
    }
    let numberOfVariants = serializedComponent.variants.numberOfVariants;
    if (numberOfVariants === undefined) {
      return { success: false };
    }

    if (
      !Number.isInteger(variantNumber) ||
      variantNumber < 0 ||
      variantNumber >= numberOfVariants
    ) {
      return { success: false };
    }

    let desiredVariant = {
      index: variantNumber,
    };

    if (serializedComponent.variants.uniqueVariants) {
      let result = getVariantsForDescendants({
        variantNumber: variantNumber,
        serializedComponent: serializedComponent,
        allComponentClasses: allComponentClasses,
      });

      if (result.success) {
        desiredVariant.subvariants = result.desiredVariants;
      } else {
        console.log(
          'Failed to get unique variant for ' +
            serializedComponent.componentType,
        );
      }
    }

    return { success: true, desiredVariant: desiredVariant };
  }

  static includeBlankStringChildren = true;
}
