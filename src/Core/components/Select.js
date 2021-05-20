import CompositeComponent from './abstract/CompositeComponent';
import {
  enumerateSelectionCombinations,
  enumerateCombinations,
} from '../utils/enumeration';
import { getVariantsForDescendants } from '../utils/variants';
import { deepClone } from '../utils/deepFunctions';
import { processAssignNames } from '../utils/serializedStateProcessing';
import me from 'math-expressions';
import { textToAst } from '../utils/math';

export default class Select extends CompositeComponent {
  static componentType = 'select';

  // static assignNewNamespaceToAllChildrenExcept = Object.keys(this.createAttributesObject({})).map(x => x.toLowerCase());
  static assignNamesToReplacements = true;

  static createsVariants = true;

  // used when referencing this component without prop
  static useChildrenForReference = false;
  static get stateVariablesShadowedForReference() {
    return ['selectedIndices'];
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.numberToSelect = {
      createComponentOfType: 'number',
      createStateVariable: 'numberToSelect',
      defaultValue: 1,
      public: true,
    };
    attributes.withReplacement = {
      createComponentOfType: 'boolean',
      createStateVariable: 'withReplacement',
      defaultValue: false,
      public: true,
    };
    attributes.type = {
      createPrimitiveOfType: 'string',
    };
    return attributes;
  }

  static returnSugarInstructions() {
    let sugarInstructions = super.returnSugarInstructions();

    function breakStringsIntoOptionsBySpaces({
      matchedChildren,
      componentAttributes,
    }) {
      let type;
      if (componentAttributes.type) {
        type = componentAttributes.type;
      } else {
        type = 'math';
      }

      if (!['math', 'text', 'number'].includes(type)) {
        console.warn(`Invalid type ${type}`);
        type = 'math';
      }

      // break any string by white space and wrap pieces with option and type

      let newChildren = matchedChildren.reduce(function (a, c) {
        if (c.componentType === 'string') {
          return [
            ...a,
            ...c.state.value
              .split(/\s+/)
              .filter((s) => s)
              .map((s) =>
                type === 'math'
                  ? me.fromAst(textToAst.convert(s))
                  : type === 'number'
                  ? Number(s)
                  : s,
              )
              .map((s) => ({
                componentType: 'option',
                children: [
                  {
                    componentType: type,
                    state: { value: s },
                  },
                ],
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
    }

    sugarInstructions.push({
      replacementFunction: breakStringsIntoOptionsBySpaces,
    });

    return sugarInstructions;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    childLogic.newLeaf({
      name: 'atLeastZeroOptions',
      componentType: 'option',
      comparison: 'atLeast',
      number: 0,
      setAsBase: true,
    });

    return childLogic;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.variants = {
      returnDependencies: () => ({
        variants: {
          dependencyType: 'variants',
        },
      }),
      definition: function ({ dependencyValues }) {
        return { newValues: { variants: dependencyValues.variants } };
      },
    };

    stateVariableDefinitions.currentVariantName = {
      returnDependencies: ({ sharedParameters }) => ({
        variant: {
          dependencyType: 'value',
          value: sharedParameters.variant,
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: { currentVariantName: dependencyValues.variant },
      }),
    };

    stateVariableDefinitions.allPossibleVariants = {
      returnDependencies: ({ sharedParameters }) => ({
        allPossibleVariants: {
          dependencyType: 'value',
          value: sharedParameters.allPossibleVariants,
        },
      }),
      definition: ({ dependencyValues }) => ({
        newValues: {
          allPossibleVariants: dependencyValues.allPossibleVariants,
        },
      }),
    };

    stateVariableDefinitions.nOptions = {
      additionalStateVariablesDefined: ['optionChildren'],
      returnDependencies: () => ({
        optionChildren: {
          dependencyType: 'child',
          childLogicName: 'atLeastZeroOptions',
          variableNames: ['selectForVariants', 'selectWeight'],
        },
      }),
      definition({ dependencyValues }) {
        return {
          newValues: {
            optionChildren: dependencyValues.optionChildren,
            nOptions: dependencyValues.optionChildren.length,
          },
        };
      },
    };

    stateVariableDefinitions.availableVariants = {
      returnDependencies: () => ({
        optionChildren: {
          dependencyType: 'stateVariable',
          variableName: 'optionChildren',
        },
        numberToSelect: {
          dependencyType: 'stateVariable',
          variableName: 'numberToSelect',
        },
        allPossibleVariants: {
          dependencyType: 'stateVariable',
          variableName: 'allPossibleVariants',
        },
      }),
      definition: function ({ dependencyValues }) {
        console.log(dependencyValues);

        let availableVariants = {};
        for (let [
          ind,
          optionChild,
        ] of dependencyValues.optionChildren.entries()) {
          for (let variant of optionChild.stateValues.selectForVariants) {
            let variantLower = variant.toLowerCase();
            if (availableVariants[variantLower] === undefined) {
              availableVariants[variantLower] = [];
            }
            availableVariants[variantLower].push(ind);
          }
        }

        for (let variant in availableVariants) {
          if (
            availableVariants[variant].length !==
            dependencyValues.numberToSelect
          ) {
            throw Error(
              'Invalid variant for select.  Variant ' +
                variant +
                ' appears in ' +
                availableVariants[variant].length +
                ' options but number to select is ' +
                numberToSelect,
            );
          }
        }

        if (Object.keys(availableVariants).length > 0) {
          // if have at least one variant specified,
          // then require that all possible variants have a variant specified
          for (let variant of dependencyValues.allPossibleVariants) {
            if (!(variant in availableVariants)) {
              throw Error(
                'Some variants are specified for select but no options are specified for possible variant: ' +
                  variant,
              );
            }
          }
          for (let variant in availableVariants) {
            if (!dependencyValues.allPossibleVariants.includes(variant)) {
              throw Error(
                'Variant ' +
                  variant +
                  ' that is specified for select is not a possible variant.',
              );
            }
          }
        }

        return {
          newValues: { availableVariants },
        };
      },
    };

    stateVariableDefinitions.selectedIndices = {
      returnDependencies: ({ sharedParameters }) => ({
        // essentialSelectedIndices: {
        //   dependencyType: "potentialEssentialVariable",
        //   variableName: "selectedIndex",
        // },
        numberToSelect: {
          dependencyType: 'stateVariable',
          variableName: 'numberToSelect',
        },
        withReplacement: {
          dependencyType: 'stateVariable',
          variableName: 'withReplacement',
        },
        optionChildren: {
          dependencyType: 'stateVariable',
          variableName: 'optionChildren',
        },
        nOptions: {
          dependencyType: 'stateVariable',
          variableName: 'nOptions',
        },
        currentVariantName: {
          dependencyType: 'stateVariable',
          variableName: 'currentVariantName',
        },
        variants: {
          dependencyType: 'stateVariable',
          variableName: 'variants',
        },
        availableVariants: {
          dependencyType: 'stateVariable',
          variableName: 'availableVariants',
        },
        selectRng: {
          dependencyType: 'value',
          value: sharedParameters.selectRng,
          doNotProxy: true,
        },
      }),
      definition: function ({ dependencyValues }) {
        // console.log(`definition of selected Indices`)
        // console.log(dependencyValues);

        // if (dependencyValues.essentialSelectedIndices !== null) {
        //   return {
        //     makeEssential: ["selectedIndices"],
        //     newValues: {
        //       selectedIndices: dependencyValues.essentialSelectedIndices
        //     },
        //     makeImmutable: ["selectedIndices"]
        //   }
        // }

        if (
          !(dependencyValues.numberToSelect >= 1) ||
          dependencyValues.nOptions === 0
        ) {
          return {
            makeEssential: { selectedIndices: true },
            newValues: {
              selectedIndices: [],
            },
            makeImmutable: ['selectedIndices'],
          };
        }

        // if desiredIndices is specfied, use those
        if (
          dependencyValues.variants &&
          dependencyValues.variants.desiredVariant !== undefined
        ) {
          let desiredIndices = dependencyValues.variants.desiredVariant.indices;
          if (desiredIndices !== undefined) {
            if (desiredIndices.length !== dependencyValues.numberToSelect) {
              throw Error(
                'Number of indices specified for select must match number to select',
              );
            }
            desiredIndices = desiredIndices.map(Number);
            if (!desiredIndices.every(Number.isInteger)) {
              throw Error('All indices specified for select must be integers');
            }
            let n = dependencyValues.nOptions;
            desiredIndices = desiredIndices.map((x) => ((x % n) + n) % n);

            return {
              makeEssential: { selectedIndices: true },
              newValues: {
                selectedIndices: desiredIndices,
              },
              makeImmutable: ['selectedIndices'],
            };
          }
        }

        // first check if have a variant for which options are specified
        let variantOptions =
          dependencyValues.availableVariants[
            dependencyValues.currentVariantName
          ];

        if (variantOptions !== undefined) {
          if (dependencyValues.numberToSelect > 1) {
            // shallow copy to remove proxy so can shuffle
            variantOptions = [...variantOptions];

            // first shuffle the array of indices
            // https://stackoverflow.com/a/12646864
            for (let i = dependencyValues.numberToSelect - 1; i > 0; i--) {
              const rand = dependencyValues.selectRng();
              const j = Math.floor(rand * (i + 1));
              [variantOptions[i], variantOptions[j]] = [
                variantOptions[j],
                variantOptions[i],
              ];
            }
          }
          return {
            makeEssential: { selectedIndices: true },
            newValues: {
              selectedIndices: variantOptions,
            },
            makeImmutable: ['selectedIndices'],
          };
        }

        let selectedIndices = [];

        let numberUniqueRequired = 1;
        if (!dependencyValues.withReplacement) {
          numberUniqueRequired = dependencyValues.numberToSelect;
        }

        if (numberUniqueRequired > dependencyValues.nOptions) {
          throw Error(
            'Cannot select ' +
              numberUniqueRequired +
              ' components from only ' +
              dependencyValues.nOptions,
          );
        }

        // normalize selectWeights to sum to 1
        let selectWeightByChild = dependencyValues.optionChildren.map(
          (x) => x.stateValues.selectWeight,
        );
        let totalWeight = selectWeightByChild.reduce((a, c) => a + c);
        selectWeightByChild = selectWeightByChild.map((x) => x / totalWeight);

        //https://stackoverflow.com/a/44081700
        let cumulativeWeights = selectWeightByChild.reduce(
          (a, x, i) => [...a, x + (a[i - 1] || 0)],
          [],
        );
        let indsRemaining = [...Array(cumulativeWeights.length).keys()];

        for (let ind = 0; ind < dependencyValues.numberToSelect; ind++) {
          // random number in [0, 1)
          let rand = dependencyValues.selectRng();

          // find largest index where cumulativeWeight is larger than rand
          // using binary search
          let start = -1,
            end = cumulativeWeights.length - 1;
          while (start < end - 1) {
            let mid = Math.floor((start + end) / 2); // mid point
            if (cumulativeWeights[mid] > rand) {
              end = mid;
            } else {
              start = mid;
            }
          }

          let selectedInd = indsRemaining[end];
          selectedIndices.push(selectedInd);

          if (
            !dependencyValues.withReplacement &&
            ind < dependencyValues.numberToSelect - 1
          ) {
            // remove selected index and renormalize weights
            selectWeightByChild.splice(end, 1);
            indsRemaining.splice(end, 1);
            totalWeight = selectWeightByChild.reduce((a, c) => a + c);
            selectWeightByChild = selectWeightByChild.map(
              (x) => x / totalWeight,
            );
            cumulativeWeights = selectWeightByChild.reduce(
              (a, x, i) => [...a, x + (a[i - 1] || 0)],
              [],
            );
          }
        }

        return {
          makeEssential: { selectedIndices: true },
          newValues: {
            selectedIndices,
          },
          makeImmutable: ['selectedIndices'],
        };
      },
    };

    stateVariableDefinitions.isVariantComponent = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { isVariantComponent: true } }),
    };

    stateVariableDefinitions.selectedVariantInfo = {
      returnDependencies: ({ componentInfoObjects }) => ({
        selectedIndices: {
          dependencyType: 'stateVariable',
          variableName: 'selectedIndices',
        },
        variantDescendants: {
          dependencyType: 'descendant',
          componentTypes: Object.keys(
            componentInfoObjects.componentTypeWithPotentialVariants,
          ),
          variableNames: ['isVariantComponent', 'selectedVariantInfo'],
          useReplacementsForComposites: true,
          recurseToMatchedChildren: false,
          variablesOptional: true,
          includeNonActiveChildren: true,
          ignoreReplacementsOfMatchedComposites: true,
          definingChildrenFirst: true,
        },
      }),
      definition({ dependencyValues }) {
        let selectedVariantInfo = {
          indices: dependencyValues.selectedIndices,
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

    stateVariableDefinitions.readyToExpandWhenResolved = {
      returnDependencies: () => ({
        selectedIndices: {
          dependencyType: 'stateVariable',
          variableName: 'selectedIndices',
        },
      }),
      definition() {
        return {
          newValues: { readyToExpandWhenResolved: true },
        };
      },
    };

    return stateVariableDefinitions;
  }

  static createSerializedReplacements({
    component,
    components,
    componentInfoObjects,
  }) {
    console.log(
      `create serialized replacements for ${component.componentName}`,
    );

    let replacements = [];

    for (let selectedIndex of component.stateValues.selectedIndices) {
      let selectedChildName =
        component.stateValues.optionChildren[selectedIndex].componentName;

      // use state, not stateValues, as read only proxy messes up internal
      // links between descendant variant components and the components themselves

      let selectedChild = components[selectedChildName];

      let serializedGrandchildren = deepClone(
        selectedChild.state.serializedChildren.value,
      );
      let serializedChild = {
        componentType: 'option',
        state: { rendered: true },
        doenetAttributes: Object.assign({}, selectedChild.doenetAttributes),
        children: serializedGrandchildren,
        originalName: selectedChildName,
      };

      if (selectedChild.attributes.newNamespace) {
        serializedChild.attributes = { newNamespace: true };
      }

      if (selectedChild.variants) {
        serializedChild.variants = deepClone(selectedChild.variants);
      }

      replacements.push(serializedChild);
    }

    // if subvariants were specified, add those the corresponding descendants
    if (component.variants && component.variants.desiredVariant !== undefined) {
      let desiredVariant = component.variants.desiredVariant;
      if (
        desiredVariant !== undefined &&
        desiredVariant.subvariants !== undefined &&
        component.variants.descendantVariantComponents !== undefined
      ) {
        // collect descendantVariantComponents that would be in select
        // if it just had the selected indicies
        let descendantVariantComponents = [];
        for (let r of replacements) {
          if (r.variants !== undefined) {
            if (r.variants.isVariantComponent) {
              descendantVariantComponents.push(r);
            } else if (r.variants.descendantVariantComponents) {
              descendantVariantComponents.push(
                ...r.variants.descendantVariantComponents,
              );
            }
          }
        }
        for (let ind in desiredVariant.subvariants) {
          let subvariant = desiredVariant.subvariants[ind];
          let variantComponent = descendantVariantComponents[ind];
          if (variantComponent === undefined) {
            break;
          }
          variantComponent.variants.desiredVariant = subvariant;
        }
      }
    }

    let processResult = processAssignNames({
      assignNames: component.doenetAttributes.assignNames,
      serializedComponents: replacements,
      parentName: component.componentName,
      parentCreatesNewNamespace: component.attributes.newNamespace,
      componentInfoObjects,
    });

    // console.log(`replacements for select`)
    // console.log(deepClone(processResult.serializedComponents));

    return { replacements: processResult.serializedComponents };
  }

  static calculateReplacementChanges() {
    return [];
  }

  static determineNumberOfUniqueVariants({ serializedComponent }) {
    let numberToSelect = 1,
      withReplacement = false;
    let numberOfVariantsByChild = [];
    let childrenToSelect = [];
    if (serializedComponent.state !== undefined) {
      if (serializedComponent.state.numberToSelect !== undefined) {
        numberToSelect = serializedComponent.state.numberToSelect;
      }
      if (serializedComponent.state.withReplacement !== undefined) {
        withReplacement = serializedComponent.state.withReplacement;
      }
    }
    if (serializedComponent.children === undefined) {
      return { succes: false };
    }

    let stringChild;
    for (let child of serializedComponent.children) {
      let componentType = child.componentType;
      if (componentType === 'numberToSelect') {
        // calculate numberToSelect only if has its value set directly
        // or if has a child that is a string
        let foundValid = false;
        if (child.state !== undefined && child.state.value !== undefined) {
          numberToSelect = Math.round(Number(child.state.value));
          foundValid = true;
        }
        // children overwrite state
        if (child.children !== undefined) {
          for (let grandchild of child.children) {
            if (grandchild.componentType === 'string') {
              numberToSelect = Math.round(Number(grandchild.state.value));
              foundValid = true;
              break;
            }
          }
        }
        if (!foundValid) {
          return { success: false };
        }
      } else if (componentType === 'withReplacement') {
        // calculate withReplacement only if has its implicitValue or value set directly
        // or if has a child that is a string
        let foundValid = false;
        if (child.state !== undefined) {
          if (child.state.implicitValue !== undefined) {
            withReplacement = child.state.implicitValue;
            foundValid = true;
          }
          if (child.state.value !== undefined) {
            withReplacement = child.state.value;
            foundValid = true;
          }
        }
        // children overwrite state
        if (child.children !== undefined) {
          for (let grandchild of child.children) {
            if (grandchild.componentType === 'string') {
              foundValid = true;
              if (grandchild.state.value.trim().toLowerCase() === 'true') {
                withReplacement = true;
              } else {
                withReplacement = false;
              }
              break;
            }
          }
        }

        if (!foundValid) {
          return { success: false };
        }
      } else if (componentType === 'selectWeight') {
        // uniqueVariants disabled if have a child with selectWeight specified
        return { succes: false };
      } else if (
        componentType !== 'hide' &&
        componentType !== 'modifyIndirectly'
      ) {
        if (componentType === 'string') {
          stringChild = child;
        }
        let childvariants = 1;
        if (
          child.variants !== undefined &&
          child.variants.numberOfVariants !== undefined
        ) {
          childvariants = child.variants.numberOfVariants;
        }
        numberOfVariantsByChild.push(childvariants);
        childrenToSelect.push(child);
      }
    }
    // console.log("numberOfVariantsByChild")
    // console.log(numberOfVariantsByChild)
    if (numberOfVariantsByChild.length === 0) {
      return { success: false };
    }

    // if have one string child, it will be broken into children by spaces
    // account for number of resulting children, each with one variant
    if (stringChild !== undefined && numberOfVariantsByChild.length === 1) {
      let numPieces = stringChild.state.value.split(/s+/).length;
      numberOfVariantsByChild = Array(numPieces).fill(1);
    }

    let uniqueVariantData = {
      numberOfVariantsByChild: numberOfVariantsByChild,
      numberToSelect: numberToSelect,
      withReplacement: withReplacement,
      childrenToSelect: childrenToSelect,
    };

    if (withReplacement || numberToSelect === 1) {
      let numberOfOptionsPerSelection = numberOfVariantsByChild.reduce(
        (a, c) => a + c,
      );
      let numberOfVariants = Math.pow(
        numberOfOptionsPerSelection,
        numberToSelect,
      );
      return {
        success: true,
        numberOfVariants: numberOfVariants,
        uniqueVariantData: uniqueVariantData,
      };
    }
    let numberOfChildren = numberOfVariantsByChild.length;

    if (numberToSelect > numberOfChildren) {
      return { success: false };
    }

    let firstNumber = numberOfVariantsByChild[0];
    let allSameNumber = numberOfVariantsByChild
      .slice(1)
      .every((x) => x === firstNumber);

    if (allSameNumber) {
      let numberOfPermutations = numberOfChildren;
      for (
        let n = numberOfChildren - 1;
        n > numberOfChildren - numberToSelect;
        n--
      ) {
        numberOfPermutations *= n;
      }
      let numberOfVariants =
        numberOfPermutations * Math.pow(firstNumber, numberToSelect);
      return {
        success: true,
        numberOfVariants: numberOfVariants,
        uniqueVariantData: uniqueVariantData,
      };
    }

    // have select without replacement where options have different numbers of variants
    let numberOfVariants = countOptions(
      numberOfVariantsByChild,
      numberToSelect,
    );
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

    let uniqueVariantData = serializedComponent.variants.uniqueVariantData;
    let numberOfVariantsByChild = uniqueVariantData.numberOfVariantsByChild;
    let numberToSelect = uniqueVariantData.numberToSelect;
    let withReplacement = uniqueVariantData.withReplacement;
    let numberOfChildren = numberOfVariantsByChild.length;
    let childrenToSelect = uniqueVariantData.childrenToSelect;

    let combinations = enumerateSelectionCombinations({
      numberOfIndices: numberToSelect,
      numberOfOptions: numberOfChildren,
      maxNumber: variantNumber + 1,
      withReplacement: withReplacement,
    });

    // console.log(combinations);

    let numberOfCombinations = combinations.length;
    // console.log("number of combinations: " + numberOfCombinations);

    // for each combination, determine the number of possibilities
    let combinationsAvailable = combinations.map((x) => ({
      combination: x,
      numberOfPossibilities: x.reduce(
        (a, c) => a * numberOfVariantsByChild[c],
        1,
      ),
    }));

    // console.log(combinationsAvailable);
    // console.log(numberOfVariantsByChild);

    // The variants, in order, will
    // select the first possibility from each combination
    // followed by the second possibility, etc.
    // When the possibilities from the combination are exhaust
    // skip that combination

    let combinationsLeft = [...Array(numberOfCombinations).keys()];
    let possibilitiesUsed = 0;
    let nCombinationsLeft = combinationsLeft.length;
    let combinationIndexSelected, variantNumberOfSelected;

    let variantNumberLeft = variantNumber;

    while (nCombinationsLeft > 0) {
      // find minimum number of possibilities in those that are left

      let minNumPos = combinationsLeft
        .map((ind) => combinationsAvailable[ind])
        .reduce((a, c) => Math.min(a, c.numberOfPossibilities), Infinity);

      let chunksize = minNumPos - possibilitiesUsed;

      if (variantNumberLeft < chunksize * nCombinationsLeft) {
        // won't exhaust the possibilities for any combination
        combinationIndexSelected =
          combinationsLeft[variantNumberLeft % nCombinationsLeft];
        variantNumberOfSelected =
          possibilitiesUsed + Math.floor(variantNumberLeft / nCombinationsLeft);
        break;
      } else {
        possibilitiesUsed += chunksize;
        variantNumberLeft -= chunksize * nCombinationsLeft;
        combinationsLeft = combinationsLeft.filter(
          (ind) =>
            combinationsAvailable[ind].numberOfPossibilities >
            possibilitiesUsed,
        );
        nCombinationsLeft = combinationsLeft.length;
      }
    }

    // console.log("combinationIndexSelected: " + combinationIndexSelected)
    // console.log("variantNumberOfSelected: " + variantNumberOfSelected)

    let selectedCombination = combinations[combinationIndexSelected];
    // console.log("selectedCombination: " + selectedCombination)

    let indicesForEachChild = enumerateCombinations({
      numberOfOptionsByIndex: selectedCombination.map(
        (x) => numberOfVariantsByChild[x],
      ),
      maxNumber: variantNumberOfSelected + 1,
    })[variantNumberOfSelected];

    // console.log("indicesForEachChild: " + indicesForEachChild)

    // for each selected child, find the descendant variant components
    // and map the variant number (index) of that child
    // to the indices of those descendat variant components

    let subvariants = [];

    let haveNontrivialSubvariants = false;
    for (let [ind, childNum] of selectedCombination.entries()) {
      if (numberOfVariantsByChild[childNum] > 1) {
        let child = childrenToSelect[childNum];
        if (child.variants.isVariantComponent) {
          let compClass = allComponentClasses[child.componentType];
          let result = compClass.getUniqueVariant({
            serializedComponent: child,
            variantNumber: indicesForEachChild[ind],
            allComponentClasses: allComponentClasses,
          });
          if (!result.success) {
            return { success: false };
          }
          subvariants.push(result.desiredVariant);
        } else {
          let result = getVariantsForDescendants({
            variantNumber: indicesForEachChild[ind],
            serializedComponent: child,
            allComponentClasses: allComponentClasses,
          });
          if (!result.success) {
            return { success: false };
          }
          subvariants.push(...result.desiredVariants);
        }
        haveNontrivialSubvariants = true;
      } else {
        subvariants.push({});
      }
    }

    let desiredVariant = { indices: selectedCombination };
    if (haveNontrivialSubvariants) {
      desiredVariant.subvariants = subvariants;
    }
    return { success: true, desiredVariant: desiredVariant };
  }
}

// counts the number of options (including permutations)
// where you can select numItems from numOptionsByItem (without replacement)
// and each select gets multiplied by the total number of options of that selection
let countOptions = function (numOptionsByItem, numItems) {
  if (numItems === 0) {
    return 0;
  }
  if (numItems === 1) {
    // if select just one item, simply add up all the different options
    return numOptionsByItem.reduce((a, c) => a + c);
  }
  let numOptions = 0;
  for (let ind in numOptionsByItem) {
    let num = numOptionsByItem[ind];
    let rest = [...numOptionsByItem];
    rest.splice(ind, 1); // remove selected item
    numOptions += num * countOptions(rest, numItems - 1);
  }
  return numOptions;
};
