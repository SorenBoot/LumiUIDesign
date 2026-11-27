/* Lumi's ambient canvas and neutral content surfaces have separate color roles. */
const rgb=hex=>hex.slice(1).match(/../g).map(part=>parseInt(part,16));
const mix=(a,b,alpha)=>a.map((value,i)=>Math.round(value*alpha+b[i]*(1-alpha)));
const hex=color=>`#${color.map(value=>value.toString(16).padStart(2,'0')).join('')}`;
const rgba=(color,alpha)=>`rgba(${color.join(',')},${alpha})`;
const luminance=color=>color.reduce((sum,value,i)=>{const c=value/255;return sum+(c<=.04045?c/12.92:((c+.055)/1.055)**2.4)*[.2126,.7152,.0722][i]},0);
const contrast=(a,b)=>{const [low,high]=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (high+.05)/(low+.05)};
function readable(color,backgrounds,dark,minimum=4.8){
  if(backgrounds.every(bg=>contrast(color,bg)>=minimum))return color;
  const end=dark?[255,255,255]:[0,0,0];let low=0,high=1;
  for(let i=0;i<20;i++){const mid=(low+high)/2;if(backgrounds.every(bg=>contrast(mix(end,color,mid),bg)>=minimum))high=mid;else low=mid;}
  return mix(end,color,high);
}

export function buildLumiPalette(preset,dark,background){
  const v=preset[dark?'dark':'light'];
  const surface=rgb(v.surface),soft=rgb(v.soft),page=rgb(v.page),scene=v.scene.map(rgb),glow=v.glow.map(rgb);
  // Radial layers are restrained; channel bounds also cover weather and moving glows.
  const atmosphere=background==='dusk'?rgb('#b58e65'):background==='sky'?rgb('#8aa5bf'):null;
  const layers=[[dark?rgb('#aeb6cf'):rgb('#d4dce7'),.035],[glow[0],.075],[glow[1],.04],...(atmosphere?[[atmosphere,.035]]:[]),[glow[0],.035],[glow[1],.025]];
  // Each gradient may contribute any alpha from zero to its maximum.
  // Include the family-specific weather overlays and the translucent summary controls.
  let bounds=[0,1].map(edge=>[0,1,2].map(c=>Math[edge?'max':'min'](...scene.map(s=>s[c]))));
  for(const [color,alpha] of layers)bounds=bounds.map((bound,edge)=>bound.map((value,c)=>Math[edge?'max':'min'](value,Math.round(color[c]*alpha+value*(1-alpha)))));
  const weatherColors=['#9aa8c0','#e5e8ed','#6783a5','#a4c1de','#a4b0bb'].map(rgb);
  const canvasBounds=bounds.flatMap(bound=>[bound,...weatherColors.map(color=>mix(color,bound,.035))]);
  canvasBounds.push(...canvasBounds.map(bound=>mix(dark?[230,235,242]:[39,47,61],bound,dark?.055:.045)));
  const text=rgb(v.text||(dark?'#f1f1ef':'#292f39')),secondary=rgb(v.secondary||(dark?'#d2d6dd':'#4d5663'));
  const panelBase=rgb(v.panel||(dark?'#1e2530':'#fafaf9')),homeBase=rgb(v.home||(dark?'#1b212b':'#fcfbf8'));
  const floatingBase=rgb(v.floating||(dark?'#222833':'#ffffff')),bubbleBase=rgb(v.bubble||(dark?'#1d232e':'#ffffff')),user=rgb(v.user);
  const panelAlpha=dark?.88:.91,homeAlpha=dark?.76:.89,floatingAlpha=dark?.96:.97,bubbleAlpha=dark?.87:.94;
  const contentBackgrounds=[surface,soft,...canvasBounds.flatMap(bg=>[mix(panelBase,bg,panelAlpha),mix(homeBase,bg,homeAlpha),mix(bubbleBase,bg,bubbleAlpha),mix(floatingBase,bg,floatingAlpha)])];
  const muted=readable(rgb(v.muted||(dark?'#bac2cf':'#596370')),contentBackgrounds,dark);
  const canvasText=readable(text,canvasBounds,dark),canvasMuted=readable(rgb(v.canvasMuted||(dark?'#c6cdd7':'#535e6d')),canvasBounds,dark);
  const accentSoft=rgb(v.accentSoft||(dark?'#344252':'#e0e8ef')),accent=readable(rgb(v.accent),[...contentBackgrounds,accentSoft],dark);
  const brandWarm=readable(rgb(dark?'#e4c59b':'#765830'),contentBackgrounds,dark);
  const canvasWarm=readable(rgb(dark?'#e4c59b':'#765830'),canvasBounds,dark);
  const primary=rgb(v.primary||(dark?'#efede7':'#35475a')),primaryText=readable(rgb(dark?'#2e3239':'#ffffff'),[primary],!dark,7);
  const navSelected=rgb(dark?'#f0ede7':'#ffffff'),navSelectedText=rgb('#292f39');
  const infoSurface=rgb(v.infoSurface||(dark?'#28394d':'#e5edf6')),infoText=rgb(v.infoText||(dark?'#a6c7f1':'#315b87'));
  const border=readable(rgb(v.border||(dark?'#778392':'#82909d')),[surface,soft],dark,3.1);
  const status=dark?{success:{text:'#a8d7bb',surface:'#21372c'},warning:{text:'#e8cc94',surface:'#3c3220'},error:{text:'#f0adb1',surface:'#40272c'}}:{success:{text:'#28613e',surface:'#e9f2ec'},warning:{text:'#73551f',surface:'#f5eedf'},error:{text:'#963f47',surface:'#f8e9eb'}};
  const colors=Object.fromEntries(Object.entries({surface,surfaceSoft:soft,page,text,secondary,muted,accent,accentSoft,userSurface:user,primary,primaryText,navSelected,navSelectedText,infoSurface,infoText,border,brandWarm,canvasWarm,canvasText,canvasMuted}).map(([key,value])=>[key,hex(value)]));
  colors.buttonPrimary=colors.primary;colors.buttonPrimaryText=colors.primaryText;
  const ambient=`${atmosphere?`linear-gradient(${rgba(atmosphere,.035)},${rgba(atmosphere,.035)}),`:''}radial-gradient(ellipse at 55% 0%,${rgba(glow[1],.04)},transparent 46%),radial-gradient(ellipse at 0% 45%,${rgba(glow[0],.075)},transparent 65%),radial-gradient(ellipse at 95% 95%,${rgba(dark?rgb('#aeb6cf'):rgb('#d4dce7'),.035)},transparent 58%),linear-gradient(140deg,${v.scene[0]},${v.scene[1]} 50%,${v.scene[2]})`;
  const vars={
    '--surface':colors.surface,'--surface-soft':colors.surfaceSoft,'--surface-panel':rgba(panelBase,panelAlpha),'--home-surface':rgba(homeBase,homeAlpha),'--surface-floating':rgba(floatingBase,floatingAlpha),
    '--nav-track':rgba(rgb(v.navTrack||(dark?'#191e27':'#404856')),dark?.55:.09),'--home-soft':dark?'rgba(230,235,242,.055)':'rgba(39,47,61,.045)',
    '--nav-selected':colors.navSelected,'--nav-selected-text':colors.navSelectedText,
    '--text':colors.text,'--secondary':colors.secondary,'--muted':colors.muted,'--canvas-ink':colors.canvasText,'--canvas-muted':colors.canvasMuted,
    '--line':dark?'rgba(208,220,238,.14)':'rgba(67,77,93,.16)','--control-border':colors.border,
    '--accent':colors.accent,'--accent-soft':colors.accentSoft,'--on-accent':hex(readable(rgb(dark?'#17130d':'#ffffff'),[accent],!dark,4.5)),'--segmented-selected':dark?hex(mix(text,surface,.16)):'#ffffff','--accent-ink':colors.navSelectedText,'--brand-warm':colors.brandWarm,'--canvas-warm':colors.canvasWarm,
    '--bubble':rgba(bubbleBase,bubbleAlpha),'--bubble-user':rgba(user,dark?.94:.97),'--primary-bg':colors.primary,'--primary-text':colors.primaryText,'--primary-fill':colors.primary,'--primary-ink':colors.primaryText,
    '--info-text':colors.infoText,'--info-surface':colors.infoSurface,
    ...Object.fromEntries(Object.entries(status).flatMap(([name,pair])=>[[`--status-${name}-text`,pair.text],[`--status-${name}-surface`,pair.surface]])),
    '--wallpaper-wash':'rgba(0,0,0,0)','--wallpaper-wash-alpha':'0','--ambient':ambient,'--canvas-color':colors.page,
    '--scene-a':v.glow[0],'--scene-b':v.glow[1],'--scene-alpha-a':'.035','--scene-alpha-b':'.025',
    '--panel-shadow':dark?'0 2px 4px #10172312,0 16px 45px -24px #0c172454':'0 2px 3px #15223804,0 14px 40px -22px #17243e42',
    '--panel-shadow-hover':dark?'0 3px 8px #10172330,0 22px 48px -22px #0c17247a':'0 3px 8px #1522380a,0 22px 44px -22px #17243e55'
  };
  const antd={colorPrimary:colors.accent,colorPrimaryBg:colors.accentSoft,colorLink:colors.accent,colorLinkHover:colors.accent,colorLinkActive:colors.accent,colorText:colors.text,colorTextSecondary:colors.secondary,colorTextTertiary:colors.muted,colorTextPlaceholder:colors.muted,colorTextLightSolid:dark?colors.primaryText:'#ffffff',colorBgLayout:colors.page,colorBgElevated:colors.surface,colorBgContainer:colors.surface,colorBorder:colors.border,colorBorderSecondary:vars['--line'],colorFillSecondary:colors.surfaceSoft,colorFillTertiary:colors.surfaceSoft,colorInfo:colors.infoText,colorInfoBg:colors.infoSurface,...Object.fromEntries(Object.entries(status).flatMap(([name,pair])=>{const role=name[0].toUpperCase()+name.slice(1);return [[`color${role}`,pair.text],[`color${role}Bg`,pair.surface],[`color${role}Border`,hex(mix(rgb(pair.text),rgb(pair.surface),.4))]]}))};
  const components={Button:{primaryShadow:'none',defaultShadow:'none',colorPrimary:colors.primary,colorPrimaryHover:hex(mix(dark?[255,255,255]:[0,0,0],primary,.08)),colorPrimaryActive:hex(mix(dark?[0,0,0]:[255,255,255],primary,.08)),primaryColor:colors.primaryText},Select:{optionSelectedBg:colors.accentSoft},Segmented:{trackBg:colors.surfaceSoft,itemSelectedBg:dark?hex(mix(text,surface,.16)):'#ffffff'},Tooltip:{colorBgSpotlight:dark?'#edf0f3':'#24282e',colorTextLightSolid:dark?'#24282e':'#ffffff'}};
  const pairs=[['body / surface',text,surface],['secondary / surface',secondary,surface],['accent / selected',accent,accentSoft],['primary action',primaryText,primary],['selected navigation',navSelectedText,navSelected],['information label',infoText,infoSurface],['message / user',text,mix(user,canvasBounds[0],dark?.94:.97)],...contentBackgrounds.flatMap((bg,i)=>[['muted / content '+i,muted,bg],['body / content '+i,text,bg],['brand / content '+i,brandWarm,bg]]),...canvasBounds.flatMap((bg,i)=>[['canvas body / bound '+i,canvasText,bg],['canvas muted / bound '+i,canvasMuted,bg],['canvas warm / bound '+i,canvasWarm,bg]]),...Object.entries(status).map(([name,pair])=>[`${name} status`,rgb(pair.text),rgb(pair.surface)])];
  return {vars,antd,components,colors,diagnostics:{dark,custom:false,hue:preset.hue,washAlpha:0,sourceSampleCount:0,note:'Lumi bounds include alpha intervals for fixed/moving gradients, the family weather overlays and translucent summary controls. Content and canvas use separate text and warm roles.',pairs:pairs.map(([role,fg,bg])=>({role,foreground:hex(fg),background:hex(bg),contrast:+contrast(fg,bg).toFixed(3),minimum:4.5}))}};
}
