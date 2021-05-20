import BooleanBaseOperatorOfMath from './abstract/BooleanBaseOperatorOfMath';

export class IsInteger extends BooleanBaseOperatorOfMath {
  static componentType = 'isinteger';

  static applyBooleanOperator(values) {
    if (values.length === 0) {
      return false;
    }
    if (values.length !== 1) {
      console.warn('IsInteger requires exactly one math child');
      return null;
    }
    let numericValue = values[0].evaluate_to_constant();

    if (!Number.isFinite(numericValue)) {
      return false;
    }

    // to account for round off error, round to nearest integer
    // and check if close to that integer
    let rounded = Math.round(numericValue);
    if (Math.abs(rounded - numericValue) <= 1e-15 * Math.abs(numericValue)) {
      return true;
    } else {
      return false;
    }
  }
}

export class IsNumber extends BooleanBaseOperatorOfMath {
  static componentType = 'isNumber';

  static applyBooleanOperator(values) {
    if (values.length === 0) {
      return false;
    }
    if (values.length !== 1) {
      console.warn('IsNumber requires exactly one math child');
      return null;
    }
    let numericValue = values[0].evaluate_to_constant();

    return Number.isFinite(numericValue);
  }
}
