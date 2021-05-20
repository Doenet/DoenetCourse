import CompositeComponent from './abstract/CompositeComponent';
import MathComponent from './Math';
import me from 'math-expressions';
import {
  breakEmbeddedStringByCommas,
  breakIntoVectorComponents,
} from './commonsugar/breakstrings';
import { latexToAst, normalizeMathExpression, textToAst } from '../utils/math';

export default class Substitute extends CompositeComponent {
  static componentType = 'substitute';

  static defaultType = 'number';

  static previewSerializedComponent({
    serializedComponent,
    sharedParameters,
    components,
  }) {
    if (serializedComponent.children === undefined) {
      return;
    }

    let typeInd;
    for (let [ind, child] of serializedComponent.children.entries()) {
      if (
        child.componentType === 'type' ||
        (child.createdComponent &&
          components[child.componentName].componentType === 'type')
      ) {
        typeInd = ind;
        break;
      }
    }

    let simplifyInd;
    for (let [ind, child] of serializedComponent.children.entries()) {
      if (
        child.componentType === 'simplify' ||
        (child.createdComponent &&
          components[child.componentName].componentType === 'simplify')
      ) {
        simplifyInd = ind;
        break;
      }
    }

    let creationInstructions = [];
    if (typeInd !== undefined) {
      creationInstructions.push({ createChildren: [typeInd] });
    }
    if (simplifyInd !== undefined) {
      creationInstructions.push({ createChildren: [simplifyInd] });
    }

    creationInstructions.push({ callMethod: 'setUpTypeSimplify' });
    return creationInstructions;
  }

  static setUpTypeSimplify({
    sharedParameters,
    definingChildrenSoFar,
    serializedComponent,
  }) {
    let typeChild;
    for (let child of definingChildrenSoFar) {
      if (child !== undefined && child.componentType === 'type') {
        typeChild = child;
        break;
      }
    }

    if (typeChild !== undefined) {
      if (!['math', 'text'].includes(typeChild.state.value)) {
        throw Error('Substitute type must be text or math');
      }
      sharedParameters.defaultType = typeChild.state.value;
    }

    // check for simplify child
    let simplifyChild;
    for (let child of definingChildrenSoFar) {
      if (child !== undefined && child.componentType === 'simplify') {
        simplifyChild = child;
        break;
      }
    }

    if (simplifyChild !== undefined) {
      sharedParameters.simplify = simplifyChild.state.value;
    }
  }

  static createAttributesObject(args) {
    let attributes = super.createAttributesObject(args);
    attributes.type = { default: undefined };

    // attributes for math
    attributes.format = { default: 'text' };
    attributes.simplify = { default: 'full' };
    attributes.displaydigits = { default: 10 };
    attributes.rendermode = { default: 'inline' };

    // attributes for text
    attributes.matchwholeword = { default: false };
    attributes.casesensitive = { default: false };

    return attributes;
  }

  static returnChildLogic(args) {
    let childLogic = super.returnChildLogic(args);

    let breakStringIntoChildren = function ({
      activeChildrenMatched,
      sharedParameters,
    }) {
      // know it a string
      let results = breakEmbeddedStringByCommas({
        childrenList: activeChildrenMatched,
      });

      if (!results.success) {
        return { success: false };
      }

      let toDelete = results.toDelete;

      let defaultType = 'math';

      if (sharedParameters.defaultType === 'text') {
        defaultType = 'text';
      }
      let componentStart = {
        componentType: defaultType,
      };
      if (defaultType === 'math' && sharedParameters.simplify !== undefined) {
        componentStart.state = { simplify: sharedParameters.simplify };
      }

      let newComponent = Object.assign({}, componentStart);
      newComponent.children = results.pieces[0];
      let newChildren = [
        {
          componentType: 'pattern',
          children: [newComponent],
        },
      ];

      let replacePairsAsStrings = results.pieces.slice(1);
      for (let piece of replacePairsAsStrings) {
        let res = breakIntoVectorComponents(piece);
        if (!res.foundVector) {
          return { sucess: false };
        }
        toDelete.push(...res.toDelete);

        let replaceChildren = [];

        let newComponent = Object.assign({}, componentStart);
        newComponent.children = res.vectorComponents[0];
        replaceChildren.push(newComponent);

        newComponent = Object.assign({}, componentStart);
        newComponent.children = res.vectorComponents[1];
        replaceChildren.push(newComponent);

        newChildren.push({
          componentType: 'replace',
          children: replaceChildren,
        });
      }

      return { success: true, newChildren: newChildren, toDelete: toDelete };
    };

    let exactlyOneString = childLogic.newLeaf({
      name: 'exactlyOneString',
      componentType: 'string',
      number: 1,
      isSugar: true,
      replacementFunction: breakStringIntoChildren,
    });

    let exactlyOnePattern = childLogic.newLeaf({
      name: 'exactlyOnePattern',
      componentType: 'pattern',
      number: 1,
    });

    let atLeastZeroReplaces = childLogic.newLeaf({
      name: 'atLeastZeroReplaces',
      componentType: 'replace',
      comparison: 'atLeast',
      number: 0,
    });

    let substitutionChildren = childLogic.newOperator({
      name: 'substitutionChildren',
      operator: 'and',
      propositions: [exactlyOnePattern, atLeastZeroReplaces],
    });

    childLogic.newOperator({
      name: 'sugarXorSubstitutionChildren',
      operator: 'xor',
      propositions: [exactlyOneString, substitutionChildren],
      setAsBase: true,
    });

    return childLogic;
  }

  updateState(args = {}) {
    super.updateState(args);

    if (!this.childLogicSatisfied) {
      this.unresolvedState.originalValue = true;
      this.unresolvedState.value = true;
      return;
    }

    let trackChanges = this.currentTracker.trackChanges;
    let childrenChanged = trackChanges.childrenChanged(this.componentName);

    if (childrenChanged) {
      let exactlyOnePattern =
        this.childLogic.returnMatches('exactlyOnePattern');
      this.state.patternParent = this.activeChildren[exactlyOnePattern[0]];
    }

    if (!this.state.patternParent.childLogicSatisfied) {
      this.unresolvedState.originalValue = true;
      this.unresolvedState.value = true;
      return;
    }

    let recalculateValue = false;
    let typeChanged = trackChanges.getVariableChanges({
      component: this,
      variable: 'type',
    });
    if (
      childrenChanged ||
      typeChanged ||
      trackChanges.childrenChanged(this.state.patternParent)
    ) {
      recalculateValue = true;

      this.state.patternChild = this.state.patternParent.activeChildren[0];

      // type child is ignored unless have a string pattern
      if (
        this.state.patternChild instanceof
        this.componentInfoObjects.allComponentClasses.math
      ) {
        this.state.type = 'math';
        this.state.patternClass = 'math';
      } else if (
        this.state.patternChild instanceof
        this.componentInfoObjects.allComponentClasses.text
      ) {
        this.state.type = 'text';
        this.state.patternClass = 'text';
      } else if (
        this.state.patternChild instanceof
        this.componentInfoObjects.allComponentClasses.string
      ) {
        this.state.patternClass = 'string';
      } else {
        console.warn('Substitute must have a math, text or string pattern.');
        this.unresolvedState.value = true;
        this.state.patternClass = 'invalid';
        return;
      }
    }

    if (this.state.patternClass === 'invalid') {
      console.warn('Substitute must have a math, text or string pattern.');
      return;
    }

    if (this.state.patternChild.unresolvedState.value) {
      this.unresolvedState.originalValue = true;
      this.unresolvedState.value = true;
      return;
    }

    if (this.state.patternClass === 'string') {
      if (
        childrenChanged ||
        trackChanges.getVariableChanges({
          component: this.state.patternChild,
          variable: 'value',
        }) ||
        trackChanges.getVariableChanges({
          component: this,
          variable: 'type',
        })
      ) {
        recalculateValue = true;

        if (this.state.type === 'text') {
          this.state.originalValue = this.state.patternChild.state.value;
        } else {
          // math
          this.state.type = 'math';
          this.state.originalValue = this.parseMathString(
            this.state.patternChild.state.value,
          );
        }
        delete this.unresolvedState.originalValue;
      }
    } else {
      if (
        childrenChanged ||
        trackChanges.getVariableChanges({
          component: this.state.patternChild,
          variable: 'value',
        })
      ) {
        recalculateValue = true;
        this.state.originalValue = this.state.patternChild.state.value;
        delete this.unresolvedState.originalValue;
      }
    }

    if (childrenChanged) {
      let atLeastZeroReplaces = this.childLogic.returnMatches(
        'atLeastZeroReplaces',
      );
      this.state.replaceChildren = atLeastZeroReplaces.map(
        (x) => this.activeChildren[x],
      );
    }

    if (
      this.state.replaceChildren.some(
        (x) =>
          !x.childLogicSatisfied ||
          x.activeChildren.some((y) => y.unresolvedState.value),
      )
    ) {
      this.unresolvedState.value = true;
      return;
    }

    if (
      childrenChanged ||
      typeChanged ||
      this.state.replaceChildren.some(
        (x) =>
          trackChanges.childrenChanged(x) ||
          x.activeChildren.some((y) =>
            trackChanges.getVariableChanges({
              component: y,
              variable: 'value',
            }),
          ),
      )
    ) {
      recalculateValue = true;

      this.state.replaces = [];
      for (let child of this.state.replaceChildren) {
        let replace = [];
        for (let b of child.activeChildren) {
          if (this.state.type === 'math') {
            if (
              b instanceof this.componentInfoObjects.allComponentClasses.math
            ) {
              replace.push(b.state.value);
            } else if (
              b instanceof this.componentInfoObjects.allComponentClasses.string
            ) {
              replace.push(this.parseMathString(b.state.value));
            } else {
              console.warn(
                'Substitute of math type must have math or string replaces',
              );
              this.unresolvedState.value = true;
              return;
            }
          } else if (this.state.type === 'text') {
            if (
              b instanceof this.componentInfoObjects.allComponentClasses.text ||
              b instanceof this.componentInfoObjects.allComponentClasses.string
            ) {
              replace.push(b.state.value);
            } else {
              console.warn(
                'Substitute of text type must have text or string replaces',
              );
              this.unresolvedState.value = true;
              return;
            }
          }
        }
        this.state.replaces.push(replace);
      }
    }

    if (
      trackChanges.getVariableChanges({ component: this, variable: 'simplify' })
    ) {
      recalculateValue = true;
    }

    if (!recalculateValue) {
      return;
    }

    delete this.unresolvedState.value;

    this.state.numSubstitutions = this.state.replaces.length;

    if (this.state.type === 'text') {
      // need to use regex form of string.replace to do a global search
      // but first need to escape any regular expression characters
      // as don't want to interpret string as regular expression

      // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Using_special_characters
      function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
      }

      this.state.value = this.state.originalValue;
      for (let ind = 0; ind < this.state.numSubstitutions; ind++) {
        let re;
        let flag = 'g';
        if (!this.state.casesensitive) {
          flag = 'gi';
        }
        if (this.state.matchwholeword) {
          // TODO: Using \b doesn't work for non-roman letters or with accents
          // Use more general unicode word boundary.  Maybe:
          // XRegExp('(?=^|$|[^\\p{L}])') suggested in https://stackoverflow.com/a/32554839
          re = new RegExp(
            '\\b' + escapeRegExp(this.state.replaces[ind][0]) + '\\b',
            flag,
          );
        } else {
          re = new RegExp(escapeRegExp(this.state.replaces[ind][0]), flag);
        }
        let replacement = this.state.replaces[ind][1];
        this.state.value = this.state.value.replace(re, replacement);
      }
    } else {
      // math
      this.state.value = this.state.originalValue.subscripts_to_strings();
      for (let ind = 0; ind < this.state.numSubstitutions; ind++) {
        this.state.value = this.state.value.substitute({
          [this.state.replaces[ind][0].subscripts_to_strings().tree]:
            this.state.replaces[ind][1].subscripts_to_strings(),
        });
      }
      this.state.value = this.state.value.strings_to_subscripts();
      this.state.value = normalizeMathExpression({
        value: this.state.value,
        simplify: this.state.simplify,
      });
    }
  }

  parseMathString(inputString) {
    if (this.state.format === 'text') {
      try {
        return me.fromAst(textToAst.convert(inputString));
      } catch (e) {
        console.log('Invalid value for a math of text format: ' + inputString);
        return me.fromAst('\uFF3F'); // long underscore
      }
    } else if (this.state.format === 'latex') {
      try {
        return me.fromAst(latexToAst.convert(inputString));
      } catch (e) {
        console.log('Invalid value for a math of latex format: ' + inputString);
        return me.fromAst('\uFF3F'); // long underscore
      }
    } else {
      throw Error('Unrecongized math format');
    }
  }

  static createSerializedReplacements({ component }) {
    if (Object.keys(component.unresolvedState).length > 0) {
      return { replacements: [] };
    }

    let serializedReplacement = {
      componentType: component.state.type,
      state: { value: component.state.value },
    };

    // for math type, if specified attributes in the substitute tag
    // give those attributes to serialized replacement
    if (component.state.type === 'math') {
      for (let item of ['simplify', 'displaydigits', 'rendermode']) {
        if (!component._state[item].usedDefault) {
          serializedReplacement.state[item] = component.state.item;
        }
      }
    }

    return { replacements: [serializedReplacement] };
  }

  static calculateReplacementChanges({ component }) {
    let replacementChanges = [];

    // if changed type, recreate
    if (component.state.type !== component.replacements[0].componentType) {
      let newSerializedReplacements = this.createSerializedReplacements({
        component,
      }).replacements;
      let replacementInstruction = {
        changeType: 'add',
        changeTopLevelReplacements: true,
        firstReplacementInd: 0,
        numberReplacementsToReplace: 1,
        serializedReplacements: newSerializedReplacements,
      };
      replacementChanges.push(replacementInstruction);
    } else {
      // if didn't change type, just change state variable(s)

      let stateChanges = { value: component.state.value };

      if (component.state.type === 'math') {
        for (let item of ['simplify', 'displaydigits', 'rendermode']) {
          if (!component._state[item].usedDefault) {
            stateChanges[item] = component.state.item;
          }
        }
      }
      let replacementInstruction = {
        changeType: 'updateStateVariables',
        component: component.replacements[0],
        stateChanges: stateChanges,
      };

      replacementChanges.push(replacementInstruction);
    }

    return replacementChanges;
  }
}
