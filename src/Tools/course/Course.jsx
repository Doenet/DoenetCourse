/**
 * External dependencies
 */
import React, { useEffect, useState, Suspense, useContext } from 'react';

import { useHistory } from 'react-router-dom';
import {
  atom,
  useSetRecoilState,
  useRecoilValue,
  selector,
  useRecoilState,
  selectorFamily,
  useRecoilValueLoadable,
  useRecoilStateLoadable,
  useRecoilCallback,
  atomFamily,
} from 'recoil';
import axios from 'axios';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import { nanoid } from 'nanoid';

/**
 * Internal dependencies
 */
import Drive, {
  folderDictionarySelector,
  clearDriveAndItemSelections,
  encodeParams,
  drivePathSyncFamily,
} from '../../_reactComponents/Drive/Drive';
import { BreadcrumbContainer } from '../../_reactComponents/Breadcrumb';
import Button from '../../_reactComponents/PanelHeaderComponents/Button';
import DriveCards from '../../_reactComponents/Drive/DriveCards';
import '../../_reactComponents/Drive/drivecard.css';
import '../../_utils/util.css';
import GlobalFont from '../../_utils/GlobalFont';
import Tool from '../_framework/Tool';
import { useToolControlHelper, ProfileContext } from '../_framework/ToolRoot';
import Toast, { useToast } from '../_framework/Toast';
import { drivecardSelectedNodesAtom, URLPathSync } from '../library/Library';
import Enrollment from './Enrollment';
import { useAssignment } from '../course/CourseActions';
import { useAssignmentCallbacks } from '../../_reactComponents/Drive/DriveActions';
import { selectedInformation } from '../library/Library';
// import {assignmentDictionary} from "../_framework/Overlays/Content"
import CollapseSection from '../../_reactComponents/PanelHeaderComponents/CollapseSection';

export const roleAtom = atom({
  key: 'roleAtom',
  default: 'Instructor',
});
const loadAssignmentSelector = selectorFamily({
  key: 'loadAssignmentSelector',
  get:
    (assignmentId) =>
    async ({ get, set }) => {
      const { data } = await axios.get(
        `/api/getAllAssignmentSettings.php?assignmentId=${assignmentId}`,
      );
      return data;
    },
});
export const assignmentDictionary = atomFamily({
  key: 'assignmentDictionary',
  default: selectorFamily({
    key: 'assignmentDictionary/Default',
    get:
      (driveIdcourseIditemIdparentFolderId) =>
      async ({ get }, instructions) => {
        let folderInfoQueryKey = {
          driveId: driveIdcourseIditemIdparentFolderId.driveId,
          folderId: driveIdcourseIditemIdparentFolderId.folderId,
        };
        let folderInfo = get(folderDictionarySelector(folderInfoQueryKey));
        const itemObj =
          folderInfo?.contentsDictionary?.[
            driveIdcourseIditemIdparentFolderId.itemId
          ];
        let itemIdassignmentId = itemObj?.assignmentId
          ? itemObj.assignmentId
          : null;
        if (itemIdassignmentId) {
          const aInfo = await get(loadAssignmentSelector(itemIdassignmentId));
          if (aInfo) {
            return aInfo?.assignments[0];
          } else return null;
        } else return null;
      },
  }),
});
let assignmentDictionarySelector = selectorFamily({
  //recoilvalue(assignmentDictionaryNewSelector(assignmentId))
  key: 'assignmentDictionaryNewSelector',
  get:
    (driveIdcourseIditemIdparentFolderId) =>
    ({ get }) => {
      return get(assignmentDictionary(driveIdcourseIditemIdparentFolderId));
    },
});

function Container(props) {
  return (
    <div
      style={{
        maxWidth: '850px',
        // border: "1px red solid",
        padding: '20px',
        display: 'grid',
      }}
    >
      {props.children}
    </div>
  );
}

function AutoSelect(props) {
  const { activateMenuPanel } = useToolControlHelper();

  const contentInfoLoad = useRecoilValueLoadable(selectedInformation);
  if (contentInfoLoad?.contents?.number > 0) {
    activateMenuPanel(0);
  } else {
    activateMenuPanel(1);
  }
  return null;
}

export default function Course(props) {
  const { openOverlay, activateMenuPanel } = useToolControlHelper();
  const [toast, toastType] = useToast();
  let routePathDriveId = '';
  let routePathFolderId = '';
  let pathItemId = '';
  let itemType = '';
  let urlParamsObj = Object.fromEntries(
    new URLSearchParams(props.route.location.search),
  );
  const setDrivecardSelection = useSetRecoilState(drivecardSelectedNodesAtom);
  const clearSelections = useSetRecoilState(clearDriveAndItemSelections);
  const [openEnrollment, setEnrollmentView] = useState(false);
  const role = useRecoilValue(roleAtom);
  const setDrivePath = useSetRecoilState(drivePathSyncFamily('main'));

  if (urlParamsObj?.path !== undefined) {
    [routePathDriveId, routePathFolderId, pathItemId, itemType] =
      urlParamsObj.path.split(':');
  }
  if (urlParamsObj?.path !== undefined) {
    [routePathDriveId] = urlParamsObj.path.split(':');
  }
  let courseId = '';
  if (urlParamsObj?.courseId !== undefined) {
    courseId = urlParamsObj?.courseId;
  }

  //Select +Add menuPanel if no course selected on startup
  useEffect(() => {
    if (routePathDriveId === '') {
      activateMenuPanel(1);
    }
  }, []);
  const history = useHistory();

  const DriveCardCallBack = ({ item }) => {
    // setDrivePath({
    //   driveId:item.driveId,
    //   parentFolderId:item.driveId,
    //   itemId:item.driveId,
    //   courseId:courseId,
    //   type:"Drive"
    // })
    let newParams = {};
    newParams['path'] = `${item.driveId}:${item.driveId}:${item.driveId}:Drive`;
    newParams['courseId'] = `${item.courseId}`;
    history.push('?' + encodeParams(newParams));
  };

  function cleardrivecardSelection() {
    // setDrivePath({
    //   driveId:"",
    //   parentFolderId:"",
    //   itemId:"",
    //   type:""
    // })
    setDrivecardSelection([]);
  }
  function useOutsideDriveSelector() {
    // setDrivePath({
    //   driveId:":",
    //   parentFolderId:":",
    //   itemId:":",
    //   type:""
    // })
    let newParams = {};
    newParams['path'] = `:::`;
    history.push('?' + encodeParams(newParams));
  }
  let breadcrumbContainer = <BreadcrumbContainer drivePathSyncKey="main" />;

  const setEnrollment = (e) => {
    e.preventDefault();
    setEnrollmentView(!openEnrollment);
  };

  const enrollCourseId = { courseId: courseId };
  let hideUnpublished = true;
  if (role === 'Instructor') {
    hideUnpublished = false;
  }
  let urlClickBehavior = '';
  if (role === 'Instructor') {
    urlClickBehavior = 'select';
  }
  let responsiveControls = '';
  if (role === 'Instructor' && routePathDriveId) {
    responsiveControls = (
      <Button
        value={openEnrollment ? 'Close Enrollment' : 'Open Enrollment'}
        callback={(e) => setEnrollment(e)}
      ></Button>
    );
  }

  const profile = useContext(ProfileContext);
  if (profile.signedIn === '0') {
    return (
      <>
        <GlobalFont />
        <Tool>
          <headerPanel title="Course"></headerPanel>

          <mainPanel>
            <div
              style={{
                border: '1px solid grey',
                borderRadius: '20px',
                margin: 'auto',
                marginTop: '10%',
                padding: '10px',
                width: '50%',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <h2>You are not signed in</h2>
                <h2>Course currently requires sign in for use</h2>
                <button style={{ background: '#1a5a99', borderRadius: '5px' }}>
                  <a
                    href="/signin"
                    style={{ color: 'white', textDecoration: 'none' }}
                  >
                    Sign in with this link
                  </a>
                </button>
              </div>
            </div>
          </mainPanel>
        </Tool>
      </>
    );
  }

  return (
    <Tool>
      <URLPathSync route={props.route} />
      <headerPanel title="Course" />
      <navPanel isInitOpen>
        <GlobalFont />
        <div
          style={{ marginBottom: '40px', height: '100vh' }}
          onClick={useOutsideDriveSelector}
        >
          <Drive
            driveId={routePathDriveId}
            foldersOnly={true}
            drivePathSyncKey="main"
          />
        </div>
      </navPanel>

      <mainPanel responsiveControls={responsiveControls}>
        <AutoSelect />
        {openEnrollment ? (
          <Enrollment selectedCourse={enrollCourseId} />
        ) : (
          <>
            {breadcrumbContainer}
            <div
              onClick={() => {
                clearSelections();
              }}
              // className={routePathDriveId ? 'mainPanelStyle' : ''}
            >
              <Container>
                <Drive
                  driveId={routePathDriveId}
                  hideUnpublished={hideUnpublished}
                  subTypes={['Administrator']}
                  // types={['content','course']}
                  urlClickBehavior="select"
                  drivePathSyncKey="main"
                  doenetMLDoubleClickCallback={(info) => {
                    let isAssignment =
                      info.item.isAssignment === '0' ? 'content' : 'assignment';
                    openOverlay({
                      type: isAssignment,
                      branchId: info.item.branchId,
                      contentId: info.item.contentId,
                      assignmentId: info.item.assignmentId,
                    });
                  }}
                />
              </Container>
            </div>

            <div
              onClick={cleardrivecardSelection}
              tabIndex={0}
              // className={routePathDriveId ? '' : 'mainPanelStyle'}
            >
              {!routePathDriveId && <h2>Admin</h2>}
              <DriveCards
                routePathDriveId={routePathDriveId}
                isOneDriveSelect={true}
                types={['course']}
                drivePathSyncKey="main"
                subTypes={['Administrator']}
                driveDoubleClickCallback={({ item }) => {
                  DriveCardCallBack({ item });
                }}
              />
              {!routePathDriveId && <h2>Student</h2>}
              <DriveCards
                routePathDriveId={routePathDriveId}
                isOneDriveSelect={true}
                types={['course']}
                drivePathSyncKey="main"
                subTypes={['Student']}
                driveDoubleClickCallback={({ item }) => {
                  DriveCardCallBack({ item });
                }}
              />
            </div>
          </>
        )}
      </mainPanel>
      {routePathDriveId && (
        <menuPanel isInitOpen title="Selected">
          <ItemInfo route={props.route} />
          <br />
          {/* <MaterialsInfo
           itemType={itemType} courseId={courseId} pathItemId={pathItemId} routePathDriveId={routePathDriveId} routePathFolderId={routePathFolderId} /> */}
        </menuPanel>
      )}
      <menuPanel title="+add"></menuPanel>
    </Tool>
  );
}

const DoenetMLInfoPanel = (props) => {
  let urlParamsObj = Object.fromEntries(
    new URLSearchParams(props.props.route.location.search),
  );

  let courseId = '';
  if (urlParamsObj?.courseId !== undefined) {
    courseId = urlParamsObj?.courseId;
  }

  const {
    addContentAssignment,
    changeSettings,
    saveSettings,
    assignmentToContent,
    loadAvailableAssignment,
    publishContentAssignment,
    onAssignmentError,
  } = useAssignment();
  const {
    makeAssignment,
    onmakeAssignmentError,
    publishAssignment,
    onPublishAssignmentError,
    publishContent,
    onPublishContentError,
    updateAssignmentTitle,
    onUpdateAssignmentTitleError,
    convertAssignmentToContent,
    onConvertAssignmentToContentError,
  } = useAssignmentCallbacks();

  const itemInfo = props.contentInfo;
  const assignmentInfoSettings = useRecoilValueLoadable(
    assignmentDictionarySelector({
      driveId: itemInfo.driveId,
      folderId: itemInfo.parentFolderId,
      itemId: itemInfo.itemId,
      courseId: courseId,
    }),
  );

  let aInfo = '';
  let assignmentId = '';

  if (assignmentInfoSettings?.state === 'hasValue') {
    aInfo = assignmentInfoSettings?.contents;
    if (aInfo?.assignmentId) {
      assignmentId = aInfo?.assignmentId;
    }
  }

  let publishContentButton = null;
  let makeAssignmentButton = null;
  let assignmentForm = null;
  let assignmentToContentButton = null;
  let loadAssignmentButton = null;
  let unPublishContentButton = null;
  let viewDoenetMLButton = itemInfo.isAssignment === '0' && (
    <Button
      value="View DoenetML"
      callback={() => {
        openOverlay({
          type: 'content',
          branchId: itemInfo?.branchId,
          contentId: itemInfo?.contentId,
        });
      }}
    />
  );
  const { openOverlay } = useToolControlHelper();
  const [addToast, ToastType] = useToast();

  const handleChange = (event) => {
    event.preventDefault();
    let name = event.target.name;
    let value =
      event.target.type === 'checkbox'
        ? event.target.checked
        : event.target.value;

    const result = changeSettings({
      [name]: value,
      driveIdcourseIditemIdparentFolderId: {
        driveId: itemInfo.driveId,
        folderId: itemInfo.parentFolderId,
        itemId: itemInfo.itemId,
        courseId: courseId,
      },
    });
    result
      .then((resp) => {
        if (resp.data.success) {
          // addToast(`Renamed item to '${newLabel}'`, ToastType.SUCCESS);
        } else {
          // onRenameItemError({errorMessage: resp.data.message});
        }
      })
      .catch((e) => {
        // onRenameItemError({errorMessage: e.message});
      });
  };
  const handleOnBlur = (e) => {
    let name = e.target.name;
    let value =
      e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    const result = saveSettings({
      [name]: value,
      driveIdcourseIditemIdparentFolderId: {
        driveId: itemInfo.driveId,
        folderId: itemInfo.parentFolderId,
        itemId: itemInfo.itemId,
        courseId: courseId,
      },
    });
    let payload = {
      ...aInfo,
      itemId: itemInfo.itemId,
      isAssignment: '1',
      assignmentId: aInfo?.assignmentId,
      [name]: value,
    };
    // if (name === 'assignment_title') {
    updateAssignmentTitle({
      driveIdFolderId: {
        driveId: itemInfo.driveId,
        folderId: itemInfo.parentFolderId,
      },
      itemId: itemInfo.itemId,
      payloadAssignment: payload,
    });

    // }

    result
      .then((resp) => {
        if (resp.data.success) {
          addToast(`Updated '${name}' to '${value}'`, ToastType.SUCCESS);
        } else {
          onAssignmentError({ errorMessage: resp.data.message });
        }
      })
      .catch((e) => {
        onAssignmentError({ errorMessage: e.message });
      });
  };
  const handlePublishContent = () => {
    let payload = {
      itemId: itemInfo.itemId,
    };
    publishContent({
      driveIdFolderId: {
        driveId: itemInfo.driveId,
        folderId: itemInfo.parentFolderId,
      },
      itemId: itemInfo.itemId,
      payload: payload,
    });

    const result = axios.post(`/api/handlePublishContent.php`, payload);
    result
      .then((resp) => {
        if (resp.data.success) {
          addToast(`'${itemInfo.label}' Published'`, ToastType.SUCCESS);
        } else {
          onAssignmentError({ errorMessage: resp.data.message });
        }
      })
      .catch((e) => {
        onAssignmentError({ errorMessage: e.message });
      });
  };

  const handleMakeContent = (e) => {
    let payload = {
      itemId: itemInfo.itemId,
    };

    assignmentToContent({
      driveIdcourseIditemIdparentFolderId: {
        driveId: itemInfo.driveId,
        folderId: itemInfo.parentFolderId,
        itemId: itemInfo.itemId,
        courseId: courseId,
      },
    });

    convertAssignmentToContent({
      driveIdFolderId: {
        driveId: itemInfo.driveId,
        folderId: itemInfo.parentFolderId,
      },
      itemId: itemInfo.itemId,
      assignedDataSavenew: payload,
    });

    const result = axios.post(`/api/handleMakeContent.php`, payload);
    result
      .then((resp) => {
        if (resp.data.success) {
          addToast(
            `'${itemInfo.assignment_title}' back to '${itemInfo.label}''`,
            ToastType.SUCCESS,
          );
        } else {
          onAssignmentError({ errorMessage: resp.data.message });
        }
      })
      .catch((e) => {
        onAssignmentError({ errorMessage: e.message });
      });
  };

  const loadBackAssignment = () => {
    let payload = {
      itemId: itemInfo.itemId,
      isAssignment: '1',
      assignmentId: aInfo?.assignmentId,
      assignment_title: aInfo?.assignment_title,
    };
    loadAvailableAssignment({
      ...aInfo,
      driveIdcourseIditemIdparentFolderId: {
        driveId: itemInfo.driveId,
        folderId: itemInfo.parentFolderId,
        itemId: itemInfo.itemId,
        courseId: courseId,
      },
    });

    updateAssignmentTitle({
      driveIdFolderId: {
        driveId: itemInfo.driveId,
        folderId: itemInfo.parentFolderId,
      },
      itemId: itemInfo.itemId,
      payloadAssignment: payload,
    });
    const result = axios.post(`/api/handleBackAssignment.php`, payload);
    result
      .then((resp) => {
        if (resp.data.success) {
          addToast(
            `'${itemInfo.label}' back to '${itemInfo.assignment_title}'`,
            ToastType.SUCCESS,
          );
        } else {
          onAssignmentError({ errorMessage: resp.data.message });
        }
      })
      .catch((e) => {
        onAssignmentError({ errorMessage: e.message });
      });
  };
  const [showAForm, setShowAForm] = useState(false);
  const role = useRecoilValue(roleAtom);
  // const [addToast, ToastType] = useToast();

  if (itemInfo?.isPublished === '0') {
    // // Publish content
    publishContentButton = (
      <>
        <Button
          value="Publish Content"
          switch_value="Published"
          callback={handlePublishContent}
        />
      </>
    );
  }

  if (itemInfo?.isAssignment === '0' && itemInfo.assignmentId === null) {
    // // Make assignment
    makeAssignmentButton = (
      <>
        <Button
          value="Make Assignment"
          callback={async () => {
            let assignmentId = nanoid();
            setShowAForm(true);
            const result = await addContentAssignment({
              driveIdcourseIditemIdparentFolderId: {
                driveId: itemInfo.driveId,
                folderId: itemInfo.parentFolderId,
                itemId: itemInfo.itemId,
                courseId: courseId,
              },
              branchId: itemInfo.branchId,
              contentId: itemInfo.contentId
                ? itemInfo.contentId
                : itemInfo.branchId,
              assignmentId: assignmentId,
            });
            let payload = {
              ...aInfo,
              itemId: itemInfo.itemId,
              assignment_title: 'Untitled Assignment',
              assignmentId: assignmentId,
              isAssignment: '1',
              branchId: itemInfo.branchId,
            };

            makeAssignment({
              driveIdFolderId: {
                driveId: itemInfo.driveId,
                folderId: itemInfo.parentFolderId,
              },
              itemId: itemInfo.itemId,
              payload: payload,
            });
            try {
              if (result.success) {
                addToast(
                  `Add new assignment 'Untitled assignment'`,
                  ToastType.SUCCESS,
                );
              } else {
                onAssignmentError({ errorMessage: result.message });
              }
            } catch (e) {
              onAssignmentError({ errorMessage: e });
            }
          }}
        />
      </>
    );
  }
  // // View Assignment Form
  if (
    itemInfo.isAssignment === '1' &&
    (itemInfo.assignmentId || aInfo?.assignmentId)
  ) {
    assignmentForm = (
      <>
        {
          <>
            <div>
              <label>Assignment Name :</label>
              <input
                required
                type="text"
                name="assignment_title"
                value={aInfo ? aInfo?.assignment_title : ''}
                placeholder="Title goes here"
                onBlur={(e) => handleOnBlur(e)}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Assigned Date:</label>
              <input
                required
                type="text"
                name="assignedDate"
                value={aInfo ? aInfo?.assignedDate : ''}
                placeholder="0001-01-01 01:01:01 "
                onBlur={handleOnBlur}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Due date: </label>
              <input
                required
                type="text"
                name="dueDate"
                value={aInfo ? aInfo?.dueDate : ''}
                placeholder="0001-01-01 01:01:01"
                onBlur={handleOnBlur}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Time Limit:</label>
              <input
                required
                type="time"
                name="timeLimit"
                value={aInfo ? aInfo?.timeLimit : ''}
                placeholder="01:01:01"
                onBlur={handleOnBlur}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Number Of Attempts:</label>
              <input
                required
                type="number"
                name="numberOfAttemptsAllowed"
                value={aInfo ? aInfo?.numberOfAttemptsAllowed : ''}
                onBlur={handleOnBlur}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Attempt Aggregation :</label>
              <input
                required
                type="text"
                name="attemptAggregation"
                value={aInfo ? aInfo?.attemptAggregation : ''}
                onBlur={handleOnBlur}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Total Points Or Percent: </label>
              <input
                required
                type="number"
                name="totalPointsOrPercent"
                value={aInfo ? aInfo?.totalPointsOrPercent : ''}
                onBlur={handleOnBlur}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Grade Category: </label>
              <input
                required
                type="select"
                name="gradeCategory"
                value={aInfo ? aInfo?.gradeCategory : ''}
                onBlur={handleOnBlur}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Individualize: </label>
              <input
                required
                type="checkbox"
                name="individualize"
                checked={aInfo ? aInfo?.individualize : false}
                onChange={handleOnBlur}
              />
            </div>
            <div>
              <label>Multiple Attempts: </label>
              <input
                required
                type="checkbox"
                name="multipleAttempts"
                checked={aInfo ? aInfo?.multipleAttempts : false}
                onChange={handleOnBlur}
              />{' '}
            </div>
            <div>
              <label>Show solution: </label>
              <input
                required
                type="checkbox"
                name="showSolution"
                checked={aInfo ? aInfo?.showSolution : false}
                onChange={handleOnBlur}
              />{' '}
            </div>
            <div>
              <label>Show feedback: </label>
              <input
                required
                type="checkbox"
                name="showFeedback"
                checked={aInfo ? aInfo?.showFeedback : false}
                onChange={handleOnBlur}
              />
            </div>
            <div>
              <label>Show hints: </label>
              <input
                required
                type="checkbox"
                name="showHints"
                checked={aInfo ? aInfo?.showHints : false}
                onChange={handleOnBlur}
              />
            </div>
            <div>
              <label>Show correctness: </label>
              <input
                required
                type="checkbox"
                name="showCorrectness"
                checked={aInfo ? aInfo?.showCorrectness : false}
                onChange={handleOnBlur}
              />
            </div>
            <div>
              <label>Proctor make available: </label>
              <input
                required
                type="checkbox"
                name="proctorMakesAvailable"
                checked={aInfo ? aInfo?.proctorMakesAvailable : false}
                onChange={handleOnBlur}
              />
            </div>
            <br />
            <div>
              <Button
                value="Publish assignment"
                switch_value="publish changes"
                callback={() => {
                  const result = publishContentAssignment({
                    driveIdcourseIditemIdparentFolderId: {
                      driveId: itemInfo.driveId,
                      folderId: itemInfo.parentFolderId,
                      itemId: itemInfo.itemId,
                      courseId: courseId,
                    },
                    branchId: itemInfo.branchId,
                    contentId: itemInfo.contentId
                      ? itemInfo.contentId
                      : itemInfo.branchId,
                    assignmentId: assignmentId,
                  });
                  const payload = {
                    ...aInfo,
                    assignmentId: assignmentId,
                    assignment_isPublished: '1',
                    courseId: courseId,
                    branchId: itemInfo.branchId,
                  };
                  publishAssignment({
                    driveIdFolderId: {
                      driveId: itemInfo.driveId,
                      folderId: itemInfo.parentFolderId,
                    },
                    itemId: itemInfo.itemId,
                    payload: payload,
                  });

                  result
                    .then((resp) => {
                      if (resp.data.success) {
                        addToast(
                          `'${aInfo.assignment_title}' Published'`,
                          ToastType.SUCCESS,
                        );
                      } else {
                        onAssignmentError({ errorMessage: resp.data.message });
                      }
                    })
                    .catch((e) => {
                      onAssignmentError({ errorMessage: e.message });
                    });
                }}
                type="submit"
              ></Button>
            </div>
          </>
        }
      </>
    );
  }
  // // Make Assignment Title update(Load back available assignment) //TODO add assignmentId from ainfo
  if (itemInfo.isAssignment === '0' && aInfo?.assignmentId) {
    loadAssignmentButton = (
      <>
        <Button value="load Assignment" callback={loadBackAssignment} />
      </>
    );
  }
  //  Make Assignment to content
  if (itemInfo.isAssignment === '1') {
    assignmentToContentButton = (
      <>
        <Button value="Make Content" callback={handleMakeContent} />
        <br />
        <Button
          value="View Assignment"
          callback={() => {
            openOverlay({
              type: 'assignment',
              branchId: itemInfo?.branchId,
              contentId: itemInfo?.contentId,
              assignmentId: itemInfo?.assignmentId,
            });
          }}
        />
      </>
    );
  }

  return (
    <>
      {makeAssignmentButton}
      <br />
      {publishContentButton}
      <br />
      {viewDoenetMLButton}
      <br />
      {loadAssignmentButton}
      <br />
      {assignmentToContentButton}
      <br />
      {assignmentForm}
      <br />
      {/* {unPublishContentButton} */}
    </>
  );
};
const FolderInfoPanel = () => {
  return <h1>Folder Info</h1>;
};

const ItemInfo = (props) => {
  const contentInfoLoad = useRecoilValueLoadable(selectedInformation);
  if (contentInfoLoad.state === 'loading') {
    return null;
  }
  if (contentInfoLoad.state === 'hasError') {
    console.error(contentInfoLoad.contents);
    return null;
  }
  let contentInfo = contentInfoLoad?.contents?.itemInfo;

  if (contentInfoLoad.contents?.number > 1) {
    return (
      <>
        <h1>{contentInfoLoad.contents.number} Content Selected</h1>
      </>
    );
  } else if (contentInfoLoad.contents?.number === 1) {
    if (contentInfo?.itemType === 'DoenetML') {
      return (
        <DoenetMLInfoPanel
          key={`DoenetMLInfoPanel${contentInfo.itemId}`}
          contentInfo={contentInfo}
          props={props}
        />
      );
    } else if (contentInfo?.itemType === 'Folder') {
      return (
        <FolderInfoPanel
          key={`FolderInfoPanel${contentInfo.itemId}`}
          contentInfo={contentInfo}
        />
      );
    }
  }
  return null;
};

//Student view info panel

// <div>
//       {
//         itemInfo.assignment_isPublished ===
//           '1'(
//             <div>
//               <h1>{aInfo?.assignment_title}</h1>
//               <p>Due: {aInfo?.dueDate}</p>
//               <p>Time Limit: {aInfo?.timeLimit}</p>
//               <p>
//                 Number of Attempts Allowed: {aInfo?.numberOfAttemptsAllowed}
//               </p>
//               <p>Points: {aInfo?.totalPointsOrPercent}</p>
//             </div>,
//           )}
//     </div>
