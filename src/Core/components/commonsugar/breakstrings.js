export function breakStringsAndOthersIntoComponentsByStringCommas(e) {
  return null;
}

// function: returnBreakStringsSugarFunction
//
// returns a sugar replacement function that
// - expects string and other children,
// - breaks the children by commas in strings not enclosed in parenthesis,
//   (optionally stripping off outer most parentheses first)
// - returns an array of components created by mapping the childrenToComponentFunction
//   function onto each of the pieces
// - other children are not examined or altered, so they could be anything
//
// For example, to take the dependency "stringAndMathChildren"
// and create points with coordinates determined by the pieces
// one could use the sugar replacement function
// let childrenToComponentFunction = x => ({
//   componentType: "point", children: [{
//     componentType: "coords", children: x}]
// })
// returnBreakStringsSugarFunction({
//   childrenToComponentFunction,
//   dependencyNameWithChildren: "stringAndMathChildren"
//  })

export function returnBreakStringsSugarFunction({
  childrenToComponentFunction,
  mustStripOffOuterParentheses = false,
}) {
  return function ({ matchedChildren }) {
    let Nparens = 0;
    let pieces = [];
    let currentPiece = [];
    let strippedParens = false;

    let nChildren = matchedChildren.length;

    if (mustStripOffOuterParentheses) {
      let firstComponent = matchedChildren[0];
      if (
        firstComponent.componentType !== 'string' ||
        firstComponent.state.value.trimLeft()[0] !== '('
      ) {
        return { success: false };
      }
    }

    for (let [compInd, component] of matchedChildren.entries()) {
      if (component.componentType !== 'string') {
        currentPiece.push(component);
        continue;
      }

      let s = component.state.value.trim();

      if (compInd === 0 && mustStripOffOuterParentheses && s[0] === '(') {
        // found beginning paren, now check if there is an ending parens
        let lastChild = matchedChildren[nChildren - 1];
        if (lastChild.componentType === 'string') {
          let sLast = lastChild.state.value.trimRight();
          if (sLast[sLast.length - 1] === ')') {
            // found ending paren, so we'll strip off first paren
            strippedParens = true;
            s = s.substring(1);
          }
        }
      }

      let beginInd = 0;

      for (let ind = 0; ind < s.length; ind++) {
        let char = s[ind];
        if (char === '(') {
          Nparens++;
        }
        if (char === ')') {
          if (Nparens === 0) {
            // parens didn't match

            // check if stripped off initial paren and we're at the end
            if (
              strippedParens &&
              compInd === nChildren - 1 &&
              ind === s.length - 1
            ) {
              // strip off last parens
              s = s.substring(0, s.length - 1);
              break;
            }
            // return failure due to non-matching parens
            return { success: false };
          }
          Nparens--;
        }
        if (char === ',' && Nparens === 0) {
          if (ind > beginInd) {
            currentPiece.push({
              componentType: 'string',
              state: { value: s.substring(beginInd, ind) },
            });
          }
          pieces.push(currentPiece);
          currentPiece = [];
          beginInd = ind + 1;
        }
      }

      if (s.length > beginInd) {
        currentPiece.push({
          componentType: 'string',
          state: { value: s.substring(beginInd, s.length) },
        });
      }
    }

    // parens didn't match, so return failure
    if (Nparens !== 0) {
      return { success: false };
    }

    pieces.push(currentPiece);

    let newChildren = pieces.map(childrenToComponentFunction);

    return {
      success: true,
      newChildren: newChildren,
    };
  };
}

// function: breakEmbeddedStringByCommas
//
// Utility function that can be used at the beginning of a sugar replacement function.
// It breaks children by commas not enclosed in parentheses.
// Remaining components are kept embedded in the pieces

// Returns
// - success: true if successed to break pieces
// - pieces: array of pieces that were broken apart by commas
//   Each piece is an array of components.

export function breakEmbeddedStringByCommas({ childrenList }) {
  let Nparens = 0;
  let pieces = [];
  let currentPiece = [];

  for (let component of childrenList) {
    if (component.componentType !== 'string') {
      currentPiece.push(component);
      continue;
    }

    let s = component.state.value.trim();
    let beginInd = 0;

    for (let ind = 0; ind < s.length; ind++) {
      let char = s[ind];
      if (char === '(') {
        Nparens++;
      }
      if (char === ')') {
        if (Nparens === 0) {
          // parens didn't match, so return failure
          return { success: false };
        }
        Nparens--;
      }
      if (char === ',' && Nparens === 0) {
        if (ind > beginInd) {
          let newString = s.substring(beginInd, ind).trim();
          currentPiece.push({
            componentType: 'string',
            state: { value: newString },
          });
        }

        pieces.push(currentPiece);
        currentPiece = [];
        beginInd = ind + 1;
      }
    }

    if (s.length > beginInd) {
      let newString = s.substring(beginInd, s.length).trim();
      currentPiece.push({
        componentType: 'string',
        state: { value: newString },
      });
    }
  }

  // parens didn't match, so return failure
  if (Nparens !== 0) {
    return { success: false };
  }

  pieces.push(currentPiece);

  return {
    success: true,
    pieces: pieces,
  };
}

export function breakEmbeddedStringsIntoParensPieces({
  componentList,
  removeParens = false,
}) {
  let Nparens = 0;
  let pieces = [];
  let currentPiece = [];

  for (let component of componentList) {
    if (component.componentType !== 'string') {
      if (Nparens === 0) {
        // if not in a parenthesis, just add as a separate piece
        pieces.push([component]);
      } else {
        currentPiece.push(component);
      }
      continue;
    }

    let s = component.state.value.trim();

    let beginInd = 0;

    for (let ind = 0; ind < s.length; ind++) {
      let char = s[ind];

      if (char === '(') {
        if (Nparens === 0 && removeParens) {
          beginInd = ind + 1;
        }
        Nparens++;
      } else if (char === ')') {
        if (Nparens === 0) {
          // parens didn't match, so return failure
          return { success: false };
        }
        if (Nparens === 1) {
          // found end of piece in parens
          if (ind + 1 > beginInd) {
            let lastInd = removeParens ? ind : ind + 1;
            let newString = s.substring(beginInd, lastInd).trim();
            if (newString.length > 0) {
              currentPiece.push({
                componentType: 'string',
                state: { value: newString },
              });
            }
          }

          pieces.push(currentPiece);
          currentPiece = [];
          beginInd = ind + 1;
        }
        Nparens--;
      } else if (Nparens === 0 && !char.match(/\s/)) {
        // starting a new piece
        // each piece must begin with parens
        return { success: false };
      }
    }

    if (s.length > beginInd) {
      let newString = s.substring(beginInd, s.length).trim();
      currentPiece.push({
        componentType: 'string',
        state: { value: newString },
      });
    }
  }

  // parens didn't match, so return failure
  if (Nparens !== 0) {
    return { success: false };
  }

  if (currentPiece.length > 0) {
    pieces.push(currentPiece);
  }

  return {
    success: true,
    pieces: pieces,
  };
}

// function: breakIntoVectorComponents
//
// Utility function that attempts to break an array of components (compList) into components of a vector
// To be considered a vector, compList must
//  -start with a string beginning with (
//  -end with a string ending with )
// Moreover, once those parens are removed, the remainder must be able to be broken by commas not in parens
// (If not, then either compList didn't obey math rules of paren or the parens removed didn't match each other
//
// Returns:
// - foundVector: true if succeded
// - vectorComponents: array whose components are arrays representing the vector components

export function breakIntoVectorComponents(compList) {
  if (compList.length === 0) {
    return { foundVector: false };
  }

  if (compList[0].componentType !== 'string') {
    return { foundVector: false };
  }

  let sFirst = compList[0].state.value;
  let charFirst = sFirst.trim()[0];
  if (charFirst !== '(') {
    return { foundVector: false };
  }

  if (compList[compList.length - 1].componentType !== 'string') {
    return { foundVector: false };
  }

  let sLast = compList[compList.length - 1].state.value;
  let charLast = sLast.trim().slice(-1);
  if (charLast !== ')') {
    return { foundVector: false };
  }

  let newCompList = [];
  if (compList.length === 1) {
    let snew = sFirst.trim().slice(1, -1).trim();
    if (snew.length > 0) {
      newCompList.push({
        componentType: 'string',
        state: { value: snew },
      });
    }
  } else {
    let snew = sFirst.trim().slice(1).trim();
    if (snew.length > 0) {
      newCompList.push({
        componentType: 'string',
        state: { value: snew },
      });
    }

    newCompList.push(...compList.slice(1, -1));

    snew = sLast.trim().slice(0, -1).trim();
    if (snew.length > 0) {
      newCompList.push({
        componentType: 'string',
        state: { value: snew },
      });
    }
  }
  let Nparens = 0;
  let pieces = [];
  let currentPiece = [];

  for (let comp of newCompList) {
    if (comp.componentType !== 'string') {
      currentPiece.push(comp);
      continue;
    }

    let s = comp.state.value.trim();

    let beginInd = 0;
    let brokeString = false;

    for (let ind = 0; ind < s.length; ind++) {
      let char = s[ind];
      if (char === '(') {
        Nparens++;
      }
      if (char === ')') {
        if (Nparens === 0) {
          // parens didn't match, so it wasn't a vector
          return { foundVector: false };
        }
        Nparens--;
      }

      if (char === ',' && Nparens === 0) {
        if (ind > beginInd) {
          let snew = s.substring(beginInd, ind).trim();
          currentPiece.push({
            componentType: 'string',
            state: { value: snew },
          });
        }

        pieces.push(currentPiece);
        currentPiece = [];
        beginInd = ind + 1;
        brokeString = true;
      }
    }

    if (brokeString) {
      if (s.length > beginInd) {
        let snew = s.substring(beginInd, s.length).trim();
        currentPiece.push({
          componentType: 'string',
          state: { value: snew },
        });
      }
    } else {
      currentPiece.push(comp);
    }
  }

  // parens didn't match, so it wasn't a vector
  if (Nparens !== 0) {
    return { foundVector: false };
  }

  pieces.push(currentPiece);

  return {
    foundVector: true,
    vectorComponents: pieces,
  };
}

// function: breakPiecesByEquals
//
// We break each piece into lhs and rhs separated by an equal sign.
// If no piece contains an equal sign, then rhs's will be empty
// If some pieces contain an equal sign but not others, return failure
// If a pieced contains two equal signs, return failure
//
// If parseVectorEquality is true and there is a single piece
// with an equal sign, then attempt to parse both lhs and rhs as vectors.
// If both are vectors of the same size, put the components individually
// into lhs and rhs pieces (i.e., treat the same as if had separate pieces
// with an equal sign for each component)
// If one side but not the other is a vector or if they have different sizes,
// then return failure
// If neither side is a vector, keep lhs and rhs as they were
//
// Returns:
// - success: true if didn't run into troubles described above
// - lhsByPiece: array of lhs of each piece
// - rhsByPiece: array of rhs of each piece
// - toDelete: strings that were broken apart and hence must be deleted
//
// Note: all punctuation (equal sign as well as comma and parens for vectors)
// are recognized only inside strings
//
// Note 2: we assume pieces have already been processed by breakEmbeddedStringByCommas
// so that strings can be idenified by the _string property

// TODO: this no longer works, as we don't add _string property,
// but this code isn't currently being called anywhere

export function breakPiecesByEquals(pieces, parseVectorEquality = false) {
  let lhsByPiece = [];
  let rhsByPiece = [];
  let toDelete = [];

  let foundEqualSignInAPiece;
  let re_equal = /^([^=]*)(=([^=]*))?$/;

  for (let ind = 0; ind < pieces.length; ind++) {
    let piece = pieces[ind];

    let lhs = [];
    let rhs = [];
    let foundEqualSign = false;
    for (let comp of piece) {
      let s = comp._string;
      if (s === undefined) {
        if (foundEqualSign) {
          rhs.push(comp);
        } else {
          lhs.push(comp);
        }
        continue;
      }

      // we have a string s
      let result = s.match(re_equal);
      if (result === null) {
        // found more than one = sign in the single string
        return { success: false };
      }
      if (result[2] === undefined) {
        // no equal sign, so just add to lhs or rhs
        if (foundEqualSign) {
          rhs.push(comp);
        } else {
          lhs.push(comp);
        }
      } else {
        // found one equal sign
        if (foundEqualSign) {
          // found second equal sign
          return { succes: false };
        }
        foundEqualSign = true;
        let l = result[1];
        let r = result[3];
        if (l.length > 0) {
          lhs.push({
            componentType: 'string',
            state: { value: l },
            _string: l,
          });
        }
        if (r.length > 0) {
          rhs.push({
            componentType: 'string',
            state: { value: r },
            _string: r,
          });
        }
        if (comp.createdComponent === true) {
          // broke up an original string
          // need to make original string as to be deleted
          toDelete.push(comp.componentName);
        }
      }
    }

    if (ind === 0) {
      foundEqualSignInAPiece = foundEqualSign;
    } else {
      if (foundEqualSign !== foundEqualSignInAPiece) {
        // inconsistent pieces, some with and without equal signs
        // sugar fails
        return { success: false };
      }
    }

    if (foundEqualSign) {
      if (pieces.length === 1 && parseVectorEquality) {
        // check if lhs and rhs are vectors
        let lhsResult = breakIntoVectorComponents(lhs);
        if (lhsResult.foundVector === true) {
          let rhsResult = breakIntoVectorComponents(rhs);
          if (rhsResult.foundVector !== true) {
            // on side is vector, the other isn't
            return { success: false };
          }
          if (
            lhsResult.vectorComponents.length !==
            rhsResult.vectorComponents.length
          ) {
            // have different vector lengths
            return { success: false };
          }

          // found two vectors of the same length
          // should treat the same as separate equalities
          for (let i = 0; i < lhsResult.vectorComponents.length; i++) {
            lhsByPiece.push(lhsResult.vectorComponents[i]);
            rhsByPiece.push(rhsResult.vectorComponents[i]);
          }
          // add any more strings to delete
          toDelete = [
            ...toDelete,
            ...lhsResult.toDelete,
            ...rhsResult.toDelete,
          ];

          return {
            success: true,
            lhsByPiece: lhsByPiece,
            rhsByPiece: rhsByPiece,
            toDelete: toDelete,
          };
        } else {
          // didn't find vector in lhs
          // just make sure isn't a vector in rhs
          let rhsResult = breakIntoVectorComponents(rhs, true);
          if (rhsResult.success === true) {
            return { success: false };
          }
        }
      }
      lhsByPiece.push(lhs);
      rhsByPiece.push(rhs);
    } else {
      // no equal sign, so we just have lhs
      lhsByPiece.push(lhs);
    }
  }

  return {
    success: true,
    lhsByPiece: lhsByPiece,
    rhsByPiece: rhsByPiece,
    toDelete: toDelete,
  };
}
