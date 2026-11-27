import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Collapse, Dropdown, Empty, Modal, Popover, Tag, Tooltip } from 'antd';
import {
  ArrowRightOutlined, BellOutlined, CheckCircleFilled, DownOutlined,
  CodeOutlined, CommentOutlined, EllipsisOutlined, FileTextOutlined,
  GithubOutlined, ReloadOutlined, RightOutlined, SunOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import './home.css';
import './home-focus.css';
import './home-refresh.css';
import { notificationRecords, useWorkflowState } from './Workbench';
import { getTaskStatus } from './work-status';

const feeds = [
  { id: 'vscode', repo: 'microsoft / vscode', kind: '修复进展', icon: CodeOutlined,
    title: '终端恢复与扩展稳定性，有了新进展',
    note: '你关注的异常有了新的排查记录，适合在下次更新前核对。',
    detail: '样例记录：维护者补充了终端恢复与扩展宿主异常的排查方向。内容为虚构，未读取 GitHub，也不对应真实 issue 或发布日期。',
    prompt: '帮我整理一下 VS Code 终端恢复与扩展稳定性的排查思路。',
  },
  { id: 'dotnet', repo: 'dotnet / runtime', kind: '新讨论', icon: CommentOutlined,
    title: '启动性能，值得继续关注的改进方向',
    note: '与你常用技术栈相关的一条讨论。',
    detail: '样例记录：围绕冷启动开销的讨论出现了新的对照结果。真实产品应保留原始链接、抓取时间与核验范围；此处仅展示内容结构。',
    prompt: '整理一下 .NET 启动性能优化需要关注的方向。',
  },
  { id: 'notes', repo: 'lumi-labs / ui-notes', kind: '版本动态', icon: FileTextOutlined,
    title: '组件交互笔记，整理好了',
    note: '选择器、滑块与通知面板，各自承担什么职责。',
    detail: '样例仓库：一份关于就近选择、参数调整与持续通知的交互笔记。仓库及内容均为虚构设计样本。',
    prompt: '接着讨论选择器、滑块和通知面板的交互设计。',
  },
];

function localClock() {
  const date = new Date();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', hourCycle: 'h23' }).format(date));
  return {
    date: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', weekday: 'long' }).format(date),
    iso: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date),
    time: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date),
    greeting: hour < 5 ? '夜深了' : hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好',
  };
}

function SummaryLine({ icon: Icon, title, children }) {
  return <span className="h54-summary-line"><Icon /><strong>{title}</strong><span className="h54-summary-value">{children}</span></span>;
}

export default function Home({ children, onNavigate, onOpenNotifications, onOpenPlan, onContinue, onPrompt, pendingCount = 2, featuredTask }) {
  const workflow = useWorkflowState();
  const [clock, setClock] = useState(localClock);
  const [sourceState, setSourceState] = useState('healthy');
  const [refreshing, setRefreshing] = useState(false);
  const [updated, setUpdated] = useState('示例快照 · 18:20');
  const [status, setStatus] = useState('');
  const [opened, setOpened] = useState([]);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const refreshTimer = useRef(null);
  const refreshButton = useRef(null);
  const promptAfterClose = useRef(null);
  const featured = featuredTask || workflow.tasks.find(task => task.id === 'upgrade') || { id: 'upgrade', title: 'AntDUI 升级评估', project: 'Lumi Assistant', session: 's3', status: 'plan', version: 2, accepted: false, goal: '先看清升级范围与风险，再决定下一步。' };
  const featuredStatus = getTaskStatus(featured, workflow);
  const currentWork = workflow.tasks.filter(task => task.id !== featured.id).slice(0, 2);
  const pendingItem = notificationRecords(workflow).find(item => item.needsAction);
  const workSummary = currentWork.length ? currentWork.map(task => {
    const title = {login:'登录页',weekly:'项目摘要'}[task.id] || task.title;
    const label = getTaskStatus(task, workflow).label;
    return `${title}${label === '待你批准' ? '待批准' : label}`;
  }).join(' · ') : '暂时没有进行中的工作';

  useEffect(() => () => clearTimeout(refreshTimer.current), []);
  useEffect(() => { const timer = setInterval(() => setClock(localClock()), 60000); return () => clearInterval(timer); }, []);

  function changeSource(next) {
    clearTimeout(refreshTimer.current);
    setRefreshing(false);
    setSourceState(next);
    setStatus('');
    setOpened([]);
  }

  function refresh(retry = false) {
    if (refreshing) return;
    setRefreshing(true);
    setStatus('正在检查示例来源…');
    refreshTimer.current = setTimeout(() => {
      setRefreshing(false);
      if (retry) {
        setSourceState('healthy');
        refreshButton.current?.focus();
      }
      if (sourceState === 'offline' && !retry) { setStatus('未能更新，可重试'); return; }
      if (sourceState === 'empty') { setStatus('请先载入示例关注'); return; }
      setUpdated(`模拟更新 · ${localClock().time}`);
      setStatus('已是最新示例');
    }, 650);
  }

  const feedItems = feeds.map(feed => ({
    key: feed.id,
    label: <div className="h54-feed-label">
      <span className={`h54-feed-icon h54-feed-icon-${feed.id}`}><feed.icon /></span>
      <span className="h54-feed-copy"><span className="h54-repository">{feed.repo}</span><strong>{feed.title}</strong></span>
    </div>,
    extra: <Tag className="h54-feed-tag">{feed.kind}</Tag>,
    children: <div className="h54-feed-detail"><p>{feed.note}</p><p className="h54-muted">{feed.detail}</p>
      <Button size="small" icon={<CommentOutlined />} onClick={() => { promptAfterClose.current=feed.prompt; setBriefingOpen(false); }}>带到对话</Button>
    </div>,
  }));

  return <div className="h54-home h54-light-home">
    <section className="h54-start" aria-labelledby="h54Greeting">
      <div className="h54-start-meta">
        <time dateTime={`${clock.iso}T${clock.time}:00+08:00`}>{clock.date} · {clock.time}</time>
        <Popover trigger="click" placement="bottom" title="上海天气 · 示例" content={<div className="h54-weather-detail"><p>22° · 晴间多云 · 18° / 24°</p><p>晚些时候会凉，记得带件外套。</p><div className="h54-forecast" aria-label="示例小时天气">{[['现在','22°'],['20:00','20°'],['22:00','19°'],['明早','18°']].map(([time,degree])=><div key={time}><span>{time}</span><strong>{degree}</strong></div>)}</div><small>示例城市 · 未获取位置</small></div>}>
          <Button type="text" size="small" icon={<SunOutlined />} aria-label="上海22度，查看示例天气详情">上海 22° · 晚些时候转凉<DownOutlined /></Button>
        </Popover>
      </div>
      <header className="h54-start-heading"><h1 id="h54Greeting">{clock.greeting}。</h1><p>今天想一起做点什么？</p></header>
      {children}
      <nav className="h54-start-links" aria-label="继续已有对话">
        <Button type="text" icon={<CommentOutlined />} onClick={() => onContinue?.(featured.session || 's3')}>接着聊 · {featured.title}</Button>
        <Dropdown trigger={['click']} autoFocus open={recentOpen} onOpenChange={setRecentOpen} menu={{items:[{key:'s1',label:'整理这周的工作'},{key:'s2',label:'讨论首页布局'}],onClick:({key})=>{setRecentOpen(false);onContinue?.(key);}}}><Button type="text" aria-haspopup="menu" aria-expanded={recentOpen}>最近对话<RightOutlined /></Button></Dropdown>
      </nav>
    </section>

    <section className="h54-support" aria-label="工作与关注摘要">
      <Button type="text" className="h54-summary-action h54-decision-link" onClick={onOpenNotifications}>
        <SummaryLine icon={BellOutlined} title="需要你决定">{pendingItem?.title || '暂时没有待处理事项'}{pendingCount ? ` · ${pendingCount} 项待处理` : ' · 查看通知'}</SummaryLine><RightOutlined />
      </Button>
      <Collapse ghost className="h54-support-collapse" expandIconPlacement="end" items={[{key:'work',label:<SummaryLine icon={FileTextOutlined} title="当前工作">{workSummary}</SummaryLine>,children:<div className="h54-work-detail">
        <div className="h54-live-work" aria-label="当前工作摘要">
          {currentWork.map(task => {const taskState=getTaskStatus(task,workflow);return <button key={task.id} type="button" className={`h54-work-link tone-${taskState.tone}`} onClick={() => onContinue?.(task.session)} title={taskState.detail}><span><strong>{task.title}</strong><span className="h54-work-state">{taskState.label}</span><small>{taskState.detail}</small></span><RightOutlined /></button>;})}
          {!currentWork.length && <p className="h54-muted">暂时没有进行中的工作</p>}
        </div>
        <section className="h54-featured-plan"><h2>{featured.title}<small>{featuredStatus.label}</small></h2><p>{featured.goal || '查看已有方案与进度，再决定下一步。'}</p><span className="h54-muted">{featured.project || 'Lumi Assistant'} · 方案 v{featured.version || 1}</span><div className="h54-plan-actions"><Button size="small" onClick={() => onContinue?.(featured.session || 's3')}>继续讨论</Button><Button size="small" type="text" onClick={() => onOpenPlan?.(featured.id || 'upgrade')}>查看方案</Button></div></section>
        <Button type="text" size="small" onClick={() => onNavigate?.('projects')}>查看项目<ArrowRightOutlined /></Button>
      </div>}]} />
      <Button type="text" className="h54-summary-action" onClick={() => setBriefingOpen(true)}>
        <SummaryLine icon={GithubOutlined} title="关注动态">{sourceState==='empty'?'还没有关注来源':sourceState==='offline'?'来源暂时离线，上次内容仍可查看':'终端恢复与扩展稳定性，有了新进展'}</SummaryLine><RightOutlined />
      </Button>
      <Collapse ghost className="h54-support-collapse" expandIconPlacement="end" items={[{key:'research',label:<SummaryLine icon={ToolOutlined} title="排查线索">编辑器异常出现在扩展启动后</SummaryLine>,children:<div className="h54-research-detail">
        <h3>编辑器为什么会突然退出？</h3><p>异常都出现在扩展启动后；还需核对版本与复现条件。</p>
        <div className="h54-progress-steps" aria-label="样例排查进度"><div><CheckCircleFilled /><span><strong>崩溃记录已整理</strong><small>样例 · 2 次异常</small></span></div><div><span className="h54-step-current" /><span><strong>核对扩展冲突</strong><small>待确认复现条件</small></span></div></div>
        <dl><div><dt>已观察</dt><dd>虚构的两段日志中，异常都出现在扩展启动后。</dd></div><div><dt>待验证</dt><dd>还不能确定具体扩展，也不能据此认定软件缺陷。</dd></div><div><dt>下一步</dt><dd>核对扩展清单，在明确授权后逐项复现；本页不会读取日志或禁用扩展。</dd></div></dl>
      </div>}]} />
    </section>
    <footer className="h54-light-disclaimer">本地样例 · 未连接 GitHub、天气或设备日志</footer>

    <Modal title="关注动态 · GitHub" open={briefingOpen} onCancel={() => setBriefingOpen(false)} afterClose={() => { const text=promptAfterClose.current; promptAfterClose.current=null; if(text)onPrompt?.(text); }} footer={null} width={640} className="h54-brief-modal" destroyOnHidden>
      <section className="h54-home h54-brief-detail">
        <header className="h54-section-head">
          <div className="h54-section-title"><span>关注来源与更新</span></div>
          <div className="h54-actions">
            <Tooltip title="刷新关注动态"><Button ref={refreshButton} type="text" icon={<ReloadOutlined />} loading={refreshing} aria-label="刷新关注动态" onClick={() => refresh()} /></Tooltip>
            <Dropdown trigger={['click']} menu={{ selectedKeys: [sourceState], selectable: true,
              items: [{ key: 'healthy', label: '正常 · 已关注' }, { key: 'offline', label: '来源暂时离线' }, { key: 'empty', label: '尚未关注' }],
              onClick: ({ key }) => changeSource(key), }}>
              <Button type="text" icon={<EllipsisOutlined />} aria-label="动态面板示例状态" />
            </Dropdown>
          </div>
        </header>

        {sourceState === 'empty' ? <div className="h54-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><strong>把关注的事放在这里</strong><p>项目更新与讨论，可以整理成一份简报。</p></>}>
          <Button onClick={() => { changeSource('healthy'); setStatus('已载入 3 个示例来源'); refreshButton.current?.focus(); }}>载入示例关注</Button>
        </Empty></div> : <>
          <div className="h54-brief-lead"><h3>3 个更新，值得留意</h3></div>
          {sourceState === 'offline' && <Alert className="h54-source-alert" type="warning" showIcon title="来源暂时离线，保留上次内容。" action={<Button size="small" loading={refreshing} onClick={() => refresh(true)}>重试</Button>} />}
          <div aria-busy={refreshing} className={refreshing ? 'h54-feed-list is-checking' : 'h54-feed-list'}>
            <Collapse ghost expandIconPlacement="end" activeKey={opened} onChange={setOpened} items={feedItems} />
          </div>
        </>}
        <footer className="h54-panel-foot"><span>{sourceState === 'empty' ? '暂无关注来源' : updated}</span><span role="status" aria-live="polite">{status || (sourceState === 'empty' ? '尚未关注' : '3 个示例来源')}</span></footer>
      </section>
    </Modal>
  </div>;
}
