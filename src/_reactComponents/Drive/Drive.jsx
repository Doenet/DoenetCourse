/**
 * External dependencies
 */
import React, {
  useContext,
  useRef,
  useEffect,
  Suspense,
  useCallback,
  useState,
} from 'react';
import axios from 'axios';
import { nanoid } from 'nanoid';
import Measure from 'react-measure';
import {
  faLink,
  faCode,
  faFolder,
  faChevronRight,
  faChevronDown,
  faUsersSlash,
  faUsers,
  faUserEdit,
  faBookOpen,
  faChalkboard,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  HashRouter as Router,
  Switch,
  Route,
  useHistory,
  Link,
} from 'react-router-dom';
import {
  atom,
  atomFamily,
  selector,
  selectorFamily,
  useSetRecoilState,
  useRecoilValueLoadable,
  useRecoilStateLoadable,
  useRecoilState,
  useRecoilValue,
} from 'recoil';

/**
 * Internal dependencies
 */
import {
  DropTargetsContext,
  DropTargetsConstant,
  WithDropTarget,
} from '../DropTarget';
import Draggable from '../Draggable';
import getSortOrder from '../../_utils/sort/LexicographicalRankingSort';
import { BreadcrumbContext } from '../Breadcrumb';
import { drivecardSelectedNodesAtom } from '../../Tools/library/Library';
import '../../_utils/util.css';
import {
  useDeleteItem,
  useMoveItems,
  useDragShadowCallbacks,
  useSortFolder,
  useCopyItems,
} from './DriveActions';
import { IsNavContext } from '../../Tools/_framework/Panels/NavPanel';
import { useToast } from '../../Tools/_framework/Toast';
import useKeyPressedListener from '../KeyPressedListener/useKeyPressedListener';

const fetchDriveUsersQuery = atomFamily({
  key: 'fetchDriveUsersQuery',
  default: selectorFamily({
    key: 'fetchDriveUsersQuery/Default',
    get: (driveId) => async () => {
      const payload = { params: { driveId } };
      const { data } = await axios.get('/api/loadDriveUsers.php', payload);
      return data;
    },
  }),
});

export const fetchDriveUsers = selectorFamily({
  key: 'fetchDriveUsers',
  get:
    (driveId) =>
    ({ get }) => {
      return get(fetchDriveUsersQuery(driveId));
    },
  set:
    (driveId) =>
    ({ get, set }, instructions) => {
      let payload = {
        params: {
          email: instructions.email,
          type: instructions.type,
          driveId,
          userId: instructions.userId,
        },
      };

      switch (instructions.type) {
        case 'Add Owner':
          axios.get('/api/saveUserToDrive.php', payload).then((resp) => {
            instructions.callback(resp.data);
          });

          break;
        case 'Add Owner step 2':
          set(fetchDriveUsersQuery(driveId), (was) => {
            let newDriveUsers = { ...was };
            let newOwners = [...was.owners];
            newOwners.push({
              email: instructions.email,
              isUser: false,
              screenName: instructions.screenName,
              userId: instructions.userId,
            });
            newDriveUsers['owners'] = newOwners;
            return newDriveUsers;
          });

          break;
        case 'Add Admin':
          axios.get('/api/saveUserToDrive.php', payload).then((resp) => {
            instructions.callback(resp.data);
          });
          break;
        case 'Add Admin step 2':
          set(fetchDriveUsersQuery(driveId), (was) => {
            let newDriveUsers = { ...was };
            let newAdmins = [...was.admins];
            newAdmins.push({
              email: instructions.email,
              isUser: false,
              screenName: instructions.screenName,
              userId: instructions.userId,
            });
            newDriveUsers['admins'] = newAdmins;
            return newDriveUsers;
          });
          break;
        case 'Remove User':
          set(fetchDriveUsersQuery(driveId), (was) => {
            let newDriveUsers = { ...was };
            if (instructions.userRole === 'owner') {
              let newOwners = [...was.owners];
              for (let [i, owner] of newOwners.entries()) {
                if (owner.userId === instructions.userId) {
                  newOwners.splice(i, 1);
                  break;
                }
              }
              newDriveUsers['owners'] = newOwners;
            }
            if (instructions.userRole === 'admin') {
              let newAdmins = [...was.admins];
              for (let [i, admin] of newAdmins.entries()) {
                if (admin.userId === instructions.userId) {
                  newAdmins.splice(i, 1);
                  break;
                }
              }
              newDriveUsers['admins'] = newAdmins;
            }
            return newDriveUsers;
          });

          axios.get('/api/saveUserToDrive.php', payload);
          // .then((resp)=>{console.log(">>>resp",resp.data) })

          break;
        case 'To Owner':
          set(fetchDriveUsersQuery(driveId), (was) => {
            let newDriveUsers = { ...was };
            let userEntry = {};
            let newAdmins = [...was.admins];
            for (let [i, admin] of newAdmins.entries()) {
              if (admin.userId === instructions.userId) {
                userEntry = admin;
                newAdmins.splice(i, 1);
                break;
              }
            }
            newDriveUsers['admins'] = newAdmins;

            let newOwners = [...was.owners];
            newOwners.push(userEntry);
            newDriveUsers['owners'] = newOwners;

            return newDriveUsers;
          });

          axios.get('/api/saveUserToDrive.php', payload);
          // .then((resp)=>{console.log(">>>resp",resp.data) })

          break;
        case 'To Admin':
          set(fetchDriveUsersQuery(driveId), (was) => {
            let newDriveUsers = { ...was };
            let userEntry = {};

            let newOwners = [...was.owners];
            for (let [i, owner] of newOwners.entries()) {
              if (owner.userId === instructions.userId) {
                if (owner.isUser) {
                  newDriveUsers.usersRole = 'admin';
                }
                userEntry = owner;
                newOwners.splice(i, 1);
                break;
              }
            }
            newDriveUsers['owners'] = newOwners;

            let newAdmins = [...was.admins];
            newAdmins.push(userEntry);
            newDriveUsers['admins'] = newAdmins;

            return newDriveUsers;
          });

          axios.get('/api/saveUserToDrive.php', payload);
          // .then((resp)=>{console.log(">>>resp",resp.data) })

          break;
        default:
          console.log(`type ${instructions.type} not handled`);
      }
    },
});

export const sortOptions = Object.freeze({
  DEFAULT: 'defaultOrder',
  LABEL_ASC: 'label ascending',
  LABEL_DESC: 'label descending',
  CREATION_DATE_ASC: 'creation date ascending',
  CREATION_DATE_DESC: 'creation date descending',
});

export const globalSelectedNodesAtom = atom({
  key: 'globalSelectedNodesAtom',
  default: [],
});

export const selectedDriveAtom = atom({
  key: 'selectedDriveAtom',
  default: '',
});

export const dragStateAtom = atom({
  key: 'dragStateAtom',
  default: {
    isDragging: false,
    draggedItemsId: null,
    draggedOverDriveId: null,
    initialDriveId: null,
    isDraggedOverBreadcrumb: false,
    dragShadowDriveId: null,
    dragShadowParentId: null,
    openedFoldersInfo: null,
    copyMode: false,
  },
});
const dragShadowId = 'dragShadow';

export default function Drive(props) {
  // console.log("=== Drive")
  const isNav = useContext(IsNavContext);

  const drivesAvailable = useRecoilValueLoadable(fetchDrivesQuery);
  if (drivesAvailable.state === 'loading') {
    return null;
  }
  if (drivesAvailable.state === 'hasError') {
    console.error(drivesAvailable.contents);
    return null;
  }

  if (props.types) {
    let drives = [];
    for (let type of props.types) {
      for (let driveObj of drivesAvailable.contents.driveIdsAndLabels) {
        if (driveObj.type === type && driveObj.subType === 'Administrator') {
          drives.push(
            <React.Fragment key={`drive${driveObj.driveId}${isNav}`}>
              <Router>
                <Switch>
                  <Route
                    path="/"
                    render={(routeprops) => (
                      <Suspense fallback={<div></div>}>
                        <DriveRouted
                          route={{ ...routeprops }}
                          driveId={driveObj.driveId}
                          label={driveObj.label}
                          isNav={isNav}
                          {...props}
                          driveObj={driveObj}
                        />
                      </Suspense>
                    )}
                  ></Route>
                </Switch>
              </Router>
            </React.Fragment>,
          );
        }
      }
    }
    return <>{drives}</>;
  } else if (props.driveId) {
    for (let driveObj of drivesAvailable.contents.driveIdsAndLabels) {
      if (driveObj.driveId === props.driveId) {
        return (
          <Router>
            <Switch>
              <Route
                path="/"
                render={(routeprops) => (
                  <Suspense fallback={<div></div>}>
                    <DriveRouted
                      route={{ ...routeprops }}
                      driveId={driveObj.driveId}
                      label={driveObj.label}
                      isNav={isNav}
                      {...props}
                      driveObj={driveObj}
                    />
                  </Suspense>
                )}
              ></Route>
            </Switch>
          </Router>
        );
      }
    }
    console.warn("Don't have a drive with driveId ", props.id);
    return null;
  } else {
    console.warn('Drive needs types or driveId defined.');
    return null;
  }
}

let loadDriveInfoQuery = selectorFamily({
  key: 'loadDriveInfoQuery',
  get:
    (driveId) =>
    async ({ get, set }) => {
      const { data } = await axios.get(
        `/api/loadFolderContent.php?driveId=${driveId}&init=true`,
      );
      // console.log("loadDriveInfoQuery DATA ",data)
      // let itemDictionary = {};
      //   for (let item of data.results){
      //     itemDictionary[item.itemId] = item;
      //   }
      //   data["itemDictionary"] = itemDictionary;
      return data;
    },
});

//Find DriveInstanceId's given driveId
let driveInstanceIdDictionary = atomFamily({
  key: 'driveInstanceIdDictionary',
  default: [],
});

export const folderDictionary = atomFamily({
  key: 'folderDictionary',
  default: selectorFamily({
    key: 'folderDictionary/Default',
    get:
      (driveIdFolderId) =>
      ({ get }) => {
        if (driveIdFolderId.driveId === '') {
          return { folderInfo: {}, contentsDictionary: {}, contentIds: {} };
        }
        const driveInfo = get(loadDriveInfoQuery(driveIdFolderId.driveId));
        let defaultOrder = [];
        let contentsDictionary = {};
        let contentIds = {};
        let folderInfo = {};
        for (let item of driveInfo.results) {
          if (item.parentFolderId === driveIdFolderId.folderId) {
            defaultOrder.push(item.itemId);
            contentsDictionary[item.itemId] = item;
          }
          if (item.itemId === driveIdFolderId.folderId) {
            folderInfo = item;
          }
        }
        defaultOrder = sortItems({
          sortKey: sortOptions.DEFAULT,
          nodeObjs: contentsDictionary,
          defaultFolderChildrenIds: defaultOrder,
        });
        contentIds[sortOptions.DEFAULT] = defaultOrder;
        return { folderInfo, contentsDictionary, contentIds };
      },
  }),
});

export const folderDictionarySelector = selectorFamily({
  //{driveId,folderId}
  get:
    (driveIdFolderId) =>
    ({ get }) => {
      return get(folderDictionary(driveIdFolderId));
    },
  set:
    (driveIdFolderId) =>
    async ({ set, get }, instructions) => {},
  // set:(setObj,newValue)=>({set,get})=>{
  //   console.log("setObj",setObj,newValue);

  // }
});

export const folderSortOrderAtom = atomFamily({
  key: 'folderSortOrderAtom',
  default: sortOptions.DEFAULT,
});

export const folderCacheDirtyAtom = atomFamily({
  key: 'foldedCacheDirtyAtom',
  default: false,
});

export const folderInfoSelector = selectorFamily({
  get:
    (driveIdInstanceIdFolderId) =>
    ({ get }) => {
      const { driveId, folderId } = driveIdInstanceIdFolderId;

      const { folderInfo, contentsDictionary, contentIds } = get(
        folderDictionarySelector({ driveId, folderId }),
      );
      const folderSortOrder = get(
        folderSortOrderAtom(driveIdInstanceIdFolderId),
      );
      let contentIdsArr = contentIds[folderSortOrder] ?? [];

      const sortedContentIdsNotInCache =
        !contentIdsArr.length && contentIds[sortOptions.DEFAULT].length;
      if (sortedContentIdsNotInCache) {
        contentIdsArr = sortItems({
          sortKey: folderSortOrder,
          nodeObjs: contentsDictionary,
          defaultFolderChildrenIds: contentIds[sortOptions.DEFAULT],
        });
      }

      let newFolderInfo = { ...folderInfo };
      newFolderInfo.sortBy = folderSortOrder;
      return { folderInfo: newFolderInfo, contentsDictionary, contentIdsArr };
    },
});

export const sortItems = ({ sortKey, nodeObjs, defaultFolderChildrenIds }) => {
  let tempArr = [...defaultFolderChildrenIds];
  switch (sortKey) {
    case sortOptions.DEFAULT:
      tempArr.sort((a, b) => {
        return nodeObjs[a].sortOrder.localeCompare(nodeObjs[b].sortOrder);
      });
      break;
    case sortOptions.LABEL_ASC:
      tempArr.sort((a, b) => {
        return nodeObjs[a].label.localeCompare(nodeObjs[b].label);
      });
      break;
    case sortOptions.LABEL_DESC:
      tempArr.sort((b, a) => {
        return nodeObjs[a].label.localeCompare(nodeObjs[b].label);
      });
      break;
    case sortOptions.CREATION_DATE_ASC:
      tempArr.sort((a, b) => {
        return (
          new Date(nodeObjs[a].creationDate) -
          new Date(nodeObjs[b].creationDate)
        );
      });
      break;
    case sortOptions.CREATION_DATE_DESC:
      tempArr.sort((b, a) => {
        return (
          new Date(nodeObjs[a].creationDate) -
          new Date(nodeObjs[b].creationDate)
        );
      });
      break;
  }
  return tempArr;
};

export const getLexicographicOrder = ({
  index,
  nodeObjs,
  defaultFolderChildrenIds = [],
}) => {
  let prevItemId = '';
  let nextItemId = '';
  let prevItemOrder = '';
  let nextItemOrder = '';

  if (defaultFolderChildrenIds.length !== 0) {
    if (index <= 0) {
      nextItemId = defaultFolderChildrenIds[0];
    } else if (index >= defaultFolderChildrenIds.length) {
      prevItemId =
        defaultFolderChildrenIds[defaultFolderChildrenIds.length - 1];
    } else {
      prevItemId = defaultFolderChildrenIds[index - 1];
      nextItemId = defaultFolderChildrenIds[index];
    }

    if (nodeObjs[prevItemId])
      prevItemOrder = nodeObjs?.[prevItemId]?.sortOrder ?? '';
    if (nodeObjs[nextItemId])
      nextItemOrder = nodeObjs?.[nextItemId]?.sortOrder ?? '';
  }
  const sortOrder = getSortOrder(prevItemOrder, nextItemOrder);
  return sortOrder;
};

function DriveHeader(props) {
  const [width, setWidth] = useState(0);
  const [numColumns, setNumColumns] = useState(4);

  let columns = '250px repeat(3,1fr)';
  if (numColumns === 3) {
    columns = '250px 1fr 1fr';
  } else if (numColumns === 2) {
    columns = '250px 1fr';
  } else if (numColumns === 1) {
    columns = '100%';
  }

  //update number of columns in header
  const breakpoints = [375, 500, 650];
  if (width >= breakpoints[2] && numColumns !== 4) {
    if (props.setNumColumns) {
      props.setNumColumns(4);
    }
    setNumColumns(4);
  } else if (
    width < breakpoints[2] &&
    width >= breakpoints[1] &&
    numColumns !== 3
  ) {
    if (props.setNumColumns) {
      props.setNumColumns(3);
    }
    setNumColumns(3);
  } else if (
    width < breakpoints[1] &&
    width >= breakpoints[0] &&
    numColumns !== 2
  ) {
    if (props.setNumColumns) {
      props.setNumColumns(2);
    }
    setNumColumns(2);
  } else if (width < breakpoints[0] && numColumns !== 1) {
    if (props.setNumColumns) {
      props.setNumColumns(1);
    }
    setNumColumns(1);
  }

  return (
    <Measure
      bounds
      onResize={(contentRect) => {
        setWidth(contentRect.bounds.width);
      }}
    >
      {({ measureRef }) => (
        <div
          ref={measureRef}
          data-doenet-driveinstanceid={props.driveInstanceId}
          className="noselect nooutline"
          style={{
            padding: '8px',
            border: '0px',
            borderBottom: '1px solid grey',
            maxWidth: '850px',
            margin: '0px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: columns,
              gridTemplateRows: '1fr',
              alignContent: 'center',
            }}
          >
            <span>Name</span>
            {numColumns >= 2 ? <span>Date</span> : null}
            {numColumns >= 3 ? <span>Published</span> : null}
            {numColumns >= 4 ? <span>Assigned</span> : null}
          </div>
        </div>
      )}
    </Measure>
  );
}

function DriveRouted(props) {
  // console.log("=== DriveRouted")

  const [numColumns, setNumColumns] = useState(1);
  const { onDragEnterInvalidArea, registerDropTarget, unregisterDropTarget } =
    useDnDCallbacks();
  const drivePath = useRecoilValue(drivePathSyncFamily(props.drivePathSyncKey));

  let hideUnpublished = false; //Default to showing unpublished
  if (props.hideUnpublished) {
    hideUnpublished = props.hideUnpublished;
  }
  const setDriveInstanceId = useSetRecoilState(
    driveInstanceIdDictionary(props.driveId),
  );
  let driveInstanceId = useRef('');
  const path = Object.fromEntries(
    new URLSearchParams(props.route.location.search),
  )?.path;
  useUpdateBreadcrumb({
    driveId: props.driveId,
    driveLabel: props.driveObj.label,
    path: path,
  });

  if (driveInstanceId.current === '') {
    driveInstanceId.current = nanoid();
    setDriveInstanceId((old) => {
      let newArr = [...old];
      newArr.push(driveInstanceId.current);
      return newArr;
    });
  }

  //Use Route to determine path variables
  let pathFolderId = props.driveId; //default

  let routePathDriveId = drivePath.driveId;
  let routePathFolderId = drivePath.parentFolderId;
  let pathItemId = drivePath.itemId;
  if (routePathFolderId !== '') {
    pathFolderId = routePathFolderId;
  }

  //If navigation then build from root else build from path
  let rootFolderId = pathFolderId;
  if (props.isNav) {
    rootFolderId = props.driveId;
  }

  if (
    !props.isNav &&
    (routePathDriveId === '' || props.driveId !== routePathDriveId)
  )
    return <></>;

  let heading = null;
  if (!props.isNav) {
    heading = (
      <DriveHeader
        driveInstanceId={props.driveInstanceId}
        setNumColumns={setNumColumns}
      />
    );
  }

  //default to all
  let viewAccess = props?.viewAccess;
  if (!viewAccess) {
    viewAccess = 'all';
  }

  return (
    <>
      {heading}
      <Folder
        driveId={props.driveId}
        folderId={rootFolderId}
        indentLevel={0}
        driveObj={props.driveObj}
        rootCollapsible={props.rootCollapsible}
        driveInstanceId={driveInstanceId.current}
        isNav={props.isNav}
        urlClickBehavior={props.urlClickBehavior}
        route={props.route}
        pathItemId={pathItemId}
        hideUnpublished={hideUnpublished}
        foldersOnly={props.foldersOnly}
        doenetMLDoubleClickCallback={props.doenetMLDoubleClickCallback}
        numColumns={numColumns}
        viewAccess={viewAccess}
        drivePathSyncKey={props.drivePathSyncKey}
      />
      <WithDropTarget
        key={DropTargetsConstant.INVALID_DROP_AREA_ID}
        id={DropTargetsConstant.INVALID_DROP_AREA_ID}
        registerDropTarget={registerDropTarget}
        unregisterDropTarget={unregisterDropTarget}
        dropCallbacks={{ onDragEnter: onDragEnterInvalidArea }}
      />
    </>
  );
}

export const fetchDrivesQuery = atom({
  key: 'fetchDrivesQuery',
  default: selector({
    key: 'fetchDrivesQuery/Default',
    get: async () => {
      const { data } = await axios.get(`/api/loadAvailableDrives.php`);
      return data;
    },
  }),
});

export const fetchDrivesSelector = selector({
  key: 'fetchDrivesSelector',
  get: ({ get }) => {
    return get(fetchDrivesQuery);
  },
  set: ({ get, set }, labelTypeDriveIdColorImage) => {
    let driveData = get(fetchDrivesQuery);
    // let selectedDrives = get(selectedDriveInformation);
    let newDriveData = { ...driveData };
    newDriveData.driveIdsAndLabels = [...driveData.driveIdsAndLabels];
    let params = {
      driveId: labelTypeDriveIdColorImage.newDriveId,
      label: labelTypeDriveIdColorImage.label,
      type: labelTypeDriveIdColorImage.type,
      image: labelTypeDriveIdColorImage.image,
      color: labelTypeDriveIdColorImage.color,
    };
    let newDrive;
    function duplicateFolder({
      sourceFolderId,
      sourceDriveId,
      destDriveId,
      destFolderId,
      destParentFolderId,
    }) {
      let contentObjs = {};
      const sourceFolder = get(
        folderDictionary({ driveId: sourceDriveId, folderId: sourceFolderId }),
      );
      if (destFolderId === undefined) {
        destFolderId = destDriveId; //Root Folder of drive
        destParentFolderId = destDriveId; //Root Folder of drive
      }

      let contentIds = { defaultOrder: [] };
      let contentsDictionary = {};
      let folderInfo = { ...sourceFolder.folderInfo };
      folderInfo.folderId = destFolderId;
      folderInfo.parentFolderId = destParentFolderId;

      for (let sourceItemId of sourceFolder.contentIds.defaultOrder) {
        const destItemId = nanoid();
        contentIds.defaultOrder.push(destItemId);
        let sourceItem = sourceFolder.contentsDictionary[sourceItemId];
        contentsDictionary[destItemId] = { ...sourceItem };
        contentsDictionary[destItemId].parentFolderId = destFolderId;
        contentsDictionary[destItemId].itemId = destItemId;
        if (sourceItem.itemType === 'Folder') {
          let childContentObjs = duplicateFolder({
            sourceFolderId: sourceItemId,
            sourceDriveId,
            destDriveId,
            destFolderId: destItemId,
            destParentFolderId: destFolderId,
          });
          contentObjs = { ...contentObjs, ...childContentObjs };
        } else if (sourceItem.itemType === 'DoenetML') {
          let destBranchId = nanoid();
          contentsDictionary[destItemId].sourceBranchId = sourceItem.branchId;
          contentsDictionary[destItemId].branchId = destBranchId;
        } else if (sourceItem.itemType === 'URL') {
          let desturlId = nanoid();
          contentsDictionary[destItemId].urlId = desturlId;
        } else {
          console.log(`!!! Unsupported type ${sourceItem.itemType}`);
        }
        contentObjs[destItemId] = contentsDictionary[destItemId];
      }
      const destFolderObj = { contentIds, contentsDictionary, folderInfo };
      // console.log({destFolderObj})
      set(
        folderDictionary({ driveId: destDriveId, folderId: destFolderId }),
        destFolderObj,
      );
      return contentObjs;
    }
    if (labelTypeDriveIdColorImage.type === 'new content drive') {
      newDrive = {
        driveId: labelTypeDriveIdColorImage.newDriveId,
        isShared: '0',
        label: labelTypeDriveIdColorImage.label,
        type: 'content',
      };
      newDriveData.driveIdsAndLabels.unshift(newDrive);
      set(fetchDrivesQuery, newDriveData);

      const payload = { params };
      axios.get('/api/addDrive.php', payload);
      // .then((resp)=>console.log(">>>resp",resp.data))
    } else if (labelTypeDriveIdColorImage.type === 'new course drive') {
      newDrive = {
        driveId: labelTypeDriveIdColorImage.newDriveId,
        isShared: '0',
        label: labelTypeDriveIdColorImage.label,
        type: 'course',
        image: labelTypeDriveIdColorImage.image,
        color: labelTypeDriveIdColorImage.color,
        subType: 'Administrator',
      };
      newDriveData.driveIdsAndLabels.unshift(newDrive);
      set(fetchDrivesQuery, newDriveData);

      const payload = { params };
      axios.get('/api/addDrive.php', payload);
      // .then((resp)=>console.log(">>>resp",resp.data))
    } else if (labelTypeDriveIdColorImage.type === 'update drive label') {
      //Find matching drive and update label
      for (let [i, drive] of newDriveData.driveIdsAndLabels.entries()) {
        if (drive.driveId === labelTypeDriveIdColorImage.newDriveId) {
          let newDrive = { ...drive };
          newDrive.label = labelTypeDriveIdColorImage.label;
          newDriveData.driveIdsAndLabels[i] = newDrive;
          break;
        }
      }
      //Set drive
      set(fetchDrivesQuery, newDriveData);
      //Save to db
      const payload = { params };
      axios.get('/api/updateDrive.php', payload);
    } else if (labelTypeDriveIdColorImage.type === 'update drive color') {
      //TODO: implement
    } else if (labelTypeDriveIdColorImage.type === 'delete drive') {
      //Find matching drive and update label
      for (let [i, drive] of newDriveData.driveIdsAndLabels.entries()) {
        if (drive.driveId === labelTypeDriveIdColorImage.newDriveId) {
          newDriveData.driveIdsAndLabels.splice(i, 1);
          break;
        }
      }
      //Set drive
      set(fetchDrivesQuery, newDriveData);
      //Save to db
      const payload = { params };
      axios.get('/api/updateDrive.php', payload);
    }
  },
});

export const folderOpenAtom = atomFamily({
  key: 'folderOpenAtom',
  default: false,
});

const folderOpenSelector = selectorFamily({
  key: 'folderOpenSelector',
  get:
    (driveInstanceIdItemId) =>
    ({ get }) => {
      return get(folderOpenAtom(driveInstanceIdItemId));
    },
  set:
    (driveInstanceIdDriveIdItemId) =>
    ({ get, set }) => {
      const isOpen = get(folderOpenAtom(driveInstanceIdDriveIdItemId));
      if (isOpen) {
        //Deselect contained items on close
        const folder = get(
          folderDictionarySelector({
            driveId: driveInstanceIdDriveIdItemId.driveId,
            folderId: driveInstanceIdDriveIdItemId.itemId,
          }),
        );
        const itemIds = folder.contentIds.defaultOrder;
        const globalItemsSelected = get(globalSelectedNodesAtom);
        let newGlobalSelected = [];
        for (let itemObj of globalItemsSelected) {
          if (itemIds.includes(itemObj.itemId)) {
            const { parentFolderId, ...atomFormat } = itemObj; //Without parentFolder
            set(selectedDriveItemsAtom(atomFormat), false);
          } else {
            newGlobalSelected.push(itemObj);
          }
        }
        set(globalSelectedNodesAtom, newGlobalSelected);
      }
      set(folderOpenAtom(driveInstanceIdDriveIdItemId), !isOpen);
    },
});

export let encodeParams = (p) =>
  Object.entries(p)
    .map((kv) => kv.map(encodeURIComponent).join('='))
    .join('&');

export const drivePathSyncFamily = atomFamily({
  key: 'drivePathSyncFamily',
  default: {
    driveId: '',
    parentFolderId: '',
    itemId: '',
    type: '',
  },
});

function Folder(props) {
  let itemId = props?.folderId;
  if (!itemId) {
    itemId = props.driveId;
  }

  let drivePathSyncKey = props.drivePathSyncKey;
  if (!drivePathSyncKey) {
    drivePathSyncKey = '_';
  }

  const setDrivePath = useSetRecoilState(drivePathSyncFamily(drivePathSyncKey));

  const [folderInfoObj, setFolderInfo] = useRecoilStateLoadable(
    folderInfoSelector({
      driveId: props.driveId,
      instanceId: props.driveInstanceId,
      folderId: props.folderId,
    }),
  );
  // const [folderInfoObj, setFolderInfo] = useRecoilStateLoadable(folderDictionarySelector({driveId:props.driveId,folderId:props.folderId}))

  const {
    onDragStart,
    onDrag,
    onDragOverContainer,
    onDragEnd,
    onDragExit,
    renderDragGhost,
    registerDropTarget,
    unregisterDropTarget,
  } = useDnDCallbacks();
  const { dropState } = useContext(DropTargetsContext);
  const [dragState, setDragState] = useRecoilState(dragStateAtom);
  // const [folderCacheDirty, setFolderCacheDirty] = useRecoilState(folderCacheDirtyAtom({driveId:props.driveId, folderId:props.folderId}))

  const parentFolderSortOrder = useRecoilValue(
    folderSortOrderAtom({
      driveId: props.driveId,
      instanceId: props.driveInstanceId,
      folderId: props.item?.parentFolderId,
    }),
  );
  const parentFolderSortOrderRef = useRef(parentFolderSortOrder); // for memoized DnD callbacks
  const [selectedDrive, setSelectedDrive] = useRecoilState(selectedDriveAtom);
  const setSelected = useSetRecoilState(
    selectedDriveItems({
      driveId: props.driveId,
      driveInstanceId: props.driveInstanceId,
      itemId,
    }),
  );
  const isSelected = useRecoilValue(
    selectedDriveItemsAtom({
      driveId: props.driveId,
      driveInstanceId: props.driveInstanceId,
      itemId,
    }),
  );
  const { deleteItem, onDeleteItemError } = useDeleteItem();
  const deleteItemCallback = (itemId) => {
    const result = deleteItem({
      driveIdFolderId: { driveId: props.driveId, folderId: props.folderId },
      driveInstanceId: props.driveInstanceId,
      itemId,
    });
    result
      .then((resp) => {
        if (resp.data.success) {
          addToast(`Deleted item '${props.item?.label}'`, ToastType.SUCCESS);
        } else {
          onDeleteItemError({ errorMessage: resp.data.message });
        }
      })
      .catch((e) => {
        onDeleteItemError({ errorMessage: e.message });
      });
  };

  const globalSelectedNodes = useRecoilValue(globalSelectedNodesAtom);
  const clearSelections = useSetRecoilState(clearDriveAndItemSelections);

  //Used to determine range of items in Shift Click
  const isOpen = useRecoilValue(
    folderOpenAtom({
      driveInstanceId: props.driveInstanceId,
      driveId: props.driveId,
      itemId: props.folderId,
    }),
  );
  const toggleOpen = useSetRecoilState(
    folderOpenSelector({
      driveInstanceId: props.driveInstanceId,
      driveId: props.driveId,
      itemId: props.folderId,
    }),
  );
  const isOpenRef = useRef(isOpen); // for memoized DnD callbacks
  const isSelectedRef = useRef(isSelected); // for memoized DnD callbacks

  const [addToast, ToastType] = useToast();
  const { sortFolder, invalidateSortCache, onSortFolderError } =
    useSortFolder();
  const { insertDragShadow, removeDragShadow } = useDragShadowCallbacks();

  // Set only when parentFolderId changes
  const setInstanceParentId = useSetRecoilState(
    driveInstanceParentFolderIdAtom(props.driveInstanceId),
  );
  useEffect(() => {
    setInstanceParentId(props.pathItemId);
  }, [props.pathItemId]);

  const indentPx = 25;
  let bgcolor = '#ffffff';
  let borderSide = '0px';
  let marginSize = '0';
  let widthSize = '60vw';
  if (props.isNav) {
    marginSize = '0px';
    widthSize = '224px';
  }
  if (isSelected) {
    bgcolor = 'hsl(209,54%,82%)';
  }
  if (isSelected && dragState.isDragging) {
    bgcolor = '#e2e2e2';
  }

  const isDraggedOver =
    dropState.activeDropTargetId === itemId &&
    !dragState.draggedItemsId?.has(itemId);
  if (isDraggedOver) {
    bgcolor = '#f0f0f0';
  }
  const isDropTargetFolder = dragState.dragShadowParentId === itemId;
  if (isDropTargetFolder) {
    bgcolor = 'hsl(209,54%,82%)';
  }

  // Update refs for variables used in DnD callbacks to eliminate re-registration
  useEffect(() => {
    isOpenRef.current = isOpen;
    isSelectedRef.current = isSelected;
  }, [isOpen, isSelected]);

  useEffect(() => {
    parentFolderSortOrderRef.current = parentFolderSortOrder;
  }, [parentFolderSortOrder]);

  // Cache invalidation when folder is dirty
  // useEffect(() => {
  //   if (folderCacheDirty) {
  //     invalidateSortCache({driveId: props.driveId, folderId: props.folderId});
  //     setFolderCacheDirty(false);
  //   }
  // }, [folderCacheDirty])

  if (props.isNav && itemId === props.pathItemId) {
    borderSide = '8px solid #1A5A99';
  }

  if (folderInfoObj.state === 'loading') {
    return null;
  }
  if (folderInfoObj.state === 'hasError') {
    console.error(folderInfoObj.contents);
    return null;
  }
  let { folderInfo, contentsDictionary, contentIdsArr } =
    folderInfoObj.contents;
  //TODO: Move filter into recoil loadable
  //Note viewAccess All is not filtered and Folders are always shown
  if (props.viewAccess === 'released') {
    contentIdsArr = contentIdsArr.filter(
      (id) =>
        contentsDictionary[id].itemType === 'Folder' ||
        contentsDictionary[id].isReleased === '1' ||
        contentsDictionary[id].isAssigned === '1',
    );
  } else if (props.viewAccess === 'assigned') {
    contentIdsArr = contentIdsArr.filter(
      (id) =>
        contentsDictionary[id].itemType === 'Folder' ||
        contentsDictionary[id].isAssigned === '1',
    );
  }

  let openCloseText = isOpen ? (
    <span data-cy="folderToggleCloseIcon">
      <FontAwesomeIcon icon={faChevronDown} />
    </span>
  ) : (
    <span data-cy="folderToggleOpenIcon">
      <FontAwesomeIcon icon={faChevronRight} />
    </span>
  );

  let openCloseButton = (
    <button
      style={{ border: 'none', backgroundColor: bgcolor, borderRadius: '5px' }}
      data-doenet-driveinstanceid={props.driveInstanceId}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleOpen();
      }}
    >
      {openCloseText}
    </button>
  );

  const sortHandler = ({ sortKey }) => {
    const result = sortFolder({
      driveIdInstanceIdFolderId: {
        driveInstanceId: props.driveInstanceId,
        driveId: props.driveId,
        folderId: props.folderId,
      },
      sortKey: sortKey,
    });
    result
      .then((resp) => {})
      .catch((e) => {
        onSortFolderError({ errorMessage: e.message });
      });
  };

  const markFolderDraggedOpened = () => {
    setDragState((old) => {
      let newOpenedFoldersInfo = [...old.openedFoldersInfo];
      newOpenedFoldersInfo.push({
        driveInstanceId: props.driveInstanceId,
        driveId: props.driveId,
        itemId: props.folderId,
      });
      return {
        ...old,
        openedFoldersInfo: newOpenedFoldersInfo,
      };
    });
  };

  const onDragOver = ({ x, y, dropTargetRef }) => {
    onDragOverContainer({ id: props.folderId, driveId: props.driveId });

    if (props.isNav) {
      removeDragShadow();
      insertDragShadow({
        driveIdFolderId: { driveId: props.driveId, folderId: props.folderId },
        parentId: props.folderId,
        position: 'intoCurrent',
      });
      return;
    }

    const dropTargetTopY = dropTargetRef?.offsetTop;
    const dropTargetHeight = dropTargetRef?.clientHeight;
    const cursorY = y;
    const cursorArea = (cursorY - dropTargetTopY) / dropTargetHeight;

    if (parentFolderSortOrderRef.current === sortOptions.DEFAULT) {
      if (cursorArea < 0.5) {
        // insert shadow to top of current dropTarget
        insertDragShadow({
          driveIdFolderId: { driveId: props.driveId, folderId: props.folderId },
          position: 'beforeCurrent',
          itemId: props.folderId,
          parentId: props.item?.parentFolderId,
        });
      } else if (cursorArea < 1.0) {
        // insert shadow to bottom of current dropTarget
        insertDragShadow({
          driveIdFolderId: { driveId: props.driveId, folderId: props.folderId },
          position: 'afterCurrent',
          itemId: props.folderId,
          parentId: props.item?.parentFolderId,
        });
      }
    } else {
      removeDragShadow();
    }
  };

  const onDragHover = () => {
    if (props.isNav) return;

    // Open folder if initially closed
    if (!isOpenRef.current && !isSelectedRef.current) {
      toggleOpen();
      // Mark current folder to close on dragEnd
      markFolderDraggedOpened();
    }

    insertDragShadow({
      driveIdFolderId: { driveId: props.driveId, folderId: props.folderId },
      parentId: props.folderId,
      position: 'intoCurrent',
    });
  };

  const onDrop = () => {};

  const onDragEndCb = () => {
    onDragEnd();
  };

  // const sortNodeButtonFactory = ({ buttonLabel, sortKey, sortHandler }) => {
  //   return <button
  //   style={{backgroundColor: "#1A5A99",color: "white", border: "none", borderRadius: "12px", height: "24px", margin: "2px"}}
  //   tabIndex={-1}
  //   onClick={(e)=>{
  //     e.preventDefault();
  //     e.stopPropagation();
  //     sortHandler({sortKey: sortKey});
  //   }}
  //   onMouseDown={e=>{ e.preventDefault(); e.stopPropagation(); }}
  //   onDoubleClick={e=>{ e.preventDefault(); e.stopPropagation(); }}
  //   >{ buttonLabel }</button>;
  // }

  let label = folderInfo?.label;

  let folder = null;
  let items = null;

  if (!props.driveObj) {
    folder = (
      <div
        data-doenet-driveinstanceid={props.driveInstanceId}
        data-cy="driveItem"
        tabIndex={0}
        className="noselect nooutline"
        style={{
          cursor: 'pointer',
          // width: "300px",
          padding: '8px',
          border: '0px',
          borderBottom: '2px solid black',
          backgroundColor: bgcolor,
          // width: widthSize,
          // boxShadow: borderSide,
          marginLeft: marginSize,
          borderLeft: borderSide,
        }}
        onClick={(e) => {
          e.preventDefault(); // Folder
          e.stopPropagation();
          if (props.isNav) {
            clearSelections();
            //Only select one item
            setDrivePath({
              driveId: props.driveId,
              parentFolderId: itemId,
              itemId,
              type: 'Folder',
            });
          } else {
            e.preventDefault();
            e.stopPropagation();
            if (!e.shiftKey && !e.metaKey) {
              setSelected({
                instructionType: 'one item',
                parentFolderId: props.parentFolderId,
              });
            } else if (e.shiftKey && !e.metaKey) {
              setSelected({
                instructionType: 'range to item',
                parentFolderId: props.parentFolderId,
              });
            } else if (!e.shiftKey && e.metaKey) {
              setSelected({
                instructionType: 'add item',
                parentFolderId: props.parentFolderId,
              });
            }
          }
          setSelectedDrive(props.driveId);
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // toggleOpen();
          setDrivePath({
            driveId: props.driveId,
            parentFolderId: itemId,
            itemId,
            type: 'Folder',
          });
        }}
        onBlur={(e) => {
          //Don't clear on navigation changes
          if (!props.isNav) {
            //Only clear if focus goes outside of this node group
            // if (e.relatedTarget === null ||
            //   (e.relatedTarget.dataset.doenetDriveinstanceid !== props.driveInstanceId &&
            //   !e.relatedTarget.dataset.doenetDriveStayselected)
            //   ){
            //     setSelected({instructionType:"clear all"})
            // }
            // if (e?.relatedTarget?.dataset?.doenetDeselectDrive){
            //   setSelected({instructionType:"clear all"});
            // }
          }
        }}
      >
        <div
          className="noselect"
          style={{
            marginLeft: `${props.indentLevel * indentPx}px`,
            display: 'grid',
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr',
            alignContent: 'center',
          }}
        >
          <div style={{ display: 'inline', margin: '0px' }}>
            {openCloseButton}
            <span data-cy="folderIcon">
              <FontAwesomeIcon icon={faFolder} />
            </span>
            <span data-cy="folderLabel">{label}</span>
          </div>
        </div>
      </div>
    );
  } else if (props.driveObj && props.isNav) {
    let driveIcon = <FontAwesomeIcon icon={faBookOpen} />;
    if (props.driveObj?.type === 'course') {
      driveIcon = <FontAwesomeIcon icon={faChalkboard} />;
    }
    //Root of Drive and in navPanel
    label = props.driveObj.label;
    folder = (
      <>
        <div
          data-doenet-driveinstanceid={props.driveInstanceId}
          data-cy="navDriveHeader"
          tabIndex={0}
          className="noselect nooutline"
          style={{
            cursor: 'pointer',
            padding: '12.5px',
            border: '0px',
            borderBottom: '2px solid black',
            backgroundColor: bgcolor,
            marginLeft: marginSize,
            fontSize: '24px',
            borderLeft: borderSide,
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (props.isNav) {
              clearSelections();
              //Only select one item
              setDrivePath({
                driveId: props.driveId,
                parentFolderId: itemId,
                itemId,
                type: 'Drive',
              });
            }
            setSelectedDrive(props.driveId);
          }}
        >
          {driveIcon} {label}
        </div>
      </>
    );
    if (props.rootCollapsible) {
      folder = (
        <div
          data-doenet-driveinstanceid={props.driveInstanceId}
          tabIndex={0}
          className="noselect nooutline"
          style={{
            cursor: 'pointer',
            padding: '12.5px',
            border: '0px',
            borderBottom: '2px solid black',
            backgroundColor: bgcolor,
            marginLeft: marginSize,
            fontSize: '24px',
            borderLeft: borderSide,
          }}
        >
          {' '}
          {openCloseButton} Drive {label}
        </div>
      );
    }
  }

  // make folder draggable and droppable
  let draggableClassName = '';
  if (!props.isNav) {
    const onDragStartCallback = () => {
      if (globalSelectedNodes.length === 0 || !isSelected) {
        setSelected({ instructionType: 'clear all' });
        setSelected({
          instructionType: 'one item',
          parentFolderId: props.parentFolderId,
        });
      }
    };
    folder = (
      <Draggable
        key={`dnode${props.driveInstanceId}${props.folderId}`}
        id={props.folderId}
        className={draggableClassName}
        onDragStart={({ ev }) =>
          onDragStart({
            ev,
            nodeId: props.folderId,
            driveId: props.driveId,
            onDragStartCallback,
          })
        }
        onDrag={onDrag}
        onDragEnd={onDragEndCb}
        ghostElement={renderDragGhost(props.folderId, folder)}
      >
        {folder}
      </Draggable>
    );
  }

  const dropTargetId = props.driveObj ? props.driveId : props.folderId;
  folder = (
    <WithDropTarget
      key={`wdtnode${props.driveInstanceId}${props.folderId}`}
      id={dropTargetId}
      registerDropTarget={registerDropTarget}
      unregisterDropTarget={unregisterDropTarget}
      dropCallbacks={{
        onDragOver: onDragOver,
        onDragHover: onDragHover,
        onDragExit: () => {
          onDragExit({ driveId: props.driveId, itemId: props.folderId });
        },
        onDrop: onDrop,
      }}
    >
      {folder}
    </WithDropTarget>
  );

  // if (props.driveObj && !props.isNav) {
  //   const sortButtons = <div style={{marginLeft: "2.5vw"}}>
  //     {sortNodeButtonFactory({buttonLabel: "Sort Custom", sortKey: sortOptions.DEFAULT, sortHandler})}
  //     {sortNodeButtonFactory({buttonLabel: "Sort Label ASC", sortKey: sortOptions.LABEL_ASC, sortHandler})}
  //     {sortNodeButtonFactory({buttonLabel: "Sort Label DESC", sortKey: sortOptions.LABEL_DESC, sortHandler})}
  //     {sortNodeButtonFactory({buttonLabel: "Sort Date ASC", sortKey: sortOptions.CREATION_DATE_ASC, sortHandler})}
  //     {sortNodeButtonFactory({buttonLabel: "Sort Date DESC", sortKey: sortOptions.CREATION_DATE_DESC, sortHandler})}
  //   </div>;

  //   folder = <>
  //     {sortButtons}
  //     {folder}

  //   </>;
  // }

  if (isOpen || (props.driveObj && !props.rootCollapsible)) {
    let dictionary = contentsDictionary;
    items = [];
    for (let itemId of contentIdsArr) {
      let item = dictionary[itemId];
      if (!item) continue;
      // console.log(">>>item",item)
      if (props.hideUnpublished && item.isPublished === '0') {
        //hide item
        if (item.assignment_isPublished != '1') continue;
        // TODO : update
      }
      if (props.foldersOnly) {
        if (item.itemType === 'Folder') {
          items.push(
            <Folder
              key={`item${itemId}${props.driveInstanceId}`}
              driveId={props.driveId}
              folderId={itemId}
              item={item}
              indentLevel={props.indentLevel + 1}
              driveInstanceId={props.driveInstanceId}
              route={props.route}
              isNav={props.isNav}
              urlClickBehavior={props.urlClickBehavior}
              pathItemId={props.pathItemId}
              deleteItem={deleteItemCallback}
              parentFolderId={props.folderId}
              hideUnpublished={props.hideUnpublished}
              foldersOnly={props.foldersOnly}
              drivePathSyncKey={props.drivePathSyncKey}
            />,
          );
        }
      } else {
        switch (item.itemType) {
          case 'Folder':
            items.push(
              <Folder
                key={`item${itemId}${props.driveInstanceId}`}
                driveId={props.driveId}
                folderId={item.itemId}
                item={item}
                indentLevel={props.indentLevel + 1}
                driveInstanceId={props.driveInstanceId}
                route={props.route}
                isNav={props.isNav}
                urlClickBehavior={props.urlClickBehavior}
                pathItemId={props.pathItemId}
                deleteItem={deleteItemCallback}
                parentFolderId={props.folderId}
                hideUnpublished={props.hideUnpublished}
                foldersOnly={props.foldersOnly}
                doenetMLDoubleClickCallback={props.doenetMLDoubleClickCallback}
                numColumns={props.numColumns}
                drivePathSyncKey={props.drivePathSyncKey}
              />,
            );
            break;
          case 'Url':
            items.push(
              <Url
                key={`item${itemId}${props.driveInstanceId}`}
                driveId={props.driveId}
                item={item}
                indentLevel={props.indentLevel + 1}
                driveInstanceId={props.driveInstanceId}
                route={props.route}
                isNav={props.isNav}
                urlClickBehavior={props.urlClickBehavior}
                pathItemId={props.pathItemId}
                deleteItem={deleteItemCallback}
                numColumns={props.numColumns}
                setDrivePath={setDrivePath}
              />,
            );
            break;
          case 'DoenetML':
            items.push(
              <DoenetML
                key={`item${itemId}${props.driveInstanceId}`}
                driveId={props.driveId}
                item={item}
                indentLevel={props.indentLevel + 1}
                driveInstanceId={props.driveInstanceId}
                route={props.route}
                isNav={props.isNav}
                pathItemId={props.pathItemId}
                doubleClickCallback={props.doenetMLDoubleClickCallback}
                deleteItem={deleteItemCallback}
                numColumns={props.numColumns}
                setDrivePath={setDrivePath}
              />,
            );
            break;
          case 'DragShadow':
            items.push(
              <DragShadow
                key={`dragShadow${itemId}${props.driveInstanceId}`}
                indentLevel={props.indentLevel + 1}
              />,
            );
            break;
          default:
            console.warn(`Item not rendered of type ${item.itemType}`);
        }
      }
    }

    if (contentIdsArr.length === 0 && !props.foldersOnly) {
      items.push(<EmptyNode key={`emptyitem${folderInfo?.itemId}`} />);
    }
  }

  return (
    <div data-cy="drive">
      {folder}
      {items}
    </div>
  );
}

const EmptyNode = React.memo(function Node(props) {
  return (
    <div
      style={{
        // width: "840px",
        padding: '8px',
        marginLeft: '47.5%',
      }}
    >
      <div className="noselect" style={{ justifyContent: 'center' }}>
        EMPTY
      </div>
    </div>
  );
});

const DragShadow = React.memo(function Node(props) {
  const indentPx = 30;
  return (
    <div
      data-cy="dragShadow"
      style={{
        width: '100%',
        height: '33px',
        marginLeft: `${props.indentLevel * indentPx}px`,
        padding: '0px',
        backgroundColor: '#f5f5f5',
        color: '#f5f5f5',
        boxShadow: '0 0 3px rgba(0, 0, 0, .2)',
        border: '2px dotted #14c6ff',
      }}
    >
      <div className="noselect">.</div>
    </div>
  );
});

function LogVisible(props) {
  const globalSelected = useRecoilValue(globalSelectedNodesAtom);
  console.log('globalSelected', globalSelected);
  return null;
}

export const selectedDriveItemsAtom = atomFamily({
  key: 'selectedDriveItemsAtom',
  default: false,
});

export const clearDriveAndItemSelections = selector({
  key: 'clearDriveAndItemSelections',
  set: ({ get, set }) => {
    const globalItemsSelected = get(globalSelectedNodesAtom);
    for (let itemObj of globalItemsSelected) {
      const { parentFolderId, ...atomFormat } = itemObj; //Without parentFolder
      set(selectedDriveItemsAtom(atomFormat), false);
    }
    if (globalItemsSelected.length > 0) {
      set(globalSelectedNodesAtom, []);
    }
    const globalDrivesSelected = get(drivecardSelectedNodesAtom);
    if (globalDrivesSelected.length > 0) {
      set(drivecardSelectedNodesAtom, []);
    }
  },
});

//key: driveInstanceId
const driveInstanceParentFolderIdAtom = atomFamily({
  key: 'driveInstanceParentFolderIdAtom',
  default: selectorFamily({
    key: 'driveInstanceParentFolderIdAtom/Default',
    get: (driveInstanceId) => () => {
      return driveInstanceId;
    },
  }),
});

const selectedDriveItems = selectorFamily({
  key: 'selectedDriveItems',
  // get:(driveIdDriveInstanceIdItemId) =>({get})=>{
  //   return get(selectedDriveItemsAtom(driveIdDriveInstanceIdItemId));
  // },
  set:
    (driveIdDriveInstanceIdItemId) =>
    ({ get, set }, instruction) => {
      const globalSelected = get(globalSelectedNodesAtom);
      const isSelected = get(
        selectedDriveItemsAtom(driveIdDriveInstanceIdItemId),
      );
      const { driveId, driveInstanceId, itemId } = driveIdDriveInstanceIdItemId;
      let lastSelectedItem = globalSelected[globalSelected.length - 1];

      function buildItemIdsAndParentIds({
        parentFolderId,
        driveInstanceId,
        driveId,
        itemIdArr = [],
        parentFolderIdArr = [],
      }) {
        const folderObj = get(
          folderDictionary({ driveId, folderId: parentFolderId }),
        );
        for (let itemId of folderObj.contentIds.defaultOrder) {
          itemIdArr.push(itemId);
          parentFolderIdArr.push(parentFolderId);
          if (folderObj.contentsDictionary[itemId].itemType === 'Folder') {
            const isOpen = get(
              folderOpenAtom({ driveInstanceId, driveId, itemId }),
            );
            if (isOpen) {
              const [folderItemIdArr, folderParentFolderIdsArr] =
                buildItemIdsAndParentIds({
                  parentFolderId: itemId,
                  driveInstanceId,
                  driveId,
                });
              itemIdArr = [...itemIdArr, ...folderItemIdArr];
              parentFolderIdArr = [
                ...parentFolderIdArr,
                ...folderParentFolderIdsArr,
              ];
            }
          }
        }
        return [itemIdArr, parentFolderIdArr];
      }

      switch (instruction.instructionType) {
        case 'one item':
          if (!isSelected) {
            //Deselect all global selected
            for (let itemObj of globalSelected) {
              let itemInfo = { ...itemObj };
              delete itemInfo['parentFolderId'];
              set(selectedDriveItemsAtom(itemInfo), false);
            }
            set(selectedDriveItemsAtom(driveIdDriveInstanceIdItemId), true);
            let itemInfo = { ...driveIdDriveInstanceIdItemId };
            itemInfo['parentFolderId'] = instruction.parentFolderId;
            set(globalSelectedNodesAtom, [itemInfo]);

            //Select contents of open folders??
            // const parentFolder = get(folderDictionary({driveId,folderId:instruction.parentFolderId}))
            // const itemType = parentFolder.contentsDictionary[itemId].itemType;
            // if (itemType === 'Folder'){
            //   let isOpen = get(folderOpenAtom(driveIdDriveInstanceIdItemId));
            //   console.log(">>>isOpen",isOpen)
            // }
          }
          break;
        case 'add item':
          if (isSelected) {
            set(selectedDriveItemsAtom(driveIdDriveInstanceIdItemId), false);
            let newGlobalSelected = [...globalSelected];
            let index;
            for (const [i, obj] of newGlobalSelected.entries()) {
              if (
                obj.driveId === driveId &&
                obj.itemId === itemId &&
                obj.driveInstanceId === driveInstanceId
              ) {
                index = i;
                break;
              }
            }
            newGlobalSelected.splice(index, 1);
            set(globalSelectedNodesAtom, newGlobalSelected);
          } else {
            set(selectedDriveItemsAtom(driveIdDriveInstanceIdItemId), true);
            let itemInfo = { ...driveIdDriveInstanceIdItemId };
            itemInfo['parentFolderId'] = instruction.parentFolderId;
            set(globalSelectedNodesAtom, [...globalSelected, itemInfo]);
          }
          break;
        case 'range to item':
          //select one if driveInstanceId doesn't match
          if (
            globalSelected.length === 0 ||
            lastSelectedItem?.driveInstanceId !== driveInstanceId
          ) {
            //No previous items selected so just select this one
            set(selectedDriveItemsAtom(driveIdDriveInstanceIdItemId), true);
            let itemInfo = { ...driveIdDriveInstanceIdItemId };
            itemInfo['parentFolderId'] = instruction.parentFolderId;
            set(globalSelectedNodesAtom, [itemInfo]);
          } else {
            const driveInstanceParentFolderId = get(
              driveInstanceParentFolderIdAtom(driveInstanceId),
            );
            let [arrayOfItemIds, parentFolderIds] = buildItemIdsAndParentIds({
              parentFolderId: driveInstanceParentFolderId,
              driveInstanceId,
              driveId,
            });

            let foundClickedItem = false;
            let foundLastItem = false;
            let addToGlobalSelected = [];
            let needToReverseOrder = false;
            for (const [i, testItemId] of arrayOfItemIds.entries()) {
              if (!foundLastItem && testItemId === lastSelectedItem.itemId) {
                foundLastItem = true;
                if (foundClickedItem) {
                  needToReverseOrder = true;
                }
              }
              if (!foundClickedItem && testItemId === itemId) {
                foundClickedItem = true;
              }
              if (foundClickedItem || foundLastItem) {
                //in range
                // console.log(">>>in range",testItemId,parentFolderIds[i])
                const isSelected = get(
                  selectedDriveItemsAtom({
                    driveId,
                    driveInstanceId,
                    itemId: testItemId,
                  }),
                );
                if (!isSelected) {
                  set(
                    selectedDriveItemsAtom({
                      driveId,
                      driveInstanceId,
                      itemId: testItemId,
                    }),
                    true,
                  ); //select item
                  addToGlobalSelected.push({
                    driveId,
                    driveInstanceId,
                    itemId: testItemId,
                    parentFolderId: parentFolderIds[i],
                  });
                }
                if (foundClickedItem && foundLastItem) {
                  break;
                }
              }
            }

            if (needToReverseOrder) {
              addToGlobalSelected.reverse();
            }
            // console.log(">>>globalSelected",globalSelected)
            // console.log(">>>addToGlobalSelected",addToGlobalSelected)
            set(globalSelectedNodesAtom, [
              ...globalSelected,
              ...addToGlobalSelected,
            ]);
          }
          break;
        case 'clear all':
          for (let itemObj of globalSelected) {
            const { parentFolderId, ...atomFormat } = itemObj; //Without parentFolder
            set(selectedDriveItemsAtom(atomFormat), false);
          }
          set(globalSelectedNodesAtom, []);
          break;
        default:
          console.warn(`Can't handle instruction ${instruction}`);
          break;
      }
    },
});

const DoenetML = React.memo((props) => {
  // console.log(`=== 📜 DoenetML`)

  const setSelected = useSetRecoilState(
    selectedDriveItems({
      driveId: props.driveId,
      driveInstanceId: props.driveInstanceId,
      itemId: props.item.itemId,
    }),
  );
  const isSelected = useRecoilValue(
    selectedDriveItemsAtom({
      driveId: props.driveId,
      driveInstanceId: props.driveInstanceId,
      itemId: props.item.itemId,
    }),
  );
  const [selectedDrive, setSelectedDrive] = useRecoilState(selectedDriveAtom);
  const [dragState] = useRecoilState(dragStateAtom);
  const {
    onDragStart,
    onDrag,
    onDragEnd,
    renderDragGhost,
    registerDropTarget,
    unregisterDropTarget,
  } = useDnDCallbacks();
  const globalSelectedNodes = useRecoilValue(globalSelectedNodesAtom);
  const [folderInfoObj, setFolderInfo] = useRecoilStateLoadable(
    folderInfoSelector({
      driveId: props.driveId,
      instanceId: props.driveInstanceId,
      folderId: props.driveId,
    }),
  );
  const parentFolderSortOrder = useRecoilValue(
    folderSortOrderAtom({
      driveId: props.driveId,
      instanceId: props.driveInstanceId,
      folderId: props.item?.parentFolderId,
    }),
  );
  const parentFolderSortOrderRef = useRef(parentFolderSortOrder); // for memoized DnD callbacks
  const { insertDragShadow } = useDragShadowCallbacks();

  const indentPx = 30;

  let woIndent = 250 - props.indentLevel * indentPx;
  let columns = `${woIndent}px repeat(3,1fr)`;
  if (props.numColumns === 3) {
    columns = `${woIndent}px 1fr 1fr`;
  } else if (props.numColumns === 2) {
    columns = `${woIndent}px 1fr`;
  } else if (props.numColumns === 1) {
    columns = '100%';
  }

  let bgcolor = '#ffffff';
  let borderSide = '0px 0px 0px 0px';
  let widthSize = 'auto';
  let marginSize = '0';
  let date = props.item.creationDate.slice(0, 10);
  let published = <FontAwesomeIcon icon={faUsersSlash} />;
  let assigned = '-';
  // let columns = 'repeat(4,25%)'
  if (props.isNav) {
    widthSize = '224px';
    marginSize = '0px';
    date = '';
    published = '';
    assigned = '';
    columns = '1fr';
  }
  if (isSelected || (props.isNav && props.item.itemId === props.pathItemId)) {
    bgcolor = 'hsl(209,54%,82%)';
    borderSide = '8px 0px 0px 0px #1A5A99';
  }
  if (isSelected && dragState.isDragging) {
    bgcolor = '#e2e2e2';
  }
  if (props.item.isPublished == 1 && !props.isNav) {
    published = <FontAwesomeIcon icon={faUsers} />;
  }
  if (props.item.isAssignment == 1 && !props.isNav) {
    assigned = <FontAwesomeIcon icon={faUserEdit} />;
  }

  let label = props.item?.label;
  if (
    props.item?.assignment_isPublished === '1' ||
    props.item?.isAssignment === '1'
  ) {
    label = props.item?.assignment_title;
  }

  useEffect(() => {
    parentFolderSortOrderRef.current = parentFolderSortOrder;
  }, [parentFolderSortOrder]);

  const onDragOver = ({ x, y, dropTargetRef }) => {
    const dropTargetTopY = dropTargetRef?.offsetTop;
    const dropTargetHeight = dropTargetRef?.clientHeight;
    const cursorY = y;
    const cursorArea = (cursorY - dropTargetTopY) / dropTargetHeight;
    if (parentFolderSortOrderRef.current === sortOptions.DEFAULT) {
      if (cursorArea < 0.5) {
        // insert shadow to top of current dropTarget
        insertDragShadow({
          driveIdFolderId: { driveId: props.driveId, folderId: props.driveId },
          position: 'beforeCurrent',
          itemId: props.item.itemId,
          parentId: props.item.parentFolderId,
        });
      } else if (cursorArea < 1.0) {
        // insert shadow to bottom of current dropTarget
        insertDragShadow({
          driveIdFolderId: { driveId: props.driveId, folderId: props.driveId },
          position: 'afterCurrent',
          itemId: props.item.itemId,
          parentId: props.item.parentFolderId,
        });
      }
    }
  };

  const onDragEndCb = () => {
    onDragEnd();
  };

  let doenetMLJSX = (
    <div
      data-doenet-driveinstanceid={props.driveInstanceId}
      data-cy="driveItem"
      tabIndex={0}
      className="noselect nooutline"
      style={{
        cursor: 'pointer',
        padding: '8px',
        border: '0px',
        borderBottom: '2px solid black',
        backgroundColor: bgcolor,
        width: widthSize,
        // boxShadow: borderSide,
        marginLeft: marginSize,
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (props.doubleClickCallback) {
          props.doubleClickCallback({
            driveId: props.driveId,
            item: props.item,
            driveInstanceId: props.driveInstanceId,
            route: props.route,
            isNav: props.isNav,
            pathItemId: props.pathItemId,
          });
        }
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (props.isNav) {
          //Only select one item
          props.setDrivePath({
            driveId: props.driveId,
            parentFolderId: props.item.parentFolderId,
            itemId: props.item.itemId,
            type: 'DoenetML',
          });
        } else {
          e.preventDefault();
          e.stopPropagation();
          if (!e.shiftKey && !e.metaKey) {
            setSelected({
              instructionType: 'one item',
              parentFolderId: props.item.parentFolderId,
            });
          } else if (e.shiftKey && !e.metaKey) {
            setSelected({
              instructionType: 'range to item',
              parentFolderId: props.item.parentFolderId,
            });
          } else if (!e.shiftKey && e.metaKey) {
            setSelected({
              instructionType: 'add item',
              parentFolderId: props.item.parentFolderId,
            });
          }
        }
        setSelectedDrive(props.driveId);
      }}
      onBlur={(e) => {
        //Don't clear on navigation changes
        if (!props.isNav) {
          //Only clear if focus goes outside of this node group
          // if (e.relatedTarget === null ||
          //   (e.relatedTarget.dataset.doenetDriveinstanceid !== props.driveInstanceId &&
          //   !e.relatedTarget.dataset.doenetDriveStayselected)
          //   ){
          //     setSelected({instructionType:"clear all"})
          // }
          // if (e.relatedTarget === null){
          //   setSelected({instructionType:"clear all"})
          // }
          // console.log(">>>dataset",e?.relatedTarget?.dataset)
          // if (e?.relatedTarget?.dataset?.doenetDeselectDrive){
          //   setSelected({instructionType:"clear all"});
          // }
        }
      }}
    >
      <div
        style={{
          marginLeft: `${props.indentLevel * indentPx}px`,
          display: 'grid',
          gridTemplateColumns: columns,
          gridTemplateRows: '1fr',
          alignContent: 'center',
        }}
      >
        <p style={{ display: 'inline', margin: '0px' }}>
          <span data-cy="doenetMLIcon">
            <FontAwesomeIcon icon={faCode} />
          </span>
          <span data-cy="doenetMLLabel">{label} </span>
        </p>
        {props.numColumns >= 2 ? <span>{date}</span> : null}
        {props.numColumns >= 3 ? <span>{published}</span> : null}
        {props.numColumns >= 4 ? <span>{assigned}</span> : null}
      </div>
    </div>
  );

  if (!props.isNav) {
    const onDragStartCallback = () => {
      if (globalSelectedNodes.length === 0 || !isSelected) {
        setSelected({ instructionType: 'clear all' });
        setSelected({
          instructionType: 'one item',
          parentFolderId: props.item.parentFolderId,
        });
      }
    };
    // make DoenetML draggable
    let draggableClassName = '';
    doenetMLJSX = (
      <Draggable
        key={`dnode${props.driveInstanceId}${props.item.itemId}`}
        id={props.item.itemId}
        className={draggableClassName}
        onDragStart={({ ev }) =>
          onDragStart({
            ev,
            nodeId: props.item.itemId,
            driveId: props.driveId,
            onDragStartCallback,
          })
        }
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        onDragEnd={onDragEndCb}
        ghostElement={renderDragGhost(props.item.itemId, doenetMLJSX)}
      >
        {doenetMLJSX}
      </Draggable>
    );

    // attach dropTarget to enable drag-reordering
    doenetMLJSX = (
      <WithDropTarget
        key={`wdtnode${props.driveInstanceId}${props.item.itemId}`}
        id={props.item.itemId}
        registerDropTarget={registerDropTarget}
        unregisterDropTarget={unregisterDropTarget}
        dropCallbacks={{
          onDragOver: onDragOver,
        }}
      >
        {doenetMLJSX}
      </WithDropTarget>
    );
  }
  return doenetMLJSX;
});

const Url = React.memo((props) => {
  const {
    onDragStart,
    onDrag,
    onDragEnd,
    renderDragGhost,
    registerDropTarget,
    unregisterDropTarget,
  } = useDnDCallbacks();
  const [dragState] = useRecoilState(dragStateAtom);
  const [folderInfoObj, setFolderInfo] = useRecoilStateLoadable(
    folderInfoSelector({
      driveId: props.driveId,
      instanceId: props.driveInstanceId,
      folderId: props.driveId,
    }),
  );
  const parentFolderSortOrder = useRecoilValue(
    folderSortOrderAtom({
      driveId: props.driveId,
      instanceId: props.driveInstanceId,
      folderId: props.item?.parentFolderId,
    }),
  );
  const parentFolderSortOrderRef = useRef(parentFolderSortOrder); // for memoized DnD callbacks

  const setSelected = useSetRecoilState(
    selectedDriveItems({
      driveId: props.driveId,
      driveInstanceId: props.driveInstanceId,
      itemId: props.item.itemId,
    }),
  );
  const isSelected = useRecoilValue(
    selectedDriveItemsAtom({
      driveId: props.driveId,
      driveInstanceId: props.driveInstanceId,
      itemId: props.item.itemId,
    }),
  );
  const globalSelectedNodes = useRecoilValue(globalSelectedNodesAtom);
  const [selectedDrive, setSelectedDrive] = useRecoilState(selectedDriveAtom);

  const indentPx = 30;
  let bgcolor = '#ffffff';
  let borderSide = '0px 0px 0px 0px';
  let widthSize = '60vw';
  let marginSize = '0';
  let date = props.item.creationDate.slice(0, 10);
  let published = <FontAwesomeIcon icon={faUsersSlash} />;
  let assigned = '-';
  let columns = 'repeat(4,25%)';
  if (props.isNav) {
    widthSize = '224px';
    marginSize = '0px';
    date = '';
    published = '';
    assigned = '';
    columns = '1fr';
  }
  if (isSelected || (props.isNav && props.item.itemId === props.pathItemId)) {
    bgcolor = 'hsl(209,54%,82%)';
    borderSide = '8px 0px 0px 0px #1A5A99';
  }
  if (isSelected && dragState.isDragging) {
    bgcolor = '#e2e2e2';
  }
  if (props.item.isPublished == 1 && !props.isNav) {
    published = <FontAwesomeIcon icon={faUsers} />;
  }
  if (props.item.isAssignment == 1 && !props.isNav) {
    assigned = <FontAwesomeIcon icon={faUserEdit} />;
  }

  useEffect(() => {
    parentFolderSortOrderRef.current = parentFolderSortOrder;
  }, [parentFolderSortOrder]);

  const onDragOver = ({ x, y, dropTargetRef }) => {
    const dropTargetTopY = dropTargetRef?.offsetTop;
    const dropTargetHeight = dropTargetRef?.clientHeight;
    const cursorY = y;
    const cursorArea = (cursorY - dropTargetTopY) / dropTargetHeight;
    if (parentFolderSortOrderRef.current === sortOptions.DEFAULT) {
    }
  };

  const onDragEndCb = () => {
    onDragEnd();
  };

  let urlJSX = (
    <div
      data-doenet-driveinstanceid={props.driveInstanceId}
      tabIndex={0}
      className="noselect nooutline"
      style={{
        cursor: 'pointer',
        // width: "60vw",
        padding: '8px',
        border: '0px',
        borderBottom: '2px solid black',
        backgroundColor: bgcolor,
        width: widthSize,
        // boxShadow: borderSide,
        marginLeft: marginSize,
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (props.urlClickBehavior === 'select') {
          if (props.isNav) {
            //Only select one item
            props.setDrivePath({
              driveId: props.driveId,
              parentFolderId: props.item.parentFolderId,
              itemId: props.item.itemId,
              type: 'Url',
            });
          } else {
            e.preventDefault();
            e.stopPropagation();
            if (!e.shiftKey && !e.metaKey) {
              setSelected({
                instructionType: 'one item',
                parentFolderId: props.item.parentFolderId,
              });
            } else if (e.shiftKey && !e.metaKey) {
              setSelected({
                instructionType: 'range to item',
                parentFolderId: props.item.parentFolderId,
              });
            } else if (!e.shiftKey && e.metaKey) {
              setSelected({
                instructionType: 'add item',
                parentFolderId: props.item.parentFolderId,
              });
            }
          }
          setSelectedDrive(props.driveId);
        } else {
          //Default url behavior is new tab
          let linkTo = props.item?.url; //Enable this when add URL is completed
          window.open(linkTo);
        }
      }}
      onBlur={(e) => {
        //Don't clear on navigation changes
        if (!props.isNav) {
          //Only clear if focus goes outside of this node group
          // if (e.relatedTarget === null ||
          //   (e.relatedTarget.dataset.doenetDriveinstanceid !== props.driveInstanceId &&
          //   !e.relatedTarget.dataset.doenetDriveStayselected)
          //   ){
          //     setSelected({instructionType:"clear all"})
          // }
          // if (e.relatedTarget.dataset.doenetDriveStayselected){
          //   console.log(">>>GET FOCUS BACK!")
          // }
          // if (e?.relatedTarget?.dataset?.doenetDeselectDrive){
          //   setSelected({instructionType:"clear all"});
          // }
        }
      }}
    >
      <div
        className="noselect"
        style={{
          marginLeft: `${props.indentLevel * indentPx}px`,
          display: 'grid',
          gridTemplateColumns: columns,
          gridTemplateRows: '1fr',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'inline', margin: '0px' }}>
          <FontAwesomeIcon icon={faLink} /> {props.item?.label}
        </div>{' '}
        {date} {published} {assigned}
      </div>
    </div>
  );

  if (!props.isNav) {
    // make URL draggable
    const onDragStartCallback = () => {
      if (globalSelectedNodes.length === 0 || !isSelected) {
        setSelected({ instructionType: 'clear all' });
        setSelected({
          instructionType: 'one item',
          parentFolderId: props.item.parentFolderId,
        });
      }
    };
    let draggableClassName = '';
    urlJSX = (
      <Draggable
        key={`dnode${props.driveInstanceId}${props.item.itemId}`}
        id={props.item.itemId}
        className={draggableClassName}
        onDragStart={({ ev }) =>
          onDragStart({
            ev,
            nodeId: props.item.itemId,
            driveId: props.driveId,
            onDragStartCallback,
          })
        }
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        onDragEnd={onDragEndCb}
        ghostElement={renderDragGhost(props.item.itemId, urlJSX)}
      >
        {urlJSX}
      </Draggable>
    );
  }

  // attach dropTarget to enable drag-reordering
  urlJSX = (
    <WithDropTarget
      key={`wdtnode${props.driveInstanceId}${props.item.itemId}`}
      id={props.item.itemId}
      registerDropTarget={registerDropTarget}
      unregisterDropTarget={unregisterDropTarget}
      dropCallbacks={{
        onDragOver: onDragOver,
      }}
    >
      {urlJSX}
    </WithDropTarget>
  );

  return urlJSX;
});

function useDnDCallbacks() {
  const { dropState, dropActions } = useContext(DropTargetsContext);
  const [dragState, setDragState] = useRecoilState(dragStateAtom);
  const globalSelectedNodes = useRecoilValue(globalSelectedNodesAtom);
  const [addToast, ToastType] = useToast();
  const { replaceDragShadow, removeDragShadow, cleanUpDragShadow } =
    useDragShadowCallbacks();
  const { moveItems, onMoveItemsError } = useMoveItems();
  const { copyItems, onCopyItemsError } = useCopyItems();
  const numItems = useRecoilValue(globalSelectedNodesAtom).length;
  const optionKeyPressed = useKeyPressedListener('Alt'); // Listen for option key events
  const optionKeyPressedRef = useRef(optionKeyPressed);

  useEffect(() => {
    setDragState((dragState) => ({
      ...dragState,
      copyMode: optionKeyPressed,
    }));
    optionKeyPressedRef.current = optionKeyPressed;
  }, [optionKeyPressed]);

  const onDragStart = ({ ev = null, nodeId, driveId, onDragStartCallback }) => {
    let draggedItemsId = new Set();
    if (globalSelectedNodes.length === 0) {
      draggedItemsId.add(nodeId);
    } else {
      const globalSelectedNodeIds = [];
      for (let globalSelectedNode of globalSelectedNodes)
        globalSelectedNodeIds.push(globalSelectedNode.itemId);
      draggedItemsId = new Set(globalSelectedNodeIds);
    }
    // Check if option key on hold
    let copyMode = false;
    if (ev && ev.altKey) copyMode = true;

    setDragState((dragState) => ({
      ...dragState,
      isDragging: true,
      draggedOverDriveId: driveId,
      initialDriveId: driveId,
      draggedItemsId,
      openedFoldersInfo: [],
      copyMode: copyMode,
    }));
    onDragStartCallback?.();
  };

  const onDrag = ({ clientX, clientY, translation, id, ev }) => {
    dropActions.handleDrag(clientX, clientY);
  };

  const onDragOverContainer = ({ id, driveId, isBreadcrumb = false }) => {
    setDragState((dragState) => {
      const { draggedOverDriveId, initialDriveId, copyMode } = dragState;
      let newDraggedOverDriveId = draggedOverDriveId;
      let newCopyMode = copyMode;
      if (draggedOverDriveId !== driveId) {
        newDraggedOverDriveId = driveId;
      }

      newCopyMode = initialDriveId !== driveId;

      return {
        ...dragState,
        draggedOverDriveId: newDraggedOverDriveId,
        isDraggedOverBreadcrumb: isBreadcrumb,
        copyMode: newCopyMode,
      };
    });
  };

  const onDragEnd = () => {
    replaceDragShadow().then((replaceDragShadowResp) => {
      if (
        !replaceDragShadowResp ||
        Object.keys(replaceDragShadowResp).length === 0
      )
        return;

      const { targetDriveId, targetFolderId, index } = replaceDragShadowResp;
      const draggingAcrossDrives =
        globalSelectedNodes?.[0].driveId !== targetDriveId;
      const copyMode = dragState.copyMode || draggingAcrossDrives;

      if (copyMode) {
        const result = copyItems({
          items: globalSelectedNodes,
          targetDriveId,
          targetFolderId,
          index,
        });

        result
          .then(([resp]) => {
            if (resp.value?.data?.success) {
              addToast(
                `Copied ${replaceDragShadowResp?.numItems} item(s)`,
                ToastType.SUCCESS,
              );
            } else {
              onCopyItemsError({ errorMessage: resp?.reason });
            }
          })
          .catch((e) => {
            onCopyItemsError({ errorMessage: e.message });
          });
      } else {
        const result = moveItems(replaceDragShadowResp);
        result
          .then((resp) => {
            if (resp.data.success) {
              addToast(
                `Moved ${replaceDragShadowResp?.numItems} item(s)`,
                ToastType.SUCCESS,
              );
            } else {
              onMoveItemsError({ errorMessage: resp.data.message });
            }
          })
          .catch((e) => {
            onMoveItemsError({ errorMessage: e.message });
          });
      }
    });

    cleanUpDragShadow();
    removeDragShadow();

    setDragState((dragState) => ({
      ...dragState,
      isDragging: false,
      draggedOverDriveId: null,
      initialDriveId: null,
      draggedItemsId: null,
      openedFoldersInfo: [],
      copyMode: false,
    }));
    dropActions.handleDrop();
  };

  const onDragExit = ({ driveId, itemId }) => {
    setDragState((dragState) => {
      const { initialDriveId, copyMode } = dragState;
      let newCopyMode = copyMode;
      if (initialDriveId !== driveId) {
        newCopyMode = false;
      }

      // Option key event takes precedent
      newCopyMode |= optionKeyPressedRef.current;

      return {
        ...dragState,
        copyMode: newCopyMode,
      };
    });
  };

  const onDragEnterInvalidArea = () => {};

  function renderDragGhost(id, element) {
    const dragGhostId = `drag-ghost-${id}`;
    return (
      <DragGhost
        id={dragGhostId}
        numItems={numItems}
        element={element}
        copyMode={dragState.copyMode}
      />
    );
  }

  return {
    onDragStart,
    onDrag,
    onDragOverContainer,
    onDragEnd,
    onDragExit,
    onDragEnterInvalidArea,
    renderDragGhost,
    registerDropTarget: dropActions.registerDropTarget,
    unregisterDropTarget: dropActions.unregisterDropTarget,
  };
}

export const nodePathSelector = selectorFamily({
  key: 'nodePathSelector',
  get:
    (driveIdFolderId) =>
    ({ get }) => {
      const { driveId, folderId } = driveIdFolderId;
      if (!driveId || !folderId) return [];
      let path = [];
      let currentNode = folderId;
      while (currentNode && currentNode !== driveId) {
        const folderInfoObj = get(
          folderDictionarySelector({ driveId, folderId: currentNode }),
        );
        path.push({
          folderId: currentNode,
          label: folderInfoObj.folderInfo.label,
        });
        currentNode = folderInfoObj.folderInfo.parentFolderId;
      }
      return path;
    },
});

const nodeChildrenSelector = selectorFamily({
  key: 'nodePathSelector',
  get:
    (driveIdFolderId) =>
    ({ get }) => {
      const { driveId, folderId } = driveIdFolderId;
      if (!driveId || !folderId) return [];
      let children = [];
      let queue = [folderId];

      while (queue.length) {
        let size = queue.length;
        for (let i = 0; i < size; i++) {
          let currentNodeId = queue.shift();
          const folderInfoObj = get(
            folderDictionarySelector({ driveId, folderId: currentNodeId }),
          );
          children.push(currentNodeId);
          for (let childId of folderInfoObj?.contentIds?.[
            sortOptions.DEFAULT
          ]) {
            queue.push(childId);
          }
        }
      }
      return children;
    },
});

function useUpdateBreadcrumb(props) {
  const { addItem: addBreadcrumbItem, clearItems: clearBreadcrumb } =
    useContext(BreadcrumbContext);
  const { onDragOverContainer } = useDnDCallbacks();
  const { dropActions } = useContext(DropTargetsContext);
  let routePathDriveId = '';
  let routePathFolderId = '';
  if (props.path) {
    const [driveId, folderId, itemId] = props.path?.split(':');
    routePathDriveId = driveId;
    routePathFolderId = folderId;
  }
  const [nodesOnPath, _] = useRecoilState(
    nodePathSelector({
      driveId: routePathDriveId,
      folderId: routePathFolderId,
    }),
  );
  const driveLabel = props.driveLabel ?? '/';
  const { moveItems } = useMoveItems();

  useEffect(() => {
    updateBreadcrumb({ routePathDriveId, routePathFolderId });
  }, [nodesOnPath]);

  const updateBreadcrumb = ({ routePathDriveId, routePathFolderId }) => {
    if (props.driveId !== routePathDriveId) {
      return;
    }

    clearBreadcrumb();
    let breadcrumbStack = [];

    // generate folder stack
    const breadcrumbItemStyle = {
      fontSize: '24px',
      color: '#040F1A',
      textDecoration: 'none',
    };

    for (let currentNode of nodesOnPath) {
      const nodeObj = currentNode;
      const currentNodeId = nodeObj.folderId;

      let newParams = Object.fromEntries(new URLSearchParams());
      newParams[
        'path'
      ] = `${routePathDriveId}:${currentNodeId}:${currentNodeId}:Folder`;
      const destinationLink = `../?${encodeParams(newParams)}`;
      // const draggedOver = DnDState.activeDropTargetId === currentNodeId && isDraggedOverBreadcrumb;
      let breadcrumbElement = (
        <Link style={breadcrumbItemStyle} to={destinationLink}>
          {nodeObj?.label}
        </Link>
      );
      breadcrumbElement = (
        <WithDropTarget
          key={`wdtbreadcrumb${props.driveId}${currentNodeId}`}
          id={currentNodeId}
          registerDropTarget={dropActions.registerDropTarget}
          unregisterDropTarget={dropActions.unregisterDropTarget}
          dropCallbacks={{
            onDragOver: () =>
              onDragOverContainer({
                id: currentNodeId,
                driveId: props.driveId,
                isBreadcrumb: true,
              }),
            onDrop: () => {
              moveItems({
                targetDriveId: props.driveId,
                targetFolderId: currentNodeId,
              });
            },
          }}
        >
          {breadcrumbElement}
        </WithDropTarget>
      );

      const breadcrumbObj = {
        to: destinationLink,
        element: breadcrumbElement,
      };

      breadcrumbStack.unshift(breadcrumbObj);
    }

    // add current drive to head of stack
    let newParams = Object.fromEntries(new URLSearchParams());
    newParams[
      'path'
    ] = `${routePathDriveId}:${routePathDriveId}:${routePathDriveId}:Drive`;
    const driveDestinationLink = `../?${encodeParams(newParams)}`;

    const driveBreadcrumbElement = (
      <WithDropTarget
        key={`wdtbreadcrumb${props.driveId}`}
        id={routePathDriveId}
        registerDropTarget={dropActions.registerDropTarget}
        unregisterDropTarget={dropActions.unregisterDropTarget}
        dropCallbacks={{
          onDragOver: () =>
            onDragOverContainer({
              id: routePathDriveId,
              driveId: props.driveId,
              isBreadcrumb: true,
            }),
          onDrop: () => {
            moveItems({
              targetDriveId: props.driveId,
              targetFolderId: props.driveId,
            });
          },
        }}
      >
        <Link
          data-cy="breadcrumbDriveColumn"
          style={breadcrumbItemStyle}
          to={driveDestinationLink}
        >
          {props.driveLabel}
        </Link>
      </WithDropTarget>
    );
    breadcrumbStack.unshift({
      to: driveDestinationLink,
      element: driveBreadcrumbElement,
    });

    // add items in stack to breadcrumb
    for (let item of breadcrumbStack) {
      addBreadcrumbItem(item);
    }
  };
}

const DragGhost = ({ id, element, numItems, copyMode = false }) => {
  const containerStyle = {
    transform: 'rotate(-5deg)',
    zIndex: '10',
    background: '#e2e2e2',
    width: '40vw',
    border: '2px solid black',
    padding: '0px',
    height: '38px',
    overflow: 'hidden',
  };

  const singleItemStyle = {
    boxShadow: 'rgba(0, 0, 0, 0.20) 5px 5px 3px 3px',
    borderRadius: '2px solid black',
    animation: 'dragAnimation 2s',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#e2e2e2',
    // marginLeft: "-60px"
  };

  const multipleItemsNumCircleContainerStyle = {
    position: 'absolute',
    zIndex: '5',
    top: '6px',
    right: '5px',
    borderRadius: '25px',
    background: '#1A5A99',
    fontSize: '12px',
    color: 'white',
    width: '25px',
    height: '25px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const copyModeIndicatorCircleContainerStyle = {
    position: 'absolute',
    zIndex: '5',
    top: '6px',
    left: '5px',
    borderRadius: '25px',
    background: '#08ed00',
    fontSize: '23px',
    color: 'white',
    width: '25px',
    height: '25px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  let dragGhost = (
    <>
      <div style={singleItemStyle}>{element}</div>
    </>
  );

  if (numItems >= 2) {
    const numItemsIndicator = (
      <>
        <div style={multipleItemsNumCircleContainerStyle}>{numItems}</div>
      </>
    );

    dragGhost = (
      <>
        {numItemsIndicator}
        {dragGhost}
      </>
    );
  }

  if (copyMode) {
    const copyModeIndicator = (
      <>
        <div style={copyModeIndicatorCircleContainerStyle}>+</div>
      </>
    );

    dragGhost = (
      <>
        {copyModeIndicator}
        {dragGhost}
      </>
    );
  }

  dragGhost = (
    <div id={id} data-cy="dragGhost" style={containerStyle}>
      {dragGhost}
    </div>
  );

  return dragGhost;
};
