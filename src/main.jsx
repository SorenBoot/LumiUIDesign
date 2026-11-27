import React,{useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {App as AntApp,Alert,Avatar,Badge,Button,Checkbox,ConfigProvider,Descriptions,Dropdown,Empty,Input,Modal,Popover,Segmented,Tag,Tooltip,theme} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import {BellOutlined,CloseOutlined,CodeOutlined,FileTextOutlined,FolderOutlined,HistoryOutlined,HomeOutlined,MenuOutlined,MessageOutlined,PlusOutlined,SafetyCertificateOutlined,SearchOutlined,SettingOutlined,ThunderboltFilled,AppstoreOutlined,GlobalOutlined,DesktopOutlined,ArrowRightOutlined} from '@ant-design/icons';
import Home from './Home';
import Settings,{getSettingsSnapshot,subscribeSettings,settingsGroups} from './Settings';
import Composer from './Composer';
import ChatThread from './ChatThread';
import ChatPanel from './ChatPanel';
import Projects from './Projects';
import Workbench,{notificationRecords,useWorkflowState,workflowActions} from './Workbench';
import Notifications from './Notifications';
import {initialSessions,initialProjects} from './data';
import {useReplyBlocks} from './reply-blocks';
import {getTaskStatus} from './work-status';
import {buildPalette,resolveAppearance} from './adaptive-colors';
import ThemeBackdrop from './ThemeBackdrop';
import 'antd/dist/reset.css';
import './styles.css';
import './reference-theme.css';
import './adaptive-theme.css';
import './adaptive-layout.css';
import './theme-collection.css';
import './composer-polish.css';
import './layout-refresh.css';
import './message-style.css';
import './theme-fixes.css';
import './composer-v2.css';
import './layout-v2.css';
import './workbench-v2.css';

function useMedia(query){const [matches,setMatches]=useState(()=>matchMedia(query).matches);useEffect(()=>{const media=matchMedia(query),changed=()=>setMatches(media.matches);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);},[query]);return matches;}
const messageTime=()=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
const defaultConfig=()=>({mode:'execute',agent:'lumi',model:getSettingsSnapshot().roleModels.text,reasoning:'来源默认',approval:'ask'});
function Lumi(){
 const {message}=AntApp.useApp(),settings=useSyncExternalStore(subscribeSettings,getSettingsSnapshot),work=useWorkflowState();
 const [view,setView]=useState('home'),[sessions,setSessions]=useState(()=>structuredClone(initialSessions)),[sessionId,setSessionId]=useState('s1'),[projects,setProjects]=useState(()=>structuredClone(initialProjects)),[projectId,setProjectId]=useState(null);
 const projectMessages=Object.fromEntries(sessions.filter(item=>item.id.startsWith('project-')).map(item=>[item.id.slice(8),item.messages]));
 const [drafts,setDrafts]=useState({}),[configs,setConfigs]=useState(()=>Object.fromEntries(initialSessions.map(s=>[s.id,defaultConfig()]).concat(initialProjects.map(p=>[`project-${p.id}`,defaultConfig()]),[["home",defaultConfig()]]))),[reply,setReply]=useState(null),[historyOpen,setHistoryOpen]=useState(false),[historyQuery,setHistoryQuery]=useState('');
 const [settingOpen,setSettingOpen]=useState(false),[section,setSection]=useState('account'),[settingMode,setSettingMode]=useState('modal'),[wbOpen,setWbOpen]=useState(false),[wbTab,setWbTab]=useState('runs'),[notifications,setNotifications]=useState(false),[search,setSearch]=useState(false),[query,setQuery]=useState(''),[about,setAbout]=useState(false),[withdraw,setWithdraw]=useState(null);
 const activeSession=sessions.find(s=>s.id===sessionId)||sessions[0],scope=view==='home'?'home':view==='projects'?`project-${projectId}`:sessionId,config=configs[scope]||defaultConfig(),draft=drafts[scope]||'',main=useRef(null);
 const messageSerial=useRef(0);
 const {activities:replyActivities,enqueue:enqueueReply,cancelAnchors}=useReplyBlocks((target,anchor,block)=>{
  const task=work.tasks.find(item=>item.id===block.taskId),status=task&&getTaskStatus(task,work);
  const delivered={...block,deliveredAt:Date.now(),replyToId:anchor,...(block.workProgress&&status?{text:`目前的进展：${status.detail}。`}:{})};
  const append=items=>{
   const index=items?.findIndex(item=>item.id===anchor)??-1;if(index<0)return items;
   const source=items[index],latestUser=items.findLast(item=>item.role==='user');
   return [...items,{...delivered,...(latestUser.id!==anchor?{quote:{index,author:'你',role:'user',text:source.text}}:{})}];
  };
  setSessions(list=>list.map(item=>item.id===target?{...item,messages:append(item.messages)}:item));
 });
 function nextMessageId(){return `m-${Date.now()}-${++messageSerial.current}`;}
 function replyBlocks(text,task){
  // Explicit preview shortcuts only; arbitrary input is not interpreted as a task.
  const request=String(text).trim().replace(/[\s？?。！!]/g,'');
  if(task&&['查看进度','查看状态','工作进度','任务进度','任务状态','现在进展如何','进展怎么样','现在什么状态'].includes(request)){
   return [{taskId:task.id,workProgress:true,text:'暂时没有这项工作的状态。',after:'本地工作状态 · 未启动新工作。'}];
  }
  return [{text:'已收到。这是本地模拟回复。'}];
 }
 const nRecords=notificationRecords(work),unread=nRecords.filter(n=>!work.read.includes(n.id)).length,pending=nRecords.filter(n=>n.needsAction).length;
 function changeConfig(patch){setConfigs(old=>({...old,[scope]:{...(old[scope]||defaultConfig()),...patch}}));}
 function setDraft(value){setDrafts(old=>({...old,[scope]:value}));}
 function navigate(next){setView(next);setReply(null);setHistoryOpen(false);setSearch(false);if(settingMode==='page')setSettingOpen(false);}
 function continueChat(id){setSessionId(id);setConfigs(c=>c[id]?c:{...c,[id]:defaultConfig()});navigate('chat');}
 function openSettings(id='account'){setSection(id);setSettingOpen(true);setNotifications(false);setHistoryOpen(false);setSearch(false);setWbOpen(false);}
 function openWorkbench(tab='runs'){setWbTab(tab);setWbOpen(true);setNotifications(false);}
 function openPlan(id='upgrade'){workflowActions.selectTask(id);openWorkbench('plan');}
 function newChat(){const id=`s-${Date.now()}`;setSessions(s=>[{id,title:'新的对话',when:'刚刚',project:null,messages:[]},...s]);setSessionId(id);setConfigs(c=>c[id]?c:{...c,[id]:defaultConfig()});navigate('chat');}
 function continueProject(id){const key=`project-${id}`,project=projects.find(p=>p.id===id);setSessions(list=>list.some(item=>item.id===key)?list:[{id:key,title:project.name,project:id,when:'刚刚',messages:[{role:'assistant',text:`这里是「${project.name}」的项目对话。目录、分支与已分配的资料会跟随这段对话。`}]},...list]);continueChat(key);}
 async function regenerate(index,project=null){
  const targetId=project?`project-${project}`:sessionId;
  const source=project?(projectMessages[project]||[{role:'assistant',text:`这里是「${projects.find(p=>p.id===project)?.name}」的项目对话。目录、分支与已分配的资料会跟随这段对话。`}]):activeSession.messages;
  const original=source?.[index];
  if(!original||original.role!=='assistant'||original.decision)return;
  await new Promise(resolve=>setTimeout(resolve,500));
  const update=items=>items?.map((item,i)=>i===index&&item===original?{...item,revision:(item.revision||1)+1,time:messageTime(),timestamp:new Date().toISOString()}:item);
  setSessions(list=>project&&!list.some(item=>item.id===targetId)?[{id:targetId,title:projects.find(p=>p.id===project)?.name,project,when:'刚刚',messages:update(source)},...list]:list.map(item=>item.id===targetId?{...item,messages:update(item.messages)}:item));
  message.info('已模拟重新生成；正文仍为预设示例，未调用模型或重跑任务');
 }
 function answer(index,answerText,selected){const timestamp=new Date().toISOString();setSessions(list=>list.map(s=>{if(s.id!==sessionId)return s;const q=s.messages[index]?.decision;if(!q||q.status!=='waiting')return s;const messages=s.messages.map((m,i)=>i===index?{...m,decision:{...q,status:selected==='cancel'?'cancelled':'answered',selected,answer:answerText}}:m);if(selected!=='cancel')messages.push({role:'user',timestamp,text:answerText,quote:{index,author:'Lumi',text:q.title}},{role:'assistant',timestamp,text:q.kind==='approval'?'决定已记录。这是本地模拟，没有发送邮件或执行外部动作。':selected==='other'?'你的条件与限制已原样保留。这里仅模拟回答过程，没有启动后续工作。':'已记录你的回答，后续范围以这次选择为准。当前没有启动真实工作。'});return{...s,messages};}));setReply(null);}
 function send(text,files){
  if(reply?.questionIndex!==undefined){answer(reply.questionIndex,text,'other');setDraft('');return;}
  const user={id:nextMessageId(),role:'user',time:messageTime(),timestamp:new Date().toISOString(),text,...(reply?{quote:reply}:{}),attachments:files};
  const target=view==='home'?`s-${Date.now()}`:sessionId;
  if(view==='home'){setSessions(list=>[{id:target,title:text.slice(0,22),when:'刚刚',project:null,messages:[user]},...list]);setConfigs(c=>({...c,[target]:config}));setSessionId(target);navigate('chat');}
  else setSessions(list=>list.map(item=>item.id===target?{...item,title:item.messages.length?item.title:text.slice(0,22),messages:[...item.messages,user]}:item));
  enqueueReply(target,user.id,replyBlocks(text,work.tasks.find(task=>task.session===target)));
  setDrafts(old=>({...old,[scope]:''}));setReply(null);
 }
 function projectSend(id,text,files,quote){
  const project=projects.find(p=>p.id===id),key=`project-${id}`,user={id:nextMessageId(),role:'user',time:messageTime(),timestamp:new Date().toISOString(),text,attachments:files,quote};
  setSessions(list=>list.some(item=>item.id===key)?list.map(item=>item.id===key?{...item,messages:[...item.messages,user]}:item):[{id:key,title:project.name,project:id,when:'刚刚',messages:[{role:'assistant',text:`这里是「${project.name}」的项目对话。目录、分支与已分配的资料会跟随这段对话。`},user]},...list]);
  enqueueReply(key,user.id,replyBlocks(text,work.tasks.find(task=>task.session===key)));setDraft('');
 }
 useEffect(()=>{workflowActions.syncEnvironment?.({online:settings.devices.coreOnline,isolated:!!settings.restore});},[settings.devices.coreOnline,settings.restore]);
 useEffect(()=>{const handler=e=>{const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setSearch(true);}else if((e.ctrlKey||e.metaKey)&&e.key===','){e.preventDefault();openSettings();}else if(e.key==='/'&&!typing&&!settingOpen){e.preventDefault();setSearch(true);}else if(e.key==='Escape'&&historyOpen)setHistoryOpen(false);};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[historyOpen,settingOpen]);
 useEffect(()=>{document.title=`Lumi V5.4 · ${view==='home'?'主页':view==='projects'?'项目':activeSession.title}`;main.current?.focus({preventScroll:true});},[view,sessionId]);
 const history=<div className="l54-history"><div><strong>对话</strong><Button size="small" type="text" icon={<PlusOutlined/>} onClick={newChat}>新建</Button></div><Input prefix={<SearchOutlined/>} aria-label="搜索会话" value={historyQuery} onChange={e=>setHistoryQuery(e.target.value)} placeholder="搜索对话…" allowClear/>{sessions.filter(s=>s.title.includes(historyQuery)).map(s=><button key={s.id} className={s.id===sessionId?'selected':''} onClick={()=>continueChat(s.id)}><MessageOutlined/><span><strong>{s.title}</strong><small>{s.when}{s.project&&' · 项目'}</small></span>{s.messages.some(m=>m.decision?.status==='waiting')&&<Badge status="warning"/>}</button>)}</div>;
 const settingsView=<Settings section={section} onSectionChange={setSection} onClose={()=>setSettingOpen(false)} displayMode={settingMode} onDisplayModeChange={setSettingMode}/>;
 const isPageSettings=settingOpen&&settingMode==='page';
 return <div className={`l54-app ref54-app ${wbOpen?'has-workbench':''} ${isPageSettings?'is-settings-page':''}`} data-view={view}>
 <a href="#l54-main" className="l54-skip">跳到主要内容</a>
 <header className="l54-header"><div className="l54-brand"><button className="l54-mark" aria-label="回到主页" onClick={()=>navigate('home')}><ThunderboltFilled/></button><b>Lumi<span>your everyday copilot</span></b><Button type="text" size="small" className="l54-version" onClick={()=>setAbout(true)}>V5.4</Button></div><nav aria-label="主要导航"><Segmented value={view} onChange={navigate} options={[{label:'主页',value:'home',icon:<HomeOutlined/>},{label:'聊天',value:'chat',icon:<MessageOutlined/>},{label:'项目',value:'projects',icon:<FolderOutlined/>}]}/></nav><div className="l54-header-actions">{view==='chat'&&<Popover trigger="click" open={historyOpen} onOpenChange={setHistoryOpen} content={history} placement="bottomRight"><Button type="text" className="l54-history-global" icon={<HistoryOutlined/>} aria-label={`切换会话，当前：${activeSession.title}`} title={activeSession.title}/></Popover>}<Tooltip title="搜索 · Ctrl K"><Button type="text" icon={<SearchOutlined/>} aria-label="搜索" onClick={()=>setSearch(true)}><span className="l54-search-label">搜索 <kbd>⌘ K</kbd></span></Button></Tooltip><Tooltip title="工作台"><Button type="text" icon={<AppstoreOutlined/>} aria-label="打开工作台" onClick={()=>{setWbOpen(v=>!v);setNotifications(false);}}/></Tooltip><Badge count={unread} size="small" offset={[-5,5]}><Button type="text" icon={<BellOutlined/>} aria-label={`通知中心，${unread} 条未读`} onClick={()=>{setNotifications(v=>!v);setWbOpen(false);}}/></Badge><Dropdown trigger={['click']} menu={{items:[{key:'account',icon:<SettingOutlined/>,label:'设置'},{key:'appearance',icon:<HomeOutlined/>,label:'外观'},{key:'connections',icon:<GlobalOutlined/>,label:'账号与连接'},{type:'divider'},{key:'about',icon:<InfoIcon/>,label:'关于此预览'}],onClick:({key})=>key==='about'?setAbout(true):openSettings(key)}}><Button type="text" className="l54-account" aria-label="账户菜单"><Avatar size={30}>J</Avatar></Button></Dropdown><Dropdown trigger={['click']} menu={{items:[{key:'new-chat',label:'新对话',icon:<PlusOutlined/>},{key:'history',label:'切换会话',icon:<HistoryOutlined/>,children:sessions.map(item=>({key:`session:${item.id}`,label:item.title}))},{type:'divider'},{key:'search',label:'搜索',icon:<SearchOutlined/>},{key:'settings',label:'设置',icon:<SettingOutlined/>},{key:'work',label:'工作台',icon:<AppstoreOutlined/>},{key:'about',label:'关于预览'}],onClick:({key})=>key==='new-chat'?newChat():key.startsWith('session:')?continueChat(key.slice(8)):key==='search'?setSearch(true):key==='settings'?openSettings():key==='work'?openWorkbench():setAbout(true)}}><Button type="text" icon={<MenuOutlined/>} aria-label="更多导航" className="l54-mobile-more"/></Dropdown></div></header>
 <main id="l54-main" ref={main} tabIndex={-1} className={`l54-main ${view==='home'?'home-page':''}`}>
 {isPageSettings?<div className="l54-settings-page">{settingsView}</div>:view==='home'?<div className="l54-home-scroll"><Home onNavigate={navigate} onOpenNotifications={()=>{setNotifications(true);setWbOpen(false);}} onOpenPlan={openPlan} onContinue={continueChat} pendingCount={pending} onPrompt={text=>{setDraft(text);document.getElementById('home-input')?.focus();}}><Composer scope="home" home value={draft} onChange={setDraft} onSend={send} config={config} onConfig={changeConfig} onOpenSettings={openSettings}/></Home></div>:view==='chat'?<div className="ref54-chat-layout has-panel"><section className="l54-chat-page" aria-label={activeSession.title}><ChatThread showToolPill={settings.general.toolPill} session={activeSession} replyActivity={replyActivities[sessionId]} replyIndex={reply?.index} onRegenerate={regenerate} onReply={r=>{setReply(r);document.getElementById(`${sessionId}-input`)?.focus();}} onOpenWorkbench={openWorkbench} onAnswer={answer} onInputAnswer={index=>setReply({questionIndex:index,index,author:'Lumi',text:activeSession.messages[index].decision.title})} onWithdraw={index=>{setWithdraw(index);}}/><Composer scope={sessionId} value={draft} onChange={setDraft} onSend={send} config={config} onConfig={changeConfig} reply={reply} onCancelReply={()=>setReply(null)} onOpenSettings={openSettings}/></section><ChatPanel/></div>:<Projects replyActivities={replyActivities} showToolPill={settings.general.toolPill} projects={projects} selected={projectId} onSelect={id=>{setProjectId(id);if(id)setConfigs(c=>c[`project-${id}`]?c:{...c,[`project-${id}`]:defaultConfig()});}} onAdd={p=>setProjects(v=>[...v,p])} sessions={sessions} onContinue={continueProject} draft={draft} onDraft={setDraft} config={config} onConfig={changeConfig} onOpenSettings={openSettings} onOpenWorkbench={openWorkbench} projectMessages={projectMessages} onRegenerate={(id,index)=>regenerate(index,id)} onSend={projectSend}/>}
 </main>
 
 <Workbench open={wbOpen} onClose={()=>setWbOpen(false)} activeTab={wbTab} onTabChange={setWbTab} onOpenPlan={openPlan} onOpenSettings={openSettings} onGoChat={continueChat} mode={config.mode} onSwitchMode={()=>changeConfig({mode:'execute'})}/>
 <Notifications open={notifications} onClose={()=>setNotifications(false)} onOpenWorkbench={openWorkbench} onOpenSettings={openSettings} onGoChat={continueChat}/>
 <Modal zIndex={1100} open={settingOpen&&settingMode==='modal'} onCancel={()=>setSettingOpen(false)} footer={null} closable={false} keyboard maskClosable={false} title={<span className="l54-sr-only">设置</span>} width={1080} className="l54-settings-modal" centered destroyOnHidden>{settingsView}</Modal>
 <Modal zIndex={1100} open={search} onCancel={()=>setSearch(false)} footer={null} title="搜索与跳转" width={600} className="l54-search-modal" destroyOnHidden><Input autoFocus size="large" prefix={<SearchOutlined/>} value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索会话、项目或设置…" aria-label="搜索会话项目与设置" allowClear/><div className="l54-search-results">{query&&!sessions.some(s=>s.title.toLowerCase().includes(query.toLowerCase()))&&!projects.some(p=>p.name.toLowerCase().includes(query.toLowerCase()))&&!settingsGroups.flatMap(g=>g[1]).some(x=>x[1].includes(query))&&<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的内容，换个关键词试试"/>}<small>对话</small>{sessions.filter(s=>s.title.toLowerCase().includes(query.toLowerCase())).map(s=><Button key={s.id} type="text" block icon={<MessageOutlined/>} onClick={()=>continueChat(s.id)}>{s.title}</Button>)}<small>设置</small>{settingsGroups.flatMap(g=>g[1]).filter(x=>x[1].includes(query)).map(([id,title,Icon])=><Button key={id} type="text" block icon={<Icon/>} onClick={()=>openSettings(id)}>{title}</Button>)}<small>项目</small>{projects.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())).map(p=><Button key={p.id} type="text" block icon={<FolderOutlined/>} onClick={()=>{navigate('projects');setProjectId(p.id);}}>{p.name}</Button>)}</div></Modal>
 <Modal open={withdraw!==null} onCancel={()=>setWithdraw(null)} title="预览会话撤回范围" okText="撤回这段会话" okButtonProps={{danger:true,disabled:withdraw!==null&&!!activeSession.messages.slice(withdraw).find(m=>m.changeSet?.status==='unknown')}} cancelText="保留会话" onOk={()=>{cancelAnchors(sessionId,activeSession.messages.slice(withdraw).map(item=>item.id).filter(Boolean));setSessions(list=>list.map(s=>s.id===sessionId?{...s,messages:s.messages.slice(0,withdraw)}:s));setWithdraw(null);setReply(null);message.success('已撤回示例会话范围；执行记录与外部影响保持');}}><p>将移除选中的用户消息及其后的 {withdraw!==null?activeSession.messages.length-withdraw-1:0} 条普通消息，任务、执行与批准记录保留。</p>{withdraw!==null&&activeSession.messages.slice(withdraw).some(m=>m.changeSet?.status==='unknown')?<Alert type="warning" showIcon title="关联文件结果待核实，整次撤回已阻止" description="这个样例包含不可核验的 ChangeSet，不能跳过文件检查而仅删除会话。先核实文件状态再重试。"/>:<Alert type="info" showIcon title="未发现关联文件修改" description="该段样例仅包含普通会话，撤回不会改动实际文件。"/>}<p className="l54-muted">外部发送、提交与其他副作用不能通过会话撤回逆转。</p></Modal>
 <Modal title="Lumi V5.4" open={about} onCancel={()=>setAbout(false)} footer={<Button type="primary" onClick={()=>setAbout(false)}>开始体验</Button>}><Tag color="blue">Ant Design 6.7.2</Tag><h2>更清晰的层次，更自然的协作。</h2><p>基于 V5.3 的流程，采用真实 Ant Design 组件重新设计。GitHub、天气、模型、账号与运行数据均为虚构样例。</p><Descriptions column={1} items={[{key:'scope',label:'本轮范围',children:'主页、聊天、项目、工作台、通知与23个设置栏目'},{key:'data',label:'数据',children:'刷新重置；没有真实模型调用或权限执行'},{key:'state',label:'状态',children:'设计探索，等待你的视觉与交互评审'}]}/><Button type="link" href="../lumi-v5.3/" target="_blank">打开 V5.3 对照 <ArrowRightOutlined/></Button></Modal>
 </div>;
}
function InfoIcon(){return <ThunderboltFilled/>;}
function Root(){
 const s=useSyncExternalStore(subscribeSettings,getSettingsSnapshot),systemDark=useMedia('(prefers-color-scheme:dark)'),reduce=useMedia('(prefers-reduced-motion:reduce)');
 const resolved=useMemo(()=>resolveAppearance(s.appearance,systemDark),[s.appearance,systemDark]);
 const palette=useMemo(()=>buildPalette(resolved),[resolved]);
 const {dark}=resolved,motion=s.appearance.motion&&!reduce;
 useLayoutEffect(()=>{
  const root=document.documentElement;
  root.classList.add('l54-theme-sync');
  root.dataset.theme=dark?'dark':'light';document.body.dataset.theme=dark?'dark':'light';
  root.dataset.palette=resolved.source;root.dataset.motion=motion?'full':'reduced';
  root.dataset.styleTheme=resolved.styleTheme;root.dataset.messageStyle=s.appearance.messageStyle||'hybrid';
  root.dataset.themeFamily=resolved.custom?'custom':resolved.preset?.family||'other';
  root.style.fontSize=`${s.appearance.fontSize+2}px`;
  root.dataset.background=s.appearance.background;root.dataset.weather=s.appearance.weather;
  // Clear family-only roles before switching to preserved themes or a wallpaper.
  ['--home-surface','--home-soft','--canvas-ink','--canvas-muted','--brand-warm','--canvas-warm','--scene-alpha-a','--scene-alpha-b'].forEach(name=>root.style.removeProperty(name));
  Object.entries(palette.vars).forEach(([name,value])=>root.style.setProperty(name,value));
  root.style.setProperty('--l54-wallpaper',s.appearance.wallpaper?`url("${s.appearance.wallpaper}")`:'none');
  void root.offsetHeight;
  const frame=requestAnimationFrame(()=>root.classList.remove('l54-theme-sync'));
  return()=>{cancelAnimationFrame(frame);root.classList.remove('l54-theme-sync');};
 },[dark,motion,s.appearance,palette,resolved.source]);
 return <ConfigProvider locale={zhCN} theme={{algorithm:dark?theme.darkAlgorithm:theme.defaultAlgorithm,token:{...palette.antd,borderRadius:9,controlHeight:36,fontSize:s.appearance.fontSize,fontFamily:'"Segoe UI Variable Text","Segoe UI","Microsoft YaHei",sans-serif',motion},components:{...palette.components,Card:{borderRadiusLG:16},Modal:{borderRadiusLG:16},Menu:{itemBorderRadius:7,itemHeight:36}}}}><AntApp message={{top:88}}>{resolved.styleTheme!=='classic'&&!resolved.custom&&<ThemeBackdrop running={motion&&s.appearance.backgroundMotion!==false}/>}<Lumi/></AntApp></ConfigProvider>;
}
createRoot(document.getElementById('root')).render(<Root/>);
