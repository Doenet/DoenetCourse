export function renameStateVariable({
  stateVariableDefinitions,
  oldName,
  newName,
}) {
  // first rename object in stateVariableDefinitions
  let stateVarDef = (stateVariableDefinitions[newName] =
    stateVariableDefinitions[oldName]);
  delete stateVariableDefinitions[oldName];

  // second, check if name is in additionalStateVariablesDefined
  if (stateVarDef.additionalStateVariablesDefined) {
    let ind = stateVarDef.additionalStateVariablesDefined.indexOf(oldName);
    if (ind !== -1) {
      stateVarDef.additionalStateVariablesDefined[ind] = newName;
    }
  }

  // third, wrap definition in a function that changes oldName to newName in
  // - newValues
  // - useEssentialOrDefaultValue
  // - noChanges
  // - makeEssential
  // - alwaysShadow
  // Note: if add additional possibilities to definition result,
  // will have to add them to what is changed here

  let originalDefinition = stateVarDef.definition;

  let keysInObjects = [
    'newValues',
    'useEssentialOrDefaultValue',
    'makeEssential',
  ];
  let entriesInArrays = ['noChanges', 'alwaysShadow'];

  stateVarDef.definition = function (args) {
    let result = originalDefinition(args);

    for (let key of keysInObjects) {
      if (result[key] && oldName in result[key]) {
        result[key][newName] = result[key][oldName];
        delete result[key][oldName];
      }
    }
    for (let key of entriesInArrays) {
      if (result[key]) {
        let ind = result[key].indexOf(oldName);
        if (ind !== -1) {
          result[key][ind] = newName;
        }
      }
    }

    return result;
  };

  // fourth, wrap inverse definition to change
  // desiredStateVariableValues and setStateVarible
  // from new name to old name

  let originalInverseDefinition = stateVarDef.inverseDefinition;

  stateVarDef.inverseDefinition = function (args) {
    let desiredStateVariableValues = args.desiredStateVariableValues;
    desiredStateVariableValues[oldName] = desiredStateVariableValues[newName];
    delete desiredStateVariableValues[newName];

    let results = originalInverseDefinition(args);

    if (results.success) {
      for (let instruction of results.instructions) {
        if (instruction.setStateVariable === oldName) {
          instruction.setStateVariable = newName;
        }
      }
    }

    return results;
  };
}
