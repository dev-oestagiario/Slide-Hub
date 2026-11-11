import { renderToStaticMarkup } from 'react-dom/server'
import { ExportPages } from './ExportPages'
import { EXPORT_STYLES } from './exportStyles'
import type { ExportPlan } from './exportModel'

function escapeHead(value:string):string{
  return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

/** A portable document without JavaScript, teacher notes or answer keys. */
export function renderStandaloneHtml(plan:ExportPlan):string{
  const markup=renderToStaticMarkup(<main className="f6-standalone"><ExportPages plan={plan}/></main>)
  const safeTitle=escapeHead(plan.title.slice(0,180))
  return '<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"/>'
    +'<meta name="viewport" content="width=device-width, initial-scale=1"/>'
    +'<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src https: data:; style-src \'unsafe-inline\'; font-src data:; base-uri \'none\'; form-action \'none\'"/>'
    +'<title>'+safeTitle+' — SlideHub</title>'
    +'<style>'+EXPORT_STYLES+'\n'
    +'html,body{margin:0;padding:0;background:#e8efed;color:#173e3c;font-family:system-ui,sans-serif}'
    +'.f6-standalone{padding:24px 16px}'
    +'@media print{.f6-standalone{padding:0!important}}'
    +'</style></head><body>'+markup+'</body></html>'
}
