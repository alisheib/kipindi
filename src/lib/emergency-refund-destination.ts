import { formatTzs } from "./utils";

/** Credited-at-refund amounts; bonus terms can subsequently re-lock main funds. */
export function emergencyRefundDestination(stake: number, bonusStakeTzs: number) {
  if (!Number.isSafeInteger(stake) || stake <= 0 ||
      !Number.isSafeInteger(bonusStakeTzs) || bonusStakeTzs < 0 || bonusStakeTzs > stake) {
    throw new Error("Invalid emergency refund split");
  }
  const real = stake - bonusStakeTzs;
  const bonus = bonusStakeTzs;
  if (real && bonus) return {
    real, bonus,
    en: `Your stake was refunded. ${formatTzs(real)} was credited to your main balance and ${formatTzs(bonus)} to your bonus balance at refund. Bonus conditions may change the amount available to withdraw; check your wallet for current balances.`,
    sw: `Dau lako limerejeshwa. ${formatTzs(real)} iliwekwa kwenye salio kuu na ${formatTzs(bonus)} kwenye salio la bonasi wakati wa marejesho. Masharti ya bonasi yanaweza kubadili kiasi unachoweza kutoa; angalia salio la sasa kwenye pochi yako.`,
    zh: `您的投注已退款。退款时 ${formatTzs(real)} 计入主余额，${formatTzs(bonus)} 计入奖金余额。奖金条件可能改变可提现金额；请查看钱包中的当前余额。`,
  };
  if (bonus) return {
    real, bonus,
    en: `Your full stake of ${formatTzs(bonus)} was credited to your bonus balance at refund. Bonus conditions may change the amount available to withdraw; check your wallet for current balances.`,
    sw: `Dau lako lote la ${formatTzs(bonus)} liliwekwa kwenye salio la bonasi wakati wa marejesho. Masharti ya bonasi yanaweza kubadili kiasi unachoweza kutoa; angalia salio la sasa kwenye pochi yako.`,
    zh: `退款时，您的全部投注 ${formatTzs(bonus)} 已计入奖金余额。奖金条件可能改变可提现金额；请查看钱包中的当前余额。`,
  };
  return {
    real, bonus,
    en: `Your full stake of ${formatTzs(real)} was credited to your main balance at refund. Bonus conditions may change the amount available to withdraw; check your wallet for current balances.`,
    sw: `Dau lako lote la ${formatTzs(real)} liliwekwa kwenye salio kuu wakati wa marejesho. Masharti ya bonasi yanaweza kubadili kiasi unachoweza kutoa; angalia salio la sasa kwenye pochi yako.`,
    zh: `退款时，您的全部投注 ${formatTzs(real)} 已计入主余额。奖金条件可能改变可提现金额；请查看钱包中的当前余额。`,
  };
}
