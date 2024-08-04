"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[8521],{3905:(e,t,n)=>{n.d(t,{Zo:()=>l,kt:()=>g});var r=n(7294);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function s(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var c=r.createContext({}),d=function(e){var t=r.useContext(c),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},l=function(e){var t=d(e.components);return r.createElement(c.Provider,{value:t},e.children)},p="mdxType",u={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},m=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,i=e.originalType,c=e.parentName,l=s(e,["components","mdxType","originalType","parentName"]),p=d(n),m=a,g=p["".concat(c,".").concat(m)]||p[m]||u[m]||i;return n?r.createElement(g,o(o({ref:t},l),{},{components:n})):r.createElement(g,o({ref:t},l))}));function g(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var i=n.length,o=new Array(i);o[0]=m;var s={};for(var c in t)hasOwnProperty.call(t,c)&&(s[c]=t[c]);s.originalType=e,s[p]="string"==typeof e?e:a,o[1]=s;for(var d=2;d<i;d++)o[d]=n[d];return r.createElement.apply(null,o)}return r.createElement.apply(null,n)}m.displayName="MDXCreateElement"},5429:(e,t,n)=>{n.d(t,{Z:()=>a});var r=n(7294);function a(e){let{className:t="adfit",style:n,unit:a,height:i,width:o}=e;return(0,r.useEffect)((()=>{let e=document.createElement("ins"),n=document.createElement("script");e.className="kakao_ad_area",e.style="display:none; width:100%;",n.async="true",n.type="text/javascript",n.src="//t1.daumcdn.net/kas/static/ba.min.js",e.setAttribute("data-ad-width",o.toString()),e.setAttribute("data-ad-height",i.toString()),e.setAttribute("data-ad-unit",a.toString()),document.querySelector(`.${t}`).appendChild(e),document.querySelector(`.${t}`).appendChild(n)}),[]),r.createElement("div",{style:n},r.createElement("div",{className:t}))}},2448:(e,t,n)=>{n.d(t,{Z:()=>i});var r=n(7294),a=n(5429);function i(){return r.createElement(a.Z,{unit:"DAN-YTmjDwlbcP42HBg6",height:100,width:320,className:"adfit-top",style:{flex:1,marginTop:24,marginBottom:24}})}},3700:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>d,contentTitle:()=>s,default:()=>m,frontMatter:()=>o,metadata:()=>c,toc:()=>l});var r=n(7462),a=(n(7294),n(3905)),i=n(2448);const o={title:"Get Pending Purchases IOS",sidebar_label:"getPendingPurchasesIOS"},s=void 0,c={unversionedId:"api-reference/methods/ios/get-pending-purchases-ios",id:"api-reference/methods/ios/get-pending-purchases-ios",title:"Get Pending Purchases IOS",description:"Gets all the transactions which are pending to be finished.",source:"@site/docs/api-reference/methods/ios/get-pending-purchases-ios.mdx",sourceDirName:"api-reference/methods/ios",slug:"/api-reference/methods/ios/get-pending-purchases-ios",permalink:"/docs/api-reference/methods/ios/get-pending-purchases-ios",draft:!1,editUrl:"https://github.com/dooboolab-community/react-native-iap/edit/main/docs/docs/api-reference/methods/ios/get-pending-purchases-ios.mdx",tags:[],version:"current",frontMatter:{title:"Get Pending Purchases IOS",sidebar_label:"getPendingPurchasesIOS"},sidebar:"tutorialSidebar",previous:{title:"clearTransactionIOS",permalink:"/docs/api-reference/methods/ios/clear-transaction-ios"},next:{title:"getPromotedProductIOS",permalink:"/docs/api-reference/methods/ios/get-promoted-product-ios"}},d={},l=[{value:"Signature",id:"signature",level:2},{value:"Usage",id:"usage",level:2}],p={toc:l},u="wrapper";function m(e){let{components:t,...n}=e;return(0,a.kt)(u,(0,r.Z)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,a.kt)(i.Z,{mdxType:"AdFitTopFixed"}),(0,a.kt)("h1",{id:"getpendingpurchasesios"},(0,a.kt)("inlineCode",{parentName:"h1"},"getPendingPurchasesIOS")),(0,a.kt)("p",null,"Gets all the transactions which are pending to be finished."),(0,a.kt)("h2",{id:"signature"},"Signature"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-ts"},"getPendingPurchasesIOS(): Promise<Purchase[]>;\n")),(0,a.kt)("h2",{id:"usage"},"Usage"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-tsx"},"import React from 'react';\nimport {Button} from 'react-native';\nimport {getPendingPurchasesIOS} from 'react-native-iap';\n\nconst App = () => {\n  const handlePendingPurchases = async () => await getPendingPurchasesIOS();\n\n  return (\n    <Button title=\"Pending purchases\" onPress={handlePendingPurchases} />\n  )\n}\n")))}m.isMDXComponent=!0}}]);