import axios from 'axios';
import {
  // useRecoilValue,
  // atom,
  atomFamily,
  selectorFamily,
  // useSetRecoilState,
  // useRecoilState,
  // useRecoilValueLoadable,
  // useRecoilStateLoadable,
  // useRecoilCallback
} from 'recoil';

export const itemHistoryAtom = atomFamily({
  key: 'itemHistoryAtom',
  default: selectorFamily({
    key: 'itemHistoryAtom/Default',
    get: (branchId) => async () => {
      let draft = {};
      let named = [];
      let autoSaves = [];
      if (!branchId) {
        return { draft, named, autoSaves };
      }
      const { data } = await axios.get(
        `/api/loadVersions.php?branchId=${branchId}`,
      );

      draft = data.versions[0];
      for (let version of data.versions) {
        if (version.isDraft === '1') {
          continue;
        }
        if (version.isNamed === '1') {
          named.push(version);
          continue;
        }
        autoSaves.push(version);
      }
      return { draft, named, autoSaves };
    },
  }),
});

export const fileByContentId = atomFamily({
  key: 'fileByContentId',
  default: selectorFamily({
    key: 'fileByContentId/Default',
    get: (contentId) => async () => {
      if (!contentId) {
        return '';
      }
      const local = localStorage.getItem(contentId);
      if (local) {
        return local;
      }
      try {
        const server = await axios.get(`/media/${contentId}.doenet`);
        return server.data;
      } catch (err) {
        //TODO: Handle 404
        return 'Error Loading';
      }
    },
  }),
});
