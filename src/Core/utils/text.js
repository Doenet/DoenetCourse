export function textFromComponent({ component, textClass }) {
  if (component.componentType === 'string' || component instanceof textClass) {
    return { success: true, textValue: component.stateValues.value };
  } else if (typeof component.stateValues.text === 'string') {
    return { success: true, textValue: component.stateValues.text };
  } else if (component.toText !== undefined) {
    let textValue = component.toText();
    if (typeof textValue === 'string') {
      return { success: true, textValue: textValue };
    }
  }

  return { success: false, textValue: '' };
}
