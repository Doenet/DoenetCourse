import { enumerateCombinations } from './enumeration';

export function getVariantsForDescendants({
  variantNumber,
  serializedComponent,
  allComponentClasses,
}) {
  if (serializedComponent.variants === undefined) {
    return { success: false };
  }
  let descendantVariantComponents =
    serializedComponent.variants.descendantVariantComponents;

  if (descendantVariantComponents === undefined) {
    return { success: false };
  }

  let numberOfVariantsByDescendant = descendantVariantComponents.map(
    (x) => x.variants.numberOfVariants,
  );

  let indices = enumerateCombinations({
    numberOfOptionsByIndex: numberOfVariantsByDescendant,
    maxNumber: variantNumber + 1,
  })[variantNumber];

  let desiredVariants = [];
  for (let [ind, comp] of descendantVariantComponents.entries()) {
    let compClass = allComponentClasses[comp.componentType];
    let r = compClass.getUniqueVariant({
      serializedComponent: comp,
      variantNumber: indices[ind],
      allComponentClasses: allComponentClasses,
    });
    if (r.success) {
      desiredVariants.push(r.desiredVariant);
    } else {
      return { succss: false };
    }
  }

  // console.log("desiredVariants");
  // console.log(desiredVariants);
  return {
    success: true,
    desiredVariants: desiredVariants,
  };
}
