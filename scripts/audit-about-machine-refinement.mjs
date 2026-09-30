import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createQuietIntervals } from '../react-app/app/src/routes/about-game-board/boardQuietIntervals.js';

const out = resolve('output/playwright/about-machine-refinement');
const base = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browser = await chromium.launch({ headless: true, args: [
  `--use-angle=${process.env.ABS_ABOUT_GPU || 'swiftshader'}`, '--enable-unsafe-swiftshader',
] });
const reports = [];
try {
  for (const [name, width, height] of [['desktop',1440,1000],['mobile',390,844]]) {
    const exported = JSON.parse(await readFile(resolve(out, `${name}-figma.json`)));
    const placement = createQuietIntervals(exported.width,
      Object.fromEntries(exported.slots.map(slot => [slot.id, slot.height])));
    const page = await browser.newPage({viewport:{width,height},hasTouch:name==='mobile'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/about.html?grid=1`);
    await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady, null, {timeout:60000});
    const structure = await page.evaluate(() => ({
      rotors:document.querySelectorAll('[id^="geometry-propeller-"]').length,
      pinball:document.querySelectorAll('#geometry-pinball-playfield circle').length,
      seesaws:document.querySelectorAll('[id^="geometry-impact-seesaw-"]').length,
      lowerBumpers:document.querySelectorAll('[id^="geometry-pinball-bumper-mid-"]').length,
      ramps:document.querySelectorAll('[id^="direction-ramp-"]').length,
      grid:document.querySelectorAll('.about-board-grid-guide > span').length,
      removed:['Vector_164','Vector_165','Vector_154','Vector_155','geometry-fixture-0002','geometry-fixture-0003']
        .filter(id => document.getElementById(id)),
      finalCopy:document.querySelector('[data-board-text-slot="final-statement"] p').textContent,
      stats:window.__ABS_ABOUT_GAME_BOARD__.getStats(),
    }));
    assert.equal(structure.rotors,3); assert.equal(structure.pinball,9);
    assert.equal(structure.seesaws,8); assert.equal(structure.lowerBumpers,0);
    assert.equal(structure.ramps,6); assert.equal(structure.grid,12);
    assert.deepEqual(structure.removed,[]); assert.ok(structure.finalCopy.length>100);
    assert.equal(structure.stats.reservoirSettled,true);
    await page.screenshot({path:resolve(out,`${name}-grid.png`)});
    const scrollTo = async sourceY => {
      await page.evaluate(y => {
        const port=document.querySelector('.about-board-scrollport'),world=document.querySelector('.about-board-world');
        const top=window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY;
        port.scrollTop=world.offsetTop+(y-top)*world.clientWidth/960-port.clientHeight/2;
      }, placement.placeY(sourceY));
      await page.waitForFunction(() => {
        const s=window.__ABS_ABOUT_GAME_BOARD__.getStats();
        const actual=document.querySelector('.about-board-scrollport').scrollTop;
        return Math.abs(actual-s.handledScrollTop)<1;
      });
    };
    for (const [label,y] of [['garden',1700],['rotors',2850],['pinball',3550],['drums',7070],['impact',8350],['ramps',9620]]) {
      await scrollTo(y);
      if(label==='rotors') {
        const transforms=()=>page.locator('[id^="geometry-propeller-"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('transform')));
        const before=await transforms();
        await page.waitForFunction(previous => [...document.querySelectorAll('[id^="geometry-propeller-"]')]
          .every((node,index)=>node.getAttribute('transform')!==previous[index]), before, {timeout:5000});
      }
      await page.screenshot({path:resolve(out,`${name}-${label}.png`)});
    }
    await page.locator('[data-board-text-slot="practice"]').evaluate(element => {
      const port=document.querySelector('.about-board-scrollport');
      port.scrollTop+=element.getBoundingClientRect().top-port.getBoundingClientRect().top-port.clientHeight*.2;
    });
    await page.waitForFunction(()=>window.__ABS_ABOUT_GAME_BOARD__.getStats().meterProgress===1);
    await page.screenshot({path:resolve(out,`${name}-practice.png`)});
    for(const y of [1124,5100,7950,1124,9800,3550]) await scrollTo(y);
    const end=await page.evaluate(()=>window.__ABS_ABOUT_GAME_BOARD__.getStats());
    assert.equal(end.inventory.conserved,true);
    assert.ok(end.furthestY>placement.placeY(1124));
    assert.deepEqual(errors,[]);
    reports.push({name,structure,inventory:end.inventory,furthestY:end.furthestY,errors});
    await page.close();
  }
  await writeFile(resolve(out,'machine-interactions.json'),JSON.stringify(reports,null,2));
  console.log('PASS: 3 rotors, 9 pinball bumpers, 8 seesaws, 6 alternating ramps, 12-column grid, restored copy, forward/reverse valve traversal and conserved inventory.');
} finally {await browser.close();}
