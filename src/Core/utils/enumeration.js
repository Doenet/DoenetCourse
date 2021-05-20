import me from 'math-expressions';

// Enumerates the unique combinations of repeeated selecting an index
// from the same set of options, with or without replacement
// The number of options to choose from is numberOfOptions
// so that each index is an integer between 0 and numberOfOptions-1
// The number of indices to choose for each combination is numberOfIndices.
// Begins with combinations that contain distinct indices, if possible
// Returns a maximum of maxNumber
export function enumerateSelectionCombinations({
  numberOfIndices,
  numberOfOptions,
  maxNumber = Infinity,
  withReplacement = true,
}) {
  if (numberOfIndices === 1) {
    let options = [...Array(numberOfOptions).keys()];
    // but put 0 last
    options = [...options.slice(1), 0].slice(0, maxNumber);
    // convert to array of arrays
    options = options.map((x) => [x]);
    return options;
  }

  let allOffsetsCombinations = enumerateSelectionCombinations({
    numberOfIndices: numberOfIndices - 1,
    numberOfOptions: numberOfOptions,
    maxNumber: maxNumber,
    withReplacement: withReplacement,
  });

  let results = [];
  let numberSoFar = 0;
  for (let offsets of allOffsetsCombinations) {
    for (let ind0 = 1; ind0 <= numberOfOptions; ind0++) {
      let combination = [
        ind0 % numberOfOptions,
        ...offsets.map((x) => (ind0 + x) % numberOfOptions),
      ];
      if (!withReplacement) {
        // skip combinations that repeat an index
        if (new Set(combination).size < numberOfIndices) {
          continue;
        }
      }
      results.push(combination);
      numberSoFar++;
      if (numberSoFar >= maxNumber) {
        return results;
      }
    }
  }

  return results;
}

// Enumerate the unique combinations of picking a set of indices
// The number of possible options for each index is given
// by the array numberOfOptionsByIndex
// whose length gives the total number of options
// Returns an array of arrays, where each array gives an index for each option
// Returns at most maxNumber of combinations
export function enumerateCombinations({
  numberOfOptionsByIndex,
  maxNumber = Infinity,
}) {
  let numberOfIndices = numberOfOptionsByIndex.length;

  if (numberOfIndices === 0) {
    return [];
  }

  let gcds = [];
  for (let ind1 = 0; ind1 < numberOfIndices; ind1++) {
    let g = [];
    for (let ind2 = 0; ind2 < ind1; ind2++) {
      g.push(
        me.math.gcd(numberOfOptionsByIndex[ind1], numberOfOptionsByIndex[ind2]),
      );
    }
    gcds.push(g);
  }

  // flatten and take max
  let maxGCD = gcds
    .reduce((a, c) => [...c, ...a], [])
    .reduce((a, c) => Math.max(a, c), 1);

  // if maxGCD is one, then can just run though each one sequentially
  // and we encounter every possibility
  if (maxGCD === 1) {
    let totalCombinations = numberOfOptionsByIndex.reduce((a, c) => a * c);
    totalCombinations = Math.min(totalCombinations, maxNumber);
    let results = [];
    for (let ind = 0; ind < totalCombinations; ind++) {
      let r = numberOfOptionsByIndex.map((x) => ind % x);
      results.push(r);
    }
    return results;
  }

  // if have two indices, then run sequentially for lcm
  // shift second index, and run sequentially for another lcm
  // if continue gcd times, will have all combinations
  if (numberOfIndices === 2) {
    let gcd = maxGCD;
    let lcm = me.math.lcm(...numberOfOptionsByIndex);

    let results = [];
    let numberSoFar = 0;
    for (let offset = 0; offset < gcd; offset++) {
      for (let ind = 0; ind < lcm; ind++) {
        let r = [
          ind % numberOfOptionsByIndex[0],
          (ind + offset) % numberOfOptionsByIndex[1],
        ];
        results.push(r);
        numberSoFar++;
        if (numberSoFar >= maxNumber) {
          return results;
        }
      }
    }
    return results;
  }

  // if have more than 2 indices and gcd isn't one
  // then combine two together (which can treat with above case)
  // and recurse with the result that has one fewer index
  // (will need to splice together final result)

  // will combine the first pair encountered that, along with gcd > 1,
  // has the smallest least common multiple
  let lcms = [];
  for (let ind1 = 0; ind1 < numberOfIndices; ind1++) {
    let m = [];
    for (let ind2 = 0; ind2 < ind1; ind2++) {
      if (gcds[ind1][ind2] > 1) {
        m.push(
          me.math.lcm(
            numberOfOptionsByIndex[ind1],
            numberOfOptionsByIndex[ind2],
          ),
        );
      } else {
        m.push(null); // be sure to skip those with gcd == 1
      }
    }
    lcms.push(m);
  }

  // flatten and take min, filering out the nulls
  let minLCM = lcms
    .reduce((a, c) => [...c, ...a], [])
    .filter((x) => x !== null)
    .reduce((a, c) => Math.min(a, c), Infinity);

  // find indices where minimum occurs
  let matchInds;

  for (let ind1 = 0; ind1 < numberOfIndices; ind1++) {
    for (let ind2 = 0; ind2 < ind1; ind2++) {
      if (lcms[ind1][ind2] === minLCM) {
        matchInds = [ind2, ind1]; // want lowest index first
        break;
      }
    }
    if (matchInds) {
      break;
    }
  }

  // create new options of just the matched results
  let n0 = numberOfOptionsByIndex[matchInds[0]];
  let n1 = numberOfOptionsByIndex[matchInds[1]];

  let innerOptions = [n0, n1];

  // create new options where replace matched results with single one
  // that has number of options set equal to the total number of inner options (n1*n2)
  let outerOptions = numberOfOptionsByIndex;
  outerOptions[matchInds[0]] = n0 * n1; // replace first with total number of combinations
  outerOptions.splice(matchInds[1], 1); // delete second matched ind

  let outerResult = enumerateCombinations({
    numberOfOptionsByIndex: outerOptions,
    maxNumber: maxNumber,
  });
  let innerResult = enumerateCombinations({
    numberOfOptionsByIndex: innerOptions,
    maxNumber: maxNumber,
  });

  // to splice back together
  // - replace the combined entry (which is at the lower index)
  //   with the first inner result
  // - insert in the second inner result at the larger index
  for (let r of outerResult) {
    let ires = innerResult[r[matchInds[0]]];
    r.splice(matchInds[0], 1, ires[0]);
    r.splice(matchInds[1], 0, ires[1]);
  }

  return outerResult;
}
