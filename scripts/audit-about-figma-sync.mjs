import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import { PNG } from 'pngjs';
import { createQuietIntervals } from '../react-app/app/src/routes/about-game-board/boardQuietIntervals.js';

// Native Figma 81:3 / 81:937, read 2026-09-29. Y includes section padding.
const reference = {
  desktop: { intro: 633.09375, width: 1412, slots: {
    'garden-ideas': [2572.1425, 35], disciplines: [3810.2512, 808.5],
    practice: [6685.2637, 504], making: [10110.3057, 84],
    'working-together': [11718.0557, 673.5284], 'final-statement': [14341.875, 210],
  } },
  mobile: { intro: 481.296875, width: 370, slots: {
    'garden-ideas': [1370.8351, 50], disciplines: [1827.6885, 1115],
    practice: [3575.7888, 570], making: [5002.8105, 60],
    'working-together': [5553.6855, 896.34], 'final-statement': [7052.6714, 240],
  } },
};
const engine = process.env.ABS_BROWSER || 'chromium';
const out = resolve('output/playwright/about-figma-sync');
await mkdir(out, { recursive: true });
const browser = await ({ chromium, webkit })[engine].launch({headless: true,
  ...(engine === 'chromium' ? {args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']} : {})});
const reports=[];
try {
  for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844],['narrow',320,740]]) {
    if(process.env.ABS_CASES && !process.env.ABS_CASES.split(',').includes(name)) continue;
    const page=await browser.newPage({viewport:{width,height},hasTouch:width<760,isMobile:width<760,deviceScaleFactor:1,colorScheme:'light'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const report={name,engine,errors};reports.push(report);
    try {
      await page.goto('http://localhost:8012/about.html');
      await page.waitForFunction(()=>window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady,null,{timeout:60000});
      await page.evaluate(()=>document.fonts.ready);
      const measure=()=>page.evaluate(()=>{
        const port=document.querySelector('.about-board-scrollport'),world=document.querySelector('.about-board-world');
        const root=port.getBoundingClientRect();
        const box=e=>{const r=e.getBoundingClientRect();return{x:r.x-root.x,y:r.y-root.y+port.scrollTop,w:r.width,h:r.height}};
        return {width:world.clientWidth,intro:box(document.querySelector('.about-board-intro')),world:box(world),
          viewport:port.clientHeight,scrollWidth:port.scrollWidth,
          reader:!document.querySelector('.about-board-reader').classList.contains('is-hidden'),
          slots:[...world.querySelectorAll('[data-board-text-slot]')].map(e=>({id:e.dataset.boardTextSlot,...box(e),
            font:getComputedStyle(e).fontSize,leading:getComputedStyle(e).lineHeight,opacity:getComputedStyle(e).opacity})),
          geometry:{upper:document.querySelectorAll('[id^="geometry-bumper-00"]').length,
            lower:document.querySelectorAll('[id^="geometry-bumper-lower-"]').length,
            rotors:document.querySelectorAll('[id^="geometry-propeller-"]').length,
            pinball:document.querySelectorAll('#geometry-pinball-playfield circle').length,
            seesaws:document.querySelectorAll('[id^="geometry-impact-seesaw-"]').length,
            ramps:document.querySelectorAll('[id^="direction-ramp-"]').length,
            removed:document.querySelectorAll('#Vector_164,#Vector_165,[id^="geometry-pinball-bumper-mid-"]').length},
          logoColumns:getComputedStyle(document.querySelector('.about-board-client-logos')).gridTemplateColumns.split(' ').length,
          stats:window.__ABS_ABOUT_GAME_BOARD__.getStats()};
      });
      report.initial=await measure();
      const initial=report.initial;
      assert.equal(initial.reader,false);
      assert.equal(initial.width,initial.scrollWidth);
      assert.deepEqual(initial.geometry,{upper:45,lower:36,rotors:3,pinball:9,seesaws:8,ramps:6,removed:0});
      assert.equal(initial.slots.length,6);
      assert.equal(initial.logoColumns,width<760?2:4);
      assert.equal(initial.stats.reservoirSettled,true);
      assert.equal(initial.stats.inventory.conserved,true);
      assert.deepEqual(initial.stats.textArchitectureOverlaps,[]);
      const ref=reference[name];
      if(ref) {
        assert.equal(initial.width,ref.width);
        assert.ok(Math.abs(initial.intro.h-ref.intro)<1.5,`${name}: introduction height`);
        for(const slot of initial.slots) {
          const [y,h]=ref.slots[slot.id];
          assert.ok(Math.abs(slot.y-y)<2,`${name} ${slot.id} top: ${slot.y} vs ${y}`);
          assert.ok(Math.abs(slot.h-h)<1,`${name} ${slot.id} height: ${slot.h} vs ${h}`);
          assert.equal(slot.font,name==='mobile'?'20px':'28px');
          assert.equal(slot.leading,name==='mobile'?'30px':'42px');
          assert.equal(slot.opacity,'1');
        }
      }
      const setScroll=async y=>{
        await page.locator('.about-board-scrollport').evaluate((port,y)=>{port.scrollTop=y;},y);
        await page.waitForFunction(()=>Math.abs(document.querySelector('.about-board-scrollport').scrollTop
          -window.__ABS_ABOUT_GAME_BOARD__.getStats().handledScrollTop)<1);
      };
      await page.screenshot({path:resolve(out,`${engine}-${name}-entry.png`)});
      for(const slot of initial.slots) {
        await setScroll(slot.y-Math.min(100,initial.viewport*.15));
        await page.screenshot({path:resolve(out,`${engine}-${name}-${slot.id}.png`)});
      }
      const placement=createQuietIntervals(initial.width,Object.fromEntries(initial.slots.map(s=>[s.id,s.h])));
      for(const index of [3,4,6,7,8]) {
        const module=placement.modules[index];
        await setScroll(initial.world.y+(module.top-initial.stats.reservoir.topY)*initial.width/960);
        await page.screenshot({path:resolve(out,`${engine}-${name}-machine-${index+1}.png`)});
      }
      // A stationary rotor must continue moving; a valve must retrace scroll.
      const rotors=placement.modules[3];
      await setScroll(initial.world.y+(rotors.top-initial.stats.reservoir.topY)*initial.width/960);
      const prior=await page.locator('#geometry-propeller-0002').getAttribute('transform');
      await page.waitForFunction(prior=>document.querySelector('#geometry-propeller-0002').getAttribute('transform')!==prior,prior);
      await setScroll(initial.world.y+(1124-initial.stats.reservoir.topY)*initial.width/960-initial.viewport*.3);
      await page.waitForFunction(()=>window.__ABS_ABOUT_GAME_BOARD__.getStats().gateProgress===1);
      await setScroll(0);
      await page.waitForFunction(()=>window.__ABS_ABOUT_GAME_BOARD__.getStats().gateProgress===0);
      report.reverse=await page.evaluate(()=>window.__ABS_ABOUT_GAME_BOARD__.getStats());
      assert.equal(report.reverse.inventory.conserved,true);
      // Stitch the complete 2D page from actual viewport paints, including
      // canvas balls and bounded SVG strips, not an unrendered fullPage capture.
      if(name!=='narrow' && engine==='chromium') {
        const end=Math.ceil(initial.world.y+initial.world.h);
        const canvas=new PNG({width:initial.width,height:end});
        const clip=await page.locator('.about-board-scrollport').evaluate(e=>{
          const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};});
        for(let y=0;y<end;y+=Math.floor(clip.height)) {
          await setScroll(y);
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          const piece=PNG.sync.read(await page.screenshot({clip}));
          PNG.bitblt(piece,canvas,0,0,Math.min(piece.width,canvas.width),Math.min(piece.height,end-y),0,y);
        }
        await writeFile(resolve(out,`${name}-full-2d.png`),PNG.sync.write(canvas));
      }
      // The 3D world is unchanged, but moving its entry must preserve lifecycle.
      await setScroll(initial.world.y+initial.world.h+initial.viewport*2.5);
      await page.waitForFunction(()=>window.__ABS_ABOUT_GAME_BOARD__.getStats().lifecycle.machineSuspended,null,{timeout:30000});
      report.spatial=await page.evaluate(()=>window.__ABS_ABOUT_GAME_BOARD__.getStats().lifecycle);
      await setScroll(0);
      await page.waitForFunction(()=>!window.__ABS_ABOUT_GAME_BOARD__.getStats().lifecycle.machineSuspended);
      const toggle=page.getByRole('button',{name:'Switch to dark mode',exact:true});
      await toggle.press('Space');
      await page.waitForFunction(()=>document.documentElement.dataset.absTheme==='dark');
      const experience=initial.slots.find(s=>s.id==='working-together');
      await setScroll(experience.y-60);
      await page.screenshot({path:resolve(out,`${engine}-${name}-dark.png`)});
      assert.deepEqual(errors,[]);
      report.passed=true;
      console.log(`PASS ${engine} ${name}: Figma layout, machine counts, scroll reversal, theme and 3D lifecycle`);
    } catch(error) {
      report.passed=false;report.failure=error.message;process.exitCode=1;
      await page.screenshot({path:resolve(out,`${engine}-${name}-failure.png`)});
      console.error(`FAIL ${engine} ${name}: ${error.message}`);
    } finally {await page.close();}
  }
} finally {
  await browser.close();
  await writeFile(resolve(out,`${engine}-report.json`),JSON.stringify(reports,null,2));
}
