import Sequence from './Sequence';
import me from 'math-expressions';
import { enumerateSelectionCombinations } from '../utils/enumeration';
import { processAssignNames } from '../utils/serializedStateProcessing';
import { textToAst } from '../utils/math';
import {
  calculateSequenceParameters,
  numberToLetters,
  lettersToNumber,
} from '../utils/sequence';

export default class SelectFromSequence extends Sequence {
  static componentType = 'selectFromSequence';

  static assignNamesToReplacements = true;

  static createsVariants = true;

  static get stateVariablesShadowedForReference() {
    return [
      ...super.stateVariablesShadowedForReference,
      'excludedCombinations',
    ];
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
    attributes.sortResults = {
      createComponentOfType: 'boolean',
      createStateVariable: 'sortResults',
      defaultValue: false,
      public: true,
    };
    attributes.excludeCombinations = {
      createComponentOfType: '_componentListOfListsWithSelectableType',
    };
    return attributes;
  }

  static returnStateVariableDefinitions() {
    let stateVariableDefinitions = super.returnStateVariableDefinitions();

    stateVariableDefinitions.excludedCombinations = {
      returnDependencies: () => ({
        excludeCombinations: {
          dependencyType: 'attributeComponent',
          attributeName: 'excludeCombinations',
          variableNames: ['lists'],
        },
      }),
      definition: function ({ dependencyValues }) {
        if (dependencyValues.excludeCombinations !== null) {
          return {
            newValues: {
              excludedCombinations:
                dependencyValues.excludeCombinations.stateValues.lists,
            },
          };
        } else {
          return { newValues: { excludedCombinations: [] } };
        }
      },
    };

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

    stateVariableDefinitions.selectedValues = {
      immutable: true,
      additionalStateVariablesDefined: ['selectedIndices'],
      returnDependencies: ({ sharedParameters }) => ({
        // essentialSelectedValues: {
        //   dependencyType: "potentialEssentialVariable",
        //   variableName: "selectedValues",
        // },
        numberToSelect: {
          dependencyType: 'stateVariable',
          variableName: 'numberToSelect',
        },
        withReplacement: {
          dependencyType: 'stateVariable',
          variableName: 'withReplacement',
        },
        length: {
          dependencyType: 'stateVariable',
          variableName: 'length',
        },
        from: {
          dependencyType: 'stateVariable',
          variableName: 'from',
        },
        step: {
          dependencyType: 'stateVariable',
          variableName: 'step',
        },
        exclude: {
          dependencyType: 'stateVariable',
          variableName: 'exclude',
        },
        excludedCombinations: {
          dependencyType: 'stateVariable',
          variableName: 'excludedCombinations',
        },
        type: {
          dependencyType: 'stateVariable',
          variableName: 'type',
        },
        lowercase: {
          dependencyType: 'stateVariable',
          variableName: 'lowercase',
        },
        sortResults: {
          dependencyType: 'stateVariable',
          variableName: 'sortResults',
        },
        variants: {
          dependencyType: 'stateVariable',
          variableName: 'variants',
        },
        selectRng: {
          dependencyType: 'value',
          value: sharedParameters.selectRng,
          doNotProxy: true,
        },
      }),
      definition: makeSelection,
    };

    stateVariableDefinitions.isVariantComponent = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { isVariantComponent: true } }),
    };

    stateVariableDefinitions.isVariantComponent = {
      returnDependencies: () => ({}),
      definition: () => ({ newValues: { isVariantComponent: true } }),
    };

    stateVariableDefinitions.selectedVariantInfo = {
      returnDependencies: () => ({
        selectedIndices: {
          dependencyType: 'stateVariable',
          variableName: 'selectedIndices',
        },
      }),
      definition({ dependencyValues }) {
        let selectedVariantInfo = {
          indices: dependencyValues.selectedIndices,
        };

        return { newValues: { selectedVariantInfo } };
      },
    };

    let originalReturnDependencies =
      stateVariableDefinitions.readyToExpandWhenResolved.returnDependencies;
    stateVariableDefinitions.readyToExpandWhenResolved.returnDependencies =
      function () {
        let deps = originalReturnDependencies();

        deps.selectedValues = {
          dependencyType: 'stateVariable',
          variableName: 'selectedValues',
        };

        return deps;
      };

    return stateVariableDefinitions;
  }

  static createSerializedReplacements({ component, componentInfoObjects }) {
    let replacements = [];

    for (let value of component.stateValues.selectedValues) {
      replacements.push({
        componentType:
          component.stateValues.type === 'letters'
            ? 'text'
            : component.stateValues.type,
        state: { value },
      });
    }

    let processResult = processAssignNames({
      assignNames: component.doenetAttributes.assignNames,
      serializedComponents: replacements,
      parentName: component.componentName,
      parentCreatesNewNamespace: component.attributes.newNamespace,
      componentInfoObjects,
    });

    return { replacements: processResult.serializedComponents };
  }

  static calculateReplacementChanges() {
    return [];
  }

  static determineNumberOfUniqueVariants({ serializedComponent }) {
    let numberToSelect = 1,
      withReplacement = false;
    if (serializedComponent.state !== undefined) {
      if (serializedComponent.state.numberToSelect !== undefined) {
        numberToSelect = serializedComponent.state.numberToSelect;
      }
      if (serializedComponent.state.withReplacement !== undefined) {
        withReplacement = serializedComponent.state.withReplacement;
      }
      if (serializedComponent.state.type !== undefined) {
        sequenceType = serializedComponent.state.type;
      }
    }
    if (serializedComponent.children === undefined) {
      return { succes: false };
    }

    let stringChild;
    let sequencePars = {};
    let excludes = [];
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
      } else if (
        ['type', 'to', 'from', 'step', 'length'].includes(componentType)
      ) {
        // calculate sequencePars only if has its value set directly
        // or if has a child that is a string
        let foundValid = false;
        if (child.state !== undefined && child.state.value !== undefined) {
          sequencePars[componentType] = child.state.value;
          foundValid = true;
        }
        // children overwrite state
        if (child.children !== undefined) {
          for (let grandchild of child.children) {
            if (grandchild.componentType === 'string') {
              sequencePars[componentType] = grandchild.state.value;
              foundValid = true;
              break;
            }
          }
        }
        if (!foundValid) {
          return { success: false };
        }
      } else if (componentType === 'exclude') {
        // calculate exclude if has a string child
        let foundValid = false;
        if (child.children !== undefined) {
          for (let grandchild of child.children) {
            if (grandchild.componentType === 'string') {
              foundValid = true;
              let stringPieces = grandchild.state.value
                .split(',')
                .map((x) => x.trim());
              excludes.push(...stringPieces);
              break;
            }
          }
        }
        if (!foundValid) {
          return { success: false };
        }
      } else if (componentType === 'string') {
        stringChild = child;
      }
    }

    if (stringChild !== undefined) {
      if (sequencePars.to !== undefined || sequencePars.from !== undefined) {
        return { success: false };
      }
      let stringPieces = stringChild.state.value.split(',');
      if (stringPieces.length === 1) {
        sequencePars.to = stringPieces[0].trim();
      } else if (stringPieces.length === 2) {
        sequencePars.from = stringPieces[0].trim();
        sequencePars.to = stringPieces[1].trim();
      } else {
        return { success: false };
      }
    }

    for (let par of ['to', 'from', 'step']) {
      if (sequencePars[par] !== undefined) {
        if (sequencePars.type === 'math') {
          if (typeof sequencePars[par] === 'string') {
            sequencePars[par] = me.fromAst(
              textToAst.convert(sequencePars[par]),
            );
          } else if (sequencePars[par].tree === undefined) {
            return { success: false };
          }
        } else if (sequencePars.type === 'letters' && par !== 'step') {
          sequencePars[par] = lettersToNumber(sequencePars[par]);
          if (sequencePars[par] === undefined) {
            return { success: false };
          }
        } else {
          sequencePars[par] = Number(sequencePars[par]);
          if (!Number.isFinite(sequencePars[par])) {
            return { success: false };
          }
        }
      }
    }

    if (sequencePars.length !== undefined) {
      if (typeof sequencePars.length === 'string') {
        sequencePars.length = Number(sequencePars.length);
      }
      if (!Number.isInteger(sequencePars.length) || sequencePars.length < 0) {
        return { success: false };
      }
    }

    for (let [ind, exc] of excludes.entries()) {
      if (sequencePars.type === 'math') {
        if (typeof exc === 'string') {
          exc = me.fromAst(textToAst.convert(exc));
        } else if (exc.tree === undefined) {
          return { success: false };
        }
      } else if (sequencePars.type === 'letters' && par !== 'step') {
        exc = lettersToNumber(exc);
        if (exc === undefined) {
          return { success: false };
        }
      } else {
        exc = Number(exc);
        if (!Number.isFinite(exc)) {
          return { success: false };
        }
      }
      excludes[ind] = exc;
    }

    // TODO: this presumably does not work anymore since
    // calculateSequenceParameters returns results rather
    // than modifying input parameters
    calculateSequenceParameters(sequencePars);

    let nOptions = sequencePars.length;
    let excludeIndices = [];
    if (excludes.length > 0) {
      if (sequencePars.type !== math) {
        excludes.sort();
        excludes = excludes.filter((x, ind, a) => x != a[ind - 1]);
        for (let item of excludes) {
          if (item < sequencePars.from) {
            continue;
          }
          let ind = (item - sequencePars.from) / sequencePars.step;
          if (ind > sequencePars.length - 1 + 1e-10) {
            break;
          }
          if (Math.abs(ind - Math.round(ind)) < 1e-10) {
            nOptions--;
            excludeIndices.push(ind);
          }
        }
      }
    }

    if (nOptions <= 0) {
      return { success: false };
    }

    let uniqueVariantData = {
      excludeIndices: excludeIndices,
      nOptions: nOptions,
      numberToSelect: numberToSelect,
      withReplacement: withReplacement,
    };

    if (withReplacement || numberToSelect === 1) {
      let numberOfVariants = Math.pow(nOptions, numberToSelect);
      return {
        success: true,
        numberOfVariants: numberOfVariants,
        uniqueVariantData: uniqueVariantData,
      };
    }

    let numberOfVariants = nOptions;
    for (let n = nOptions - 1; n > nOptions - numberToSelect; n--) {
      numberOfVariants *= n;
    }
    return {
      success: true,
      numberOfVariants: numberOfVariants,
      uniqueVariantData: uniqueVariantData,
    };
  }

  static getUniqueVariant({ serializedComponent, variantNumber }) {
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
    let excludeIndices = uniqueVariantData.excludeIndices;
    let nOptions = uniqueVariantData.nOptions;
    let numberToSelect = uniqueVariantData.numberToSelect;
    let withReplacement = uniqueVariantData.withReplacement;

    let getSingleIndex = function (num) {
      let ind = num;
      for (let excludeInd of excludeIndices) {
        if (ind === excludeInd) {
          ind++;
        }
      }
      return ind;
    };

    if (numberToSelect === 1) {
      return {
        success: true,
        desiredVariant: { indices: [getSingleIndex(variantNumber)] },
      };
    }

    let numbers = enumerateSelectionCombinations({
      numberOfIndices: numberToSelect,
      numberOfOptions: nOptions,
      maxNumber: variantNumber + 1,
      withReplacement: withReplacement,
    })[variantNumber];
    let indices = numbers.map(getSingleIndex);
    return { success: true, desiredVariant: { indices: indices } };
  }
}

function makeSelection({ dependencyValues }) {
  // console.log(`make selection`)
  // console.log(dependencyValues)

  // if (dependencyValues.essentialSelectedValues !== null) {
  //   return {
  //     makeEssential: ["selectedValues"],
  //     newValues: {
  //       selectedValues: dependencyValues.essentialSelectedValues
  //     }
  //   }
  // }

  if (dependencyValues.numberToSelect < 1) {
    return {
      makeEssential: { selectedValues: true, selectedIndices: true },
      newValues: {
        selectedValues: [],
        selectedIndices: [],
      },
    };
  }

  let numberUniqueRequired = 1;
  if (!dependencyValues.withReplacement) {
    numberUniqueRequired = dependencyValues.numberToSelect;
  }

  if (numberUniqueRequired > dependencyValues.length) {
    throw Error(
      'Cannot select ' +
        numberUniqueRequired +
        ' values from a sequence of length ' +
        dependencyValues.length,
    );
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
      let n = dependencyValues.length;
      desiredIndices = desiredIndices.map((x) => ((x % n) + n) % n);

      // assume that we have an excluded combination
      // until we determine that we aren't matching an excluded combination
      let isExcludedCombination = true;

      let selectedValues = [];
      for (let index of desiredIndices) {
        let componentValue = dependencyValues.from;
        if (index > 0) {
          if (dependencyValues.type === 'math') {
            componentValue = componentValue
              .add(dependencyValues.step.multiply(me.fromAst(index)))
              .expand()
              .simplify();
          } else {
            componentValue += dependencyValues.step * index;
          }
        }

        if (dependencyValues.type === 'letters') {
          componentValue = numberToLetters(
            componentValue,
            dependencyValues.lowercase,
          );
        }

        // throw error if asked for an excluded value
        if (dependencyValues.type === 'math') {
          if (dependencyValues.exclude.some((x) => x.equals(componentValue))) {
            throw Error(
              'Specified index of selectfromsequence that was excluded',
            );
          }
        } else {
          if (dependencyValues.exclude.includes(componentValue)) {
            throw Error(
              'Specified index of selectfromsequence that was excluded',
            );
          }
        }

        // check if matches the corresponding component of an excluded combination
        let matchedExcludedCombinationIndex = false;
        if (dependencyValues.type === 'math') {
          if (
            dependencyValues.excludedCombinations.some((x) =>
              [x, index].equals(componentValue),
            )
          ) {
            matchedExcludedCombinationIndex = true;
          }
        } else {
          if (
            dependencyValues.excludedCombinations.some(
              (x) => x[index] === componentValue,
            )
          ) {
            matchedExcludedCombinationIndex = true;
          }
        }

        if (!matchedExcludedCombinationIndex) {
          isExcludedCombination = false;
        }

        selectedValues.push(componentValue);
      }

      if (isExcludedCombination) {
        throw Error(
          'Specified indices of selectfromsequence that was an excluded combination',
        );
      }

      return {
        makeEssential: { selectedValues: true, selectedIndices: true },
        newValues: { selectedValues, selectedIndices: desiredIndices },
      };
    }
  }

  let numberCombinationsExcluded = dependencyValues.excludedCombinations.length;

  let selectedValues, selectedIndices;

  if (numberCombinationsExcluded === 0) {
    let selectedObj = selectValuesAndIndices({
      stateValues: dependencyValues,
      numberUniqueRequired: numberUniqueRequired,
      numberToSelect: dependencyValues.numberToSelect,
      withReplacement: dependencyValues.withReplacement,
      rng: dependencyValues.selectRng,
    });

    selectedValues = selectedObj.selectedValues;
    selectedIndices = selectedObj.selectedIndices;
  } else {
    let numberPossibilities =
      dependencyValues.length - dependencyValues.exclude.length;

    if (dependencyValues.withReplacement) {
      numberPossibilities = Math.pow(
        numberPossibilities,
        dependencyValues.numberToSelect,
      );
    } else {
      let n = numberPossibilities;
      for (let i = 1; i < dependencyValues.numberToSelect; i++) {
        numberPossibilities *= n - i;
      }
    }

    // console.log(`numberPossibilities: ${numberPossibilities}`)

    if (numberCombinationsExcluded > 0.7 * numberPossibilities) {
      throw Error('Excluded over 70% of combinations in selectFromSequence');
    }

    // with 200 chances with at least 70% success,
    // prob of failure less than 10^(-30)
    let foundValidCombination = false;
    for (let sampnum = 0; sampnum < 200; sampnum++) {
      let selectedObj = selectValuesAndIndices({
        stateValues: dependencyValues,
        numberUniqueRequired: numberUniqueRequired,
        numberToSelect: dependencyValues.numberToSelect,
        withReplacement: dependencyValues.withReplacement,
        rng: dependencyValues.selectRng,
      });

      selectedValues = selectedObj.selectedValues;
      selectedIndices = selectedObj.selectedIndices;

      // try again if hit excluded combination
      if (dependencyValues.type === 'math') {
        if (
          dependencyValues.excludedCombinations.some((x) =>
            x.every((v, i) => v.equals(selectedValues[i])),
          )
        ) {
          continue;
        }
      } else {
        if (
          dependencyValues.excludedCombinations.some((x) =>
            x.every((v, i) => v === selectedValues[i]),
          )
        ) {
          continue;
        }
      }

      foundValidCombination = true;
      break;
    }

    if (!foundValidCombination) {
      // this won't happen, as occurs with prob < 10^(-30)
      throw Error(
        "By extremely unlikely fluke, couldn't select combination of random values",
      );
    }
  }

  if (dependencyValues.sortResults) {
    // combine selectedIndices and selectedValues to sort together
    let combinedList = [];
    for (let [ind, val] of selectedValues.entries()) {
      combinedList.push({ value: val, index: selectedIndices[ind] });
    }

    if (dependencyValues.type === 'number') {
      combinedList.sort((a, b) => a.value - b.value);
    } else if (dependencyValues.type === 'letters') {
      // sort according to their numerical value, not as words
      combinedList.sort(
        (a, b) => lettersToNumber(a.value) - lettersToNumber(b.value),
      );
    }

    selectedValues = combinedList.map((x) => x.value);
    selectedIndices = combinedList.map((x) => x.index);

    // don't sort type math
  }

  return {
    makeEssential: { selectedValues: true, selectedIndices: true },
    newValues: { selectedValues, selectedIndices },
  };
}

function selectValuesAndIndices({
  stateValues,
  numberUniqueRequired = 1,
  numberToSelect = 1,
  withReplacement = false,
  rng,
}) {
  let selectedValues = [];
  let selectedIndices = [];

  if (
    stateValues.exclude.length + numberUniqueRequired <
    0.5 * stateValues.length
  ) {
    // the simplest case where the likelihood of getting excluded is less than 50%
    // just randomly select from all possibilities
    // and use rejection method to resample if an excluded is hit

    for (let ind = 0; ind < numberToSelect; ind++) {
      // with 100 chances with at least 50% success,
      // prob of failure less than 10^(-30)
      let foundValid = false;
      let componentValue;
      let selectedIndex;
      for (let sampnum = 0; sampnum < 100; sampnum++) {
        // random number in [0, 1)
        let rand = rng();
        // random integer from 0 to length-1
        selectedIndex = Math.floor(rand * stateValues.length);

        if (!withReplacement && selectedIndices.includes(selectedIndex)) {
          continue;
        }

        componentValue = stateValues.from;
        if (selectedIndex > 0) {
          if (stateValues.type === 'math') {
            componentValue = componentValue
              .add(stateValues.step.multiply(me.fromAst(selectedIndex)))
              .expand()
              .simplify();
          } else {
            componentValue += stateValues.step * selectedIndex;
          }
        }

        // try again if hit excluded value
        if (stateValues.type === 'math') {
          if (stateValues.exclude.some((x) => x.equals(componentValue))) {
            continue;
          }
        } else {
          if (stateValues.exclude.includes(componentValue)) {
            continue;
          }
        }

        foundValid = true;
        break;
      }

      if (!foundValid) {
        // this won't happen, as occurs with prob < 10^(-30)
        throw Error(
          "By extremely unlikely fluke, couldn't select random value",
        );
      }

      if (stateValues.type === 'letters') {
        componentValue = numberToLetters(componentValue, stateValues.lowercase);
      }
      selectedValues.push(componentValue);
      selectedIndices.push(selectedIndex);
    }

    return { selectedValues, selectedIndices };
  }

  // for cases when a large fraction might be excluded
  // we will generate the list of possible values and pick from those

  let possibleValues = [];

  for (let ind = 0; ind < stateValues.length; ind++) {
    let componentValue = stateValues.from;
    if (ind > 0) {
      if (stateValues.type === 'math') {
        componentValue = componentValue
          .add(stateValues.step.multiply(me.fromAst(ind)))
          .expand()
          .simplify();
      } else {
        componentValue += stateValues.step * ind;
      }
    }

    if (stateValues.type === 'math') {
      if (stateValues.exclude.some((x) => x.equals(componentValue))) {
        continue;
      }
    } else {
      if (stateValues.exclude.includes(componentValue)) {
        continue;
      }
    }

    if (stateValues.type === 'letters') {
      componentValue = numberToLetters(componentValue, stateValues.lowercase);
    }

    possibleValues.push(componentValue);
  }

  let numPossibleValues = possibleValues.length;

  if (numberUniqueRequired > numPossibleValues) {
    throw Error(
      'Cannot select ' +
        numberUniqueRequired +
        ' unique values from sequence of length ' +
        numPossibleValues,
    );
  }

  if (numberUniqueRequired === 1) {
    for (let ind = 0; ind < numberToSelect; ind++) {
      // random number in [0, 1)
      let rand = rng();
      // random integer from 0 to numPossibleValues-1
      let selectedIndex = Math.floor(rand * numPossibleValues);

      selectedIndices.push(selectedIndex);
      selectedValues.push(possibleValues[selectedIndex]);
    }

    return { selectedValues, selectedIndices };
  }

  // need to select more than one value without replacement
  // shuffle array and choose first elements
  // https://stackoverflow.com/a/12646864
  let possibleIndices = [...Array(possibleValues.length).keys()];
  for (let i = possibleValues.length - 1; i > 0; i--) {
    const rand = rng();
    const j = Math.floor(rand * (i + 1));
    [possibleValues[i], possibleValues[j]] = [
      possibleValues[j],
      possibleValues[i],
    ];
    [possibleIndices[i], possibleIndices[j]] = [
      possibleIndices[j],
      possibleIndices[i],
    ];
  }

  selectedValues = possibleValues.slice(0, numberToSelect);
  selectedIndices = possibleIndices.slice(0, numberToSelect);
  return { selectedValues, selectedIndices };
}
