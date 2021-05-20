import BooleanBaseOperator from './abstract/BooleanBaseOperator';
import BooleanBaseOperatorOneInput from './abstract/BooleanBaseOperatorOneInput';

export class Not extends BooleanBaseOperatorOneInput {
  static componentType = 'not';

  static applyBooleanOperator(value) {
    return !value;
  }
}

export class And extends BooleanBaseOperator {
  static componentType = 'and';

  static applyBooleanOperator(values) {
    return values.every((x) => x);
  }
}

export class Or extends BooleanBaseOperator {
  static componentType = 'or';

  static applyBooleanOperator(values) {
    return values.some((x) => x);
  }
}

export class Xor extends BooleanBaseOperator {
  static componentType = 'xor';

  static applyBooleanOperator(values) {
    let numberTrues = values.reduce((acc, curr) => acc + curr, 0);
    return numberTrues === 1;
  }
}
