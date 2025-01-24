"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[622],{5680:(e,n,t)=>{t.d(n,{xA:()=>s,yg:()=>u});var r=t(6540);function a(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function i(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,r)}return t}function o(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?i(Object(t),!0).forEach((function(n){a(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):i(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function l(e,n){if(null==e)return{};var t,r,a=function(e,n){if(null==e)return{};var t,r,a={},i=Object.keys(e);for(r=0;r<i.length;r++)t=i[r],n.indexOf(t)>=0||(a[t]=e[t]);return a}(e,n);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)t=i[r],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(a[t]=e[t])}return a}var p=r.createContext({}),d=function(e){var n=r.useContext(p),t=n;return e&&(t="function"==typeof e?e(n):o(o({},n),e)),t},s=function(e){var n=d(e.components);return r.createElement(p.Provider,{value:n},e.children)},m="mdxType",c={inlineCode:"code",wrapper:function(e){var n=e.children;return r.createElement(r.Fragment,{},n)}},y=r.forwardRef((function(e,n){var t=e.components,a=e.mdxType,i=e.originalType,p=e.parentName,s=l(e,["components","mdxType","originalType","parentName"]),m=d(t),y=a,u=m["".concat(p,".").concat(y)]||m[y]||c[y]||i;return t?r.createElement(u,o(o({ref:n},s),{},{components:t})):r.createElement(u,o({ref:n},s))}));function u(e,n){var t=arguments,a=n&&n.mdxType;if("string"==typeof e||a){var i=t.length,o=new Array(i);o[0]=y;var l={};for(var p in n)hasOwnProperty.call(n,p)&&(l[p]=n[p]);l.originalType=e,l[m]="string"==typeof e?e:a,o[1]=l;for(var d=2;d<i;d++)o[d]=t[d];return r.createElement.apply(null,o)}return r.createElement.apply(null,t)}y.displayName="MDXCreateElement"},6565:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>p,contentTitle:()=>o,default:()=>c,frontMatter:()=>i,metadata:()=>l,toc:()=>d});var r=t(8168),a=(t(6540),t(5680));const i={},o=void 0,l={unversionedId:"api/interfaces/NativeModuleProps",id:"api/interfaces/NativeModuleProps",title:"NativeModuleProps",description:"react-native-iap / Exports / NativeModuleProps",source:"@site/docs/api/interfaces/NativeModuleProps.md",sourceDirName:"api/interfaces",slug:"/api/interfaces/NativeModuleProps",permalink:"/docs/api/interfaces/NativeModuleProps",draft:!1,editUrl:"https://github.com/hyochan/react-native-iap/edit/main/docs/docs/api/interfaces/NativeModuleProps.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"IapIosSk2.IosModulePropsSk2",permalink:"/docs/api/interfaces/IapIosSk2.IosModulePropsSk2"},next:{title:"PricingPhaseAndroid",permalink:"/docs/api/interfaces/PricingPhaseAndroid"}},p={},d=[{value:"Hierarchy",id:"hierarchy",level:2},{value:"Table of contents",id:"table-of-contents",level:2},{value:"Methods",id:"methods",level:3},{value:"Methods",id:"methods-1",level:2},{value:"addListener",id:"addlistener",level:3},{value:"Parameters",id:"parameters",level:4},{value:"Returns",id:"returns",level:4},{value:"Defined in",id:"defined-in",level:4},{value:"endConnection",id:"endconnection",level:3},{value:"Returns",id:"returns-1",level:4},{value:"Defined in",id:"defined-in-1",level:4},{value:"initConnection",id:"initconnection",level:3},{value:"Returns",id:"returns-2",level:4},{value:"Defined in",id:"defined-in-2",level:4},{value:"removeListeners",id:"removelisteners",level:3},{value:"Parameters",id:"parameters-1",level:4},{value:"Returns",id:"returns-3",level:4},{value:"Defined in",id:"defined-in-3",level:4}],s={toc:d},m="wrapper";function c(e){let{components:n,...t}=e;return(0,a.yg)(m,(0,r.A)({},s,t,{components:n,mdxType:"MDXLayout"}),(0,a.yg)("p",null,(0,a.yg)("a",{parentName:"p",href:"../.."},"react-native-iap")," / ",(0,a.yg)("a",{parentName:"p",href:"/docs/api/modules"},"Exports")," / NativeModuleProps"),(0,a.yg)("h1",{id:"interface-nativemoduleprops"},"Interface: NativeModuleProps"),(0,a.yg)("p",null,"Common interface for all native modules (iOS \u2014 AppStore, Android \u2014 PlayStore and Amazon)."),(0,a.yg)("h2",{id:"hierarchy"},"Hierarchy"),(0,a.yg)("ul",null,(0,a.yg)("li",{parentName:"ul"},(0,a.yg)("p",{parentName:"li"},(0,a.yg)("strong",{parentName:"p"},(0,a.yg)("inlineCode",{parentName:"strong"},"NativeModuleProps"))),(0,a.yg)("p",{parentName:"li"},"\u21b3 ",(0,a.yg)("a",{parentName:"p",href:"/docs/api/interfaces/IapAndroid.AndroidModuleProps"},(0,a.yg)("inlineCode",{parentName:"a"},"AndroidModuleProps"))),(0,a.yg)("p",{parentName:"li"},"\u21b3 ",(0,a.yg)("a",{parentName:"p",href:"/docs/api/interfaces/IapAmazon.AmazonModuleProps"},(0,a.yg)("inlineCode",{parentName:"a"},"AmazonModuleProps"))),(0,a.yg)("p",{parentName:"li"},"\u21b3 ",(0,a.yg)("a",{parentName:"p",href:"/docs/api/interfaces/IapIos.IosModuleProps"},(0,a.yg)("inlineCode",{parentName:"a"},"IosModuleProps"))),(0,a.yg)("p",{parentName:"li"},"\u21b3 ",(0,a.yg)("a",{parentName:"p",href:"/docs/api/interfaces/IapIosSk2.IosModulePropsSk2"},(0,a.yg)("inlineCode",{parentName:"a"},"IosModulePropsSk2"))))),(0,a.yg)("h2",{id:"table-of-contents"},"Table of contents"),(0,a.yg)("h3",{id:"methods"},"Methods"),(0,a.yg)("ul",null,(0,a.yg)("li",{parentName:"ul"},(0,a.yg)("a",{parentName:"li",href:"/docs/api/interfaces/NativeModuleProps#addlistener"},"addListener")),(0,a.yg)("li",{parentName:"ul"},(0,a.yg)("a",{parentName:"li",href:"/docs/api/interfaces/NativeModuleProps#endconnection"},"endConnection")),(0,a.yg)("li",{parentName:"ul"},(0,a.yg)("a",{parentName:"li",href:"/docs/api/interfaces/NativeModuleProps#initconnection"},"initConnection")),(0,a.yg)("li",{parentName:"ul"},(0,a.yg)("a",{parentName:"li",href:"/docs/api/interfaces/NativeModuleProps#removelisteners"},"removeListeners"))),(0,a.yg)("h2",{id:"methods-1"},"Methods"),(0,a.yg)("h3",{id:"addlistener"},"addListener"),(0,a.yg)("p",null,"\u25b8 ",(0,a.yg)("strong",{parentName:"p"},"addListener"),"(",(0,a.yg)("inlineCode",{parentName:"p"},"eventType"),"): ",(0,a.yg)("inlineCode",{parentName:"p"},"void")),(0,a.yg)("p",null,"addListener for NativeEventEmitter"),(0,a.yg)("h4",{id:"parameters"},"Parameters"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:"left"},"Name"),(0,a.yg)("th",{parentName:"tr",align:"left"},"Type"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:"left"},(0,a.yg)("inlineCode",{parentName:"td"},"eventType")),(0,a.yg)("td",{parentName:"tr",align:"left"},(0,a.yg)("inlineCode",{parentName:"td"},"string"))))),(0,a.yg)("h4",{id:"returns"},"Returns"),(0,a.yg)("p",null,(0,a.yg)("inlineCode",{parentName:"p"},"void")),(0,a.yg)("h4",{id:"defined-in"},"Defined in"),(0,a.yg)("p",null,(0,a.yg)("a",{parentName:"p",href:"https://github.com/hyochan/react-native-iap/blob/37b1e7b/src/modules/common.ts#L12"},"modules/common.ts:12")),(0,a.yg)("hr",null),(0,a.yg)("h3",{id:"endconnection"},"endConnection"),(0,a.yg)("p",null,"\u25b8 ",(0,a.yg)("strong",{parentName:"p"},"endConnection"),"(): ",(0,a.yg)("inlineCode",{parentName:"p"},"Promise"),"\\<",(0,a.yg)("inlineCode",{parentName:"p"},"boolean"),">"),(0,a.yg)("p",null,"Required method to end the payment provider connection"),(0,a.yg)("h4",{id:"returns-1"},"Returns"),(0,a.yg)("p",null,(0,a.yg)("inlineCode",{parentName:"p"},"Promise"),"\\<",(0,a.yg)("inlineCode",{parentName:"p"},"boolean"),">"),(0,a.yg)("h4",{id:"defined-in-1"},"Defined in"),(0,a.yg)("p",null,(0,a.yg)("a",{parentName:"p",href:"https://github.com/hyochan/react-native-iap/blob/37b1e7b/src/modules/common.ts#L9"},"modules/common.ts:9")),(0,a.yg)("hr",null),(0,a.yg)("h3",{id:"initconnection"},"initConnection"),(0,a.yg)("p",null,"\u25b8 ",(0,a.yg)("strong",{parentName:"p"},"initConnection"),"(): ",(0,a.yg)("inlineCode",{parentName:"p"},"Promise"),"\\<",(0,a.yg)("inlineCode",{parentName:"p"},"boolean"),">"),(0,a.yg)("p",null,"Required method to start a payment provider connection"),(0,a.yg)("h4",{id:"returns-2"},"Returns"),(0,a.yg)("p",null,(0,a.yg)("inlineCode",{parentName:"p"},"Promise"),"\\<",(0,a.yg)("inlineCode",{parentName:"p"},"boolean"),">"),(0,a.yg)("h4",{id:"defined-in-2"},"Defined in"),(0,a.yg)("p",null,(0,a.yg)("a",{parentName:"p",href:"https://github.com/hyochan/react-native-iap/blob/37b1e7b/src/modules/common.ts#L6"},"modules/common.ts:6")),(0,a.yg)("hr",null),(0,a.yg)("h3",{id:"removelisteners"},"removeListeners"),(0,a.yg)("p",null,"\u25b8 ",(0,a.yg)("strong",{parentName:"p"},"removeListeners"),"(",(0,a.yg)("inlineCode",{parentName:"p"},"count"),"): ",(0,a.yg)("inlineCode",{parentName:"p"},"void")),(0,a.yg)("p",null,"removeListeners for NativeEventEmitter"),(0,a.yg)("h4",{id:"parameters-1"},"Parameters"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:"left"},"Name"),(0,a.yg)("th",{parentName:"tr",align:"left"},"Type"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:"left"},(0,a.yg)("inlineCode",{parentName:"td"},"count")),(0,a.yg)("td",{parentName:"tr",align:"left"},(0,a.yg)("inlineCode",{parentName:"td"},"number"))))),(0,a.yg)("h4",{id:"returns-3"},"Returns"),(0,a.yg)("p",null,(0,a.yg)("inlineCode",{parentName:"p"},"void")),(0,a.yg)("h4",{id:"defined-in-3"},"Defined in"),(0,a.yg)("p",null,(0,a.yg)("a",{parentName:"p",href:"https://github.com/hyochan/react-native-iap/blob/37b1e7b/src/modules/common.ts#L15"},"modules/common.ts:15")))}c.isMDXComponent=!0}}]);