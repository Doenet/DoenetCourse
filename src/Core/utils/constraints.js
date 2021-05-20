export function applyConstraintFromComponentConstraints({
  variables,
  applyComponentConstraint,
}) {
  let newVariables = {};
  let constrained = false;

  for (let varName in variables) {
    let result = applyComponentConstraint({ [varName]: variables[varName] });
    if (result.constrained) {
      constrained = true;
      newVariables[varName] = result.variables[varName];
    }
  }
  if (constrained) {
    return {
      constrained,
      variables: newVariables,
    };
  } else {
    return {};
  }
}
