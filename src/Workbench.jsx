import React, {useEffect, useState, useSyncExternalStore} from 'react';
import {Alert, Badge, Button, Card, Collapse, Descriptions, Drawer, Empty, Form, Input, Popconfirm, Segmented, Select, Space, Steps, Switch, Tabs, Tag, Tooltip} from 'antd';
import {ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, ClockCircleOutlined, CodeOutlined, FileTextOutlined, GlobalOutlined, LaptopOutlined, LockOutlined, PauseCircleOutlined, PlayCircleOutlined, SafetyCertificateOutlined, ScheduleOutlined} from '@ant-design/icons';
import './workbench.css';
import {getTaskStatus} from './work-status';

// Shared sample state: approvals and delivery stay consistent across both surfaces.
let state = {
  approval: 'pending', delivery: 'failed', read: ['dependency-digest'], browser: 'bot', privateMode: false,
  online: true, isolated: false, previewPaused: false, selectedTask: 'login',
  tasks: [
    {id:'login',title:'重构登录页',project:'Lumi Assistant',session:'s1',status:'running',version:1,accepted:true,execution:1,goal:'改善登录页的窄屏排版、表单反馈与键盘操作。',steps:['梳理页面和验收项','调整布局与表单反馈','运行构建并检查窄屏','整理成果与未验证事项'],events:['11:38 · 已整理目标与验收清单','11:40 · 检索子代理提交组件对照','11:42 · jack-pc 请求运行一次构建']},
    {id:'upgrade',title:'AntDUI 升级评估',project:'Lumi Assistant',session:'s3',status:'plan',version:2,accepted:false,execution:null,goal:'只评估升级风险，先不安装依赖或修改项目。',steps:['核对当前组件用法','对照变更说明与兼容性','列出风险与回退条件','整理评估报告，不修改项目'],events:['10:18 · 已读取示例变更说明','10:24 · 方案 v2 已保存，等待讨论']},
    {id:'weekly',title:'整理本周项目摘要',project:'个人知识库',session:'s4',status:'partial',version:1,accepted:true,execution:1,goal:'汇总项目动态并注明未能核实的来源。',steps:['收集本周动态','核对原始来源','生成带引用的摘要','在来源会话交付'],events:['09:00 · 完成 2 个示例来源的读取','09:02 · 第 3 个来源需要重新登录','09:04 · 已保存部分报告，未重试受限来源']}
  ],
  schedules:[
    {id:'morning',name:'每天的项目简报',kind:'work',frequency:'daily',time:'09:00',date:'2026-11-27',target:'本周项目摘要',description:'读取已授权的项目动态，有变化时在来源会话报告。',enabled:true,run:'已完成',delivery:'投递失败'},
    {id:'review',name:'周一整理待办',kind:'reminder',frequency:'weekly',time:'10:00',date:'2026-11-30',target:'整理这周的工作',description:'提醒自己整理本周待办，不委派 Agent 执行工作。',enabled:false,run:'尚未运行',delivery:'尚未投递'},
    {id:'watch',name:'关注依赖更新',kind:'work',frequency:'daily',time:'14:00',date:'2026-11-27',target:'AntDUI 升级评估',description:'只读检查示例更新说明；不安装、提交或部署。',enabled:true,run:'运行中',delivery:'等待结果'}
  ]
};
const listeners = new Set();
let environmentRevision = 0;
function patch(next){state={...state,...next};listeners.forEach(fn=>fn());}
function updateTask(id,values){patch({tasks:state.tasks.map(task=>task.id===id?{...task,...values}:task)});}
function syncEnvironment({online=state.online,isolated=state.isolated}){
  online=Boolean(online);isolated=Boolean(isolated);
  if(online===state.online&&isolated===state.isolated)return;
  environmentRevision+=1;
  const restricted=!online||isolated;
  const enteringRestore=isolated&&!state.isolated;
  patch({online,isolated,
    ...(restricted?{
      browser:'unknown',
      approval:state.approval==='requested'?'unknown':state.approval,
      delivery:state.delivery==='retrying'?'failed':state.delivery,
      deliveryError:state.delivery==='retrying'?'运行环境发生变化；请核对连接后再重试。':state.deliveryError,
      tasks:state.tasks.map(task=>['running','waiting','stopping'].includes(task.status)?{...task,status:'unknown',events:[...task.events,enteringRestore?'现在 · 恢复隔离：旧执行结果需要重新核实':'现在 · 连接中断：在途执行结果待核实，不自动重跑']}:task)
    }:{}),
    ...(enteringRestore?{schedules:state.schedules.map(schedule=>({...schedule,enabled:false,run:schedule.run==='运行中'?'结果待核实':schedule.run}))}: {})
  });
}
export function useWorkflowState(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>state);}
export const statusNames={running:'运行中',stopping:'正在停止',stopped:'已停止',plan:'方案待讨论',partial:'部分完成',cancelled:'已取消',unknown:'结果待核实',done:'已交付待验证'};
const approvalNames={pending:'待批准',requested:'等待回执',approved:'已批准一次',denied:'已拒绝',unknown:'回执待核实',revoked:'授权已撤销'};
const deliveryNames={failed:'投递失败',retrying:'正在重试',delivered:'已重发 · 送达未知'};
export function notificationRecords(snapshot=state){return [
  {id:'login-approval',kind:'approval',title:snapshot.approval==='pending'?'构建需要一次批准':snapshot.approval==='requested'?'构建批准正在等待回执':snapshot.approval==='unknown'?'构建批准回执待核实':'构建批准已有记录',source:'重构登录页',time:'11:42',description:'jack-pc · 登录页改动 · 仅这一次构建。',status:approvalNames[snapshot.approval],needsAction:snapshot.approval==='pending',session:'s1'},
  {id:'morning-delivery',kind:'delivery',title:snapshot.delivery==='delivered'?'项目简报的通知已重发':snapshot.delivery==='retrying'?'正在重试项目简报通知':'项目简报的通知未送达',source:'定时简报',time:'09:04',description:'报告已保存在来源会话，工作无需重跑。',status:deliveryNames[snapshot.delivery],needsAction:snapshot.delivery!=='delivered',session:'s4'},
  {id:'github-digest',kind:'update',title:'关注的项目有 3 条新动态',source:'GitHub 关注',time:'10:30',description:'组件修复、发布说明与兼容性讨论，已整理为简报。',status:'新动态',needsAction:false,session:'s4'},
  {id:'dependency-digest',kind:'update',title:'升级评估方案已保存',source:'AntDUI 升级评估',time:'10:24',description:'风险与回退条件已整理，可以接着上次继续讨论。',status:'方案已保存',needsAction:false,session:'s3'}
];}
export const workflowActions={
  markRead(id,read=true){patch({read:read?[...new Set([...state.read,id])]:state.read.filter(x=>x!==id)});},
  markAllRead(){patch({read:notificationRecords().map(x=>x.id)});},
  syncEnvironment,
  setEnvironment:syncEnvironment,
  approve(allow){if(state.approval!=='pending'||(allow&&(!state.online||state.isolated||['stopping','stopped','cancelled','unknown'].includes(state.tasks[0].status))))return false;const revision=environmentRevision;patch({approval:allow?'requested':'denied'});if(allow)setTimeout(()=>{if(state.approval!=='requested'||revision!==environmentRevision)return;patch({approval:state.online&&!state.isolated?'approved':'unknown'});},650);return true;},
  retry(){if(state.delivery!=='failed'||!state.online||state.isolated)return;const revision=environmentRevision;patch({delivery:'retrying',deliveryError:''});setTimeout(()=>{if(revision!==environmentRevision||state.delivery!=='retrying')return;patch({delivery:state.online&&!state.isolated?'delivered':'failed'});},650);},
  selectTask(id){patch({selectedTask:id});},
  stop(id){const task=state.tasks.find(x=>x.id===id);if(!task||!['running','waiting'].includes(task.status)||!state.online||state.isolated)return;const revision=environmentRevision;updateTask(id,{status:'stopping',events:[...task.events,'现在 · 已发出模拟停止请求，等待回执']});setTimeout(()=>{const fresh=state.tasks.find(x=>x.id===id);if(fresh.status!=='stopping'||revision!==environmentRevision)return;updateTask(id,{status:state.online&&!state.isolated?'stopped':'unknown',events:[...fresh.events,state.online&&!state.isolated?'现在 · 模拟执行端已确认停止':'现在 · 连接变化，停止结果待核实']});},650);},
  resume(id){const task=state.tasks.find(x=>x.id===id);if(!task||task.status!=='stopped'||!state.online||state.isolated)return;updateTask(id,{status:'running',events:[...task.events,'现在 · 核对已有进度后接续；没有重放已完成动作']});},
  cancel(id){const task=state.tasks.find(x=>x.id===id);updateTask(id,{status:'cancelled',events:[...task.events,'现在 · 已放弃后续目标；已有记录与外部影响保留']});},
  verify(id){const task=state.tasks.find(x=>x.id===id);if(!task||task.status!=='unknown'||!state.online||state.isolated)return;updateTask(id,{status:'stopped',events:[...task.events,'现在 · 模拟核对旧运行记录：已停止，未重复执行']});},
  savePlan(id,goal){const task=state.tasks.find(x=>x.id===id);updateTask(id,{goal,version:task.version+1,accepted:false,events:[...task.events,`现在 · 方案 v${task.version+1} 已保存，等待重新认可`]});},
  acceptPlan(id){updateTask(id,{accepted:true});},
  executePlan(id){const task=state.tasks.find(x=>x.id===id);if(!task?.accepted||['running','stopping','unknown','cancelled'].includes(task.status)||!state.online||state.isolated)return;updateTask(id,{status:'running',execution:task.version,events:[...task.events,`现在 · 按已认可方案 v${task.version} 开始模拟执行`]});},
  takeover(){if(!state.online||state.privateMode||state.isolated||['unknown','handing','observing'].includes(state.browser))return;const revision=environmentRevision,returning=state.browser==='user';patch({browser:returning?'observing':'handing'});setTimeout(()=>{if(revision!==environmentRevision||state.privateMode)return;patch({browser:state.online&&!state.isolated?(returning?'bot':'user'):'unknown'});},650);},
  verifyBrowser(){if(!state.online||state.isolated||state.privateMode||state.browser!=='unknown')return;patch({browser:'user'});},
  privateMode(value){patch({privateMode:value,...(value&&['handing','observing'].includes(state.browser)?{browser:'unknown'}:{})});},
  setSchedule(id,enabled){if(enabled&&(!state.online||state.isolated))return;patch({schedules:state.schedules.map(s=>s.id===id?{...s,enabled}:s)});},
  saveSchedule(value){patch({schedules:value.id?state.schedules.map(s=>s.id===value.id?{...s,...value}:s):[...state.schedules,{...value,id:`schedule-${Date.now()}`,enabled:false,run:'尚未运行',delivery:'尚未投递'}]});}
};

export function ApprovalContent({compact=false,onOpenSettings}){
  const snapshot=useWorkflowState(),taskStopped=['stopping','stopped','cancelled','unknown'].includes(snapshot.tasks[0].status),blocked=!snapshot.online||snapshot.isolated||taskStopped;
  return <section className="w54-approval" aria-label="单次构建批准">
    {compact?<p className="w54-approval-source"><SafetyCertificateOutlined/> jack-pc · 单次构建</p>:<div className="w54-section-heading"><span className="w54-symbol warning"><SafetyCertificateOutlined/></span><div><h3>{snapshot.approval==='pending'?'允许这一次构建？':'构建批准记录'}</h3><p>jack-pc · 重构登录页</p></div><Tag color={snapshot.approval==='pending'?'gold':'default'}>{approvalNames[snapshot.approval]}</Tag></div>}
    <Descriptions column={1} size="small" items={[{key:'action',label:'动作',children:<code>npm run build</code>},{key:'scope',label:'范围',children:<span>C:/Projects/Lumi <small>（示例）</small></span>},{key:'expiry',label:'有效期',children:'仅这一次构建'}]}/>
    <p className="w54-note">可能生成项目内构建产物。不包含安装、删除、网络发布或扩大访问范围。</p>
    {blocked&&<Alert type="warning" showIcon title={taskStopped?'任务当前不能继续执行':'运行环境需要核对'} description={taskStopped?'先核对任务停止或未知状态，再决定是否接续。已有记录保持。':'当前连接或恢复状态不允许新的执行。已有记录仍可查看。'} action={!taskStopped&&<Button size="small" onClick={()=>onOpenSettings?.('devices/core')}>检查设置</Button>}/>}
    {snapshot.approval==='pending'?<div className="w54-actions"><Button onClick={()=>workflowActions.approve(false)}>拒绝此次</Button><Button type="primary" disabled={blocked} onClick={()=>workflowActions.approve(true)}>仅批准这一次</Button></div>:<Alert type={snapshot.approval==='approved'?'success':'info'} showIcon title={approvalNames[snapshot.approval]} description={snapshot.approval==='requested'?'正在等待模拟执行端回执。':snapshot.approval==='approved'?'单次批准已记录；构建结果仍需单独核验。':snapshot.approval==='denied'?'本次构建未执行；任务与已有成果保留。':'旧回执无法确认，请先核对运行状态。'}/>}
  </section>;
}

function Plan({task,mode,onSwitchMode}){
  const environment=useWorkflowState(),blocked=!environment.online||environment.isolated||['unknown','cancelled'].includes(task.status);
  const [editing,setEditing]=useState(false),[goal,setGoal]=useState(task.goal);
  useEffect(()=>{setGoal(task.goal);setEditing(false);},[task.id]);
  return <div className="w54-plan">
    <div className="w54-section-heading"><h3>方案 v{task.version}</h3><Tag color={task.accepted?'green':'default'}>{task.accepted?'已认可':'待讨论'}</Tag></div>
    {editing?<Form layout="vertical" onFinish={()=>{if(goal.trim()){workflowActions.savePlan(task.id,goal.trim());setEditing(false);}}}><Form.Item label="目标与范围" required><Input.TextArea value={goal} onChange={e=>setGoal(e.target.value)} autoSize={{minRows:3,maxRows:8}}/></Form.Item><Space><Button type="primary" htmlType="submit" disabled={!goal.trim()}>保存新版本</Button><Button onClick={()=>setEditing(false)}>取消</Button></Space></Form>:<p className="w54-lead">{task.goal}</p>}
    <p className="w54-caption">以下为方案顺序；当前执行状态与回执见“执行记录”。</p>
    <Steps orientation="vertical" size="small" current={-1} items={task.steps.map(title=>({title}))}/>
    <Collapse ghost items={[{key:'bounds',label:'范围、风险与版本关系',children:<><p>设备或来源不可用时暂停相关步骤；未知结果先核实。当前方案不授权安装、提交或部署。</p><Descriptions size="small" column={1} items={[{key:'version',label:'版本关系',children:task.version>1?`基于 v${task.version-1} 修订；旧记录保留`:'首次保存版本'},{key:'execution',label:'执行版本',children:task.execution?`已有执行仍采用 v${task.execution}`:'尚未执行'},{key:'check',label:'验收',children:'对照目标列出检查、证据与未验证部分'}]}/></>} ]}/>
    {blocked&&<Alert type="warning" showIcon title="暂不能开始执行" description={task.status==='unknown'?'旧执行结果需要先核实，不能重复提交。':task.status==='cancelled'?'此任务已取消，已有方案与记录保留。':'先核对 Core 连接与恢复状态；保存与讨论方案仍可继续。'}/>}
    <div className="w54-actions"><Button onClick={()=>setEditing(true)}>修订方案</Button>{!task.accepted?<Button type="primary" onClick={()=>workflowActions.acceptPlan(task.id)}>认可这个版本</Button>:['running','stopping'].includes(task.status)?<Tag color="processing">已有执行 · v{task.execution}</Tag>:mode==='plan'?<Button disabled={blocked} onClick={onSwitchMode}>先切到 Build</Button>:<Popconfirm disabled={blocked} title={`按方案 v${task.version} 模拟执行？`} description="仅本页样例；需要额外权限的动作仍会单独请求。" okText="开始模拟执行" cancelText="取消" onConfirm={()=>workflowActions.executePlan(task.id)}><Button type="primary" disabled={blocked}>按此版本执行</Button></Popconfirm>}</div>
    <p className="w54-caption">保存、认可与开始执行是三个独立动作。</p>
  </div>;
}

function Sources(){return <div className="w54-sources">{[{name:'组件变更说明',address:'docs.example.invalid/releases',tag:'已核实',tone:'green',detail:'已对照示例原文与适用版本；不是运行测试。'},{name:'项目迁移记录',address:'notes.example.invalid/migration',tag:'已读取',tone:'default',detail:'尚未独立交叉核实，更新时间未知。'},{name:'社区兼容性讨论',address:'community.example.invalid/topic',tag:'仅搜到',tone:'gold',detail:'全文受限；摘要不能支持已验证结论。'}].map(s=><article key={s.name}><div><strong>{s.name}</strong><Tag color={s.tone}>{s.tag}</Tag></div><small>{s.address}</small><p>{s.detail}</p></article>)}</div>}

function Artifacts(){
  const [selected,setSelected]=useState('diff');
  return <div><div className="w54-section-heading"><h3>成果与证据</h3><Tag>3 项 · 合成内容</Tag></div><Segmented aria-label="成果类型" block value={selected} onChange={setSelected} options={[{label:'改动对照',value:'diff'},{label:'页面预览',value:'preview'},{label:'摘要报告',value:'report'}]}/>
    {selected==='diff'?<div className="w54-code"><header><CodeOutlined/> Login.tsx <Tag>+42 −18</Tag></header><pre><span className="muted">{'// 示例片段，不是工作区文件\n'}</span><span className="removed">{'- <div className="login-form">\n'}</span><span className="added">{'+ <form aria-describedby="login-hint">\n+   <p id="login-hint">使用工作邮箱登录</p>\n+   <button type="submit">继续</button>'}</span></pre></div>:selected==='preview'?<div className="w54-synthetic-login"><Tag>合成页面</Tag><div className="w54-demo-logo">L</div><h3>欢迎回来</h3><p>登录页布局示例，不接受真实凭据。</p><div className="w54-fake-input">name@example.test</div><div className="w54-fake-submit">继续</div></div>:<article className="w54-report"><h3>本周的三件事</h3><p>登录页交互进入检查阶段，组件升级方案等待讨论，知识库已整理出可复用说明。</p><h4>已经核对</h4><ul><li>两个示例来源的时间与适用范围。</li><li>每条结论与对应来源说明。</li></ul><h4>仍待确认</h4><p>一个受限来源未能读取；结论不是完整项目验收。</p><Collapse ghost items={[{key:'sources',label:'引用与来源',children:<Sources/>}]}/></article>}
    <Descriptions column={1} size="small" items={[{key:'checks',label:'示例检查',children:selected==='report'?'引用、时间、未核实范围':'字段顺序、错误说明、响应式目标'},{key:'limitations',label:'未验证',children:'真实构建、真实浏览器与业务结果'},{key:'status',label:'交付状态',children:'展示成果，不表示已验收'}]}/>
  </div>;
}

function BrowserPanel({onOpenSettings}){
  const s=useWorkflowState(),moving=['handing','observing'].includes(s.browser),blocked=!s.online||s.isolated;
  const names={bot:'Lumi 控制中',user:'你已接管',handing:'正在移交',observing:'重新观察中',unknown:'控制权待核实'};
  return <div><div className="w54-section-heading"><GlobalOutlined/><h3>浏览器工作现场</h3><Tag color={s.browser==='user'?'green':'processing'}>{names[s.browser]}</Tag></div><div className="w54-browser-address"><LockOutlined/><span>demo.lumi.local/weekly</span><Tag>示例</Tag></div>
    <div className={`w54-browser-preview ${s.privateMode?'is-private':''}`}>{s.privateMode||blocked||s.browser==='unknown'?<><LockOutlined/><h3>{s.privateMode?'预览已遮蔽':'预览等待重新核对'}</h3><p>{s.privateMode?'私密输入期间暂停观察与自动操作。':'连接或控制权变化后，不展示旧画面为实时状态。'}</p></>:<><div className="w54-browser-logo">L<span>Weekly notes</span></div><h3>本周工作日志</h3><p>登录页交互与组件评估</p><div className="w54-preview-line"/><div className="w54-preview-line short"/><div className="w54-preview-task"><CheckCircleOutlined/> 已整理项目变更</div><div className="w54-preview-task"><ClockCircleOutlined/> 等待来源核验</div><small>本地合成画面 · 无真实浏览器控制</small></>}</div>
    <p className="w54-note" role="status">{s.privateMode?'这里只演示遮蔽状态，不接收密码或验证码。':blocked?'自动操作与接管暂不可用，请核对 Core 与恢复状态。':s.browser==='unknown'?'连接已恢复也不自动接续；先核对控制权，再交还并重新观察。':s.browser==='user'?'你接管期间，Lumi 不操作这个会话。交还后先重新观察。':s.browser==='observing'?'正在模拟重新观察，尚未恢复自动操作。':s.browser==='handing'?'正在等待移交回执，尚未宣称已接管。':'最近动作：读取示例页面结构。'}</p>
    <div className="w54-actions"><Button onClick={()=>onOpenSettings?.('browser')}>浏览器设置</Button><Button type="primary" loading={moving} disabled={blocked||s.privateMode} onClick={()=>s.browser==='unknown'?workflowActions.verifyBrowser():workflowActions.takeover()}>{s.browser==='unknown'?'核对控制权':s.browser==='user'?'交还并重新观察':'接管这个会话'}</Button></div>
    <div className="w54-setting-row"><div><strong>私密输入示例</strong><small>暂停预览与自动操作</small></div><Switch aria-label="私密输入示例" checked={s.privateMode} onChange={workflowActions.privateMode}/></div>
    <Collapse ghost items={[{key:'events',label:'动作记录',children:<ol className="w54-event-list"><li>14:02 · 打开合成工作日志</li><li>14:03 · 读取示例页面结构</li><li>14:04 · {names[s.browser]}</li></ol>}]}/>
  </div>;
}

function LocalPanel({onOpenSettings}){
  const [device,setDevice]=useState('local'),s=useWorkflowState();
  const pending=s.approval==='pending';
  return <div><div className="w54-section-heading"><h3>执行位置</h3><Badge status={s.online?'success':'warning'} text={s.online?'连接正常':'连接中断'}/></div><Segmented block value={device} onChange={setDevice} aria-label="执行设备" options={[{label:'本机',value:'local'},{label:'jack-pc',value:'jack'},{label:'云端',value:'cloud'}]}/>
    {device==='cloud'?<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未连接云端执行设备"><Button onClick={()=>onOpenSettings?.('devices/core')}>查看设备连接</Button></Empty>:device==='jack'?<div className="w54-command"><div><CodeOutlined/><code>npm run build</code></div><Tag color={pending||s.approval==='unknown'?'gold':'default'}>{pending?'等待批准':s.approval==='denied'?'未执行':approvalNames[s.approval]}</Tag><p>jack-pc · C:/Projects/Lumi · 示例路径</p><small>{pending?'尚未执行；需要限定范围的单次批准。':'批准记录与实际构建结果分开呈现。'}</small></div>:<div className="w54-command"><div><CodeOutlined/><code>git status</code></div><Tag color="green">示例已完成</Tag><p>Lumi-PC · C:/Projects/Lumi · 0.2s</p><small>3 个已修改文件，没有未解决冲突。</small></div>}
    <Button icon={<LaptopOutlined/>} onClick={()=>onOpenSettings?.('devices/core')}>管理 Core 与设备</Button><p className="w54-caption">仅展示合成记录，不会运行命令或连接真实设备。</p>
  </div>;
}

function Schedules(){
  const {schedules,online,isolated,delivery}=useWorkflowState();const [editing,setEditing]=useState(null),[filter,setFilter]=useState('all');const [form]=Form.useForm();
  function edit(s){setEditing(s||{});form.setFieldsValue(s||{name:'',kind:'reminder',frequency:'daily',time:'09:00',date:'2026-11-27',target:'整理这周的工作',description:''});}
  return <div><div className="w54-section-heading"><h3>定时工作</h3><Button size="small" type="primary" onClick={()=>edit(null)}>新建安排</Button></div>
    {editing?<Form form={form} layout="vertical" onFinish={values=>{workflowActions.saveSchedule({...values,id:editing.id});setEditing(null);}}><Form.Item name="name" label="名称" rules={[{required:true,whitespace:true,message:'填写安排名称'}]}><Input/></Form.Item><Form.Item name="kind" label="类型"><Select options={[{label:'提醒自己',value:'reminder'},{label:'只读工作',value:'work'}]}/></Form.Item><Form.Item name="frequency" label="频率"><Select options={[{label:'每天',value:'daily'},{label:'每周一',value:'weekly'},{label:'仅一次',value:'once'}]}/></Form.Item><Form.Item name="time" label="时间 · 上海时区" rules={[{required:true,pattern:/^([01]\d|2[0-3]):[0-5]\d$/,message:'使用 HH:mm，例如 09:00'}]}><Input placeholder="09:00"/></Form.Item><Form.Item noStyle shouldUpdate={(previous,current)=>previous.frequency!==current.frequency}>{({getFieldValue})=>getFieldValue('frequency')==='once'?<Form.Item name="date" label="日期" rules={[{required:true,message:'选择一次性安排的日期'}]}><Input type="date"/></Form.Item>:null}</Form.Item><Form.Item name="target" label="来源会话"><Select options={['整理这周的工作','本周项目摘要','AntDUI 升级评估'].map(label=>({label,value:label}))}/></Form.Item><Form.Item name="description" label="内容与允许范围" rules={[{required:true,whitespace:true,message:'填写提醒内容或只读工作范围'}]}><Input.TextArea autoSize={{minRows:2,maxRows:5}}/></Form.Item><Alert type="info" title={editing.id?'修改未来安排，不重跑当前执行':'新安排先保存为未启用草稿'}/><div className="w54-actions"><Button onClick={()=>setEditing(null)}>取消</Button><Button htmlType="submit" type="primary">保存安排</Button></div></Form>:<><Segmented value={filter} onChange={setFilter} options={[{label:'全部',value:'all'},{label:'已启用',value:'enabled'},{label:'已暂停',value:'paused'}]}/><div className="w54-schedule-list">{schedules.filter(s=>filter==='all'||(filter==='enabled')===s.enabled).map(s=><article key={s.id}><div className="w54-section-heading"><Button type="text" onClick={()=>edit(s)}>{s.name}</Button><Switch size="small" aria-label={`启用${s.name}`} checked={s.enabled} disabled={!s.enabled&&(!online||isolated)} onChange={value=>workflowActions.setSchedule(s.id,value)}/></div><p>{s.kind==='reminder'?'提醒自己':'只读工作'} · {{daily:'每天',weekly:'每周一',once:'仅一次'}[s.frequency]} {s.time}</p><Tag>{s.enabled?'已启用':'未启用 / 已暂停'}</Tag><small>本次运行：{s.run} · {s.id==='morning'?deliveryNames[delivery]:s.delivery}</small></article>)}</div></>}
    <p className="w54-caption">未来安排与当前执行分开控制。仅本地样例，不会在未来运行或发送通知。</p>
  </div>;
}

const stepIndexFor=task=>task.status==='done'?task.steps.length:task.status==='plan'?0:Math.min(2,task.steps.length-1);
function needsFor(task,snapshot){
  if(task.id==='login'&&snapshot.approval==='pending'&&task.status==='running')return 'approval';
  if(task.status==='plan'&&!task.accepted)return 'plan';
  if(task.status==='partial')return 'review';
  return null;
}
function TaskList({tasks,snapshot,current,onPick}){
  const groups=[['needs','需要你',tasks.filter(t=>needsFor(t,snapshot))],['running','进行中',tasks.filter(t=>!needsFor(t,snapshot)&&['running','waiting','stopping'].includes(t.status))],['ended','已结束',tasks.filter(t=>!needsFor(t,snapshot)&&!['running','waiting','stopping'].includes(t.status))]];
  return <div className="w54-list">{groups.filter(([, ,list])=>list.length).map(([key,label,list])=><section key={key} className={`w54-group is-${key}`} aria-label={label}><h3><i aria-hidden="true"/>{label} · {list.length}</h3>{list.map(t=>{const status=getTaskStatus(t,snapshot);return <button type="button" key={t.id} className={`w54-task-row ${t.id===current?'is-current':''}`} onClick={()=>onPick(t.id)}><span className={`w54-task-icon tone-${status.tone}`} aria-hidden="true">{key==='needs'?<SafetyCertificateOutlined/>:key==='running'?<ClockCircleOutlined/>:<CheckCircleOutlined/>}</span><span className="w54-task-copy"><strong>{t.title}</strong><small>{status.label} · {t.project}</small></span><ArrowRightOutlined className="w54-task-go"/></button>;})}</section>)}</div>;
}
export default function Workbench({open,onClose,activeTab,onTabChange,onOpenPlan,onOpenSettings,onGoChat,mode='execute',onSwitchMode}){
  const s=useWorkflowState(),[listView,setListView]=useState(false),[tab,setTab]=useState('runs'),[taskTab,setTaskTab]=useState('overview'),[subview,setSubview]=useState(''),[query,setQuery]=useState('');
  const currentTab=activeTab||tab,task=s.tasks.find(t=>t.id===s.selectedTask)||s.tasks[0];
  const visibleStatus=getTaskStatus(task,s);
  const progressSummary=task.status==='plan'?(task.accepted?'方案已认可 · 等待开始':'方案待讨论 · 尚未开工'):task.status==='unknown'?'旧执行结果待核实，不显示实时进度':task.status==='stopping'?'停止请求已发出 · 等待执行端回执':task.status==='stopped'?'执行已停止 · 已有记录保留':task.status==='cancelled'?'后续工作已取消 · 已有记录保留':task.status==='partial'?'报告已保存 · 1 个来源受限':task.status==='done'?'成果已交付 · 仍需核验':'执行中 · 以最近回执为准';
  const activeRun=task.status==='running',needsVerification=task.status==='unknown';
  const stepIndex=stepIndexFor(task);
  const taskBlocked=!s.online||s.isolated||['stopping','stopped','cancelled','unknown'].includes(task.status);
  const needs=needsFor(task,s)==='approval'?{title:'批准一次构建',body:<>jack-pc 将运行 <code>npm run build</code>，只在当前项目内，不含安装、删除或发布。</>,actions:<><Button type="primary" disabled={taskBlocked} onClick={()=>workflowActions.approve(true)}>仅批准这一次</Button><Button onClick={()=>setSubview('approval')}>查看范围</Button><Button type="text" className="w54-deny" onClick={()=>workflowActions.approve(false)}>拒绝</Button></>}
   :needsFor(task,s)==='plan'?{title:'确认方案',body:'方案 v'+task.version+' 已保存。确认后才会开始，期间不安装依赖、不改项目。',actions:<Button type="primary" onClick={()=>setTaskTab('plan')}>查看方案</Button>}
   :needsFor(task,s)==='review'?{title:'复核受限来源',body:'第 3 个来源需要重新登录，报告已先保存，未自动重试。',actions:<Button type="primary" onClick={()=>setTaskTab('history')}>查看记录</Button>}:null;
  useEffect(()=>{setListView(false);if(activeTab==='approve')setSubview('approval');else if(activeTab==='plan'){setSubview('');setTaskTab('plan');}else setSubview('');},[activeTab]);
  function changeTab(key){setSubview('');setTab(key);onTabChange?.(key);}
  const content=currentTab==='browser'?<BrowserPanel onOpenSettings={onOpenSettings}/>:currentTab==='local'?<LocalPanel onOpenSettings={onOpenSettings}/>:currentTab==='artifacts'?<Artifacts/>:currentTab==='schedules'?<><Button type="text" icon={<ArrowLeftOutlined/>} onClick={()=>changeTab('runs')}>返回运行</Button><Schedules/></>:subview==='approval'||currentTab==='approve'?<ApprovalContent onOpenSettings={onOpenSettings}/>:listView?<TaskList tasks={s.tasks} snapshot={s} current={task.id} onPick={id=>{workflowActions.selectTask(id);setTaskTab('overview');setListView(false);}}/>:<>
    <Button type="text" size="small" className="w54-back" icon={<ArrowLeftOutlined/>} onClick={()=>setListView(true)}>全部任务 · {s.tasks.length}</Button>
    <header className="w54-head"><span className="w54-head-project">{task.project}</span><h2>{task.title}</h2>
     <div className="w54-head-meta"><span className={`w54-tone tone-${visibleStatus.tone}`} title={visibleStatus.detail}>{visibleStatus.label}</span><span>{stepIndex>=task.steps.length?'全部步骤完成':task.status==='plan'?`${task.steps.length} 步 · 尚未开工`:`第 ${stepIndex+1}/${task.steps.length} 步`}</span></div>
     <div className="w54-progress" role="progressbar" aria-label="步骤进度" aria-valuemin={0} aria-valuemax={task.steps.length} aria-valuenow={Math.min(stepIndex,task.steps.length)}><i style={{width:`${Math.min(stepIndex,task.steps.length)/task.steps.length*100}%`}}/></div>
    </header>
    {needs&&<section className="w54-needs" aria-label="需要你处理"><div className="w54-needs-head"><SafetyCertificateOutlined/>需要你 · {needs.title}</div><p>{needs.body}</p><div className="w54-needs-actions">{needs.actions}</div></section>}
    <Segmented block className="w54-task-seg" value={currentTab==='plan'?'plan':taskTab} onChange={key=>{setTaskTab(key);if(currentTab==='plan')changeTab('runs');}} options={[{value:'overview',label:'进度'},{value:'plan',label:'方案'},{value:'history',label:'记录'}]}/>
    {taskTab==='plan'||currentTab==='plan'?<Plan task={task} mode={mode} onSwitchMode={onSwitchMode}/>:taskTab==='history'?<ol className="w54-event-list">{task.events.map((event,i)=><li key={i}>{event}</li>)}</ol>:<>
      <ol className="w54-steps" aria-label="步骤">{task.steps.map((step,i)=>{const state=i<stepIndex?'done':i===stepIndex&&task.status!=='plan'?'now':'todo';return <li key={step} className={`is-${state}`}><span className="w54-step-mark" aria-hidden="true">{state==='done'?<CheckCircleOutlined/>:state==='now'?<ClockCircleOutlined/>:null}</span><div><span className="w54-step-title">{step}</span>{state==='now'&&<small>{progressSummary}</small>}</div><span className="l54-sr-only">{state==='done'?'已完成':state==='now'?'进行中':'未开始'}</span></li>;})}</ol>
      {task.id==='login'&&<Collapse ghost className="w54-agents-line" items={[{key:'agents',label:<span className="w54-agents-sum"><span className="w54-agent-dots" aria-hidden="true"><i/><i/></span>Lumi + 3 个子代理 · jack-pc</span>,children:<><div className="w54-agents"><div><Badge status={activeRun?'processing':needsVerification?'warning':'default'} text="Lumi"/><Tag>本机 Core</Tag><p>{activeRun?'协调当前执行':statusNames[task.status]}</p><small>检索子代理 · 已有 18 步示例记录</small><small>校验子代理 · {activeRun?'正在对比截图':statusNames[task.status]}</small></div><div><Badge status={needsVerification?'warning':activeRun&&s.approval==='approved'?'processing':'default'} text="jack-pc"/><Tag>已配对</Tag><p>批准记录：{approvalNames[s.approval]}</p><small>构建子代理 · {!activeRun?statusNames[task.status]:s.approval==='approved'?'等待构建结果':s.approval==='unknown'?'回执待核实':'尚未执行'}</small></div></div><Descriptions size="small" column={1} items={[{key:'location',label:'执行位置',children:'Lumi-PC 与 jack-pc（示例）'},{key:'context',label:'上下文',children:'62% · 2,437 tokens'},{key:'check',label:'检查',children:'仅演示，未做真实检查'}]}/></>}]}/>}
    </>}
    <div className="w54-task-actions">{['running','waiting'].includes(task.status)?<Popconfirm title="停止当前执行？" description="保留目标和成果，不撤销外部影响或未来安排。" okText="模拟停止" cancelText="取消" onConfirm={()=>workflowActions.stop(task.id)}><Button icon={<PauseCircleOutlined/>} disabled={!s.online||s.isolated}>停止</Button></Popconfirm>:task.status==='unknown'?<Button disabled={!s.online||s.isolated} onClick={()=>workflowActions.verify(task.id)}>核实执行结果</Button>:task.status==='stopped'?<Button icon={<PlayCircleOutlined/>} disabled={!s.online||s.isolated} onClick={()=>workflowActions.resume(task.id)}>核对并继续</Button>:null}<Button icon={<FileTextOutlined/>} onClick={()=>changeTab('artifacts')}>成果</Button><Button type="text" icon={<ArrowRightOutlined/>} onClick={()=>{onClose?.();onGoChat?.(task.session);}}>来源会话</Button></div>
    <Collapse ghost className="w54-more" items={[{key:'more',label:'其他任务操作',children:<><p className="w54-note">取消放弃后续目标，不撤销已经产生的外部影响。</p><Popconfirm title="取消这项任务？" okText="确认取消" cancelText="保留任务" onConfirm={()=>workflowActions.cancel(task.id)}><Button danger disabled={task.status==='cancelled'}>取消这项任务</Button></Popconfirm></>} ]}/>
  </>;
  return <Drawer title={<div className="w54-drawer-title"><span className="w54-symbol"><CodeOutlined/></span><div><strong>工作台</strong><small>工作进行到哪里，一眼看清</small></div></div>} open={open} onClose={onClose} mask={false} keyboard rootClassName="v54-workbench-drawer" styles={{wrapper:{width:'min(440px, 100vw)'},body:{padding:'0 20px 20px'}}} extra={<Tooltip title="定时工作"><Button type="text" aria-label="定时工作" icon={<ScheduleOutlined/>} onClick={()=>changeTab('schedules')}/></Tooltip>} footer={<div className="w54-drawer-footer"><Badge status={s.online?'success':'warning'} text={s.online?'演示 Core 在线':'演示 Core 离线'}/><span>本地模拟</span></div>}>
    <Tabs className="w54-main-tabs" activeKey={['approve','plan','schedules'].includes(currentTab)?'runs':currentTab} onChange={changeTab} items={[{key:'runs',label:'运行'},{key:'browser',label:'浏览器'},{key:'local',label:'本机'},{key:'artifacts',label:'产物'}]}/>{(!s.online||s.isolated)&&<Alert type="warning" showIcon title={s.isolated?'恢复隔离中':'连接已中断'} description="只显示已有记录，不代表在途工作已停止。"/>}{content}
  </Drawer>;
}

