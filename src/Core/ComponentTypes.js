import * as PropertyComponents from './components/PropertyComponents';
import * as MMeMen from './components/MMeMen';
import * as MdMdnMrow from './components/MdMdnMrow';
import * as BooleanOperators from './components/BooleanOperators';
import * as BooleanOperatorsOfMath from './components/BooleanOperatorsOfMath';
import * as MathOperators from './components/MathOperators';
import * as FunctionOperators from './components/FunctionOperators';
import * as Extrema from './components/Extrema';
import * as PatternReplace from './components/PatternReplace';
import * as ParagraphMarkup from './components/ParagraphMarkup';
import * as SingleCharacterComponents from './components/SingleCharacterComponents';
import * as Sectioning from './components/Sectioning';
import * as Lists from './components/Lists';
import * as DynamicalSystems from './components/dynamicalSystems';
import * as FeedbackDefinitions from './components/FeedbackDefinitions';
import * as StyleDefinitions from './components/StyleDefinitions';
import * as ComponentWithSelectableType from './components/abstract/ComponentWithSelectableType';
import * as SideBySide from './components/SideBySide';
import * as UpdateValue from './components/UpdateValue';
import Document from './components/Document';
import StringComponent from './components/StringComponent';
import Text from './components/Text';
import TextList from './components/TextList';
import RandomizedTextList from './components/RandomizedTextList';
import MathList from './components/MathList';
import NumberList from './components/NumberList';
import P from './components/P';
import BooleanComponent from './components/Boolean';
import BooleanList from './components/BooleanList';
import MathComponent from './components/Math';
import Copy from './components/Copy';
import Extract from './components/Extract';
import Collect from './components/Collect';
import Ref from './components/Ref';
import Point from './components/Point';
import Coords from './components/Coords';
import Line from './components/Line';
import LineSegment from './components/LineSegment';
import Polyline from './components/Polyline';
import Polygon from './components/Polygon';
import Triangle from './components/Triangle';
import Rectangle from './components/Rectangle';
import Circle from './components/Circle';
import Parabola from './components/Parabola';
import Curve from './components/Curve';
import BezierControls from './components/BezierControls';
import ControlVectors from './components/ControlVectors';
import PointListComponent from './components/abstract/PointListComponent';
import LineListComponent from './components/abstract/LineListComponent';
import VectorListComponent from './components/abstract/VectorListComponent';
import AngleListComponent from './components/abstract/AngleListComponent';
import Vector from './components/Vector';
import Angle from './components/Angle';
import Answer from './components/Answer';
import Award from './components/Award';
import When from './components/When';
import MathInput from './components/MathInput';
import TextInput from './components/TextInput';
import BooleanInput from './components/BooleanInput';
import ChoiceInput from './components/ChoiceInput';
import Choice from './components/Choice';
import NumberComponent from './components/Number';
import Integer from './components/Integer';
import Graph from './components/Graph';
import Variables from './components/Variables';
import Variable from './components/Variable';
import Function from './components/Function';
import Template from './components/Template';
import Option from './components/Option';
import Sequence from './components/Sequence';
import Map from './components/Map';
import Sources from './components/Sources';
import Slider from './components/Slider';
import Markers from './components/Markers';
import Constraints from './components/Constraints';
import ConstrainToGrid from './components/ConstrainToGrid';
import AttractToGrid from './components/AttractToGrid';
import ConstrainTo from './components/ConstrainTo';
import AttractTo from './components/AttractTo';
import ConstraintUnion from './components/ConstraintUnion';
import TransformConstraintIntoAttractor from './components/TransformConstraintIntoAttractor';
import Intersection from './components/Intersection';
import Panel from './components/Panel';
import ConstrainToAngles from './components/ConstrainToAngles';
import AttractToAngles from './components/AttractToAngles';
import ConditionalContent from './components/ConditionalContent';
import AsList from './components/AsList';
import Spreadsheet from './components/Spreadsheet';
import Cell from './components/Cell';
import Row from './components/Row';
import Column from './components/Column';
import CellBlock from './components/CellBlock';
import Table from './components/Table';
import Variants from './components/Variants';
import Seeds from './components/Seeds';
import VariantControl from './components/VariantControl';
import SelectFromSequence from './components/SelectFromSequence';
import Select from './components/Select';
import Group from './components/Group';
import AnimateFromSequence from './components/AnimateFromSequence';
import Evaluate from './components/Evaluate';
import RandomNumber from './components/RandomNumber';
import GenerateRandomNumbers from './components/GenerateRandomNumbers';
import Substitute from './components/Substitute';
import Offsets from './components/Offsets';
import DiscreteInfiniteSet from './components/DiscreteInfiniteSet';
import Image from './components/Image';
import Video from './components/Video';
import Embed from './components/Embed';
import Hint from './components/Hint';
import Solution from './components/Solution';
import IntComma from './components/IntComma';
import Pluralize from './components/Pluralize';
import Feedback from './components/Feedback';
import Container from './components/Container';
import CollaborateGroups from './components/CollaborateGroups';
import CollaborateGroupSetup from './components/CollaborateGroupSetup';
import ConsiderAsResponses from './components/ConsiderAsResponses';
import SelectByIndex from './components/SelectByIndex';
import Case from './components/Case';
import SelectByCondition from './components/SelectByCondition';
import Lorem from './components/Lorem';

//Extended
import * as ComponentSize from './components/abstract/ComponentSize';
import BaseComponent from './components/abstract/BaseComponent';
import InlineComponent from './components/abstract/InlineComponent';
import BlockComponent from './components/abstract/BlockComponent';
import GraphicalComponent from './components/abstract/GraphicalComponent';
import ConstraintComponent from './components/abstract/ConstraintComponent';
import Input from './components/abstract/Input';
import CompositeComponent from './components/abstract/CompositeComponent';
import BooleanBaseOperator from './components/abstract/BooleanBaseOperator';
import BooleanBaseOperatorOfMath from './components/abstract/BooleanBaseOperatorOfMath';
import MathBaseOperator from './components/abstract/MathBaseOperator';
import MathBaseOperatorOneInput from './components/abstract/MathBaseOperatorOneInput';
import FunctionBaseOperator from './components/abstract/FunctionBaseOperator';
import SectioningComponent from './components/abstract/SectioningComponent';
import TextFromSingleStringChild from './components/abstract/TextFromSingleStringChild';
import InlineRenderInlineChildren from './components/abstract/InlineRenderInlineChildren';
import TextOrInline from './components/abstract/TextOrInline';

const componentTypeArray = [
  ...Object.values(PropertyComponents),
  ...Object.values(MMeMen),
  ...Object.values(MdMdnMrow),
  ...Object.values(BooleanOperators),
  ...Object.values(BooleanOperatorsOfMath),
  ...Object.values(MathOperators),
  ...Object.values(FunctionOperators),
  ...Object.values(Extrema),
  ...Object.values(PatternReplace),
  ...Object.values(ParagraphMarkup),
  ...Object.values(SingleCharacterComponents),
  ...Object.values(Sectioning),
  ...Object.values(Lists),
  ...Object.values(DynamicalSystems),
  ...Object.values(FeedbackDefinitions),
  ...Object.values(StyleDefinitions),
  ...Object.values(UpdateValue),
  ...Object.values(SideBySide),
  ...Object.values(ComponentWithSelectableType),
  Document,
  StringComponent,
  Text,
  TextList,
  RandomizedTextList,
  P,
  BooleanComponent,
  BooleanList,
  MathComponent,
  MathList,
  NumberList,
  Copy,
  Extract,
  Collect,
  Ref,
  Point,
  Coords,
  Line,
  LineSegment,
  Polyline,
  Polygon,
  Triangle,
  Rectangle,
  Circle,
  Parabola,
  Curve,
  BezierControls,
  ControlVectors,
  Vector,
  Angle,
  Answer,
  Award,
  When,
  MathInput,
  TextInput,
  BooleanInput,
  ChoiceInput,
  Choice,
  NumberComponent,
  Integer,
  Graph,
  Variables,
  Variable,
  Function,
  Template,
  Option,
  Sequence,
  Slider,
  Spreadsheet,
  Cell,
  Row,
  Column,
  CellBlock,
  Table,
  Markers,
  Panel,
  Map,
  Sources,
  Constraints,
  ConstrainToGrid,
  AttractToGrid,
  ConstrainTo,
  AttractTo,
  ConstraintUnion,
  TransformConstraintIntoAttractor,
  Intersection,
  ConstrainToAngles,
  AttractToAngles,
  ConditionalContent,
  AsList,
  Seeds,
  Variants,
  VariantControl,
  SelectFromSequence,
  Select,
  Group,
  AnimateFromSequence,
  Evaluate,
  RandomNumber,
  GenerateRandomNumbers,
  Substitute,
  Offsets,
  DiscreteInfiniteSet,
  Image,
  Video,
  Embed,
  Hint,
  Solution,
  IntComma,
  Pluralize,
  Feedback,
  Container,
  CollaborateGroups,
  CollaborateGroupSetup,
  ConsiderAsResponses,
  SelectByIndex,
  Case,
  SelectByCondition,
  Lorem,
  BaseComponent,
  InlineComponent,
  BlockComponent,
  GraphicalComponent,
  ConstraintComponent,
  Input,
  CompositeComponent,
  PointListComponent,
  LineListComponent,
  VectorListComponent,
  AngleListComponent,
  BooleanBaseOperator,
  BooleanBaseOperatorOfMath,
  MathBaseOperator,
  MathBaseOperatorOneInput,
  FunctionBaseOperator,
  ...Object.values(ComponentSize),
  SectioningComponent,
  TextFromSingleStringChild,
  InlineRenderInlineChildren,
  TextOrInline,
];

export function standardComponentClasses() {
  const componentClasses = {};
  const lowerCaseComponentTypes = new Set();
  for (let ct of componentTypeArray) {
    let newComponentType = ct.componentType;

    if (newComponentType.substring(0, 1) !== '_') {
      if (newComponentType === undefined) {
        throw Error(
          'Cannot create component as componentType is undefined for class ' +
            ct,
        );
      }
      let lowerCaseType = newComponentType.toLowerCase();
      if (lowerCaseComponentTypes.has(lowerCaseType)) {
        throw Error(
          'component type ' + newComponentType + ' defined in two classes',
        );
      }
      if (!/[a-zA-Z]/.test(newComponentType.substring(0, 1))) {
        throw Error(
          'Invalid component type ' +
            newComponentType +
            '. Component types must begin with a letter.',
        );
      }
      componentClasses[newComponentType] = ct;
      lowerCaseComponentTypes.add(lowerCaseType);
    }
  }
  return componentClasses;
}

export function allComponentClasses() {
  const componentClasses = {};
  const lowerCaseComponentTypes = new Set();
  for (let ct of componentTypeArray) {
    let newComponentType = ct.componentType;
    if (newComponentType === undefined) {
      throw Error(
        'Cannot create component as componentType is undefined for class ' + ct,
      );
    }
    let lowerCaseType = newComponentType.toLowerCase();
    if (lowerCaseComponentTypes.has(lowerCaseType)) {
      throw Error(
        'component type ' + newComponentType + ' defined in two classes',
      );
    }
    componentClasses[newComponentType] = ct;
    lowerCaseComponentTypes.add(lowerCaseType);
  }
  return componentClasses;
}

export function componentTypesCreatingVariants() {
  const componentClasses = {};
  const lowerCaseComponentTypes = new Set();
  for (let ct of componentTypeArray) {
    if (ct.createsVariants) {
      let newComponentType = ct.componentType;
      if (newComponentType === undefined) {
        throw Error(
          'Cannot create component as componentType is undefined for class ' +
            ct,
        );
      }
      let lowerCaseType = newComponentType.toLowerCase();
      if (lowerCaseComponentTypes.has(lowerCaseType)) {
        throw Error(
          'component type ' + newComponentType + ' defined in two classes',
        );
      }
      componentClasses[newComponentType] = ct;
      lowerCaseComponentTypes.add(lowerCaseType);
    }
  }
  return componentClasses;
}

export function componentTypeWithPotentialVariants() {
  const componentClasses = {};
  const lowerCaseComponentTypes = new Set();
  for (let ct of componentTypeArray) {
    if (
      ct.createsVariants ||
      ct.setUpVariantIfVariantControlChild ||
      ct.alwaysSetUpVariant
    ) {
      let newComponentType = ct.componentType;
      if (newComponentType === undefined) {
        throw Error(
          'Cannot create component as componentType is undefined for class ' +
            ct,
        );
      }
      let lowerCaseType = newComponentType.toLowerCase();
      if (lowerCaseComponentTypes.has(lowerCaseType)) {
        throw Error(
          'component type ' + newComponentType + ' defined in two classes',
        );
      }
      componentClasses[newComponentType] = ct;
      lowerCaseComponentTypes.add(lowerCaseType);
    }
  }
  return componentClasses;
}
