const fs=require('fs'),path=require('path');const file=path.join(path.dirname(__dirname),'style.css');let s=fs.readFileSync(file,'utf8');const marker='/* Rediseño experimental:';const i=s.indexOf(marker);if(i<0)throw Error('Falta bloque rediseño');let base=s.slice(0,i),extra=s.slice(i);
const cards='#gestiones .servicio-card,\n#consultorios .servicio-card,\n#cartilla .servicio-card,\n#consultorios .consultorios-controls';
const buttons='#gestiones .servicio-card .btn,\n#consultorios .servicio-card .btn,\n#consultorios .servicio-card .turnos-oval a,\n#cartilla .servicio-card .btn,\n#consultorios .consultorios-toggle';
// Reutilizar los mismos bloques originales, conservando sus valores intactos.
base=base.replaceAll('.emergencia-card{','.emergencia-card,\n'+cards+'{');
base=base.replace('.emergencia-card::before{','.emergencia-card::before,\n'+cards.split(',\n').map(x=>x+'::before').join(',\n')+'{');
base=base.replaceAll('.emergencia-card h3{','.emergencia-card h3,\n#gestiones .servicio-card h3,\n#consultorios .servicio-card h3,\n#cartilla .servicio-card h3{');
base=base.replaceAll('.emergencia-btn{','.emergencia-btn,\n'+buttons+'{');
base=base.replaceAll('.emergencia-btn:hover{','.emergencia-btn:hover,\n'+buttons.split(',\n').map(x=>x+':hover').join(',\n')+'{');
base=base.replace('.emergencia-btn--outline{','.emergencia-btn--outline,\n#cartilla .servicio-card .btn--ghost,\n#consultorios .consultorios-toggle{');
base=base.replace('.emergencia-btn--outline:hover{','.emergencia-btn--outline:hover,\n#cartilla .servicio-card .btn--ghost:hover,\n#consultorios .consultorios-toggle:hover{');
base=base.replace('.emergencia-hours{','.emergencia-hours,\n#gestiones .servicio-card p.muted,\n#consultorios .servicio-card p.muted,\n#cartilla .servicio-card p.muted{');
function strip(selector,props){const start=extra.indexOf(selector+'{');if(start<0)throw Error('No existe '+selector);const end=extra.indexOf('}',start);let block=extra.slice(start,end);for(const prop of props)block=block.replace(new RegExp('(^|[;\\n])\\s*'+prop+':[^;]+;','g'),'$1');extra=extra.slice(0,start)+block+extra.slice(end);}
strip(cards.replace(',\n#consultorios .consultorios-controls',''),['padding','border','border-top','border-radius','background','color','box-shadow']);
strip('#gestiones .servicio-card:hover,\n#consultorios .servicio-card:hover,\n#cartilla .servicio-card:hover',['border-color','box-shadow']);
extra=extra.replace('.servicio-card::before{content:none;}','.servicio-card::before{top:0;left:0;width:auto;height:auto;background:none;}');
strip('#gestiones .servicio-card h3,\n#consultorios .servicio-card h3,\n#cartilla .servicio-card h3',['color','font-size','line-height']);
strip('#gestiones .servicio-card p.muted,\n#consultorios .servicio-card p.muted,\n#cartilla .servicio-card p.muted',['color','line-height']);
strip(buttons.replace(',\n#consultorios .consultorios-toggle',''),['border','border-radius','background','color','font','font-size','font-weight','box-shadow','transition']);
extra=extra.replace('  cursor:pointer;\n  \n}', '  cursor:pointer;\n}');
strip('#gestiones .servicio-card .btn:hover,\n#consultorios .servicio-card .btn:hover,\n#consultorios .servicio-card .turnos-oval a:hover,\n#cartilla .servicio-card .btn:hover',['background','transform']);
extra=extra.replace('#cartilla .servicio-card .btn--ghost{background:#fff;color:var(--verde-principal);}','').replace('#cartilla .servicio-card .btn--ghost:hover{background:#e6f4ec;}','');
strip('#consultorios .consultorios-controls',['border','border-radius','background','box-shadow']);
strip('#consultorios .consultorios-toggle',['border','border-radius','background','color','font','font-weight','box-shadow']);
extra=extra.replace('#consultorios .consultorios-toggle:hover{background:#e6f4ec;}','');
// El bloque común ya proporciona el acabado; aquí solo se adapta la distribución.
extra+='\n/* Restablecer apariencia nativa de botones sin cambiar los controles. */\n'+buttons+'{font-family:inherit;cursor:pointer;}\n#gestiones .servicio-card .btn,\n#consultorios .servicio-card .btn{border:0;}\n#consultorios .consultorios-controls .consultorios-mobile-title{font-weight:900;}\n';
fs.writeFileSync(file,base+extra);