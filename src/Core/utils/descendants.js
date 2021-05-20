export function gatherDescendants({
  ancestor,
  descendantTypes,
  recurseToMatchedChildren = true,
  useReplacementsForComposites = false,
  includeNonActiveChildren = false,
  // includePropertyChildren = false,
  skipOverAdapters = false,
  ignoreReplacementsOfMatchedComposites = false,
  definingChildrenFirst = false,
  namesToIgnore = [],
  init = true,
  componentInfoObjects,
}) {
  let matchChildToTypes = (child) =>
    descendantTypes.some((ct) =>
      componentInfoObjects.isInheritedComponentType({
        inheritedComponentType: child.componentType,
        baseComponentType: ct,
      }),
    );

  let childrenToCheck = [];

  if (
    useReplacementsForComposites &&
    componentInfoObjects.isInheritedComponentType({
      inheritedComponentType: ancestor.componentType,
      baseComponentType: '_composite',
    })
  ) {
    if (init) {
      // if not init, parent will also be checked.
      // Since replacements will be children of parent,
      // don't need to gather them here
      childrenToCheck.push(
        ...replacementsForComposites({
          composite: ancestor,
          componentInfoObjects,
          includeComposites: includeNonActiveChildren,
        }),
      );
    }
  } else {
    if (includeNonActiveChildren && definingChildrenFirst) {
      // add defining children in order
      for (let child of ancestor.definingChildren) {
        childrenToCheck.push(child);
      }
    }

    // first add active children in order
    if (ancestor.activeChildren) {
      for (let [ind, child] of ancestor.activeChildren.entries()) {
        // add a fake componentName to placeholders
        if (!child.componentName) {
          child.componentName = `__placeholder_${ind}`;
        }

        if (
          !childrenToCheck
            .map((x) => x.componentName)
            .includes(child.componentName)
        ) {
          childrenToCheck.push(child);
        }
      }
    }

    if (includeNonActiveChildren) {
      if (!definingChildrenFirst) {
        // add any non-active defining children in order
        for (let child of ancestor.definingChildren) {
          if (
            !childrenToCheck
              .map((x) => x.componentName)
              .includes(child.componentName)
          ) {
            childrenToCheck.push(child);
          }
        }
      }

      // add any other children
      if (ancestor.allChildren) {
        for (let childName in ancestor.allChildren) {
          let childObj = ancestor.allChildren[childName];
          if (
            childObj.definingChildrenIndex === undefined &&
            childObj.activeChildrenIndex === undefined
          ) {
            childrenToCheck.push(childObj.component);
          }
        }

        // since placeholders that were adapted are not in allChildren,
        // check for those separately
        for (let [ind, child] of ancestor.activeChildren.entries()) {
          let adapted = child.adaptedFrom;
          if (adapted && !adapted.componentName) {
            // add fake componentName
            adapted.componentName = `__placeholder_adapted_${ind}`;
            if (
              !childrenToCheck
                .map((x) => x.componentName)
                .includes(adapted.componentName)
            ) {
              childrenToCheck.push(adapted);
            }
          }
        }
      }
    }
  }

  if (ignoreReplacementsOfMatchedComposites) {
    // first check if have matched any composites, so can ignore their replacements
    for (let child of childrenToCheck) {
      let matchedChild = matchChildToTypes(child);
      if (
        matchedChild &&
        componentInfoObjects.isInheritedComponentType({
          inheritedComponentType: child.componentType,
          baseComponentType: '_composite',
        })
      ) {
        namesToIgnore = [
          ...namesToIgnore,
          ...replacementsForComposites({
            composite: child,
            componentInfoObjects,
            includeComposites: true,
          }).map((x) => x.componentName),
        ];
      }
    }
  }

  if (skipOverAdapters) {
    for (let [ind, child] of childrenToCheck.entries()) {
      if (child.adaptedFrom && !namesToIgnore.includes(child.componentName)) {
        // found an adapter

        namesToIgnore = [...namesToIgnore, child.componentName];

        let adaptedLocation = childrenToCheck
          .map((x) => x.componentName)
          .indexOf(child.adaptedFrom.componentName);
        if (adaptedLocation === -1) {
          // if adapted component isn't in childrenToCheck
          // then replace adapter with adapted component
          childrenToCheck.splice(ind, 1, child.adaptedFrom);
        } else {
          // if both adapter and adapted component are in childrenToCheck, then
          // as long as the adapted component isn't a defining child
          // with definingChildrenFirst
          // (in which case the adapted component would already be in the right spot)
          // switch the locations of the adapted component and the adapter
          // Rationale: the adapter is in the location that one would expect

          if (
            !(
              definingChildrenFirst &&
              ancestor.definingChildren
                .map((x) => x.componentName)
                .includes(child.adaptedFrom.componentName)
            )
          ) {
            // swap locations
            childrenToCheck.splice(ind, 1, child.adaptedFrom);
            childrenToCheck.splice(adaptedLocation, 1, child);
          }
        }
      }
    }
  }

  if (namesToIgnore.length > 0) {
    childrenToCheck = childrenToCheck.filter(
      (x) => !namesToIgnore.includes(x.componentName),
    );
  }

  let descendants = [];
  let replacementNamesOfMatchedComposites = [];

  for (let child of childrenToCheck) {
    let matchedChild = matchChildToTypes(child);
    if (matchedChild) {
      descendants.push({
        componentName: child.componentName,
        componentType: child.componentType,
      });
    }

    if (!matchedChild || recurseToMatchedChildren) {
      // recurse
      let additionalDescendants = gatherDescendants({
        ancestor: child,
        descendantTypes,
        recurseToMatchedChildren,
        useReplacementsForComposites,
        includeNonActiveChildren,
        skipOverAdapters,
        ignoreReplacementsOfMatchedComposites,
        definingChildrenFirst,
        init: false,
        componentInfoObjects,
      });
      descendants.push(...additionalDescendants);
    }
  }

  if (ignoreReplacementsOfMatchedComposites) {
    descendants = descendants.filter(
      (x) => !replacementNamesOfMatchedComposites.includes(x),
    );
  }

  return descendants;
}

function replacementsForComposites({
  composite,
  includeComposites = false,
  componentInfoObjects,
}) {
  let replacements = [];

  if (composite.replacements) {
    let originalReplacements;
    if (composite.replacementsToWithhold) {
      let numReplacements =
        composite.replacements.length - composite.replacementsToWithhold;
      originalReplacements = composite.replacements.slice(0, numReplacements);
    } else {
      originalReplacements = composite.replacements;
    }

    for (let replacement of originalReplacements) {
      if (
        componentInfoObjects.isInheritedComponentType({
          inheritedComponentType: replacement.componentType,
          baseComponentType: '_composite',
        })
      ) {
        if (includeComposites) {
          replacements.push(replacement);
        }
        replacements.push(
          ...replacementsForComposites({
            composite: replacement,
            componentInfoObjects,
            includeComposites,
          }),
        );
      } else {
        replacements.push(replacement);
      }
    }
  }

  return replacements;
}

export function ancestorsIncludingComposites(comp, components) {
  if (comp.ancestors === undefined || comp.ancestors.length === 0) {
    return [];
  }

  let comps = [comp.ancestors[0].componentName];

  let parent = components[comp.ancestors[0].componentName];
  if (parent) {
    comps.push(...ancestorsIncludingComposites(parent, components));
  }

  if (comp.replacementOf) {
    comps.push(comp.replacementOf.componentName);
    let replacementAs = ancestorsIncludingComposites(
      comp.replacementOf,
      components,
    );
    for (let a of replacementAs) {
      if (!comps.includes(a)) {
        comps.push(a);
      }
    }
  }

  return comps;
}
