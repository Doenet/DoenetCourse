import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
// import VerticalDivider from "../../../imports/PanelHeaderComponents/VerticalDivider";

const wrappedCtrlGrp = styled.div`
  position: 'relative';
`;

var MinimizedSection = styled.div`
height:100px,
opacity: 1;
display: block;
background-color: white;
width: max-content;
border: 1px solid #E2E2E2;
z-index: 9999;
color: black;
position: absolute;
right: 0;
top:50px;
`;

export default function ResponsiveControlsWrapper(props) {
  // console.log("on resize",props.mainPanelWidth);
  var getControlGroupsWidth = (width) => {
    setControlGrpWidthArray((ctrlGrpWidthsArray) => [
      ...ctrlGrpWidthsArray,
      width,
    ]);
  };

  const [iconObj, setIconObj] = useState({});
  const [innerWidth, setInnerWidth] = useState(window.innerWidth);
  const [minimizedItemIndex, setMinimizedItemIndex] = useState(-1);
  const [ctrlGrpWidthsArray, setControlGrpWidthArray] = useState([]);
  const [tobeRenderedChildren, setToBeRenderedChildren] = useState(
    React.Children.map(props.children, (obj) =>
      React.cloneElement(obj, { getControlGroupsWidth: getControlGroupsWidth }),
    ),
  );
  const [defaultChildrens, setDefaultChildrens] = useState(
    React.Children.map(props.children, (obj) =>
      React.cloneElement(obj, { getControlGroupsWidth: getControlGroupsWidth }),
    ),
  );
  const [leftPos, setLeftPos] = useState(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const WRAPPED_CONTROL_GROUP_WIDTH = 50;

  var showMinimizedVersion = (icon, index) => {
    setIconObj(icon);
    // if(icon.props && icon.props.children){
    //   icon.props.children.props.style.backgroundColor = "skyblue";
    // }
    let widthToBeAdded = index * 5;
    if (index !== 0) {
      let width = 0;
      for (let i = 0; i < index; i++) {
        let childObj = tobeRenderedChildren[i];
        if (width === 0) {
          if (childObj.type && typeof childObj.type === 'function') {
            width = ctrlGrpWidthsArray[i];
          }
          if (childObj.type && childObj.type === 'wrappedCtrlGrp') {
            width = 50;
          }
        } else {
          if (childObj.type && typeof childObj.type === 'function') {
            width = width + ctrlGrpWidthsArray[i];
          }
          if (childObj.type && childObj.type === 'wrappedCtrlGrp') {
            width = width + 50;
          }
        }
      }
      width = width + widthToBeAdded;
      // // console.log("left position", width);
      setLeftPos(width.toString().concat('px'));
    } else {
      setLeftPos(undefined);
    }
    setMinimizedItemIndex(index);
    setIsOpen(!isOpen);
    // props.setMinimizedPropIndex(index);
  };

  useEffect(() => {
    setToBeRenderedChildren(tobeRenderedChildren);
  }, [minimizedItemIndex]);

  ////////compares all control group's width and main panel's width and collapses/expands
  useEffect(() => {
    // console.log(">>>control groups width",ctrlGrpWidthsArray )
    // on render detects width of main panel and checks,which control groups should collapse
    //if change in ctrlGrpWidthsArray
    if (ctrlGrpWidthsArray.length > 0 && minimizedItemIndex === -1) {
      let totalInitialWidth = ctrlGrpWidthsArray.reduce((a, b) => a + b, 0); // total widths of all control groups
      let vdWidth = (ctrlGrpWidthsArray.length - 1) * 5; //Vertical Dividers Width
      totalInitialWidth = totalInitialWidth + vdWidth;
      if (totalInitialWidth > props.mainPanelWidth) {
        //checks if initial width of all control groups is more than main panel width
        let toBeCheckedWidth = 0; // toBeCheckedWidth (comparing changed width while render to main panel width)
        let expandChildIndexArr = [];
        ctrlGrpWidthsArray.forEach((width, index) => {
          //finding the indexes of ctrl groups which will fit with in the main panel width;
          if (toBeCheckedWidth === 0) {
            toBeCheckedWidth =
              vdWidth +
              width +
              (ctrlGrpWidthsArray.length - 1 - index) *
                WRAPPED_CONTROL_GROUP_WIDTH;
            if (toBeCheckedWidth > props.mainPanelWidth) {
              return;
            } else {
              expandChildIndexArr.push(index);
            }
          } else {
            toBeCheckedWidth = toBeCheckedWidth + width;
            // console.log("to be checked width before", toBeCheckedWidth);
            toBeCheckedWidth =
              toBeCheckedWidth +
              (ctrlGrpWidthsArray.length - 1 - index) *
                WRAPPED_CONTROL_GROUP_WIDTH;
            // console.log("to be checked width after", toBeCheckedWidth);
            if (toBeCheckedWidth > props.mainPanelWidth) {
              return;
            } else {
              expandChildIndexArr.push(index);
            }
          }
        }); //finding the indexes how many control groups will fit with in the main panel width;
        // debugger;
        let childrenArray = [...tobeRenderedChildren];
        ctrlGrpWidthsArray.forEach((obj, index) => {
          if (expandChildIndexArr.indexOf(index) === -1) {
            var propsEl = createWrappedEl(childrenArray, index);
            if (propsEl) {
              childrenArray[index] = propsEl;
            }
          }
        });
        // debugger;
        setToBeRenderedChildren(childrenArray);
      }
    }
  }, [ctrlGrpWidthsArray]);

  // const windowResizeHandlerInCGW = () => {
  //   setInnerWidth(window.innerWidth);
  // };

  const handleClick = (e) => {
    // console.log(">>>eventobj", e.target.nodeName);
    // console.log("clicked index"  , minimizedItemIndex);
    // console.log("clicked index width", width, ctrlGrpWidthsArray)
    // if(e.target.nodeName !== "svg" && e.target.nodeName !== "path" && minimizedItemIndex !== -1) {
    //   setMinimizedItemIndex(-1);
    //   props.setMinimizedPropIndex(-1);
    // }
    setIsOpen(!isOpen);
  };
  // window.addEventListener("resize", windowResizeHandlerInCGW);
  document.addEventListener('click', handleClick);

  // main panel width changes with window resize -- converting control group to wrapper(icon) and vs
  useEffect(() => {
    let wrappedChildrens = tobeRenderedChildren.filter(
      (obj) => obj && obj.type && obj.type === 'wrappedCtrlGrp',
    );
    let unWrappedChildrens = tobeRenderedChildren.filter(
      (obj) => obj && obj.type && obj.type && typeof obj.type === 'function',
    );
    let wrappedChildrenIndexes = [];
    let unwrappedChildrenIndexes = [];
    let verticalDividersWidth = (tobeRenderedChildren.length - 1) * 5;
    //calculating wrapped/unwrapped indexes and widths
    tobeRenderedChildren.map((obj, index) => {
      if (obj && obj.type && obj.type === 'wrappedCtrlGrp') {
        wrappedChildrenIndexes.push(index);
      }
    });
    tobeRenderedChildren.map((obj, index) => {
      if (obj && obj.type && typeof obj.type === 'function') {
        unwrappedChildrenIndexes.push(index);
      }
    });
    let unwrappedChildrenWidth = 0;
    ctrlGrpWidthsArray.forEach((width, index) => {
      if (unwrappedChildrenIndexes.indexOf(index) !== -1) {
        if (unwrappedChildrenWidth === 0) {
          unwrappedChildrenWidth = width;
        } else {
          unwrappedChildrenWidth = unwrappedChildrenWidth + width;
        }
      }
    });
    ////////

    //while maximizing
    if (wrappedChildrens.length !== 0) {
      if (
        props.mainPanelWidth >
        unwrappedChildrenWidth +
          ctrlGrpWidthsArray[wrappedChildrenIndexes[0]] +
          wrappedChildrenIndexes.length * WRAPPED_CONTROL_GROUP_WIDTH
      ) {
        let children = [...tobeRenderedChildren];
        children[wrappedChildrenIndexes[0]] = React.cloneElement(
          defaultChildrens[wrappedChildrenIndexes[0]],
          { fromMaximize: true },
        );
        setToBeRenderedChildren(children);
      }
    }
    //while minimizing
    else if (unWrappedChildrens.length !== 0) {
      if (
        props.mainPanelWidth <
        verticalDividersWidth +
          unwrappedChildrenWidth +
          wrappedChildrenIndexes.length * WRAPPED_CONTROL_GROUP_WIDTH
      ) {
        let toBeUpdatedChildrenArray = [...tobeRenderedChildren];
        toBeUpdatedChildrenArray[
          unwrappedChildrenIndexes[unwrappedChildrenIndexes.length - 1]
        ] = (
          <wrappedCtrlGrp>
            {
              toBeUpdatedChildrenArray[unwrappedChildrenIndexes.length - 1][
                'props'
              ].icon
            }
          </wrappedCtrlGrp>
        );
        setToBeRenderedChildren(toBeUpdatedChildrenArray);
      }
    }
    setMinimizedItemIndex(-1);
    // props.setMinimizedPropIndex(-1);
  }, [props.mainPanelWidth]);

  // creating wrap element
  function createWrappedEl(propArray, index) {
    if (
      propArray[index] &&
      propArray[index]['props'] &&
      propArray[index]['props'].icon
    ) {
      return <wrappedCtrlGrp>{propArray[index]['props'].icon}</wrappedCtrlGrp>;
    }
  }

  return (
    <React.Fragment>
      {tobeRenderedChildren
        ? tobeRenderedChildren.map((obj, index) => {
            return (
              <div>
                {obj && obj.type && obj.type === 'wrappedCtrlGrp' ? (
                  <>
                    <div
                      style={{ display: 'flex' }}
                      onClick={() => {
                        showMinimizedVersion(obj, index);
                      }}
                    >
                      {obj}
                      {index === 0 && tobeRenderedChildren.length - 1 ? (
                        <VerticalDivider />
                      ) : index / 2 !== 0 &&
                        index !== tobeRenderedChildren.length - 1 ? (
                        <VerticalDivider />
                      ) : (
                        ''
                      )}
                    </div>
                    {isOpen ? (
                      <MinimizedSection
                        style={{
                          left: leftPos ? leftPos : 770,
                          position: 'absolute',
                        }}
                      >
                        {minimizedItemIndex !== -1
                          ? defaultChildrens[minimizedItemIndex]
                          : ''}{' '}
                      </MinimizedSection>
                    ) : (
                      false
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex' }}>
                    {obj}
                    {index === 0 &&
                    index !== tobeRenderedChildren.length - 1 ? (
                      <VerticalDivider />
                    ) : index / 2 !== 0 &&
                      index !== tobeRenderedChildren.length - 1 ? (
                      <VerticalDivider />
                    ) : (
                      ''
                    )}
                  </div>
                )}
              </div>
            );
          })
        : null}
    </React.Fragment>
  );
}
