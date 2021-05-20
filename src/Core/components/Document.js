import BaseComponent from './abstract/BaseComponent';
import { getVariantsForDescendants } from '../utils/variants';
import { returnDefaultStyleDefinitions } from '../utils/style';

export default class Document extends BaseComponent {
  static componentType = 'document';
  static rendererType = 'section';
  static renderChildren = true;

  static createsVariants = true;

  static alwaysSetUpVariant = true;

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);

    delete attributes.hide;
    delete attributes.disabled;
    delete attributes.modifyIndirectly;
    delete attributes.fixed;
    delete attributes.styleNumber;
    delete attributes.isResponse;

    attributes.feedbackDefinitions = {
      createComponentOfType: 'feedbackDefinitions',
      createStateVariable: 'feedbackDefinitions',
      get defaultValue() {
        return returnDefaultFeedbackDefinitions();
      },
      propagateToDescendants: true,
      mergeArrayWithDefault: true,
      public: true,
    };
    attributes.styleDefinitions = {
      createComponentOfType: 'styleDefinitions',
      createStateVariable: 'styleDefinitions',
      get defaultValue() {
        return returnDefaultStyleDefinitions();
      },
      propagateToDescendants: true,
      mergeArrayWithDefault: true,
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

    let atMostOneDescription = childLogic.newLeaf({
      name: 'atMostOneDescription',
      componentType: 'description',
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
      name: 'variantTitleDescriptionMetaAnything',
      operator: 'and',
      propositions: [
        atMostOneVariantControl,
        atMostOneTitle,
        atMostOneDescription,
        anything,
      ],
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

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
      }),
      definition({ dependencyValues }) {
        if (dependencyValues.titleChild.length === 0) {
          return { newValues: { title: '' } };
        } else {
          return {
            newValues: {
              title: dependencyValues.titleChild[0].stateValues.text,
            },
          };
        }
      },
    };

    stateVariableDefinitions.description = {
      public: true,
      componentType: 'text',
      forRenderer: true,
      returnDependencies: () => ({
        descriptionChild: {
          dependencyType: 'child',
          childLogicName: 'atMostOneDescription',
          variableNames: ['text'],
        },
      }),
      definition({ dependencyValues }) {
        if (dependencyValues.descriptionChild.length === 0) {
          return { newValues: { description: '' } };
        } else {
          return {
            newValues: {
              description:
                dependencyValues.descriptionChild[0].stateValues.text,
            },
          };
        }
      },
    };

    stateVariableDefinitions.level = {
      forRenderer: true,
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { level: 0 } }),
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

    stateVariableDefinitions.nScoredDescendants = {
      returnDependencies: () => ({
        scoredDescendants: {
          dependencyType: 'stateVariable',
          variableName: 'scoredDescendants',
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            nScoredDescendants: dependencyValues.scoredDescendants.length,
          },
        };
      },
    };

    stateVariableDefinitions.itemCreditAchieved = {
      isArray: true,
      returnArraySizeDependencies: () => ({
        nScoredDescendants: {
          dependencyType: 'stateVariable',
          variableName: 'nScoredDescendants',
        },
      }),
      returnArraySize({ dependencyValues }) {
        return [dependencyValues.nScoredDescendants];
      },
      stateVariablesDeterminingDependencies: ['scoredDescendants'],
      returnArrayDependenciesByKey({ arrayKeys, stateValues }) {
        let dependenciesByKey = {};
        for (let arrayKey of arrayKeys) {
          let descendant = stateValues.scoredDescendants[arrayKey];
          if (descendant) {
            dependenciesByKey[arrayKey] = {
              creditAchieved: {
                dependencyType: 'stateVariable',
                componentName: descendant.componentName,
                variableName: 'creditAchieved',
              },
            };
          }
        }

        return { dependenciesByKey };
      },
      arrayDefinitionByKey({ dependencyValuesByKey, arrayKeys }) {
        let itemCreditAchieved = {};

        for (let arrayKey of arrayKeys) {
          itemCreditAchieved[arrayKey] =
            dependencyValuesByKey[arrayKey].creditAchieved;
        }

        return { newValues: { itemCreditAchieved } };
      },
      markStaleByKey({ arrayKeys, changes }) {
        if (changes.__array_size || changes.__array_keys) {
          return {
            itemScoreChanged: {
              itemNumbers: arrayKeys,
            },
          };
        }

        let findArrayKeyRegex = /^__(\d+)_/;

        let itemNumbers = [];

        for (let changeName in changes) {
          let match = findArrayKeyRegex.exec(changeName);
          if (match) {
            itemNumbers.push(match[1]);
          }
        }

        return {
          itemScoreChanged: { itemNumbers },
        };
      },
    };

    stateVariableDefinitions.displayDigitsForCreditAchieved = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { displayDigitsForCreditAchieved: 3 } }),
    };

    stateVariableDefinitions.creditAchieved = {
      public: true,
      componentType: 'number',
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
      returnDependencies: () => ({
        scoredDescendants: {
          dependencyType: 'stateVariable',
          variableName: 'scoredDescendants',
        },
        itemCreditAchieved: {
          dependencyType: 'stateVariable',
          variableName: 'itemCreditAchieved',
        },
      }),
      definition({ dependencyValues }) {
        let creditSum = 0;
        let totalWeight = 0;

        for (let [
          ind,
          component,
        ] of dependencyValues.scoredDescendants.entries()) {
          let weight = component.stateValues.weight;
          creditSum += dependencyValues.itemCreditAchieved[ind] * weight;
          totalWeight += weight;
        }
        let creditAchieved = creditSum / totalWeight;
        let percentCreditAchieved = creditAchieved * 100;

        return { newValues: { creditAchieved, percentCreditAchieved } };
      },
    };

    stateVariableDefinitions.selectedVariantInfo = {
      returnDependencies: ({ sharedParameters, componentInfoObjects }) => ({
        variantNumber: {
          dependencyType: 'value',
          value: sharedParameters.variantNumber,
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
        let selectedVariantInfo = {
          index: dependencyValues.variantNumber,
        };
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
        return { newValues: { selectedVariantInfo } };
      },
    };

    return stateVariableDefinitions;
  }

  submitAllAnswers() {
    let answersToSubmit = [];
    for (let answer of this.descendantsFound.answer) {
      if (!answer.state.allAwardsJustSubmitted) {
        answersToSubmit.push(answer);
      }
    }
    // Set answersToSubmitCounter to the number of answers that we have to submit
    // Each submission involves a call to an external function that has
    // an asynchronous callBack.  The callBack will decrement the counter each
    // time so that it can know when all answers have been submitted
    // (i.e., the counter is back to zero)
    // at which point the callback should do something
    this.answersToSubmitCounter = answersToSubmit.length;
    if (this.answersToSubmitCounter === 0) {
      this.externalFunctions.allAnswersSubmitted();
    } else {
      for (let answer of answersToSubmit) {
        answer.submitAnswer();
      }
    }
  }

  static setUpVariant({
    serializedComponent,
    sharedParameters,
    definingChildrenSoFar,
    allComponentClasses,
  }) {
    // console.log("****Variant for document*****")

    let variantControlChild;
    for (let child of definingChildrenSoFar) {
      if (child !== undefined && child.componentType === 'variantControl') {
        variantControlChild = child;
        break;
      }
    }
    if (variantControlChild === undefined) {
      // no variant control child
      // so just use default of 100 variants
      // with variant names a, b, c, ...
      // and seeds 1,2,3,...

      let nVariants = 100;

      if (serializedComponent.variants.uniqueVariants) {
        nVariants = serializedComponent.variants.numberOfVariants;
      }

      sharedParameters.allPossibleVariants = [...Array(nVariants).keys()].map(
        numberToLowercaseLetters,
      );

      let variantNumber;
      // check if desiredVariant was specified
      let desiredVariant = serializedComponent.variants.desiredVariant;
      if (desiredVariant !== undefined) {
        if (desiredVariant.index !== undefined) {
          let desiredVariantNumber = Number(desiredVariant.index);
          if (!Number.isInteger(desiredVariantNumber)) {
            throw Error(
              'Variant number ' + desiredVariant.index + ' must be an integer',
            );
          } else {
            variantNumber = desiredVariantNumber % nVariants;
            if (variantNumber < 0) {
              variantNumber += nVariants;
            }
          }
        } else if (desiredVariant.value !== undefined) {
          if (typeof desiredVariant.value === 'string') {
            // want case insensitive test, so convert to lower case
            let desiredNumber = sharedParameters.allPossibleVariants.indexOf(
              desiredVariant.value.toLowerCase(),
            );
            if (desiredNumber !== -1) {
              variantNumber = desiredNumber;
            }
          }
          if (variantNumber === undefined) {
            console.log(
              'Variant ' +
                desiredVariant.value +
                ' is not valid, convert to variant index',
            );
            variantNumber = Math.abs(
              sharedParameters.hashStringToInteger(
                JSON.stringify(desiredVariant.value),
              ) % nVariants,
            );
            console.log(variantNumber);
          }
        }
      }

      if (variantNumber === undefined) {
        // if variant number wasn't specifed, generate randomly
        let rand = sharedParameters.selectRng();
        variantNumber = Math.floor(rand * nVariants);
      }

      let seed = variantNumber + 1;
      let convertedSeed = sharedParameters.hashStringToInteger(seed.toString());

      sharedParameters.variantNumber = variantNumber;
      sharedParameters.variant = numberToLowercaseLetters(variantNumber);
      // console.log("Selected seed: " + seed);
      sharedParameters.selectRng = new sharedParameters.rngClass(convertedSeed);

      // save parameters to serializedComponent
      // so can return to where left off on next pass
      serializedComponent.variants.generatedSelectParameters = {
        selectRng: sharedParameters.selectRng,
        variant: sharedParameters.variant,
        allPossibleVariants: sharedParameters.allPossibleVariants,
      };
    } else {
      // get parameters from variant control child
      sharedParameters.variant =
        variantControlChild.state.selectedVariant.value;
      sharedParameters.variantNumber =
        variantControlChild.state.selectedVariantNumber.value;
      sharedParameters.selectRng = variantControlChild.state.selectRng.value;
      sharedParameters.allPossibleVariants =
        variantControlChild.state.variants.value;
      // console.log("Selected seed: " + variantControlChild.state.selectedSeed);
    }

    console.log('Document variant: ' + sharedParameters.variant);

    // if subvariants were specified, add those to the corresponding descendants
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

    if (desiredVariant.subvariants !== undefined) {
      if (
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

    // console.log("Desired variant for document");
    // console.log(desiredVariant);
  }

  static determineNumberOfUniqueVariants({ serializedComponent }) {
    if (serializedComponent.children === undefined) {
      return { success: true, numberOfVariants: 1 };
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

    // Find number of variants from variantControl, if it exists
    let numberOfVariants = 100;
    if (
      variantControlInd !== undefined &&
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

    let uniqueVariantData;

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

    let result = getVariantsForDescendants({
      variantNumber: variantNumber,
      serializedComponent: serializedComponent,
      allComponentClasses: allComponentClasses,
    });

    if (!result.success) {
      console.log('Failed to get unique variant for document.');

      return { success: false };
    }

    return {
      success: true,
      desiredVariant: { subvariants: result.desiredVariants },
    };
  }

  static includeBlankStringChildren = true;
}

function numberToLowercaseLetters(number) {
  let letters = '';
  while (true) {
    let nextNum = number % 26;
    letters = String.fromCharCode(97 + nextNum) + letters;
    if (number < 26) {
      break;
    }
    number = Math.floor(number / 26) - 1;
  }
  return letters;
}

function returnDefaultFeedbackDefinitions() {
  return [
    {
      feedbackCode: 'numericalerror',
      feedbackText: `Credit reduced because numbers in your answer weren't quite right.  Did you round too much?`,
    },
    {
      feedbackCode: 'goodjob',
      feedbackText: `Good job!`,
    },
    {
      feedbackCode: 'onesignerror',
      feedbackText: `Credit reduced because it appears that you made a sign error.`,
    },
    {
      feedbackCode: 'twosignerrors',
      feedbackText: `Credit reduced because it appears that you made two sign errors.`,
    },
  ];
}
