import InlineRenderInlineChildren from './abstract/InlineRenderInlineChildren';

export class Em extends InlineRenderInlineChildren {
  static componentType = 'em';
}

export class Alert extends InlineRenderInlineChildren {
  static componentType = 'alert';
}

export class Q extends InlineRenderInlineChildren {
  static componentType = 'q';
}

export class SQ extends InlineRenderInlineChildren {
  static componentType = 'sq';
}

export class Term extends InlineRenderInlineChildren {
  static componentType = 'term';
  static rendererType = 'alert';
}

export class c extends InlineRenderInlineChildren {
  static componentType = 'c';
}
