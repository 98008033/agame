// Event Templates - MVP P0 Events (10 priority events)
// Based on PLAN/event-templates.md

// Event trigger condition types
export interface EventTriggerCondition {
  type: 'level' | 'resource' | 'relationship' | 'nation' | 'skill' | 'time' | 'state' | 'location';
  value: number | string;
  description: string;
  required?: boolean;
}

// Event consequence types
export interface EventConsequence {
  type: 'resource' | 'relationship' | 'reputation' | 'status' | 'event' | 'skill';
  target?: string; // NPC ID, faction ID, or 'player'
  value: number;
  description: string;
  isNegative?: boolean;
}

// Event choice
export interface EventChoice {
  index: number;
  label: string;
  description: string;
  consequences: EventConsequence[];
  skillRequirement?: { skill: string; level: number };
  narrativeOutcome: string;
  triggeredEvent?: string; // Chain to another event
}

// Event template
export interface EventTemplate {
  id: string;
  type: 'nation_invite' | 'resource_dilemma' | 'personal_conflict' | 'crisis_response' | 'daily_life';
  category: '效忠选择' | '资源抉择' | '人际冲突' | '危机应对';
  title: string;
  description: string;
  narrativeText: string;
  triggerConditions: EventTriggerCondition[];
  choices: EventChoice[];
  scope: 'personal' | 'local' | 'regional' | 'national';
  importance: 'minor' | 'normal' | 'major' | 'critical';
  expiresIn?: number; // Days until expiration
  cooldownDays?: number; // Days before can trigger again
}

// P0 Priority Event Templates
export const EVENT_TEMPLATES: EventTemplate[] = [
  // ============================================
  // 效忠选择类
  // ============================================
  {
    id: 'event_001_nation_invite',
    type: 'nation_invite',
    category: '效忠选择',
    title: '边境使者的邀请',
    description: '三位来自不同阵营的使者同时出现在暮光村，各自邀请你加入他们的阵营。',
    narrativeText: `暮光村的村口来了三位使者，各自代表着不同的势力。

苍龙帝国的使者穿着墨绿色官服，手持盖有玉玺的文书："帝国需要你这样的人才。效忠苍龙，你将获得正式的官职和俸禄。"

霜狼联邦的使者身披狼皮斗篷，腰挂符文护符："寒狼首领听说了你的事迹。霜狼需要勇士，不是奴才。"

金雀花王国的使者一袭锦缎长袍，手指上的戒指闪烁着魔法光泽："商会的金潮先生愿意与你谈谈。在金雀花，金币决定地位。"

三人都等着你的回答...`,
    triggerConditions: [
      { type: 'level', value: 5, description: '等级≥5' },
      { type: 'nation', value: 'none', description: '无效忠阵营' },
    ],
    choices: [
      {
        index: 0,
        label: '接受苍龙帝国',
        description: '加入苍龙帝国，获得官职和俸禄',
        consequences: [
          { type: 'reputation', target: 'canglong', value: 30, description: '苍龙声望+30' },
          { type: 'reputation', target: 'shuanglang', value: -10, description: '霜狼声望-10', isNegative: true },
          { type: 'reputation', target: 'jinque', value: -10, description: '金雀花声望-10', isNegative: true },
          { type: 'resource', target: 'player', value: 50, description: '获得50金币入职礼' },
          { type: 'status', value: 1, description: '获得"帝国见习军官"身份' },
        ],
        narrativeOutcome: '你接过苍龙使者的文书，正式成为帝国的一员。霜狼和金雀花的使者面露不满，但最终还是离去了。',
      },
      {
        index: 1,
        label: '接受霜狼联邦',
        description: '加入霜狼联邦，成为联邦勇士',
        consequences: [
          { type: 'reputation', target: 'shuanglang', value: 30, description: '霜狼声望+30' },
          { type: 'reputation', target: 'canglong', value: -10, description: '苍龙声望-10', isNegative: true },
          { type: 'reputation', target: 'jinque', value: -10, description: '金雀花声望-10', isNegative: true },
          { type: 'resource', target: 'player', value: 30, description: '获得30金币' },
          { type: 'status', value: 2, description: '获得"联邦勇士"身份' },
        ],
        narrativeOutcome: '你选择与霜狼使者同行。他拍了拍你的肩膀："好，从今日起，你就是我们的人了。"',
      },
      {
        index: 2,
        label: '接受金雀花王国',
        description: '加入金雀花，成为商会代理人',
        consequences: [
          { type: 'reputation', target: 'jinque', value: 30, description: '金雀花声望+30' },
          { type: 'reputation', target: 'canglong', value: -10, description: '苍龙声望-10', isNegative: true },
          { type: 'reputation', target: 'shuanglang', value: -10, description: '霜狼声望-10', isNegative: true },
          { type: 'resource', target: 'player', value: 100, description: '获得100金币启动资金' },
          { type: 'status', value: 3, description: '获得"商会代理人"身份' },
        ],
        narrativeOutcome: '金雀花使者微笑着点头："明智的选择。金币不会背叛你。"',
      },
      {
        index: 3,
        label: '保持独立',
        description: '婉拒三方邀请，保持自由民身份',
        consequences: [
          { type: 'reputation', target: 'border', value: 20, description: '边境声望+20' },
          { type: 'status', value: 4, description: '获得"自由民"身份' },
        ],
        narrativeOutcome: '你婉拒了三位使者。他们各自离去，但你感到——这样的选择，未来可能不会再有。',
      },
    ],
    scope: 'local',
    importance: 'major',
    expiresIn: 3,
    cooldownDays: 30,
  },

  // ============================================
  // 资源抉择类
  // ============================================
  {
    id: 'event_006_refugee_request',
    type: 'resource_dilemma',
    category: '资源抉择',
    title: '灾民的求助',
    description: '一群来自边境的灾民请求援助，他们因灾害失去了家园。',
    narrativeText: `一群衣衫褴褛的灾民聚集在村口。他们来自边境的霜狼领地，据说那里发生了雪灾。

为首的难民跪在你面前："大人，求您施舍些粮食和钱财。我们的孩子快饿死了。"

村民们小声议论："给了他们，我们自己的储备就少了..."

你该如何选择？`,
    triggerConditions: [
      { type: 'resource', value: 100, description: '金币≥100' },
    ],
    choices: [
      {
        index: 0,
        label: '慷慨救济',
        description: '拿出大量物资援助灾民',
        consequences: [
          { type: 'resource', target: 'player', value: -200, description: '金币-200', isNegative: true },
          { type: 'reputation', target: 'border', value: 20, description: '边境声望+20' },
          { type: 'status', value: 5, description: '获得"仁慈"标签' },
        ],
        narrativeOutcome: '你打开粮仓，亲自分发粮食和金币。灾民们感激涕零，有人开始称你为"仁慈的领主"。',
      },
      {
        index: 1,
        label: '少量施舍',
        description: '给予少量援助，保全自己',
        consequences: [
          { type: 'resource', target: 'player', value: -50, description: '金币-50', isNegative: true },
          { type: 'reputation', target: 'border', value: 5, description: '边境声望+5' },
        ],
        narrativeOutcome: '你给了他们一些粮食和少量金币。灾民们带着失望离去，但也算有了些补给。',
      },
      {
        index: 2,
        label: '拒绝援助',
        description: '为了自己的领地，拒绝施舍',
        consequences: [
          { type: 'reputation', target: 'border', value: -10, description: '边境声望-10', isNegative: true },
          { type: 'status', value: 6, description: '获得"冷血"标签', isNegative: true },
        ],
        narrativeOutcome: '你冷冷地拒绝了他们。灾民们绝望地离去，村民们的眼神中带着一丝不安...',
      },
    ],
    scope: 'local',
    importance: 'normal',
    expiresIn: 2,
    cooldownDays: 14,
  },

  // ============================================
  // 人际冲突类
  // ============================================
  {
    id: 'event_011_npc_conflict',
    type: 'personal_conflict',
    category: '人际冲突',
    title: '两难的调解',
    description: '两个与你关系不错的NPC发生冲突，需要你做出选择。',
    narrativeText: `老根村长和铁壁猎户同时来找你，两人明显不和。

老根叹气："铁壁太冲动了，他要带人去袭击苍龙的商队，这会把我们全害死！"

铁壁怒道："老根太懦弱！苍龙的商队一直在剥削我们，必须反击！你站哪边？"

两人同时看着你，等待你的回答...`,
    triggerConditions: [
      { type: 'relationship', value: 30, description: '与两个NPC关系≥30' },
    ],
    choices: [
      {
        index: 0,
        label: '支持老根（保守派）',
        description: '劝说铁壁放弃袭击计划',
        consequences: [
          { type: 'relationship', target: 'npc_laogen', value: 20, description: '老根关系+20' },
          { type: 'relationship', target: 'npc_bd_hunter', value: -15, description: '铁壁关系-15', isNegative: true },
        ],
        narrativeOutcome: '你站在老根这边，劝说铁壁冷静。铁壁不情愿地同意了，但明显对你有些不满。',
      },
      {
        index: 1,
        label: '支持铁壁（激进派）',
        description: '同意袭击计划并提供帮助',
        consequences: [
          { type: 'relationship', target: 'npc_bd_hunter', value: 25, description: '铁壁关系+25' },
          { type: 'relationship', target: 'npc_laogen', value: -20, description: '老根关系-20', isNegative: true },
          { type: 'reputation', target: 'canglong', value: -15, description: '苍龙声望-15', isNegative: true },
        ],
        narrativeOutcome: '你同意了铁壁的计划。老根摇头叹息，带着失望离去。',
      },
      {
        index: 2,
        label: '调解双方',
        description: '尝试让双方达成妥协',
        skillRequirement: { skill: 'charisma', level: 3 },
        consequences: [
          { type: 'relationship', target: 'npc_laogen', value: 10, description: '老根关系+10' },
          { type: 'relationship', target: 'npc_bd_hunter', value: 10, description: '铁壁关系+10' },
        ],
        narrativeOutcome: '你耐心地调解，最终双方同意——铁壁只做威慑，不真正袭击。老根和铁壁都对你表示感谢。',
      },
      {
        index: 3,
        label: '保持中立',
        description: '不参与双方的争执',
        consequences: [
          { type: 'relationship', target: 'npc_laogen', value: -5, description: '老根关系-5', isNegative: true },
          { type: 'relationship', target: 'npc_bd_hunter', value: -5, description: '铁壁关系-5', isNegative: true },
        ],
        narrativeOutcome: '你选择不表态。两人带着各自的失望离去，你感到关系有些疏远了...',
      },
    ],
    scope: 'personal',
    importance: 'normal',
    expiresIn: 1,
    cooldownDays: 7,
  },

  // ============================================
  // 危机应对类
  // ============================================
  {
    id: 'event_016_border_bandits',
    type: 'crisis_response',
    category: '危机应对',
    title: '边境匪患',
    description: '一伙匪徒袭击了附近的商队，正向村庄移动。',
    narrativeText: `警报！荒原狼的匪帮袭击了附近的一个商队！

浓烟从东边升起。村民们惊恐地跑来跑动。斥候报告：匪帮大约20人，正在掠夺财物，可能向暮光村移动。

你可以选择...`,
    triggerConditions: [
      { type: 'location', value: 'borderlands', description: '在边境地区' },
    ],
    choices: [
      {
        index: 0,
        label: '组织防御',
        description: '带领村民抵御匪徒',
        consequences: [
          { type: 'resource', target: 'player', value: 100, description: '战利品+100金币' },
          { type: 'reputation', target: 'border', value: 15, description: '边境声望+15' },
          { type: 'skill', value: 5, description: '战斗经验+5' },
        ],
        narrativeOutcome: '你带领村民建立了防线，匪徒进攻失败后撤退。村民们欢呼你的勇敢。',
      },
      {
        index: 1,
        label: '花钱消灾',
        description: '支付赎金换取和平',
        consequences: [
          { type: 'resource', target: 'player', value: -150, description: '金币-150', isNegative: true },
          { type: 'status', value: 7, description: '获得"软弱"标签', isNegative: true },
        ],
        narrativeOutcome: '你支付了赎金，匪徒满意地离去。但村民们窃窃私语，似乎对你的决定有些不满...',
      },
      {
        index: 2,
        label: '暗中勾结',
        description: '与匪徒合作分享利益',
        consequences: [
          { type: 'resource', target: 'player', value: 200, description: '分赃+200金币' },
          { type: 'status', value: 8, description: '获得"通匪"秘密标签', isNegative: true },
        ],
        narrativeOutcome: '你暗中与匪徒达成协议，分享了一部分赃物。这事没人知道...但若被发现后果严重。',
      },
      {
        index: 3,
        label: '请求援助',
        description: '向效忠阵营请求援军',
        consequences: [
          { type: 'reputation', target: 'border', value: 5, description: '边境声望+5' },
          { type: 'event', value: 1, description: '触发后续事件' },
        ],
        narrativeOutcome: '你派出信使请求援助，援军3天后到达。商队已经损失了大部分货物...',
      },
    ],
    scope: 'local',
    importance: 'major',
    expiresIn: 1,
    cooldownDays: 7,
  },

  {
    id: 'event_018_plague',
    type: 'crisis_response',
    category: '危机应对',
    title: '瘟疫阴影',
    description: '一种奇怪的疫病开始在村庄蔓延。',
    narrativeText: `暮光村传来坏消息。

村民老根面色凝重："一种奇怪的疫病正在蔓延。症状是高热、昏睡...已经有三个人病倒了。"

他看着你："我们需要决定——是隔离病人，还是去采购药材，还是..."

村民们恐惧地议论着，等着你的决定。`,
    triggerConditions: [],
    choices: [
      {
        index: 0,
        label: '全力救治',
        description: '花费金币采购药材救治',
        consequences: [
          { type: 'resource', target: 'player', value: -300, description: '金币-300（药材）', isNegative: true },
          { type: 'reputation', target: 'border', value: 25, description: '边境声望+25' },
          { type: 'status', value: 9, description: '获得"救命恩人"标签' },
        ],
        narrativeOutcome: '你花费大量金币购买了药材，亲自照料病人。一周后，疫情得到控制，村民们感激涕零。',
      },
      {
        index: 1,
        label: '隔离疫区',
        description: '将病人隔离，控制疫情蔓延',
        consequences: [
          { type: 'resource', target: 'player', value: -100, description: '金币-100', isNegative: true },
          { type: 'reputation', target: 'border', value: 5, description: '边境声望+5' },
        ],
        narrativeOutcome: '你下令隔离病人。虽然控制了疫情，但隔离区的人们眼神中带着绝望...',
      },
      {
        index: 2,
        label: '等待观察',
        description: '先观望几天再决定',
        consequences: [
          { type: 'resource', target: 'player', value: -50, description: '损失50金币（病人减少）', isNegative: true },
        ],
        narrativeOutcome: '你决定观望。几天后，又有两人病倒，情况变得更糟了...',
      },
    ],
    scope: 'local',
    importance: 'critical',
    expiresIn: 2,
    cooldownDays: 30,
  },
];

// Get event template by ID
export function getEventTemplate(id: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find(e => e.id === id);
}

// Get random event template for a given category
export function getRandomEventTemplate(
  category?: '效忠选择' | '资源抉择' | '人际冲突' | '危机应对'
): EventTemplate {
  const filtered = category
    ? EVENT_TEMPLATES.filter(e => e.category === category)
    : EVENT_TEMPLATES;
  const result = filtered[Math.floor(Math.random() * filtered.length)];
  return result !== undefined ? result : EVENT_TEMPLATES[0]!;
}

// Check if player meets trigger conditions
export function checkTriggerConditions(
  conditions: EventTriggerCondition[],
  playerState: {
    level: number;
    gold: number;
    faction: string | null;
    relationships: Record<string, number>;
    skills: Record<string, { level: number }>;
    location: string;
  }
): boolean {
  for (const cond of conditions) {
    switch (cond.type) {
      case 'level':
        if (playerState.level < (cond.value as number)) return false;
        break;
      case 'resource':
        if (playerState.gold < (cond.value as number)) return false;
        break;
      case 'nation':
        if (cond.value === 'none' && playerState.faction) return false;
        if (typeof cond.value === 'string' && cond.value !== 'none' && playerState.faction !== cond.value) return false;
        break;
      case 'relationship':
        const minRelation = cond.value as number;
        const hasEnough = Object.values(playerState.relationships).some(r => r >= minRelation);
        if (!hasEnough) return false;
        break;
      case 'location':
        if (!playerState.location.includes(cond.value as string)) return false;
        break;
    }
  }
  return true;
}

export default EVENT_TEMPLATES;