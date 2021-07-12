/**
 * External dependencies
 */
// import React from 'react';
import { nanoid } from 'nanoid';
import axios from 'axios';
import { useRecoilCallback } from 'recoil';

/**
 * Internal dependencies
 */
import {
  folderDictionaryFilterSelector,
  globalSelectedNodesAtom,
  folderDictionary,
  selectedDriveItemsAtom,
  sortOptions,
  getLexicographicOrder,
  folderCacheDirtyAtom,
  dragStateAtom,
  sortItems,
  nodePathSelector,
  folderOpenAtom,
  folderSortOrderAtom,
} from './Drive';
import { useToast } from '../../Tools/_framework/Toast';

const dragShadowId = 'dragShadow';

const formatDate = (dt) => {
  const formattedDate = `${dt.getFullYear().toString().padStart(2, '0')}-${(
    dt.getMonth() + 1
  )
    .toString()
    .padStart(2, '0')}-${dt.getDate().toString().padStart(2, '0')} ${dt
    .getHours()
    .toString()
    .padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt
    .getSeconds()
    .toString()
    .padStart(2, '0')}`;

  return formattedDate;
};

export const useCopyItems = () => {
  const [addToast, ToastType] = useToast();

  /**
   * @param {Object[]} items - items to be copied { driveId, driveInstanceId,
   *  itemId, parentFolderId }
   * @param {string} targetDriveId - destination drive ID
   * @param {string} targetFolderId - destination folder ID
   * @param {string} index - insertion index in destination folder
   */
  const copyItems = useRecoilCallback(
    ({ snapshot, set }) =>
      async ({ items = [], targetDriveId, targetFolderId, index }) => {
        // Interrupt copy action if items is empty
        if (items.length === 0) {
          throw 'No items to be copied';
        }

        let destinationFolderObj = await snapshot.getPromise(
          folderDictionary({
            driveId: targetDriveId,
            folderId: targetFolderId,
          }),
        );
        let newDestinationFolderObj = JSON.parse(
          JSON.stringify(destinationFolderObj),
        );
        const insertIndex = index ?? 0;
        let newSortOrder = '';
        const dt = new Date();
        const creationTimestamp = formatDate(dt);
        let globalDictionary = {};
        let globalContentIds = {};

        for (let item of items) {
          if (!item.driveId || !item.driveInstanceId || !item.itemId)
            throw 'Invalid arguments error';

          // Deselect currently selected items
          let selectedItem = {
            driveId: item.driveId,
            driveInstanceId: item.driveInstanceId,
            itemId: item.itemId,
          };
          set(selectedDriveItemsAtom(selectedItem), false);

          // Clone target item and its children
          const { newItemId, newItem } = await cloneItem({
            snapshot,
            globalDictionary,
            globalContentIds,
            creationTimestamp,
            item,
            targetDriveId,
            targetFolderId,
          });

          // Specify copy in label when copying within same drive
          if (item.driveId === targetDriveId) {
            const newItemLabel = `Copy of ${newItem.label}`;
            newItem.label = newItemLabel;
          }

          // Generate sortOrder for cloned item
          const cleanDefaultOrder = newDestinationFolderObj['contentIds'][
            'defaultOrder'
          ].filter((itemId) => itemId !== dragShadowId);
          newSortOrder = getLexicographicOrder({
            index: insertIndex,
            nodeObjs: newDestinationFolderObj.contentsDictionary,
            defaultFolderChildrenIds: cleanDefaultOrder,
          });
          newItem.sortOrder = newSortOrder;

          // Insert root of cloned tree/item into destination
          newDestinationFolderObj['contentsDictionary'][newItemId] = newItem;
          newDestinationFolderObj['contentIds']['defaultOrder'].splice(
            insertIndex,
            0,
            newItemId,
          );
        }

        // Clear global selection
        set(globalSelectedNodesAtom, []);

        let promises = [];
        for (let newItemId of Object.keys(globalDictionary)) {
          let newItem = globalDictionary[newItemId];

          const addItemsParams = {
            driveId: targetDriveId,
            parentFolderId: newItem.parentFolderId,
            itemId: newItemId,
            doenetId: newItem.doenetId,
            // doenetId: nanoid(),
            versionId: newItem.versionId,
            // versionId: nanoid(),
            label: newItem.label,
            type: newItem.itemType,
            sortOrder: newItem.sortOrder,
            isNewCopy: '1',
          };

          // Clone DoenetML
          if (newItem.itemType === 'DoenetML') {
            const newDoenetML = cloneDoenetML({
              item: newItem,
              timestamp: creationTimestamp,
            });

            promises.push(axios.post('/api/saveNewVersion.php', newDoenetML));

            // Unify new doenetId
            // addItemsParams["doenetId"] = newDoenetML?.doenetId;
          }

          const payload = {
            params: addItemsParams,
          };

          const result = axios.get('/api/addItem.php', payload);
          promises.push(result);
        }

        Promise.allSettled(promises).then(([result]) => {
          if (result.value?.data?.success) {
            // Update destination folder
            set(
              folderDictionary({
                driveId: targetDriveId,
                folderId: targetFolderId,
              }),
              newDestinationFolderObj,
            );

            // Add new cloned items into folderDictionary
            for (let newItemId of Object.keys(globalDictionary)) {
              let newItem = globalDictionary[newItemId];
              if (newItem.itemType === 'Folder') {
                // BFS tree-walk to iterate through tree nodes
                let queue = [newItemId];
                while (queue.length) {
                  const size = queue.length;
                  for (let i = 0; i < size; i++) {
                    const currentItemId = queue.shift();
                    const currentItem = globalDictionary[currentItemId];
                    if (currentItem.itemType !== 'Folder') continue;

                    // Build contentsDictionary
                    let contentsDictionary = {};
                    for (let childContentId of globalContentIds[
                      currentItemId
                    ]) {
                      contentsDictionary = {
                        ...contentsDictionary,
                        [childContentId]: globalDictionary[childContentId],
                      };
                    }

                    // Build folder info object
                    const currentFolderInfoObj = {
                      folderInfo: currentItem,
                      contentsDictionary,
                      contentIds: {
                        [sortOptions.DEFAULT]: globalContentIds[currentItemId],
                      },
                    };

                    // Add current folder into folderDictionary
                    set(
                      folderDictionary({
                        driveId: targetDriveId,
                        folderId: currentItemId,
                      }),
                      currentFolderInfoObj,
                    );

                    queue = [...queue, ...globalContentIds[currentItemId]];
                  }
                }
              }
            }

            // Mark current folder as dirty
            set(
              folderCacheDirtyAtom({
                driveId: targetDriveId,
                folderId: targetFolderId,
              }),
              true,
            );
          }
        });

        const result = await Promise.allSettled(promises);
        return result;
      },
  );

  const cloneItem = async ({
    snapshot,
    globalDictionary = {},
    globalContentIds = {},
    creationTimestamp,
    item,
    targetDriveId,
    targetFolderId,
  }) => {
    // Retrieve info of target item from parentFolder
    const itemParentFolder = await snapshot.getPromise(
      folderDictionary({
        driveId: item.driveId,
        folderId: item.parentFolderId,
      }),
    );
    const itemInfo = itemParentFolder['contentsDictionary'][item.itemId];

    // Clone item (Note this should be the source of new ids)
    const newItem = { ...itemInfo };
    const newItemId = nanoid();
    newItem.itemId = newItemId;
    newItem.doenetId = nanoid();
    newItem.versionId = nanoid();
    newItem.previousDoenetId = itemInfo.doenetId;

    if (itemInfo.itemType === 'Folder') {
      const { contentIds } = await snapshot.getPromise(
        folderDictionary({ driveId: item.driveId, folderId: item.itemId }),
      );
      globalContentIds[newItemId] = [];
      for (let contentId of contentIds[sortOptions.DEFAULT]) {
        let subItem = {
          ...item,
          parentFolderId: item.itemId,
          itemId: contentId,
        };
        let result = await cloneItem({
          snapshot,
          globalDictionary,
          globalContentIds,
          creationTimestamp,
          item: subItem,
          targetFolderId: newItemId,
          targetDriveId,
        });
        const newSubItemId = result.newItemId;
        globalContentIds[newItemId].push(newSubItemId);
      }
    }

    newItem.parentFolderId = targetFolderId;
    newItem.creationDate = creationTimestamp;
    globalDictionary[newItemId] = newItem;

    return { newItemId, newItem };
  };

  const cloneDoenetML = ({ item, timestamp }) => {
    let newVersion = {
      title: item.label,
      doenetId: item.doenetId,
      // doenetId: nanoid(),
      contentId: item.contentId,
      versionId: item.versionId,
      timestamp,
      isDraft: '0',
      isNamed: '1',
      isNewCopy: '1',
      doenetML: item.doenetML,
      previousDoenetId: item.previousDoenetId,
    };
    return newVersion;
  };

  const onCopyItemsError = ({ errorMessage = null }) => {
    addToast(`Copy item(s) error: ${errorMessage}`, ToastType.ERROR);
  };

  return { copyItems, onCopyItemsError };
};

export const useDragShadowCallbacks = () => {
  const replaceDragShadow = useRecoilCallback(({ snapshot }) => async () => {
    const { dragShadowDriveId, dragShadowParentId } = await snapshot.getPromise(
      dragStateAtom,
    );
    const globalSelectedNodes = await snapshot.getPromise(
      globalSelectedNodesAtom,
    );

    // Check if drag shadow valid
    if (!dragShadowDriveId || !dragShadowParentId) return;

    let dragShadowParentFolderInfoObj = null;
    if (dragShadowDriveId && dragShadowParentId)
      dragShadowParentFolderInfoObj = await snapshot.getPromise(
        folderDictionary({
          driveId: dragShadowDriveId,
          folderId: dragShadowParentId,
        }),
      );
    let dragShadowParentDefaultOrder =
      dragShadowParentFolderInfoObj?.contentIds[sortOptions.DEFAULT];
    let insertIndex = dragShadowParentDefaultOrder?.indexOf(dragShadowId);

    if (insertIndex < 0) {
      return {};
    }

    return {
      targetDriveId: dragShadowDriveId,
      targetFolderId: dragShadowParentId,
      index: insertIndex,
      numItems: globalSelectedNodes.length,
    };
  });

  const insertDragShadow = useRecoilCallback(
    ({ snapshot, set }) =>
      async ({ driveIdFolderId, position, parentId, itemId }) => {
        const {
          dragShadowDriveId,
          dragShadowParentId,
          draggedItemsId,
          copyMode,
        } = await snapshot.getPromise(dragStateAtom);

        if (!copyMode && draggedItemsId && draggedItemsId?.has(itemId)) {
          removeDragShadow();
          return;
        }

        const dragShadow = {
          assignmentId: null,
          doenetId: null,
          contentId: null,
          creationDate: '',
          isPublished: '0',
          itemId: dragShadowId,
          itemType: 'DragShadow',
          label: '',
          parentFolderId: parentId,
          url: null,
          urlDescription: null,
          urlId: null,
        };
        const insertPosition = position;

        const dropTargetParentId = parentId;
        let dragShadowParentFolderInfoObj = null;
        if (dragShadowDriveId && dragShadowParentId)
          dragShadowParentFolderInfoObj = await snapshot.getPromise(
            folderDictionary({
              driveId: dragShadowDriveId,
              folderId: dragShadowParentId,
            }),
          );

        // remove dragShadowId from dragShadowParentId (contentDictionary, contentIds)
        if (dragShadowParentFolderInfoObj) {
          set(
            folderDictionary({
              driveId: dragShadowDriveId,
              folderId: dragShadowParentId,
            }),
            (old) => {
              let newObj = { ...old };
              let newDefaultOrder = [...newObj.contentIds[sortOptions.DEFAULT]];
              newDefaultOrder = newDefaultOrder.filter(
                (itemId) => itemId !== dragShadowId,
              );
              const defaultOrderObj = {
                [sortOptions.DEFAULT]: newDefaultOrder,
              };
              newObj.contentIds = defaultOrderObj;
              return newObj;
            },
          );
        }

        if (insertPosition === 'intoCurrent') {
          /*
           * Handle drag move: display drag shadow as a child of target item
           * insert dragShadowId into driveIdFolderId.folderId (contentDictionary, contentIds)
           */
          // Handle insertion into dragged items
          if (draggedItemsId && draggedItemsId?.has(driveIdFolderId.folderId))
            return;

          set(folderDictionary(driveIdFolderId), (old) => {
            let newObj = { ...old };
            let newContentsDictionary = { ...old.contentsDictionary };
            let newDefaultOrder = [...newObj.contentIds[sortOptions.DEFAULT]];

            // Copy dragShadow data into destination dictionary
            newContentsDictionary[dragShadowId] = dragShadow;

            // Make sure dragShadow not duplicated
            if (dragShadowParentId === dropTargetParentId)
              newDefaultOrder = newDefaultOrder.filter(
                (itemId) => itemId !== dragShadowId,
              );

            // Insert dragShadow into order array
            newDefaultOrder.splice(0, 0, dragShadowId);

            // Update data
            const defaultOrderObj = { [sortOptions.DEFAULT]: newDefaultOrder };
            newObj.contentIds = defaultOrderObj;
            newObj.contentsDictionary = newContentsDictionary;
            return newObj;
          });

          // Update dragStateAtom.dragShadowParentId to dropTargetParentId
          set(dragStateAtom, (old) => {
            return {
              ...old,
              dragShadowDriveId: driveIdFolderId.driveId,
              dragShadowParentId: driveIdFolderId.folderId,
            };
          });
        } else {
          /*
           * Handle drag re-ordering: display drag shadow before or after target item
           * insert dragShadowId into dropTargetParent (contentDictionary, contentIds)
           */

          // Helper function to verify if position of insertion is valid
          const isValidPosition = ({
            draggedItemsId,
            contentIdsArr,
            index,
          }) => {
            // Allow any position if multiple items are being dragged
            if (draggedItemsId?.size > 1) return true;

            let isValid = true;
            let nextItemId = null,
              prevItemId = null;

            if (contentIdsArr.length !== 0) {
              if (index <= 0) {
                nextItemId = contentIdsArr[0];
              } else if (index >= contentIdsArr.length) {
                prevItemId = contentIdsArr[contentIdsArr.length - 1];
              } else {
                prevItemId = contentIdsArr[index - 1];
                nextItemId = contentIdsArr[index];
              }

              if (prevItemId && draggedItemsId?.has(prevItemId))
                isValid = false;
              if (nextItemId && draggedItemsId?.has(nextItemId))
                isValid = false;
            }
            return isValid;
          };

          let isValid = true;

          set(
            folderDictionary({
              driveId: driveIdFolderId.driveId,
              folderId: dropTargetParentId,
            }),
            (old) => {
              let newObj = { ...old };
              let newContentsDictionary = { ...old.contentsDictionary };
              let newDefaultOrder = [...newObj.contentIds[sortOptions.DEFAULT]];

              // Copy dragShadow data into destination dictionary
              newContentsDictionary[dragShadowId] = dragShadow;

              // Make sure dragShadow not duplicated
              if (dragShadowParentId === dropTargetParentId)
                newDefaultOrder = newDefaultOrder.filter(
                  (itemId) => itemId !== dragShadowId,
                );

              // Compute insertion index
              let index = newDefaultOrder.indexOf(itemId);
              if (insertPosition === 'afterCurrent') index += 1;

              // Check if insertion index valid
              isValid =
                copyMode ||
                isValidPosition({
                  draggedItemsId,
                  contentIdsArr: newDefaultOrder,
                  index,
                });

              // Insert dragShadow into order array
              if (isValid) newDefaultOrder.splice(index, 0, dragShadowId);

              // Update data
              const defaultOrderObj = {
                [sortOptions.DEFAULT]: newDefaultOrder,
              };
              newObj.contentIds = defaultOrderObj;
              newObj.contentsDictionary = newContentsDictionary;
              return newObj;
            },
          );

          // Update dragShadow data in dragStateAtom
          if (isValid) {
            set(dragStateAtom, (old) => {
              return {
                ...old,
                dragShadowDriveId: driveIdFolderId.driveId,
                dragShadowParentId: dropTargetParentId,
              };
            });
          }
        }
      },
  );

  const removeDragShadow = useRecoilCallback(
    ({ snapshot, set }) =>
      async () => {
        const { dragShadowDriveId, dragShadowParentId } =
          await snapshot.getPromise(dragStateAtom);
        // Check if drag shadow valid
        if (!dragShadowDriveId || !dragShadowParentId) return;

        set(
          folderDictionary({
            driveId: dragShadowDriveId,
            folderId: dragShadowParentId,
          }),
          (old) => {
            let newObj = { ...old };
            let newDefaultOrder = [...newObj.contentIds[sortOptions.DEFAULT]];
            newDefaultOrder = newDefaultOrder.filter(
              (itemId) => itemId !== dragShadowId,
            );
            const defaultOrderObj = { [sortOptions.DEFAULT]: newDefaultOrder };
            newObj.contentIds = defaultOrderObj;
            return newObj;
          },
        );
        set(dragStateAtom, (old) => {
          return {
            ...old,
            dragShadowDriveId: null,
            dragShadowParentId: null,
          };
        });
      },
  );

  const cleanUpDragShadow = useRecoilCallback(
    ({ snapshot, set }) =>
      async () => {
        const { dragShadowDriveId, dragShadowParentId, openedFoldersInfo } =
          await snapshot.getPromise(dragStateAtom);

        // If valid dragShadow, filter path of folders to dragShadow
        let openedFolders = [...openedFoldersInfo];
        let filteredOpenedFolders = [];
        if (dragShadowDriveId && dragShadowParentId) {
          let foldersOnPath = await snapshot.getPromise(
            nodePathSelector({
              driveId: dragShadowDriveId,
              folderId: dragShadowParentId,
            }),
          );
          let folderOnPathSet = new Set(
            foldersOnPath.map((obj) => obj.folderId),
          );
          for (let openedFolder of openedFolders) {
            const notFolderOnPath = !(
              openedFolder.driveId === dragShadowDriveId &&
              folderOnPathSet.has(openedFolder.itemId)
            );
            if (notFolderOnPath) {
              filteredOpenedFolders.push(openedFolder);
            }
          }
        } else {
          filteredOpenedFolders = openedFolders;
        }

        for (let openedFolder of filteredOpenedFolders) {
          set(folderOpenAtom(openedFolder), false);
        }
      },
  );

  return {
    insertDragShadow,
    removeDragShadow,
    replaceDragShadow,
    cleanUpDragShadow,
  };
};

export const useSortFolder = () => {
  const [addToast, ToastType] = useToast();
  const sortFolder = useRecoilCallback(
    ({ set, snapshot }) =>
      async ({ driveIdInstanceIdFolderId, sortKey }) => {
        const { driveId, folderId } = driveIdInstanceIdFolderId;
        const { contentIds } = await snapshot.getPromise(
          folderDictionaryFilterSelector({ driveId, folderId }),
        );
        set(folderSortOrderAtom(driveIdInstanceIdFolderId), sortKey);

        // if sortOrder not already cached in folderDictionary
        if (!contentIds[sortKey]) {
          set(folderDictionary({ driveId, folderId }), (old) => {
            let newObj = JSON.parse(JSON.stringify(old));
            let { contentsDictionary, contentIds } = newObj;
            let newFolderInfo = { ...newObj.folderInfo };

            const sortedFolderChildrenIds = sortItems({
              sortKey,
              nodeObjs: contentsDictionary,
              defaultFolderChildrenIds: contentIds[sortOptions.DEFAULT],
            });

            // Update folder data
            newObj.folderInfo = newFolderInfo;
            newObj.contentIds[sortKey] = sortedFolderChildrenIds;

            return newObj;
          });
        }
      },
  );

  const invalidateSortCache = useRecoilCallback(
    ({ set }) =>
      async ({ driveIdFolderId }) => {
        set(folderDictionary(driveIdFolderId), (old) => {
          let newObj = { ...old };
          let { contentIds } = old;

          newObj.contentIds = {
            [sortOptions.DEFAULT]: [...contentIds[sortOptions.DEFAULT]],
          };
          return newObj;
        });
        return;
      },
  );

  const onSortFolderError = ({ errorMessage = null }) => {
    addToast(`Sort items error: ${errorMessage}`, ToastType.ERROR);
  };

  return { sortFolder, invalidateSortCache, onSortFolderError };
};

export const useAssignmentCallbacks = () => {
  const [addToast, ToastType] = useToast();

  const makeAssignment = useRecoilCallback(
    ({ set }) =>
      ({ driveIdFolderId, itemId, payload }) => {
        set(folderDictionary(driveIdFolderId), (old) => {
          let newObj = JSON.parse(JSON.stringify(old));
          let newItemObj = newObj.contentsDictionary[itemId];
          newItemObj.isAssigned = '1';
          newItemObj.dueDate = payload?.dueDate;
          return newObj;
        });
      },
  );

  const onmakeAssignmentError = ({ errorMessage = null }) => {
    addToast(`make assignment error: ${errorMessage}`, ToastType.ERROR);
  };
  const publishAssignment = useRecoilCallback(
    ({ set }) =>
      ({ driveIdFolderId, itemId }) => {
        set(folderDictionary(driveIdFolderId), (old) => {
          let newObj = JSON.parse(JSON.stringify(old));
          let newItemObj = newObj.contentsDictionary[itemId];
          newItemObj.assignment_isPublished = '1';
          newItemObj.isAssigned = '1';
          return newObj;
        });
      },
  );

  const onPublishAssignmentError = ({ errorMessage = null }) => {
    addToast(`Publish assignment error: ${errorMessage}`, ToastType.ERROR);
  };

  const publishContent = useRecoilCallback(
    ({ set }) =>
      ({ driveIdFolderId, itemId }) => {
        set(folderDictionary(driveIdFolderId), (old) => {
          let newObj = JSON.parse(JSON.stringify(old));
          let newItemObj = newObj.contentsDictionary[itemId];
          newItemObj.isPublished = '1';
          return newObj;
        });
      },
  );

  const onPublishContentError = () => {
    addToast(`Publish content error`, ToastType.ERROR);
  };

  const updateAssignmentTitle = useRecoilCallback(
    ({ set }) =>
      ({ driveIdFolderId, itemId, payloadAssignment }) => {
        set(folderDictionary(driveIdFolderId), (old) => {
          let newObj = JSON.parse(JSON.stringify(old));
          let newItemObj = newObj.contentsDictionary[itemId];
          newItemObj.isAssigned = '1';
          newItemObj.assignedDate = payloadAssignment?.assignedDate;
          newItemObj.dueDate = payloadAssignment?.dueDate;
          newItemObj.timeLimit = payloadAssignment?.timeLimit;
          newItemObj.numberOfAttemptsAllowed =
            payloadAssignment?.numberOfAttemptsAllowed;
          newItemObj.totalPointsOrPercent =
            payloadAssignment?.totalPointsOrPercent;
          newItemObj.gradeCategory = payloadAssignment?.gradeCategory;
          return newObj;
        });
      },
  );

  const onUpdateAssignmentTitleError = ({ errorMessage = null }) => {
    addToast(`Rename assignment error: ${errorMessage}`, ToastType.ERROR);
  };

  const convertAssignmentToContent = useRecoilCallback(
    ({ set }) =>
      ({ driveIdFolderId, itemId }) => {
        set(folderDictionary(driveIdFolderId), (old) => {
          let newObj = JSON.parse(JSON.stringify(old));
          let newItemObj = newObj.contentsDictionary[itemId];
          newItemObj.isAssigned = '0';
          return newObj;
        });
      },
  );

  const onConvertAssignmentToContentError = ({ errorMessage = null }) => {
    addToast(`Convert assignment error: ${errorMessage}`, ToastType.ERROR);
  };

  return {
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
  };
};
