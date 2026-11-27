import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Empty, Image, Input, Modal, Radio, Tag, Tooltip } from 'antd';
import {
  ArrowRightOutlined, CheckOutlined, CommentOutlined, CopyOutlined,
  CloseOutlined, FileTextOutlined, MessageOutlined, PictureOutlined, ReloadOutlined, RollbackOutlined,
  SafetyCertificateOutlined, ThunderboltOutlined,
  LikeOutlined, LikeFilled, DislikeOutlined, DislikeFilled,
} from '@ant-design/icons';
import './chat.css';
import './message-actions.css';
import { useWorkflowState, workflowActions } from './Workbench';
import {getTaskStatus} from './work-status';

function plainMessage(message) {
  return [message.text, ...(message.list || []), message.after, message.decision?.title].filter(Boolean).join('\n');
}

function messageTime(message, session) {
  if (message.time) return String(message.time);
  if (message.timestamp || message.deliveredAt) {
    const value = new Date(message.timestamp || message.deliveredAt);
    if (!Number.isNaN(value.getTime())) return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(value);
  }
  return session?.when?.match(/\d{1,2}:\d{2}/)?.[0] || '时间未记录';
}

function messageTimeDetails(message, session) {
  const recorded = message.timestamp || message.deliveredAt;
  const date = recorded ? new Date(recorded) : null;
  if (date && !Number.isNaN(date.getTime())) {
    const full = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(date);
    return { short: messageTime(message, session), label: `${full} · 上海时间 · 本地模拟`, dateTime: date.toISOString() };
  }
  if (message.time) return { short: String(message.time), label: `${message.time} · 未记录日期 · 本地模拟` };
  return { short: messageTime(message, session) === '时间未记录' ? '未记录' : messageTime(message, session), label: `${session?.when || '时间未记录'} · 样例会话时间，未提供逐条消息的日期与时刻` };
}

function MessageRow({ children, className, id, label, busy, pinned, renderActions }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const [tooltipKeys, setTooltipKeys] = useState([]);
  const row = useRef(null), enterTimer = useRef(null), leaveTimer = useRef(null), holdTimer = useRef(null), press = useRef(null);
  const open = hovered || focused || touchOpen || tooltipKeys.length > 0 || busy || !!pinned;
  const interactive = target => target instanceof Element && target.closest('button,a,input,textarea,select,summary,[role="button"],[role="radio"]');
  function cancelHold() { clearTimeout(holdTimer.current); holdTimer.current = null; }
  function tooltip(key, shown) { setTooltipKeys(keys => shown ? keys.includes(key) ? keys : [...keys, key] : keys.filter(item => item !== key)); }
  function leave() {
    clearTimeout(enterTimer.current);
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHovered(false), 180);
  }
  function pointerDown(event) {
    if (event.pointerType !== 'touch' || event.button !== 0 || interactive(event.target)) return;
    cancelHold();
    press.current = { x: event.clientX, y: event.clientY, moved: false, held: false };
    holdTimer.current = setTimeout(() => {
      if (!press.current || press.current.moved || String(window.getSelection()).trim()) return;
      press.current.held = true;
      setTouchOpen(true);
    }, 450);
  }
  function pointerMove(event) {
    if (!press.current || Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) <= 10) return;
    press.current.moved = true;
    cancelHold();
    if (press.current.held) setTouchOpen(false);
  }
  function pointerUp(event) {
    const current = press.current;
    cancelHold(); press.current = null;
    if (!current || current.moved || current.held || interactive(event.target) || String(window.getSelection()).trim()) return;
    setTouchOpen(value => !value);
  }
  function pointerCancel() { if (press.current?.held) setTouchOpen(false); cancelHold(); press.current = null; }
  useEffect(() => {
    if (!touchOpen) return;
    const outside = event => {
      if (row.current?.contains(event.target) || event.target instanceof Element && event.target.closest('.ant-tooltip,.ant-modal-root,.ant-popover,.ant-dropdown')) return;
      setTouchOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [touchOpen]);
  useEffect(() => () => { clearTimeout(enterTimer.current); clearTimeout(leaveTimer.current); clearTimeout(holdTimer.current); }, []);

  return <article ref={row} className={`${className} ${open ? 'is-actions-open' : ''}`} id={id} tabIndex={0} aria-label={label}
    onPointerEnter={event => { if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover)').matches) return; clearTimeout(leaveTimer.current); clearTimeout(enterTimer.current); enterTimer.current = setTimeout(() => setHovered(true), 140); }}
    onPointerLeave={event => { if (event.pointerType === 'mouse') leave(); }}
    onFocusCapture={event => { if (event.target.matches(':focus-visible')) setFocused(true); }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerCancel}
    onKeyDown={event => { if (event.key === 'Escape') { setTouchOpen(false); setTooltipKeys([]); } }}>
    {children}
    <div className="c54-actions-reveal" aria-hidden={!open} inert={!open}>
      <div className="c54-actions-clip">
        <div className="c54-message-actions" role="group" aria-label={`${label}操作`}>
          {renderActions(tooltip, () => setTouchOpen(true))}
        </div>
      </div>
    </div>
  </article>;
}

function ShotDeck({ shots }) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const shown = shots.slice(0, 3);
  function showImage(index) { setCurrent(index); setPreviewOpen(true); }

  return <>
    <div className="c54-shots-deck" data-count={shots.length} aria-label={`${shots.length} 张图片`}>
      {shown.map((shot, index) => <button key={`${shot.src}-${index}`} type="button" className="c54-shot-card" onClick={() => showImage(index)} aria-label={`查看大图：${shot.cap || `图片 ${index + 1}`}`}>
        <img src={shot.src} alt={shot.cap || `图片 ${index + 1}`} loading="lazy" />
        {index === shown.length - 1 && shots.length > shown.length && <span className="c54-shot-more">+{shots.length - shown.length}</span>}
      </button>)}
      <Tooltip title={`查看全部 ${shots.length} 张图片`}><Button type="text" icon={<PictureOutlined />} className="c54-shot-all" aria-label={`显示所有图片，共 ${shots.length} 张`} onClick={() => setGalleryOpen(true)} /></Tooltip>
    </div>
    <Modal open={galleryOpen} onCancel={() => setGalleryOpen(false)} title={<span>所有图片 <small>{shots.length}</small></span>} footer={null} styles={{mask:{background:'transparent'}}} closable={{ closeIcon: <CloseOutlined />, 'aria-label': '关闭照片墙' }} width="100vw" className="c54-gallery" wrapClassName="c54-gallery-wrap" destroyOnHidden>
      <div className={`c54-gallery-wall ${shots.length > 4 ? 'is-many' : ''}`}>
        {shots.map((shot, index) => <button key={`${shot.src}-${index}`} type="button" className="c54-gallery-photo" onClick={() => showImage(index)} aria-label={`查看大图：${shot.cap || `图片 ${index + 1}`}`}><img src={shot.src} alt={shot.cap || `图片 ${index + 1}`} /><span>{shot.cap || `图片 ${index + 1}`}</span></button>)}
      </div>
    </Modal>
    <Image.PreviewGroup items={shots.map(shot => ({ src: shot.src, alt: shot.cap || '消息图片' }))} preview={{ open: previewOpen, current, onChange: setCurrent, onOpenChange: setPreviewOpen }} />
  </>;
}

function DecisionCard({ decision: q, index, draft, onDraftChange, onAnswer, onInputAnswer }) {
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const firstOption = useRef(null);
  const approved = q.kind === 'approval';
  const waiting = q.status === 'waiting';
  const chosen = draft?.selected ?? q.selected ?? '';
  const custom = draft?.custom ?? q.custom ?? '';
  const options = q.options || [];
  const titleId = `c54-decision-${index}`;
  const fieldId = `c54-answer-${index}`;
  const errorId = `c54-error-${index}`;
  const stateLabel = waiting ? approved ? '待决定' : '待回答' : q.status === 'answered' ? approved ? '决定已记录' : '已回答' : q.status === 'cancelled' ? '已取消' : '已过期';

  useEffect(() => { setError(''); }, [q.id, q.status]);

  function select(value) {
    setError('');
    onDraftChange({ selected: value, custom });
    if (value === 'other') requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }
  function submit(event) {
    event.preventDefault();
    if (!waiting) return;
    const answer = chosen === 'other' ? custom.trim() : options[Number(chosen)];
    if (chosen === '' || !answer) {
      setError(chosen === 'other' ? '请填写你的回答。' : '选择一个选项，或填写其他回答。');
      if (chosen === 'other') inputRef.current?.focus();
      else firstOption.current?.focus();
      return;
    }
    onAnswer?.(index, answer, chosen);
  }

  return <Card variant="borderless" className={`c54-decision ${approved ? 'is-approval' : ''}`} aria-labelledby={titleId}>
    <header className="c54-decision-head"><span className="c54-decision-kind">{approved ? <SafetyCertificateOutlined /> : <MessageOutlined />}{approved ? '动作批准' : '需要你回答'}</span><Tag color={waiting && approved ? 'gold' : waiting ? 'blue' : 'default'}>{stateLabel}</Tag></header>
    <h3 id={titleId}>{q.title}</h3>
    {q.context && <p className="c54-decision-context">{q.context}</p>}
    {q.facts?.length > 0 && <dl className="c54-decision-facts">{q.facts.map(([name, value], factIndex) => <div key={`${name}-${factIndex}`}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>}
    {approved && <p className="c54-approval-note"><SafetyCertificateOutlined />{waiting ? '仅针对下方列明的对象与本次动作；本地预览不会实际发送或执行。' : '批准记录与执行结果分别显示；此预览未执行真实动作。'}</p>}
    {waiting ? <form onSubmit={submit}>
      <fieldset className="c54-answer-fieldset"><legend className="c54-sr-only">{approved ? '选择本次决定' : '选择你的回答'}</legend>
        <Radio.Group className="c54-answer-options" value={chosen} onChange={event => select(event.target.value)} aria-describedby={error ? errorId : undefined}>
          {options.map((option, optionIndex) => <Radio ref={optionIndex === 0 ? firstOption : undefined} key={optionIndex} value={String(optionIndex)}><span>{option}</span></Radio>)}
          <Radio value="other"><span>{approved ? '自定义范围' : '其他回答 / 自己填写'}</span></Radio>
        </Radio.Group>
      </fieldset>
      {chosen === 'other' && <div className="c54-custom-answer"><label htmlFor={fieldId}>{approved ? '描述需要调整的对象、动作或边界' : '按自己的想法回答'}</label><Input.TextArea ref={inputRef} id={fieldId} value={custom} onChange={event => { onDraftChange({ selected: 'other', custom: event.target.value }); setError(''); }} rows={3} maxLength={1200} showCount autoSize={{ minRows: 3, maxRows: 7 }} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} placeholder={approved ? '例如：先修改收件人，再让我确认草稿。' : '例如：先验证能否复现，再准备方案，暂时不要创建 PR。'} /></div>}
      <p id={errorId} className="c54-answer-error" role="alert">{error}</p>
      <footer className="c54-decision-actions">{onInputAnswer && <Button type="text" size="small" onClick={() => onInputAnswer(index)}>在输入框回答</Button>}<div><Button size="small" onClick={() => onAnswer?.(index, null, 'cancel')}>取消</Button><Button type="primary" size="small" htmlType="submit">{approved ? '提交决定' : '提交回答'}</Button></div></footer>
    </form> : <div className="c54-decision-result">{q.status === 'answered' ? <><span><CheckOutlined />{approved ? '你的决定' : '你的回答'}</span><p>{q.answer || (q.selected === 'other' ? q.custom : options[Number(q.selected)]) || '已记录'}</p><small>{q.selected === 'other' ? '已保留自定义条件；后续需要重新核对目标与范围。' : '仅记录示例答案，没有启动真实工作。'}</small></> : <p>这张卡片已{q.status === 'cancelled' ? '取消' : '过期'}，不能再提交。需要时根据当前目标重新询问。</p>}</div>}
  </Card>;
}

export default function ChatThread({ session, onReply, onOpenWorkbench, onAnswer, onWithdraw, onRegenerate, onInputAnswer, replyIndex, replyActivity, showToolPill = true }) {
  const workflow = useWorkflowState();
  const [copied, setCopied] = useState(null);
  const [copyError, setCopyError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [highlighted, setHighlighted] = useState(null);
  const [jumped, setJumped] = useState(null);
  const [regenerating, setRegenerating] = useState(null);
  const [feedback, setFeedback] = useState({});
  const scroller = useRef(null);
  const stickToBottom=useRef(true),lastSession=useRef(null),lastLength=useRef(0);
  const [newBlocks,setNewBlocks]=useState(0);
  const copiedTimer = useRef(null);
  const jumpTimer = useRef(null);
  const messages = session?.messages || [];
  const tasks = workflow.tasks.filter(item => item.session === session?.id);

  useEffect(() => {
    const changed=lastSession.current!==session?.id;
    const added=changed?0:Math.max(0,messages.length-lastLength.current);
    lastSession.current=session?.id;lastLength.current=messages.length;
    if(changed){stickToBottom.current=true;setNewBlocks(0);}
    const frame = requestAnimationFrame(() => {
      if(scroller.current&&stickToBottom.current&&replyIndex==null)scroller.current.scrollTop=scroller.current.scrollHeight;
      else if(added)setNewBlocks(count=>count+added);
    });
    return () => cancelAnimationFrame(frame);
  }, [session?.id, messages.length,!!replyActivity]);
  useEffect(() => { setHighlighted(null); setJumped(null); setRegenerating(null); setCopied(null); setCopyError(''); clearTimeout(copiedTimer.current); }, [session?.id]);
  useEffect(() => () => { clearTimeout(copiedTimer.current); clearTimeout(jumpTimer.current); }, []);

  async function copy(message, index) {
    try {
      await navigator.clipboard.writeText(plainMessage(message));
      setCopyError(''); setCopied(index); clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopyError('复制未完成，请选择消息文字后手动复制。');
    }
  }

  function jumpTo(index) {
    const target = scroller.current?.querySelector(`#msg-${index}`);
    if (!target) return;
    stickToBottom.current=false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    target.focus({ preventScroll: true });
    setJumped(index); clearTimeout(jumpTimer.current);
    jumpTimer.current = setTimeout(() => setJumped(null), 1100);
  }

  async function regenerate(index) {
    if (!onRegenerate || regenerating !== null) return;
    setRegenerating(index);
    try { await onRegenerate(index); }
    finally { setRegenerating(null); }
  }

  return <div className="c54-thread" ref={scroller} onScroll={()=>{const el=scroller.current;stickToBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<72;if(stickToBottom.current)setNewBlocks(0);}} role="region" aria-label={`${session?.title || '新对话'}的消息`}>
    <div className="c54-thread-inner">
      {!messages.length ? <div className="c54-empty"><span className="c54-empty-mark"><ThunderboltOutlined /></span><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><h2>从一个想法开始</h2><p>发一条消息，让 Lumi 帮你梳理、查找或推进事情。</p></>} /><Tag>本地交互预览</Tag></div> : <>
        <div className="c54-thread-date"><span />{session?.when || '最近'} · 示例会话<span /></div>
        {(() => { let lastAssistant = -1; messages.forEach((m, i) => { if (m.role !== 'user') lastAssistant = i; }); return messages.map((message, index) => {
          const user = message.role === 'user';
          const previous = messages[index - 1];
          const continuation = !user && previous?.role === 'assistant' && message.replyRunId && message.replyRunId === previous.replyRunId && !message.quote;
          const author = user ? '你' : '助手';
          const draftKey = `${session?.id}:${message.decision?.id || index}`;
          const time = messageTimeDetails(message, session);
          const actions = (tooltip, keepOpen) => <>
            <Tooltip title={copied === index ? '已复制' : '复制消息'} onOpenChange={shown => tooltip('copy', shown)}><Button type="text" size="small" className={copied === index ? 'is-copied' : ''} icon={<span className="c54-copy-symbol" aria-hidden="true"><CopyOutlined className="c54-copy-original" /><CheckOutlined className="c54-copy-check" /></span>} onClick={() => copy(message, index)} aria-label={copied === index ? '已复制消息' : '复制消息'} /></Tooltip>
            <Tooltip title="回复这条消息" onOpenChange={shown => tooltip('reply', shown)}><Button type="text" size="small" icon={<CommentOutlined />} aria-label="回复这条消息" onClick={() => onReply?.({ index, author, role: message.role, text: plainMessage(message), full: plainMessage(message) })} /></Tooltip>
            {!user && !message.decision && onRegenerate && <Tooltip title={regenerating === index ? '正在重新生成 · 本地模拟' : '重新生成这条回复 · 本地模拟'} onOpenChange={shown => tooltip('regenerate', shown)}><Button type="text" size="small" icon={<ReloadOutlined />} loading={regenerating === index} aria-label={regenerating === index ? '正在重新生成回复' : '重新生成这条回复'} disabled={regenerating !== null && regenerating !== index} onClick={() => regenerate(index)} /></Tooltip>}
            {user && onWithdraw && <Tooltip title="先预览从这条消息开始的撤回范围" onOpenChange={shown => tooltip('withdraw', shown)}><Button type="text" size="small" icon={<RollbackOutlined />} aria-label="预览从这条消息开始的撤回范围" onClick={() => { keepOpen(); onWithdraw(index); }} /></Tooltip>}
            {!user && !message.decision && (() => { const key = `${session?.id}:${index}`, value = feedback[key]; const set = v => setFeedback(current => ({ ...current, [key]: current[key] === v ? null : v })); return <>
              <Tooltip title={value === 'up' ? '已标记有帮助 · 仅本地' : '有帮助 · 仅本地记录'} onOpenChange={shown => tooltip('up', shown)}><Button type="text" size="small" className={value === 'up' ? 'is-rated' : ''} icon={value === 'up' ? <LikeFilled /> : <LikeOutlined />} aria-pressed={value === 'up'} aria-label="这条回复有帮助" onClick={() => set('up')} /></Tooltip>
              <Tooltip title={value === 'down' ? '已标记没帮助 · 仅本地' : '没帮助 · 仅本地记录'} onOpenChange={shown => tooltip('down', shown)}><Button type="text" size="small" className={value === 'down' ? 'is-rated' : ''} icon={value === 'down' ? <DislikeFilled /> : <DislikeOutlined />} aria-pressed={value === 'down'} aria-label="这条回复没帮助" onClick={() => set('down')} /></Tooltip>
            </>; })()}
            <Tooltip title={time.label} placement="top" trigger={['hover', 'focus']} onOpenChange={shown => tooltip('time', shown)}><Button type="text" size="small" className="c54-message-time" onClick={event => event.currentTarget.focus({ preventScroll: true })} aria-label={`消息时间：${time.label}`}><time dateTime={time.dateTime}>{time.short}</time></Button></Tooltip>
            {message.revision > 1 && <span className="c54-message-version" aria-label={`本地模拟回复版本 ${message.revision}`} title="本地模拟重新生成版本">v{message.revision}</span>}
          </>;
          return <MessageRow pinned={index === lastAssistant && !user} className={`c54-message ${user ? 'is-user' : 'is-assistant'} ${continuation?'is-continuation':''} ${message.arrived&&lastSession.current===session?.id&&Date.now()-message.deliveredAt<800?'is-arriving':''} ${message.shots?.length ? 'has-shots' : ''} ${highlighted === index || replyIndex === index ? 'is-quoting' : ''} ${jumped === index ? 'is-jump-target' : ''} ${regenerating === index ? 'is-regenerating' : ''}`} id={`msg-${index}`} key={`${session?.id}:${message.id || index}`} label={`${author}的消息`} busy={regenerating === index} renderActions={actions}>
            {message.status&&<Tag>{message.status}</Tag>}
            {message.quote && <button type="button" className="c54-quote-ghost" onClick={() => jumpTo(message.quote.index)} onPointerEnter={() => setHighlighted(message.quote.index)} onPointerLeave={() => setHighlighted(null)} onFocus={() => setHighlighted(message.quote.index)} onBlur={() => setHighlighted(null)} aria-label={`回到引用的${message.quote.author || 'Lumi'}消息：${message.quote.text}`}><span className="c54-quote-bubble">{message.quote.text}</span><svg className="c54-quote-elbow" viewBox="0 0 10 10" aria-hidden="true"><path d="M10 9L7.4 9C5.16 9 4.04 9 3.18 8.56C2.43 8.18 1.82 7.57 1.44 6.82C1 5.96 1 4.84 1 2.6L1 0" fill="none" stroke="currentColor" strokeWidth="2" /></svg></button>}
            <div className="c54-message-surface">
              {message.text && <div className="c54-prose">{String(message.text).split('\n').map((paragraph, i) => paragraph ? <p key={i}>{paragraph}</p> : <br key={i} />)}</div>}
              {message.list?.length > 0 && <ul className="c54-prose-list">{message.list.map((item, i) => <li key={i}>{item}</li>)}</ul>}
              {message.after && <p className="c54-message-after">{message.after}</p>}
              {message.attachments?.length > 0 && <div className="c54-attachments" aria-label="此消息的示例附件">{message.attachments.map((file, i) => <Tag key={`${file}-${i}`} icon={<FileTextOutlined />}>{file}</Tag>)}</div>}
              {message.decision && <DecisionCard decision={message.decision} index={index} draft={drafts[draftKey]} onDraftChange={draft => setDrafts(current => ({ ...current, [draftKey]: draft }))} onAnswer={onAnswer} onInputAnswer={onInputAnswer} />}
            </div>
            {message.shots?.length > 0 && <ShotDeck shots={message.shots} />}
          </MessageRow>;
        }); })()}
      </>}
        {replyActivity&&<div className="c54-reply-activity" role="status"><span className="c54-status-orbit is-busy" aria-hidden="true"/><span>{replyActivity.label}{replyActivity.queued>0&&` · ${replyActivity.queued} 条待回复`}</span></div>}
        {showToolPill&&tasks.length>0&&<div className="c54-work-capsules" aria-label="这段对话的工作状态">{tasks.map(task=>{const status=getTaskStatus(task,workflow);return <Tooltip key={task.id} title={status.detail}><button type="button" className={`c54-work-capsule tone-${status.tone}`} onClick={()=>{workflowActions.selectTask(task.id);onOpenWorkbench?.(task.status==='plan'?'plan':'runs');}} aria-label={`${task.title} · ${status.label}，查看工作`}><span className={`c54-status-orbit ${status.busy?'is-busy':''}`} aria-hidden="true"/><span className="c54-capsule-task">{task.title}</span><span className="c54-capsule-separator" aria-hidden="true">·</span><strong>{status.label}</strong><ArrowRightOutlined/></button></Tooltip>;})}</div>}
      <p className="c54-copy-status" role="status">{copyError}</p>
      <span className="c54-sr-only" role="status">{copied !== null ? '消息已复制' : regenerating !== null ? '正在模拟重新生成回复' : ''}</span>
    </div>
    {newBlocks>0&&<div className="c54-new-blocks"><Button size="small" shape="round" onClick={()=>{stickToBottom.current=true;scroller.current.scrollTo({top:scroller.current.scrollHeight,behavior:'instant'});setNewBlocks(0);}}>有 {newBlocks} 条新消息 ↓</Button></div>}
  </div>;
}
