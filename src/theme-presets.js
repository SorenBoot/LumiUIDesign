/* Page-local visual presets. Existing appearance modes and image analysis stay independent. */
const lumiDark={surface:'#2a303c',soft:'#222936',accent:'#b8cbdc',user:'#4f5b6f'};
const lumiLight={surface:'#f6f5f2',soft:'#e5e7eb',accent:'#46647f',user:'#d4dce6'};
const lumiThemes=[
  {id:'ember',family:'lumi',name:'墨夜琥珀',description:'暖墨 · 纸白 · 单一琥珀强调',mode:'dark',hue:30,
    dark:{surface:'#24252a',soft:'#1c1d21',accent:'#eaa95e',user:'#33343a',page:'#141518',scene:['#141518','#17181c','#1b1a1a'],glow:['#262c38','#7a4f26'],panel:'#1f2024',home:'#1d1e22',floating:'#26272c',bubble:'#202125',text:'#efece6',accentSoft:'#3b3024',infoSurface:'#2b2a28',infoText:'#e3cfb2',navTrack:'#0c0c0e',secondary:'#d8d2c8',muted:'#b8b0a4',canvasMuted:'#c9c1b5',border:'#857d72'},
    light:{surface:'#ffffff',soft:'#efece6',accent:'#a4561a',user:'#ece5da',page:'#f6f4ef',scene:['#f6f4ef','#f4f1eb','#f1ece3'],glow:['#e9e5de','#f2d2a8'],primary:'#1d1e22',text:'#1d1e22',accentSoft:'#f2e4d2',infoSurface:'#f1ebe2',infoText:'#7a4a1e',navTrack:'#3a3530',secondary:'#4b463f',muted:'#6a6359',canvasMuted:'#5c554b',border:'#9a9184'}},
  {id:'lumi',family:'lumi',name:'雾蓝暖光',description:'蓝灰 · 石墨 · 暖金',mode:'dark',hue:218,
    dark:{...lumiDark,page:'#354257',scene:['#354257','#3c4558','#4c505a'],glow:['#667f9f','#b4916c']},
    light:{...lumiLight,page:'#d9dfe7',scene:['#d9dfe7','#e2e3e5','#e9e6e2'],glow:['#b6c8dc','#e1c59e']}},
  {id:'lumi-blue',family:'lumi',name:'澄蓝微光',description:'冷蓝 · 石墨 · 暖金',mode:'dark',hue:212,
    dark:{...lumiDark,page:'#293d53',scene:['#293d53','#354754','#424e5e'],glow:['#6a8ba9','#bca180']},
    light:{...lumiLight,page:'#dbe5ee',scene:['#dbe5ee','#e2eaf0','#edf0ef'],glow:['#b3cce2','#e4ceb0']}},
  {id:'lumi-green',family:'lumi',name:'青岚微光',description:'青灰 · 石墨 · 暖金',mode:'dark',hue:160,
    dark:{...lumiDark,page:'#2f403d',scene:['#2f403d','#394841','#444f47'],glow:['#839e91','#c1ac87']},
    light:{...lumiLight,page:'#dce5df',scene:['#dce5df','#e2e8e2','#ecebe4'],glow:['#b9cfc2','#e3cfad']}}
];
export const themePresets = [
  {id:'classic',name:'经典原色',description:'石墨灰 / 瓷白',mode:null,hue:218,
    light:{page:'#edf0f1',surface:'#fafafa',soft:'#e4e9eb',accent:'#45677b',user:'#dce2e5',scene:['#edf0f1','#e7ebee','#f1f2f0']},
    dark:{page:'#171819',surface:'#242526',soft:'#1b1c1e',accent:'#b8cbd7',user:'#34383d',scene:['#171819','#202326','#171819']}},
  {id:'cream',name:'奶油纸感',description:'暖白 · 陶土棕',mode:'light',hue:32,
    light:{page:'#f3ede2',surface:'#fffcf5',soft:'#eee4d6',accent:'#955c40',user:'#e8d8c5',scene:['#f3ede2','#e9ddc8','#f8f2e6']},
    dark:{page:'#27211c',surface:'#342c24',soft:'#2b241e',accent:'#dfbda1',user:'#4b392b',scene:['#27211c','#382c23','#211e1a']}},
  {id:'cloud',name:'晴空蓝白',description:'雾蓝 · 轻盈留白',mode:'light',hue:210,
    light:{page:'#eaf0f7',surface:'#f9fcff',soft:'#dee8f3',accent:'#356b98',user:'#d8e7f5',scene:['#eaf0f7','#dae7f3','#f2f7fc']},
    dark:{page:'#182635',surface:'#233548',soft:'#1c2c3e',accent:'#b6d1ec',user:'#334c65',scene:['#182635','#263b4d','#142230']}},
  {id:'forest',name:'松林夜色',description:'深松绿 · 鼠尾草',mode:'dark',hue:148,
    light:{page:'#e8efe4',surface:'#f9fcf5',soft:'#dde8d7',accent:'#3a6744',user:'#d7e3cc',scene:['#e8efe4','#d9e5d3','#f0f3e8']},
    dark:{page:'#14231f',surface:'#20352d',soft:'#192b24',accent:'#b2c9a5',user:'#334d3d',scene:['#14231f','#263b2b','#10251f']}},
  {id:'midnight',name:'午夜冰蓝',description:'墨蓝 · 冷色微光',mode:'dark',hue:218,
    light:{page:'#e5ecfa',surface:'#f8fbff',soft:'#d7e2f5',accent:'#365a95',user:'#d2def3',scene:['#e5ecfa','#d7e2f7','#edf2ff']},
    dark:{page:'#111a2a',surface:'#1d2b40',soft:'#172337',accent:'#a9c9ef',user:'#2d4161',scene:['#111a2a','#233650','#12243a']}},
  {id:'azure',name:'蔚蓝流光',description:'钴蓝 · 青蓝流光',mode:'light',hue:215,
    light:{page:'#dceaff',surface:'#f6faff',soft:'#cddff6',accent:'#245eaa',user:'#c6dcf7',scene:['#dceaff','#b8d4f7','#d1eaf4']},
    dark:{page:'#102650',surface:'#193766',soft:'#142d57',accent:'#b8d8ff',user:'#2b4d7d',scene:['#102650','#193c65','#142e5e']}},
  {id:'mint',name:'青绿微风',description:'薄荷 · 清透青碧',mode:'light',hue:155,
    light:{page:'#daefe4',surface:'#f3fcf5',soft:'#cce5d6',accent:'#28684f',user:'#c2dfd0',scene:['#daefe4','#b9dccc','#e7efcf']},
    dark:{page:'#102b28',surface:'#1a3c35',soft:'#14332d',accent:'#afe0c5',user:'#2b5144',scene:['#102b28','#1d4538','#203c32']}},
  ...lumiThemes
];

export function getThemePreset(id){return themePresets.find(item=>item.id===id)||themePresets[0];}

/** Picking a preset applies its suggested mode without discarding the stored wallpaper. */
export function presetAppearancePatch(id,current){
  const preset=getThemePreset(id);
  const sameFamily=preset.family==='lumi'&&getThemePreset(current?.styleTheme).family==='lumi';
  return {styleTheme:preset.id,background:preset.id==='classic'?'mist':'theme',...(preset.mode&&!sameFamily?{theme:preset.mode}:{})};
}
