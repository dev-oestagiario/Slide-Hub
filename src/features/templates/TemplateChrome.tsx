import type { PresentationTemplateConfig } from './model'

type Props = {
  config: PresentationTemplateConfig
  index: number
  total: number
}

/** Shared by template samples, writing preview and actual presentation. */
export function TemplateChrome({ config, index, total }: Props) {
  const {branding,footer}=config
  const hasFooter=Boolean(footer.text)||footer.showPageNumber
  return <>
    {branding.showHeader&&<div className={'f3-brand-header '+(branding.logoAlignment==='right'?'f3-brand-header-right':'')}>
      {branding.logoUrl&&<img src={branding.logoUrl} alt="" loading="lazy" />}
      {branding.label&&<span>{branding.label}</span>}
    </div>}
    {branding.accentRule&&<div className="f3-accent-rule" style={{backgroundColor:config.theme.accent}} aria-hidden="true"/>}
    {hasFooter&&<div className="f3-brand-footer">
      <span>{footer.text}</span>
      {footer.showPageNumber&&<span>{String(index+1).padStart(2,'0')} / {String(total).padStart(2,'0')}</span>}
    </div>}
  </>
}
