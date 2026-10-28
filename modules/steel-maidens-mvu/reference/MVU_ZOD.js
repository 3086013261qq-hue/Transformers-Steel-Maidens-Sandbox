// 角色脚本「MVU ZOD」：变量结构。z（zod）和 _（lodash）由酒馆助手提供，不要 import。
// 只允许下面这一条 import；末尾的 registerMvuSchema 不能少，少了 Schema 不生效。
import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';

// -1 表示「待确定」：开局时还不知道的数值先放 -1，第一次更新时再定。钳制时只放过正好是 -1 的值，别的负数照常钳到下限。
const 待定 = -1;
const 范围 = (v, 下限, 上限) => (Number(v) === 待定 ? 待定 : _.clamp(Number(v) || 0, 下限, 上限));

export const Schema = z.object({
  // 数值：越界修正，不报错
  好感度: z.coerce.number().transform(v => 范围(v, 0, 100)).prefault(待定),
  所持金: z.coerce.number().transform(v => 范围(v, 0, 9999999)).prefault(待定),

  // 字符串：空串表示待确定
  心情: z.string().prefault(''),

  // 动态键集合：键名 → 对象。用 record，不用数组
  物品栏: z.record(
    z.string().describe('物品名'),
    z.object({
      描述: z.string().prefault(''),
      数量: z.coerce.number().transform(v => _.clamp(v, 0, 999)).prefault(1),
    }),
  ).prefault({}),
});

$(() => {
  registerMvuSchema(Schema);
});
