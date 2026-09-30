import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import { createQuietIntervals } from '../react-app/app/src/routes/about-game-board/boardQuietIntervals.js';

const out = resolve('output/playwright/about-machine-refinement');
// This machine is a development experiment; production retains its launch gate.
const base = process.env.ABS_BASE_URL || 'http://localhost:8012';
const engine = process.env.ABS_BROWSER || 'chromium';
const browser = await ({ chromium, webkit })[engine].launch({ headless: true,
  ...(engine === 'chromium' ? { args: ['--use-gl=angle', `--use-angle=${process.env.ABS_ABOUT_GPU || 'swiftshader-webgl'}`,
    '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] } : {}) });
const reports = [];
await mkdir(out, { recursive: true });
try {
  const cases = engine === 'chromium'
    ? [['desktop',1440,1000],['mobile',390,844],['narrow',320,740],['landscape',844,390]]
    : [['desktop',1440,1000],['mobile',390,844]];
  for (const [name, width, height] of cases) {
    if (process.env.ABS_CASES && !process.env.ABS_CASES.split(',').includes(name)) continue;
    const context = await browser.newContext({ viewport:{width,height}, deviceScaleFactor:1,
      hasTouch:name!=='desktop', isMobile:name!=='desktop' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/about.html?preview=about`, {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady, null, {timeout:60000});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    const initial = await page.evaluate(() => {
      const root=document.querySelector('.about-board-scrollport'), world=document.querySelector('.about-board-world');
      return { width:world.clientWidth, worldTop:world.offsetTop, worldHeight:world.offsetHeight,
        viewport:root.clientHeight, scrollWidth:root.scrollWidth,
        reader:!document.querySelector('.about-board-reader').classList.contains('is-hidden'),
        overlays:document.querySelectorAll('[data-about-draw-overlay]').length,
        slots:[...world.querySelectorAll('[data-board-text-slot]')].map(n=>({id:n.dataset.boardTextSlot,
          x:n.offsetLeft,top:n.offsetTop,height:n.offsetHeight,width:n.offsetWidth,
          font:getComputedStyle(n).fontSize,opacity:getComputedStyle(n).opacity})),
        stats:window.__ABS_ABOUT_GAME_BOARD__.getStats() };
    });
    await writeFile(resolve(out,`${engine}-${name}-initial.json`),JSON.stringify(initial,null,2));
    assert.equal(initial.reader,false,`${name}: reading intervals must not fall back to detached copy`);
    assert.equal(initial.overlays,0);
    assert.equal(initial.scrollWidth,initial.width);
    assert.equal(initial.slots.length,6);
    assert.deepEqual(initial.stats.textArchitectureOverlaps,[]);
    assert.equal(initial.stats.inventory.conserved,true);
    assert.equal(initial.stats.reservoirSettled,true,`${name}: gravity preparation must settle`);
    assert.equal(initial.stats.inventory.retired,0,`${name}: preparation must retain the full inventory`);
    const editorial = await page.evaluate(() => {
      const grid = document.querySelector('.about-board-disciplines');
      return {
        columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        markers: [...grid.querySelectorAll('[data-discipline]')].map(item => ({
          role: item.dataset.discipline,
          actual: getComputedStyle(item.querySelector('.about-board-discipline-dot')).backgroundColor,
          corner: getComputedStyle(item.querySelector('.about-board-discipline-dot')).cornerShape,
          expected: getComputedStyle(document.documentElement)
            .getPropertyValue(`--simulation-role-${item.dataset.discipline}`).trim(),
        })),
        methods: document.querySelectorAll('.about-board-career dt').length,
        logos: document.querySelectorAll('.about-board-client-logos img').length,
      };
    });
    assert.equal(editorial.columns,width<=760?1:2);
    assert.equal(editorial.markers.length,6);
    assert.equal(editorial.methods,0);
    assert.equal(editorial.logos,15);
    for (const marker of editorial.markers) {
      assert.ok(marker.expected,`${marker.role} must resolve to a shared simulation colour`);
      const rgb = marker.expected.slice(1).match(/../g).map(value => Number.parseInt(value,16));
      assert.equal(marker.actual,`rgb(${rgb.join(', ')})`);
      if (marker.corner) assert.equal(marker.corner,'round','discipline markers must remain circles');
    }
    initial.slots.filter(slot=>slot.id!=='flipper-instruction').forEach(slot=>{
      assert.equal(slot.opacity,'1');
      assert.equal(slot.font,width<=760?'20px':width===1440?'28px':'23px');
      assert.ok(slot.width<=initial.width*.9+1);
    });
    await page.screenshot({path:resolve(out,`${engine}-${name}-entry.png`)});
    if(engine==='chromium' && ['desktop','mobile'].includes(name)) {
      const placement=createQuietIntervals(initial.width,Object.fromEntries(initial.slots.map(n=>[n.id,n.height])));
      const specs=placement.modules.map(({name,sourceTop,selector,top,height})=>({
        name,selector,sourceStart:sourceTop,y:top,height}));
      const capture=await page.evaluate(specs=>{
        const port=document.querySelector('.about-board-scrollport'), world=document.querySelector('.about-board-world');
        const portRect=port.getBoundingClientRect(), svg=document.querySelector('.about-board-art svg');
        const geometry=svg.querySelector('#Geometry'), scale=world.clientWidth/960;
        const measure=n=>{const r=n.getBoundingClientRect();return {x:r.x-portRect.x,y:r.y-portRect.y+port.scrollTop,width:r.width,height:r.height};};
        const text=n=>{const style=getComputedStyle(n);return {...measure(n),text:n.innerText,
          tag:n.tagName,fontFamily:style.fontFamily,fontSize:parseFloat(style.fontSize),fontWeight:style.fontWeight,
          lineHeight:parseFloat(style.lineHeight),letterSpacing:parseFloat(style.letterSpacing)||0,
          color:style.color,align:style.textAlign,case:style.textTransform};};
        const slots=[document.querySelector('.about-board-intro__copy'),...world.querySelectorAll('[data-board-text-slot]')]
          .map(n=>({id:n.dataset.boardTextSlot||'introduction',...measure(n),
            text:[...n.querySelectorAll('h1,h2,h3 > span:last-child,p,small,dt,dd')].map(text),
            items:[...n.querySelectorAll('[data-discipline]')].map(item=>({id:item.dataset.discipline,
              ...measure(item),label:text(item.querySelector('h3 > span:last-child')),
              description:text(item.querySelector('p')),
              dot:{...measure(item.querySelector('.about-board-discipline-dot')),
                color:getComputedStyle(item.querySelector('.about-board-discipline-dot')).backgroundColor}})),
            methods:[...n.querySelectorAll('.about-board-career > div')].map(item=>({
              ...measure(item),label:text(item.querySelector('dt')),description:text(item.querySelector('dd'))}))}));
        const outputModules=specs.map(spec=>{
          const root=document.createElementNS('http://www.w3.org/2000/svg','svg');
          root.setAttribute('xmlns','http://www.w3.org/2000/svg');
          root.setAttribute('width',world.clientWidth);root.setAttribute('height',spec.height*scale);
          root.setAttribute('viewBox',`0 ${spec.y} 960 ${spec.height}`);
          for(const node of geometry.querySelectorAll(spec.selector)) {
            const clone=node.cloneNode(true), nodes=[node,...node.querySelectorAll('*')], clones=[clone,...clone.querySelectorAll('*')];
            nodes.forEach((original,index)=>{
              if(!(original instanceof SVGElement))return;
              const style=getComputedStyle(original), target=clones[index];
              for(const key of ['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','fill-rule'])
                target.setAttribute(key,style.getPropertyValue(key));
              target.removeAttribute('class');target.removeAttribute('style');
            });
            const matrix=geometry.getCTM().inverse().multiply(node.getCTM());
            clone.setAttribute('transform',`matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`);
            root.append(clone);
          }
          return {...spec,x:0,y:world.offsetTop+(spec.y-window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY)*scale,
            width:world.clientWidth,height:spec.height*scale,svg:new XMLSerializer().serializeToString(root)};
        });
        const ballHeight=(1170-window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY)*scale;
        const crop=document.createElement('canvas');crop.width=world.clientWidth;crop.height=Math.ceil(ballHeight);
        const context=crop.getContext('2d'), origin=window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY;
        for(const ball of window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot()) {
          if(!ball.id.startsWith('pit-'))continue;
          context.fillStyle=ball.colour;context.beginPath();
          context.arc(ball.x*scale,(ball.y-origin)*scale,ball.radius*scale,0,Math.PI*2);context.fill();
        }
        return {width:world.clientWidth,height:world.offsetTop+world.offsetHeight,
          surface:getComputedStyle(document.querySelector('.about-game-board')).backgroundColor,
          slots,modules:outputModules,logos:[...world.querySelectorAll('.about-board-client-logos img')].map(n=>({...measure(n),id:n.closest('li').dataset.clientId,src:n.src})),
          cue:text(document.querySelector('.about-board-entry-cue')),
          balls:{x:0,y:world.offsetTop,width:world.clientWidth,height:ballHeight,data:crop.toDataURL()}};
      },specs);
      await writeFile(resolve(out,`${name}-balls.png`),Buffer.from(capture.balls.data.split(',')[1],'base64'));
      delete capture.balls.data;
      await writeFile(resolve(out,`${name}-figma.json`),JSON.stringify(capture));
    }
    const flow=[];
    for(const slot of initial.slots) {
      await page.evaluate(y=>{document.querySelector('.about-board-scrollport').scrollTop=y;},initial.worldTop+slot.top-100);
      await page.waitForTimeout(100);
      await page.waitForFunction(() => {
        const s=window.__ABS_ABOUT_GAME_BOARD__.getStats();
        return Math.abs(s.scrollTop-s.handledScrollTop)<1;
      }, null, {timeout:3000});
      const sample=await page.evaluate(id=>{
        const n=document.querySelector(`[data-board-text-slot="${id}"]`),s=window.__ABS_ABOUT_GAME_BOARD__.getStats();
        return {id,opacity:getComputedStyle(n).opacity,inventory:s.inventory,
          gate:s.gateProgress,meter:s.meterProgress,scroll:s.scrollTop,handled:s.handledScrollTop};
      },slot.id);
      assert.equal(sample.opacity,'1');assert.equal(sample.inventory.conserved,true);
      assert.ok(Math.abs(sample.scroll-sample.handled)<1);
      flow.push(sample);
      if(['garden-ideas','disciplines','practice','making','working-together','final-statement'].includes(slot.id))
        await page.screenshot({path:resolve(out,`${engine}-${name}-${slot.id}.png`)});
    }
    await page.evaluate(()=>{const s=document.querySelector('.about-board-scrollport');s.scrollTop=s.scrollHeight;});
    await page.waitForFunction(()=>window.__ABS_ABOUT_GAME_BOARD__?.getStats().lifecycle.machineSuspended);
    await page.waitForTimeout(700);
    await page.screenshot({path:resolve(out,`${engine}-${name}-ending.png`)});
    const ending=await page.evaluate(()=>{const s=window.__ABS_ABOUT_GAME_BOARD__.getStats();return {error:s.authoredEndingError,lifecycle:s.lifecycle,inventory:s.inventory};});
    assert.equal(ending.error,null);
    await page.evaluate(()=>{document.querySelector('.about-board-scrollport').scrollTop=0;});
    await page.waitForFunction(()=>!window.__ABS_ABOUT_GAME_BOARD__?.getStats().lifecycle.machineSuspended);
    await page.waitForTimeout(200);
    const restored=await page.evaluate(()=>window.__ABS_ABOUT_GAME_BOARD__.getStats());
    assert.equal(restored.gateProgress,0);assert.equal(restored.inventory.conserved,true);
    // A theme change must not bring back low-opacity or clipped copy.
    await page.evaluate(async()=>{
      const button=document.querySelector('[aria-label*="dark" i], [aria-label*="light" i]');
      if(!button) throw new Error('Theme control not found');
      button.click();
    });
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.absTheme),'dark');
    await page.screenshot({path:resolve(out,`${engine}-${name}-theme-entry.png`)});
    assert.deepEqual(errors,[]);
    reports.push({name,width,height,slots:initial.slots,editorial,flow,ending,restored:restored.inventory,errors});
    console.log(`PASS ${engine}-${name}: reading layout, theme, reverse scroll and lifecycle.`);
    await context.close();
  }
  await writeFile(resolve(out,`${engine}-audit.json`),JSON.stringify(reports,null,2));
  console.log(`PASS: ${engine} Reading rhythm, ${reports.length} viewports, all passages, forward/reverse valves and 2D/3D lifecycle.`);
} finally {await browser.close();}
