const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('C:/Users/Usuario/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.dirname(__dirname);
const original = path.join(root,'BACKUP_ANTES_REDISENO','originales');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.pdf':'application/pdf'};
const server = http.createServer((req,res) => {
  let name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const base = name.startsWith('/antes/') ? original : root;
  if(base===original) name=name.slice(6);
  const file = path.join(base,name==='/'?'index.html':name);
  if (!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);});
});
(async()=>{
  const report={hashes:{},viewports:[],errors:[]};
  for(const entry of JSON.parse(fs.readFileSync(path.join(root,'BACKUP_ANTES_REDISENO','manifest-originales.json'),'utf8').replace(/^\uFEFF/,''))){
    assert.equal(sha(path.join(original,entry.ruta)),entry.sha256.toLowerCase());
    if(!['index.html','style.css'].includes(entry.ruta)){assert.equal(sha(path.join(root,entry.ruta)),entry.sha256.toLowerCase());report.hashes[entry.ruta]='sin cambios';}
  }
  await new Promise(resolve=>server.listen(8765,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const context=await browser.newContext({serviceWorkers:'block'});
    await context.route('**/*', route => new URL(route.request().url()).hostname==='127.0.0.1' ? route.continue() : route.abort());
    const page=await context.newPage();
    page.on('pageerror',error=>report.errors.push(error.message));
    for(const width of [1440,768,390,320]){
      await page.setViewportSize({width,height:1000});
      await page.goto('http://127.0.0.1:8765/antes/');
      await page.waitForSelector('#consultoriosLoader',{state:'hidden'});
      const baseline=await page.evaluate(()=>({
        links:[...document.querySelectorAll('a')].map(a=>[a.getAttribute('href'),a.hasAttribute('download'),a.getAttribute('target')]),
        ids:[...document.querySelectorAll('[id]')].map(el=>el.id).sort(),
        emergencyStyles:[document.querySelector('#emergencias'),...document.querySelectorAll('#emergencias *')].map(el=>{const s=getComputedStyle(el);return [s.cssText,...Array.from(s).map(p=>[p,s.getPropertyValue(p)])];}),
        untouched:['inicio','novedades','emergencias','carnet','contacto'].map(id=>document.getElementById(id).outerHTML),
      }));
      await page.locator('#emergencias').screenshot({path:path.join(__dirname,`emergencias-antes-${width}.png`)});
      await page.goto('http://127.0.0.1:8765/');
      await page.waitForSelector('#consultoriosLoader',{state:'hidden'});
      const current=await page.evaluate(()=>({
        links:[...document.querySelectorAll('a')].map(a=>[a.getAttribute('href'),a.hasAttribute('download'),a.getAttribute('target')]),
        ids:[...document.querySelectorAll('[id]')].map(el=>el.id).sort(),
        emergencyStyles:[document.querySelector('#emergencias'),...document.querySelectorAll('#emergencias *')].map(el=>{const s=getComputedStyle(el);return [s.cssText,...Array.from(s).map(p=>[p,s.getPropertyValue(p)])];}),
        untouched:['inicio','novedades','emergencias','carnet','contacto'].map(id=>document.getElementById(id).outerHTML),
      }));
      assert.deepEqual(current,baseline);
      await page.locator('#emergencias').screenshot({path:path.join(__dirname,`emergencias-despues-${width}.png`)});
      for(const [button,modal] of [['btnAbrirAutorizaciones','autorizacionesModal'],['btnAbrirAltas','altasModal'],['btnAbrirEstudios','estudiosModal']]){
        await page.locator('#'+button).click();
        assert.equal(await page.locator('#'+modal).getAttribute('aria-hidden'),'false');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#'+modal).getAttribute('aria-hidden'),'true');
      }
      if(width<=768){
        assert.equal(await page.locator('#consultoriosContainer').isVisible(),false);
        await page.locator('#btnToggleConsultorios').click();
        assert.equal(await page.locator('#consultoriosContainer').isVisible(),true);
        await page.locator('#btnToggleConsultorios').click();
        assert.equal(await page.locator('#consultoriosContainer').isVisible(),false);
      }
      const name=await page.evaluate(()=>consultoriosEspecialidades[0].especialidad);
      await page.locator('#buscadorConsultorios').fill(name);
      assert.equal(await page.locator('#consultoriosContainer').isVisible(),true);
      assert.equal(await page.locator('#consultoriosContainer .card').count()>0,true);
      await page.locator('#buscadorConsultorios').fill('zzzz-no-existe');
      assert.equal(await page.locator('.consultorios-empty').count(),1);
      await page.locator('#buscadorConsultorios').fill('');
      const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,cards:[...document.querySelectorAll('.servicio-card')].map(el=>({width:el.offsetWidth,background:getComputedStyle(el).backgroundImage,title:el.querySelector('h3').textContent}))}));
      assert.equal(layout.overflow,false);
      assert.equal(layout.cards.length,7);
      assert.equal(layout.cards.every(card=>!card.background.includes('url(')),true);
      await page.mouse.move(0,0);
      await page.waitForTimeout(250);
      const finish = await page.evaluate(()=>{
        const properties=['backgroundImage','borderTopColor','borderRightColor','borderRadius','boxShadow'];
        const pick=el=>Object.fromEntries(properties.map(p=>[p,getComputedStyle(el)[p]]));
        const reference=pick(document.querySelector('.emergencia-card--medikids'));
        const cards=[...document.querySelectorAll('.servicio-card')].map(pick);
        const panel=pick(document.querySelector('.consultorios-controls'));
        const buttonProperties=['backgroundColor','color','borderRadius','boxShadow','fontWeight'];
        const button=el=>Object.fromEntries(buttonProperties.map(p=>[p,getComputedStyle(el)[p]]));
        const buttonReference=button(document.querySelector('.emergencia-btn'));
        const buttons=[...document.querySelectorAll('.servicio-card .btn:not(.btn--ghost),.servicio-card .turnos-oval a')].map(button);
        const specs=[...document.querySelectorAll('#consultoriosContainer .consultorio-card')].map(el=>el.offsetHeight);
        const pseudoReference=getComputedStyle(document.querySelector('.emergencia-card'),'::before');
        const pseudoProperties=['content','position','borderTopWidth','borderTopColor','backgroundImage','width','height'];
        const pseudoCards=[...document.querySelectorAll('.servicio-card')].map(el=>{const p=getComputedStyle(el,'::before');return {border:p.borderTopWidth,color:p.borderTopColor,content:p.content,background:p.backgroundImage};});
        return {reference,cards,panel,buttonReference,buttons,specs,pseudoCards};
      });
      for(const card of finish.cards)assert.deepEqual(card,finish.reference);
      assert.deepEqual(finish.panel,finish.reference);
      for(const button of finish.buttons)assert.deepEqual(button,finish.buttonReference);
      assert(finish.pseudoCards.every(p=>p.border==='4px'&&p.content==='""'&&p.background==='none'));
      if(width>768)assert(finish.specs.every(h=>h===112));
      report.finish='Fondos, bordes, radios, sombras y botones equivalentes al CSS real de Emergencias; especialidades uniformes';
      await page.locator('#consultoriosContainer').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      for(const id of ['gestiones','consultorios','cartilla']) await page.locator('#'+id).screenshot({path:path.join(__dirname,`${id}-${width}.png`)});
      report.viewports.push({width,...layout,modales:'abren y cierran',buscador:'filtra, muestra vacíos y conserva el desplegable móvil',links:'idénticos',emergencias:'HTML y estilos calculados idénticos'});
    }
    assert.deepEqual(report.errors,[]);
    fs.writeFileSync(path.join(__dirname,'verificacion.json'),JSON.stringify(report,null,2));
    console.log('Verificado: 4 anchos, 7 tarjetas, destinos originales, 3 modales, búsqueda y desplegable móvil, sin desbordamiento ni errores JS. Emergencias con HTML y estilos idénticos. Otros 24 archivos intactos.');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
