import { createGlobalStyle } from 'styled-components';

import OpenSansRegularWoffTwo from '../Media/fonts/files/open-sans-v18-latin-regular.woff2';
import OpenSansRegularItalicWoffTwo from '../Media/fonts/files/open-sans-v18-latin-italic.woff2';
import OpenSansBoldWoffTwo from '../Media/fonts/files/open-sans-v18-latin-700.woff2';
import OpenSansItalicBoldWoffTwo from '../Media/fonts/files/open-sans-v18-latin-700italic.woff2';

import OpenSansRegularWoff from '../Media/fonts/files/open-sans-v18-latin-regular.woff';
import OpenSansRegularItalicWoff from '../Media/fonts/files/open-sans-v18-latin-italic.woff';
import OpenSansBoldWoff from '../Media/fonts/files/open-sans-v18-latin-700.woff';
import OpenSansItalicBoldWoff from '../Media/fonts/files/open-sans-v18-latin-700italic.woff';

const GlobalFont = createGlobalStyle`
  @font-face {
    font-family: 'Open Sans';
    font-style: normal;
    font-weight: normal;
    src:
      url('${OpenSansRegularWoffTwo}') format('woff2'),
      url('${OpenSansRegularWoff}') format('woff');
  }
 
  @font-face {
    font-family: 'Open Sans';
    font-style: italic;
    font-weight: normal;
    src:
      url('${OpenSansRegularItalicWoffTwo}') format('woff2'),
      url('${OpenSansRegularItalicWoff}') format('woff');
  }
 
  @font-face {
    font-family: 'Open Sans';
    font-style: normal;
    font-weight: 700;
    src:
      url('${OpenSansBoldWoffTwo}') format('woff2'),
      url('${OpenSansBoldWoff}') format('woff');
  }

  @font-face {
    font-family: 'Open Sans';
    font-style: italic;
    font-weight: 700;
    src:
      url('${OpenSansItalicBoldWoffTwo}') format('woff2'),
      url('${OpenSansItalicBoldWoff}') format('woff');
  }
  html
  {
    font-family: Open Sans !important
  }
`;

export default GlobalFont;
