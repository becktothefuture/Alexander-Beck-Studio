import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { launchAboutAuditBrowser } from './audit-about-narrative-surfel-v2-helpers.mjs';
import { compileAboutNarrativeJourneyMap, resolveAboutNarrativeJourneyMap } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeJourneyMap.js';
import { measureCameraGatePassage } from './about-v2-blender/camera-gate-metrics.mjs';

const output = new URL(`${resolve(process.env.ABS_READING_OUTPUT || 'output/playwright/about-reading-clearance')}/`, 'file:');
await mkdir(fileURLToPath(output), { recursive: true });
const assets = new URL('../react-app/app/public/models/about-v2-edited-world/', import.meta.url);
const track = JSON.parse(await readFile(new URL('camera-track.json', assets)));
const sourceHash = JSON.parse(await readFile(new URL('meta.json', assets))).source.sha256;
const profiles = [
  ['desktop',1440,1000,1], ['mobile',390,844,1], ['narrow',320,740,1],
  ['short',390,600,1], ['wide',1920,1080,1],
  ['desktop-200-reflow',720,500,2], ['wide-200-reflow',960,540,2],
];
const groups = [
  ['biography','[data-text-field-id="text-background-unit"]'],
  ['career','[data-text-field-id="text-background-unit"] .about-narrative-career-sequence'],
  ['thesis','[data-text-field-id="text-complexity-curiosity"]'],
  ['listening','[data-text-field-id="text-complexity-listen"]'],
  ['disciplines','[data-text-field-id="text-discipline-labels"]'],
  ['clients','[data-text-field-id="text-disciplines-title"]'],
  ['method','[data-text-field-id="text-life-character"]'],
];
const titles=['text-complexity-idea','text-complexity-conditions','text-life-momentum'];

function installProbe() {
  const opacity = (element) => {
    let alpha=1;
    for(let node=element; node instanceof HTMLElement;node=node.parentElement){
      const style=getComputedStyle(node);
      if(style.display==='none'||style.visibility==='hidden')return 0;
      alpha*=parseFloat(style.opacity);
    }
    return alpha;
  };
  const imageRects = (image) => {
    if(!image.complete||!image.naturalWidth)return [];
    const canvas=document.createElement('canvas');
    canvas.width=Math.min(640,image.naturalWidth);
    canvas.height=Math.max(1,Math.round(canvas.width*image.naturalHeight/image.naturalWidth));
    const context=canvas.getContext('2d');context.drawImage(image,0,0,canvas.width,canvas.height);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
    let x0=canvas.width,y0=canvas.height,x1=0,y1=0;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>32){x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);}
    const box=image.getBoundingClientRect(), w=image.clientWidth,h=image.clientHeight;
    const fit=Math.min(w/image.naturalWidth,h/image.naturalHeight);
    const fw=image.naturalWidth*fit,fh=image.naturalHeight*fit;
    return [{left:box.left+((w-fw)/2+x0/canvas.width*fw)*box.width/w,right:box.left+((w-fw)/2+x1/canvas.width*fw)*box.width/w,
      top:box.top+((h-fh)/2+y0/canvas.height*fh)*box.height/h,bottom:box.top+((h-fh)/2+y1/canvas.height*fh)*box.height/h,text:image.alt,element:image}];
  };
  window.__readingProbe=(selector, includeHiddenGeometry=false)=>{
    const root=document.querySelector(selector), port=document.querySelector('.about-narrative-scrollport');
    if(!root||!port)return null;
    const portBox=port.getBoundingClientRect(),H=port.clientHeight,scrollWU=port.scrollTop/H;
    const field=root.closest('[data-text-field-id]')||root.querySelector('[data-text-field-id]');
    const fieldBox=field?.getBoundingClientRect(),fs=field?getComputedStyle(field):null;
    const editorial=!!root.closest('.about-narrative-render-span--editorial');
    const feather=editorial?(parseFloat(fs.getPropertyValue('--reading-stage-feather'))||0):0;
    let clipTop=portBox.top,clipBottom=portBox.bottom;
    if(editorial&&fs.clipPath!=='none'){
      clipTop=Math.max(clipTop,fieldBox.top+(parseFloat(fs.getPropertyValue('--reading-stage-clip-top'))||0));
      clipBottom=Math.min(clipBottom,fieldBox.bottom-(parseFloat(fs.getPropertyValue('--reading-stage-clip-bottom'))||0));
    }
    const raw=[];
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const node=walker.currentNode,parent=node.parentElement;
      if(!node.textContent.trim()||parent.closest('.about-narrative-editorial-lines__measure,[hidden],.about-narrative-visually-hidden'))continue;
      const style=getComputedStyle(parent);
      if(style.display==='none'||style.visibility==='hidden')continue;
      const range=document.createRange();range.selectNodeContents(node);
      for(const rect of range.getClientRects())if(rect.width>0&&rect.height>0)raw.push({left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,text:node.textContent.trim(),element:parent});
    }
    for(const image of root.querySelectorAll('img:not([hidden])'))raw.push(...imageRects(image));
    const records=raw.map(r=>{
      const alpha=opacity(r.element),top=Math.max(r.top,clipTop),bottom=Math.min(r.bottom,clipBottom);
      const maximumFeatherAlpha=feather>0?Math.min(1,Math.max(0,(bottom-portBox.top)/feather),Math.max(0,(portBox.bottom-top)/feather)):1;
      return {text:r.text,topWU:(r.top-portBox.top)/H+scrollWU,bottomWU:(r.bottom-portBox.top)/H+scrollWU,
        left:r.left,right:r.right,top:r.top,bottom:r.bottom,opacity:alpha,visible:bottom>top&&r.right>portBox.left&&r.left<portBox.right&&alpha*maximumFeatherAlpha>0.05,
        effectiveMaximumAlpha:alpha*maximumFeatherAlpha,fullyUnfeathered:r.top>=portBox.top+feather&&r.bottom<=portBox.bottom-feather};
    });
    return {scrollWU,H,port:{left:portBox.left,top:portBox.top,right:portBox.right,bottom:portBox.bottom},feather,clip:{top:clipTop,bottom:clipBottom},
      records:includeHiddenGeometry?records:records.filter(r=>r.visible)};
  };
}

const browser=await launchAboutAuditBrowser(process.env.ABS_BROWSER || 'chromium');
const reports=[];
try{
  for(const [id,width,height,dpr] of profiles){
    if(process.env.ABS_READING_PROFILES&&!process.env.ABS_READING_PROFILES.split(',').includes(id))continue;
    console.log(`Starting ${id}`);
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,colorScheme:'light',hasTouch:width<500});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${process.env.ABS_BASE_URL || 'http://localhost:8012'}/about.html?preview=about&edit=0`,{waitUntil:'domcontentloaded'});
    if(process.env.ABS_ABOUT_CANDIDATE_STYLE)await page.addStyleTag({path:resolve(process.env.ABS_ABOUT_CANDIDATE_STYLE)});
    await page.waitForFunction(()=>window.__aboutNarrativeRuntime?.getMetrics().state==='ready',null,{timeout:60000});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState==='complete',null,{timeout:60000});
    await page.waitForTimeout(800);
    await page.evaluate(installProbe);
    const state=await page.evaluate(()=>{
      const port=document.querySelector('.about-narrative-scrollport');
      const fields=[...document.querySelectorAll('[data-render-span-id]')].map(node=>({id:node.querySelector('[data-text-field-id]').dataset.textFieldId,startWU:+node.dataset.storyStartWu,focusWU:+node.dataset.storyFocusWu,endWU:+node.dataset.storyEndWu}));
      const metrics=window.__aboutNarrativeRuntime.getMetrics();
      const cover=document.querySelector('.viewport-cover');
      return {fields,durationWU:fields.at(-1).endWU,viewport:{innerWidth,innerHeight,dpr:devicePixelRatio,scrollportHeight:port.clientHeight},viewportCover:cover?{mode:cover.dataset.viewportMode,text:cover.innerText}:null,layoutProfile:document.querySelector('.about-narrative-lab').dataset.aboutLayoutProfile,sourceHash:metrics.assetSourceHash,errors:metrics.error};
    });
    if(state.sourceHash!==sourceHash)throw Error('Canonical source changed during reading probe.');
    const setWU=async(wu,settle=40)=>{
      await page.evaluate(value=>{
        const p=document.querySelector('.about-narrative-scrollport');p.scrollTop=value*p.clientHeight;
      },wu);
      await page.waitForTimeout(settle);
    };
    const report={id,mode:id.includes('200')?'200% equivalent CSS reflow; half CSS viewport, DPR2; not native menu zoom':'native CSS viewport',...state,groups:{},titles:{},errors};
    report.visibleReadingSupported=!state.viewportCover;
    report.intervalEvidence=state.viewportCover?'Underlying DOM only; covered by viewport guard. Exclude from visible passage constraints.':'DOM Range geometry, computed opacity/clip and boundary probes; not glyph-pixel segmentation.';
    for(const [name,selector] of groups){
      console.log(`${id}: ${name}`);
      const fieldId=selector.match(/data-text-field-id="([^"]+)"/)[1];
      const field=state.fields.find(f=>f.id===fieldId);
      await setWU(field.focusWU,100);
      const measure=await page.evaluate(selector=>window.__readingProbe(selector,true),selector);
      const records=measure.records.filter(r=>r.opacity>0.05);
      if(!records.length){report.groups[name]={error:'No painted ranges at focus',measure};continue;}
      const first=records.reduce((a,b)=>a.topWU<b.topWU?a:b),last=records.reduce((a,b)=>a.bottomWU>b.bottomWU?a:b);
      let start=first.topWU-1+.05*measure.feather/measure.H;
      const end=last.bottomWU-.05*measure.feather/measure.H;
      const boundary=[];
      for(const [label,wu] of [['before-entry',start-.005],['after-entry',start+.005],['before-exit',end-.005],['after-exit',end+.005]]){
        await setWU(wu,80);
        const observed=await page.evaluate(selector=>window.__readingProbe(selector),selector);
        boundary.push({label,requestedWU:wu,actualWU:observed.scrollWU,count:observed.records.length,first:observed.records[0]?.text,last:observed.records.at(-1)?.text});
      }
      if(boundary[1].count===0){
        let low=start-.01,high=start+.4;
        await setWU(high,100);
        if((await page.evaluate(selector=>window.__readingProbe(selector),selector)).records.length){
          for(let i=0;i<12;i++){
            const mid=(low+high)/2;await setWU(mid,100);
            if((await page.evaluate(selector=>window.__readingProbe(selector),selector)).records.length)high=mid;else low=mid;
          }
          start=high;
          for(const [index,wu] of [[0,start-.005],[1,start+.005]]){
            await setWU(wu,100);const observed=await page.evaluate(selector=>window.__readingProbe(selector),selector);
            boundary[index]={label:index?'after-entry':'before-entry',requestedWU:wu,actualWU:observed.scrollWU,count:observed.records.length,first:observed.records[0]?.text,last:observed.records.at(-1)?.text};
          }
        }
      }
      report.groups[name]={intervalWU:[start,end],normalized:[start/state.durationWU,end/state.durationWU],firstText:first.text,lastText:last.text,rangeCount:records.length,
        measuredAtWU:measure.scrollWU,featherPx:measure.feather,boundary,
        ranges:records.map(r=>({text:r.text,startWU:r.topWU-1+.05*measure.feather/measure.H,endWU:r.bottomWU-.05*measure.feather/measure.H,opacity:r.opacity}))};
    }
    for(const fieldId of titles){
      const field=state.fields.find(f=>f.id===fieldId),observations=[];
      for(const [label,wu] of [['before-entry',field.startWU-.005],['after-entry',field.startWU+.005],['focus',field.focusWU],['before-exit',field.endWU-.005],['after-exit',field.endWU+.005]]){
        await setWU(wu,600);
        const observed=await page.evaluate(selector=>window.__readingProbe(selector),`[data-text-field-id="${fieldId}"] h2`);
        observations.push({label,requestedWU:wu,actualWU:observed.scrollWU,count:observed.records.length,text:observed.records.map(r=>r.text).join(''),bounds:observed.records.length?{top:Math.min(...observed.records.map(r=>r.top)),bottom:Math.max(...observed.records.map(r=>r.bottom))}:null});
      }
      report.titles[fieldId]={intervalWU:[field.startWU,field.endWU],normalized:[field.startWU/state.durationWU,field.endWU/state.durationWU],uncertaintyWU:.005,observations};
    }
    const lastTitle=report.titles['text-complexity-conditions'];
    report.emptyPassages={round:{intervalWU:[lastTitle.intervalWU[1],report.groups.biography.intervalWU[0]]},gate:{intervalWU:[report.groups.clients.intervalWU[1],report.titles['text-life-momentum'].intervalWU[0]]}};
    for(const passage of Object.values(report.emptyPassages)){passage.normalized=passage.intervalWU.map(wu=>wu/state.durationWU);passage.lengthWU=passage.intervalWU[1]-passage.intervalWU[0];}
    const map=resolveAboutNarrativeJourneyMap(compileAboutNarrativeJourneyMap(state),track);
    const crossing=measureCameraGatePassage(track);
    report.physical={pathLengthWU:map.pathLengthWU,anchors:map.anchors.filter(a=>['portal-entry','portal-exit','gate-entry','gate-exit','gate-release'].includes(a.id)),firstGateFrontDistanceWU:crossing.gates[0].intersections[0][0].distanceWU,lastGateBackDistanceWU:Math.max(...crossing.gates.at(-1).intersections.flat().map(c=>c.distanceWU))};
    const anchor = id => map.anchors.find(item => item.id === id).cameraStoryWU;
    report.clearanceWU = {
      roundEntry: anchor('portal-entry') - 0.18 - report.emptyPassages.round.intervalWU[0],
      roundExit: report.emptyPassages.round.intervalWU[1] - anchor('portal-exit') - 0.18,
      gateEntry: anchor('gate-entry') - 0.55 - report.emptyPassages.gate.intervalWU[0],
      gateExit: report.emptyPassages.gate.intervalWU[1] - anchor('gate-exit') - 0.18,
    };
    assert.equal(report.visibleReadingSupported, true, `${id}: the viewport cover blocks reading.`);
    assert.deepEqual(errors, []);
    for (const [name, group] of Object.entries(report.groups)) {
      assert.ok(group.rangeCount > 0, `${id}: ${name} has no measured painted text.`);
      assert.ok(group.boundary.find(item => item.label === 'after-entry').count > 0,
        `${id}: ${name} did not paint at its measured entry.`);
    }
    await writeFile(new URL(`${id}-clearance.json`, output), JSON.stringify(report.clearanceWU, null, 2));
    for (const [boundary, clearance] of Object.entries(report.clearanceWU))
      assert.ok(clearance >= 0, `${id}: ${boundary} overlaps reading by ${-clearance} WU.`);
    await setWU(state.fields.find(f=>f.id==='text-life-character').focusWU,600);
    await page.screenshot({path:fileURLToPath(new URL(`${id}-method.png`,output)),timeout:10000});
    await writeFile(new URL(`${id}.json`,output),JSON.stringify(report,null,2)+'\n');
    reports.push(report);
    await writeFile(new URL('summary.json',output),JSON.stringify(reports.map(({groups,titles,...r})=>({...r,groups:Object.fromEntries(Object.entries(groups).map(([k,{ranges,...v}])=>[k,v])),titles})),null,2)+'\n');
    console.log(JSON.stringify({id,duration:state.durationWU,emptyPassages:report.emptyPassages,painted:{biography:report.groups.biography.intervalWU,career:report.groups.career.intervalWU,clients:report.groups.clients.intervalWU,method:report.groups.method.intervalWU}}));
    await context.close();
  }
} finally {await browser.close();}
