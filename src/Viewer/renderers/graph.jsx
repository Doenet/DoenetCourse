import React from 'react';
import DoenetRenderer from './DoenetRenderer';
import { sizeToCSS } from './utils/css';

export default class Graph extends DoenetRenderer {
  constructor(props) {
    super(props);

    this.setAllBoardsToStayLowQuality =
      this.setAllBoardsToStayLowQuality.bind(this);
    this.setAllBoardsToHighQualityAndUpdate =
      this.setAllBoardsToHighQualityAndUpdate.bind(this);
  }

  static initializeChildrenOnConstruction = false;

  componentDidMount() {
    this.drawBoard();
    this.forceUpdate();
    // this.drawGraphicalComponents();
  }

  drawBoard() {
    window.JXG.Options.axis.ticks.majorHeight = 20;

    let boundingbox = [
      this.doenetSvData.xmin,
      this.doenetSvData.ymax,
      this.doenetSvData.xmax,
      this.doenetSvData.ymin,
    ];

    this.board = window.JXG.JSXGraph.initBoard(this.componentName, {
      boundingbox,
      axis: false,
      showCopyright: false,
      showNavigation: this.doenetSvData.showNavigation,
    });

    if (this.doenetSvData.displayXAxis) {
      let xaxisOptions = {};
      if (this.doenetSvData.xlabel) {
        xaxisOptions.name = this.doenetSvData.xlabel;
        xaxisOptions.withLabel = true;
        xaxisOptions.label = {
          position: 'rt',
          offset: [-10, 15],
        };
      }
      xaxisOptions.ticks = {
        ticksDistance: 2,
        label: {
          offset: [-5, -15],
        },
        minorTicks: 5,
        precision: 4,
      };

      if (!this.doenetSvData.displayYAxis) {
        xaxisOptions.ticks.drawZero = true;
      }

      let xaxis = this.board.create(
        'axis',
        [
          [0, 0],
          [1, 0],
        ],
        xaxisOptions,
      );
    }

    if (this.doenetSvData.displayYAxis) {
      let yaxisOptions = {};
      if (this.doenetSvData.ylabel) {
        yaxisOptions.name = this.doenetSvData.ylabel;
        yaxisOptions.withLabel = true;
        yaxisOptions.label = {
          position: 'rt',
          offset: [-25, -5],
        };
      }
      yaxisOptions.ticks = {
        ticksDistance: 2,
        label: {
          offset: [12, -2],
        },
        minorTicks: 4,
        precision: 4,
      };

      if (!this.doenetSvData.displayXAxis) {
        yaxisOptions.ticks.drawZero = true;
      }

      let yaxis = this.board.create(
        'axis',
        [
          [0, 0],
          [0, 1],
        ],
        yaxisOptions,
      );
    }

    this.board.itemsRenderedLowQuality = {};

    // this.board.on('up', this.setAllBoardsToHighQualityAndUpdate);
    // this.board.on('down', this.setAllBoardsToStayLowQuality);

    this.board.on('boundingbox', () => {
      if (!this.settingBoundingBox) {
        this.previousBoundingbox = this.board.getBoundingBox();
        let [xmin, ymax, xmax, ymin] = this.previousBoundingbox;
        this.actions.changeAxisLimits({
          xmin,
          xmax,
          ymin,
          ymax,
        });
      }
    });

    this.doenetPropsForChildren = { board: this.board };
    this.initializeChildren();

    this.previousBoundingbox = boundingbox;

    this.previousDimensions = {
      width: parseFloat(sizeToCSS(this.doenetSvData.width)),
      height: parseFloat(sizeToCSS(this.doenetSvData.height)),
    };
  }

  update() {
    let currentDimensions = {
      width: parseFloat(sizeToCSS(this.doenetSvData.width)),
      height: parseFloat(sizeToCSS(this.doenetSvData.height)),
    };

    if (
      (currentDimensions.width !== this.previousDimensions.width ||
        currentDimensions.height !== this.previousDimensions.height) &&
      Number.isFinite(currentDimensions.width) &&
      Number.isFinite(currentDimensions.height)
    ) {
      this.board.resizeContainer(
        currentDimensions.width,
        currentDimensions.height,
      );
      this.previousDimensions = currentDimensions;
    }

    let boundingbox = [
      this.doenetSvData.xmin,
      this.doenetSvData.ymax,
      this.doenetSvData.xmax,
      this.doenetSvData.ymin,
    ];

    if (boundingbox.some((v, i) => v !== this.previousBoundingbox[i])) {
      this.settingBoundingBox = true;
      this.board.setBoundingBox(boundingbox);
      this.settingBoundingBox = false;
      // seem to need to call this again to get the ticks correct
      this.board.fullUpdate();

      if (this.board.updateQuality === this.board.BOARD_QUALITY_LOW) {
        this.board.itemsRenderedLowQuality[this.componentName] = this.board;
      }

      this.previousBoundingbox = boundingbox;
    }

    super.update();
  }

  setToLowQualityRender({ stayLowQuality } = {}) {
    if (this.board !== undefined) {
      this.board.updateQuality = this.board.BOARD_QUALITY_LOW;
      if (stayLowQuality !== undefined) {
        this.stayLowQuality = stayLowQuality;
      }
    }
  }

  setToHighQualityRenderAndUpdate({ overrideStayLowQuality = false } = {}) {
    if (this.stayLowQuality && !overrideStayLowQuality) {
      return;
    }

    if (this.board === undefined) {
      return;
    }
    this.stayLowQuality = false;
    this.board.updateQuality = this.board.BOARD_QUALITY_HIGH;
    let updatedItem = false;
    for (let key in this.board.itemsRenderedLowQuality) {
      let item = this.board.itemsRenderedLowQuality[key];
      item.needsUpdate = true;
      item.update();
      updatedItem = true;
    }
    if (updatedItem) {
      this.board.updateRenderer();
    }
    this.board.itemsRenderedLowQuality = {};
  }

  setAllBoardsToStayLowQuality() {
    for (let renderer of this.graphRenderComponents) {
      renderer.setToLowQualityRender({ stayLowQuality: true });
    }
  }

  setAllBoardsToHighQualityAndUpdate() {
    for (let renderer of this.graphRenderComponents) {
      renderer.setToHighQualityRenderAndUpdate({
        overrideStayLowQuality: true,
      });
    }
  }

  componentWillUnmount() {
    // let allRenderers = this.renderers;
    // for(let componentName in allRenderers) {
    //   let componentRenderer = allRenderers[componentName];
    //   if(componentRenderer.deleteGraphicalObject !== undefined) {
    //     componentRenderer.deleteGraphicalObject();
    //   }
    // }
  }

  componentDidUpdate() {
    // this.updateGraphicalComponents();
    //window.MathJax.Hub.Queue(["Typeset",window.MathJax.Hub, "#"+this.component.componentName]);
  }

  render() {
    const divStyle = {
      width: sizeToCSS(this.doenetSvData.width),
      height: sizeToCSS(this.doenetSvData.height),
    };

    if (this.doenetSvData.hidden) {
      divStyle.display = 'none';
    }

    return (
      <React.Fragment>
        <a name={this.componentName} />
        <div id={this.componentName} className="jxgbox" style={divStyle} />
        {this.children}
      </React.Fragment>
    );
  }
}
