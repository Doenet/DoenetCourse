import React from 'react';
import { faTh } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  drivePathSyncFamily,
  folderDictionary,
  fetchDrivesQuery,
} from '../Drive/Drive';
import {
  useRecoilValue,
  useRecoilState,
  atomFamily,
  selectorFamily,
} from 'recoil';

const breadcrumbItemAtomFamily = atomFamily({
  key: 'breadcrumbItemAtomFamily',
  default: selectorFamily({
    key: 'breadcrumbItemAtomFamily/Default',
    get:
      (driveIdFolderId) =>
      ({ get }) => {
        let items = [];
        let driveId = driveIdFolderId.driveId;
        let folderId = driveIdFolderId.folderId;
        if (!driveId) {
          return items;
        }
        while (folderId) {
          let folderInfo = get(folderDictionary({ driveId, folderId }));
          if (!folderInfo.folderInfo.itemId) {
            break;
          }

          items.push({
            type: 'Folder',
            folderId: folderInfo.folderInfo.itemId,
            label: folderInfo.folderInfo.label,
          });
          folderId = folderInfo.folderInfo.parentFolderId;
        }
        const drivesInfo = get(fetchDrivesQuery);
        let driveObj = { type: 'Drive', folderId: driveId };
        for (let drive of drivesInfo.driveIdsAndLabels) {
          if (drive.driveId === driveId) {
            driveObj.label = drive.label;
            break;
          }
        }
        items.push(driveObj);
        return items;
      },
  }),
});

export const BreadcrumbContainer = (props) => {
  const [drivePath, setDrivePath] = useRecoilState(
    drivePathSyncFamily(props.drivePathSyncKey),
  );
  const items = useRecoilValue(
    breadcrumbItemAtomFamily({
      driveId: drivePath.driveId,
      folderId: drivePath.parentFolderId,
    }),
  );

  //Don't show up if not in a drive
  if (drivePath.driveId === '') {
    return null;
  }

  let leftmostBreadcrumb = (
    <span
      onClick={() => {
        setDrivePath({
          driveId: '',
          parentFolderId: '',
          itemId: '',
          type: '',
        });
      }}
    >
      <FontAwesomeIcon icon={faTh} />
    </span>
  );

  let reversed = [...items];
  reversed.reverse();

  let children = [];
  for (let item of reversed) {
    children.push(
      <span
        onClick={() => {
          setDrivePath({
            driveId: drivePath.driveId,
            parentFolderId: item.folderId,
            itemId: item.folderId,
            type: 'Folder',
          });
        }}
      >
        {item.label} /{' '}
      </span>,
    );
  }

  return (
    <div style={{ margin: '10px' }}>
      {leftmostBreadcrumb} {children}
    </div>
  );
};
