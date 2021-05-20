import React, { useState, useRef } from 'react';
import DriveCard from './DoenetDriveCard';
// import { useTransition, animated,useSpring, useChain ,config} from "react-spring";
import './drivecard.css';
import Measure from 'react-measure';
import { useHistory } from 'react-router-dom';
import { useMenuPanelController } from '../../Tools/_framework/Panels/MenuPanel';
import { drivecardSelectedNodesAtom } from '../../Tools/library/Library';
import {
  // atom,
  useSetRecoilState,
  useRecoilValue,
  useRecoilState,
  useRecoilValueLoadable,
} from 'recoil';
import { fetchDrivesSelector, drivePathSyncFamily } from './Drive';

const DriveCards = (props) => {
  const {
    driveDoubleClickCallback,
    isOneDriveSelect,
    subTypes,
    types,
    drivePathSyncKey,
  } = props;

  const drivesInfo = useRecoilValueLoadable(fetchDrivesSelector);
  let driveInfo = [];
  if (drivesInfo.state === 'hasValue') {
    driveInfo = drivesInfo.contents.driveIdsAndLabels;
  }
  // Drive cards component
  let drivecardComponent = null;
  if (driveInfo && driveInfo.length > 0) {
    drivecardComponent = (
      <DriveCardWrapper
        driveDoubleClickCallback={driveDoubleClickCallback}
        subTypes={subTypes}
        types={types}
        drivePathSyncKey={drivePathSyncKey}
        isOneDriveSelect={isOneDriveSelect}
        driveInfo={driveInfo}
      />
    );
  } else if (driveInfo.length === 0) {
    if (isOneDriveSelect) {
      drivecardComponent = <h2>You have no courses.</h2>;
    } else {
      drivecardComponent = (
        <h2>You have no courses. Add one using the Menu Panel {`-->`} </h2>
      );
    }
  }
  return <>{drivecardComponent}</>;
};

const DriveCardWrapper = (props) => {
  const {
    driveDoubleClickCallback,
    isOneDriveSelect,
    subTypes,
    driveInfo,
    drivePathSyncKey,
    types,
  } = props;

  const [drivecardSelectedValue, setDrivecardSelection] = useRecoilState(
    drivecardSelectedNodesAtom,
  );
  const setOpenMenuPanel = useMenuPanelController();
  const [driveCardPath, setDrivecardPath] = useRecoilState(
    drivePathSyncFamily(drivePathSyncKey),
  );

  let driveCardItems = [];
  let heights = [];
  const [width, setWidth] = useState(0);
  const getColumns = (width) => {
    if (width > 1500) {
      return 5;
    } else if (width > 1000) {
      return 4;
    } else if (width > 600) {
      return 3;
    } else if (width > 400) {
      return 2;
    } else if (width > 200) {
      return 1;
    } else {
      return 1;
    }
  };
  const columns = getColumns(width);
  heights = new Array(columns).fill(0);
  let showCards = [];
  if (types[0] === 'course') {
    if (subTypes.length > 1) {
      showCards = driveInfo;
    } else {
      for (let i = 0; i < driveInfo.length; i++) {
        if (driveInfo[i].subType === subTypes[0]) {
          showCards.push(driveInfo[i]);
        }
      }
    }
  }

  driveCardItems = showCards.map((child, i) => {
    const column = heights.indexOf(Math.min(...heights)); // Basic masonry-grid placing, puts tile into the smallest column using Math.min
    const xy = [(width / columns) * column, (heights[column] += 250) - 250]; // X = container width / number of columns * column index, Y = it's just the height of the current column
    return { ...child, xy, width: width / columns, height: 250 };
  });

  if (driveCardPath.driveId !== '') {
    return null;
  }

  function setRecoilDrivePath(driveId) {
    setDrivecardPath({
      driveId,
      parentFolderId: driveId,
      itemId: driveId,
      type: 'Drive',
    });
  }

  const handleKeyDown = (e, item) => {
    if (e.key === 'Enter') {
      setDrivecardPath({
        driveId: item.driveId,
        parentFolderId: item.driveId,
        itemId: item.driveId,
        type: 'Drive',
      });
      // setRecoilDrivePath(item.driveId)
    }
  };

  const handleKeyUp = (e, item) => {
    if (e.key === 'Tab') {
      setDrivecardSelection([item]);
    }
  };

  // Drive selection
  const drivecardselection = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuPanel(0);
    if (isOneDriveSelect) {
      if (!e.shiftKey && !e.metaKey) {
        // one item
        setDrivecardSelection((old) => [item]);
      }
    } else {
      if (!e.shiftKey && !e.metaKey) {
        // one item
        setDrivecardSelection((old) => [item]);
      } else if (e.shiftKey && !e.metaKey) {
        // range to item

        setDrivecardSelection((old) => {
          if (old.length > 0) {
            let finalArray = [];
            let initalDriveId = '';
            if (old.length === 1) {
              initalDriveId = old[0].driveId;
            } else {
              finalArray = [...old];
              initalDriveId = old[old.length - 1].driveId;
            }
            let firstDriveId = driveCardItems.findIndex(
              (j) => j.driveId === item.driveId,
            );
            let lastDriveId = driveCardItems.findIndex(
              (k) => k.driveId === initalDriveId,
            );
            if (firstDriveId > lastDriveId) {
              let slicedArr = driveCardItems.slice(
                lastDriveId,
                firstDriveId + 1,
              );
              let filteredArr = slicedArr.map((l) => l);
              finalArray = [...finalArray, ...filteredArr];
            } else {
              let slicedArr = driveCardItems.slice(
                firstDriveId,
                lastDriveId + 1,
              );
              let filteredArr = slicedArr.map((m) => m);
              finalArray = [...finalArray, ...filteredArr];
            }
            let outputArray = finalArray.reduce(
              (uniue, index) =>
                uniue.find((el) => (el.driveId == index.driveId ? true : false))
                  ? uniue
                  : [...uniue, index],
              [],
            );
            return outputArray;
          } else {
            return [...old, item];
          }
        });
      } else if (!e.shiftKey && e.metaKey) {
        // add item
        setDrivecardSelection((old) => {
          let alreadyAvaliable = old.filter((i) => i.driveId === item.driveId);
          if (alreadyAvaliable.length > 0) {
            const arr = [];
            for (let i = 0; i < old.length; i++) {
              if (old[i].driveId != item.driveId) {
                arr.push(old[i]);
              }
            }
            return arr;
          } else {
            return [...old, item];
          }
        });
      }
    }
  };

  const getSelectedCard = (cardItem) => {
    if (drivecardSelectedValue.length == 0) {
      return false;
    }
    let availableCard = drivecardSelectedValue.filter(
      (i) =>
        i.driveId === cardItem.driveId &&
        i.drivePathSyncKey === drivePathSyncKey,
    );
    return availableCard.length > 0 ? true : false;
  };

  return (
    <div className="drivecardContainer">
      <Measure
        bounds
        onResize={(contentRect) => {
          setWidth(contentRect.bounds.width);
        }}
      >
        {({ measureRef }) => (
          <div
            ref={measureRef}
            style={{
              width: '100%',
            }}
            className={`list`}
          >
            {driveCardItems.map((item, index) => {
              item['drivePathSyncKey'] = drivePathSyncKey; //need for selection
              let isSelected = getSelectedCard(item);
              return (
                <div
                  key={index}
                  className={`adiv ${isSelected ? 'borderselection' : ''}`}
                  style={{
                    width: 250,
                    height: 250,
                    opacity: 1,
                    padding: 15,
                  }}
                >
                  <div
                    style={{ height: '100%', outline: 'none' }}
                    tabIndex={index + 1}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      drivecardselection(e, item, props);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, item)}
                    onKeyUp={(e) => handleKeyUp(e, item)}
                    // onBlur={(e)=> handleKeyBlur(e,item)}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDrivecardSelection([]);
                      setRecoilDrivePath(item.driveId);
                      // if (driveDoubleClickCallback) {
                      //   driveDoubleClickCallback({ item });
                      // }
                    }}
                  >
                    <DriveCard
                      image={item.image}
                      color={item.color}
                      label={item.label}
                      isSelected={isSelected}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Measure>
    </div>
  );
};

export default DriveCards;
