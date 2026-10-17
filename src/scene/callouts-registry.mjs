// Anchor registry for screen-space callout chips. Scene systems register what can be labelled; the label system
// (labels.mjs) reads it each frame, projects the anchors and de-overlaps the chips. Stored on scene.userData, so
// systems can register in any order without extra wiring.
export function getAnchors(scene) {
  if (!scene.userData.calloutAnchors) scene.userData.calloutAnchors = new Map();
  return scene.userData.calloutAnchors;
}

/**
 * @param {object} scene Three.js scene
 * @param {{id:string, point:()=>{x:number,y:number,z:number}, content:(frame:object)=>(null|{title:string, sub?:string|null, tone?:string, priority?:number, lines?:Array<{text:string,on:boolean}>}), maxDist?:number}} a
 */
export function registerAnchor(scene, a) {
  getAnchors(scene).set(a.id, { maxDist: 900, ...a });
  return a;
}
