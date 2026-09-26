const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { baseURL, newTestContext } = require('./browser-context.cjs');
const KEY = 'uchebnik:pchelko-1959:pages-001-010:v1';
(async () => {
  const { pages } = await import('../src/content/book.ts');
  const browser = await chromium.launch({ headless: true });
  const report = { passed: false, checks: [], errors: [] };
  try {
    for (const viewport of [{width:390,height:844},{width:800,height:375}]) {
      const ctx = await newTestContext(browser, {viewport, hasTouch:true});
      const p = await ctx.newPage();
      p.on('pageerror', e=>report.errors.push(e.message));
      for (const id of ['p007-block07','p008-block08','p010-block06']) {
        const page = pages.find(p=>p.blocks.some(b=>b.id===id));
        const block = page.blocks.findIndex(b=>b.id===id), b=page.blocks[block];
        await p.goto(baseURL+'/metadata.json');
        await p.evaluate(({KEY,page,block,id})=>localStorage.setItem(KEY,JSON.stringify({version:1,contentRevision:3,page,block,answers:{[id]:{value:['card-1'],checked:true}}})), {KEY,page:page.number,block,id});
        await p.goto(baseURL);
        await p.getByRole('button',{name:/^(Продолжить занятие|Начать заниматься)/}).click();
        await p.getByTestId('number-meaning').waitFor();
        const card = label=>p.getByRole('button',{name:label,exact:true});
        // The old numeral-only completion must not skip the new exploration.
        assert.equal(await p.getByText('✓ Верно!',{exact:false}).count(),0);
        await card(b.targets.at(-1).label).tap();
        assert.equal(await p.getByText('✓ Верно!',{exact:false}).count(),0);
        for (const t of b.targets) {
          await card(t.label).tap();
          await p.getByTestId('meaning-feedback').getByText(t.label+'.',{exact:false}).waitFor();
          assert.equal(await p.getByText('Пока не совпало.',{exact:false}).count(),0);
        }
        await p.getByText('✓ Верно!',{exact:false}).waitFor();
        const persisted=await p.evaluate(({KEY,id})=>JSON.parse(localStorage.getItem(KEY)).answers[id],{KEY,id});
        assert.deepEqual(new Set(persisted.value),new Set(b.expected));
        await card(b.targets[0].label).tap();
        await p.getByText('✓ Верно!',{exact:false}).waitFor();
        assert.equal(await p.locator('img[src*="abacus"]').count(),0);
        if (id==='p008-block08') await p.getByTestId('modern-meaning-tokens').waitFor();
        await p.reload();
        await p.getByRole('button',{name:/^(Продолжить занятие|Начать заниматься)/}).click();
        await p.getByText('✓ Верно!',{exact:false}).waitFor();
        await p.getByTestId('number-meaning').scrollIntoViewIfNeeded();
        if(id==='p007-block07') await p.screenshot({path:`docs/number-meaning-${viewport.width}.png`,fullPage:true});
        report.checks.push({id,viewport,representations:b.targets.length,allValid:true,reload:true});
      }
      await ctx.close();
    }
    assert.deepEqual(report.errors,[]);
    report.passed=true;
  } catch(e) { report.errors.push(String(e)); process.exitCode=1; }
  finally {fs.writeFileSync('docs/number-meaning-browser-result.json',JSON.stringify(report,null,2)+'\n'); await browser.close();}
  console.log(JSON.stringify(report,null,2));
})();
