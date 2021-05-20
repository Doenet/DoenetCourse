import React from 'react';
import ReactDOM from 'react-dom';
import { parse, parseAndCompile, showCursor } from '../../Parser/parser.js';

// import axios from 'axios';

// const Test = () => {
//   return (
//     <div
//       style={{
//         display: 'grid',
//         grid:
//           '"nav header menu" auto "nav extra menu" 1fr "nav footer menu" auto / auto 1fr auto',
//         height: '85vh',
//         gap: '4px',
//       }}
//     >
//       <DragPanel
//         direction={handleDirection.DOWN}
//         gridArea={'header'}
//         panelSize={60}
//       >
//         Test teawteateateatateatea
//       </DragPanel>
//       <DragPanel direction={handleDirection.RIGHT} gridArea={'nav'} isInitOpen>
//         Test teawteateateatateatea
//       </DragPanel>
//       <DragPanel direction={handleDirection.LEFT} gridArea={'menu'}>
//         Test teawteateateatateatea
//       </DragPanel>
//       <DragPanel direction={handleDirection.UP} gridArea={'footer'}>
//         Test teawteateateatateatea
//       </DragPanel>
//       <div style={{ gridArea: 'extra', backgroundColor: 'red' }} />
//     </div>
//   );
// };
// ReactDOM.render(<Test />, document.getElementById('root'));

// function DynamicLoad(props) {

//   let [components,setComponents] = useState([])

//   useEffect(()=>{
//       let loader = import("/renderers/one.js")
//       loader.then((resp)=>{
//         const one = resp.default({text:'this is from static path'});
//         setComponents([<React.Fragment key='1'>{one}</React.Fragment>])
//       })

//   },[])

//   // let loader = import("/temp/one.js")
//   // loader.then((resp)=>{
//   //   // console.log(">>>resp",resp.default(3));
//   //   const component = resp.default;
//   //   console.log(">>>component",component)
//   //   setComponents([<>{component}</>])
//   // })

//   // const One = lazy(() => import('./one.jsx'));
//   // const Two = lazy(() => import('./two.jsx'));

//   // axios.get('/api/test.php').then((resp) => console.log('>>>resp', resp.data));

//   return (
//     <>
//       {/* <div>{loaded}</div> */}
//       {/* <Suspense fallback={<div>Components are Loading...</div>}>
//         <One />
//         <Two />
//       </Suspense> */}
//       {/* <Suspense fallback={<div>Three is Loading...</div>}>
//         <Three />
//       </Suspense> */}

//       {components}
//       <p>This is a p tag</p>
//     </>
//   );
// }

// <DynamicLoad />,

ReactDOM.render(<p>temp</p>, document.getElementById('root'));

const doenetMl =
  '<p>This is a test string <div> with a nested tag </div></p> <test attr="value" /> <two />';

// const doenetMl = `
//   <p> this is a test string
//     <div id="divtastic" parsed="true"> with a div <a href ="https://www.youtube.com/watch?v=dQw4w9WgXcQ"> cool link </a></div>
//   </p>
//   <test passed="true" />`

let t = parse(doenetMl);
console.log(t);
// console.log(t.node.getChildren());
console.log(showCursor(t));

let o = parseAndCompile(doenetMl);
console.log(o);

// while(t.next()){
//   console.log(">>>node type",t.type)
//   console.log(">>>node bounds", t.from,t.to)
// }

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/concepts/hot-module-replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}
