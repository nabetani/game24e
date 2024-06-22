import { Rng, seedType } from "./rng"
import { range, clamp } from "./calc"

export type RarityType = 1 | 2 | 3 | 4 | 5
export type ItemInfoType = { name: string, uname: string, rarity: RarityType }
const itemsInfos: ItemInfoType[] = [
    { rarity: 1, name: "ゴブリンが好きそうな、ちょっと臭い帽子", uname: "変な帽子" },
    { rarity: 1, name: "ゾンビの親指", uname: "骨みたいなもの" },
    { rarity: 1, name: "小さな魔獣の爪", uname: "なにかの破片" },
    { rarity: 1, name: "コボルトの木靴（割れている）", uname: "木でできた何か" },
    { rarity: 1, name: "からっぽの水筒（蓋がない）", uname: "よくわからない入れ物" },
    { rarity: 1, name: "スライムの餌が入っていた袋", uname: "謎の袋" },
    { rarity: 1, name: "回復系の魔法薬が入っていたと思われる小瓶", uname: "謎の瓶" },
    { rarity: 1, name: "毒系の魔法薬が入っていたと思われる小瓶", uname: "謎の瓶" },
    { rarity: 1, name: "力が強くなる魔法薬が入っていたと思われる小瓶", uname: "謎の瓶" },
    { rarity: 1, name: "火炎を巻き起こす魔道具の燃えカス", uname: "燃えカス" },
    //
    { rarity: 2, name: "耳が長い種族のための耳かき", uname: "謎の棒" },
    { rarity: 2, name: "ローブの切れ端（闇の魔道士が好きそうな柄）", uname: "よくわからない布" },
    { rarity: 2, name: "モーニングスターの鎖の部分", uname: "金属片" },
    { rarity: 2, name: "オークの肩当ての破片（革製）", uname: "硬い革の切れ端" },
    { rarity: 2, name: "投擲用の槍の穂先", uname: "金属片" },
    { rarity: 2, name: "どこだかわからない村の地図", uname: "紙切れ" },
    { rarity: 2, name: "ゴブリンが好きそうな帽子（あまり臭くない）", uname: "変な帽子" },
    { rarity: 2, name: "両手剣の破片", uname: "金属片" },
    { rarity: 2, name: "トロルが使っていた棍棒（重い）", uname: "重たい棒" },
    { rarity: 2, name: "金属製の小さな宝箱（中身はない）", uname: "謎の箱" },
    //
    { rarity: 3, name: "魔法の剣の破片（魔法の効果はなさそう）", uname: "金属片" },
    { rarity: 3, name: "ゾンビの小指（やけに細い）", uname: "骨みたいなもの" },
    { rarity: 3, name: "オークの胸当ての破片（鉄製）", uname: "金属片" },
    { rarity: 3, name: "ローブの切れ端（外は黒くて、中はキラキラ）", uname: "よくわからない布" },
    { rarity: 3, name: "とても大きな魔獣の爪", uname: "なにかの破片" },
    { rarity: 3, name: "「宝の地図」と書いてある地図（宝の場所の記載はない）", uname: "紙切れ" },
    { rarity: 3, name: "ローブの切れ端（豹柄）", uname: "よくわからない布" },
    { rarity: 3, name: "コボルトの革靴（やけに小さい）", uname: "硬い革の切れ端" },
    { rarity: 3, name: "ドラゴンの羽の切れ端（黄色くてベトベトしている）", uname: "黄色くてベトベトしたもの" },
    { rarity: 3, name: "ドラゴンの羽の切れ端（かじられた跡がある）", uname: "なにかの破片" },
    //
    { rarity: 4, name: "呪われた剣の破片（呪いの効果はなさそう）", uname: "金属片" },
    { rarity: 4, name: "干からびた魔獣の肉（ちょっといい匂いがする）", uname: "いい匂いがする物体" },
    { rarity: 4, name: "ドラゴンの鱗（緑色で傷が多い）", uname: "緑色の切れ端" },
    { rarity: 4, name: "ドラゴンの羽の切れ端（黒くてザラザラしている）", uname: "黒い切れ端" },
    { rarity: 4, name: "邪悪な魔獣の肉（やけに美味しそうな匂い）", uname: "いい匂いがする物体" },
    { rarity: 4, name: "ドラゴニュートの手袋（右手だけ）", uname: "謎の手袋" },
    { rarity: 4, name: "グリフォンの羽毛（半分黒い）", uname: "ふわふわした物体" },
    { rarity: 4, name: "グリフォンのくちばしの破片", uname: "なにかの破片" },
    { rarity: 4, name: "怪しげな指輪がついたままのゴーレムの指", uname: "骨みたいなもの" },
    { rarity: 4, name: "サテュロスの蹄の破片（やけに重い）", uname: "やけに重い物体" },
    //
    { rarity: 5, name: "ドラゴンの鱗（傷がなく、鮮やかな青）", uname: "青いなにかの切れ端" },
    { rarity: 5, name: "ドラゴンの鱗（キラキラしている）", uname: "キラキラしたなにかの切れ端" },
    { rarity: 5, name: "ドラゴンの羽の切れ端（赤くてちょっとあたたかい）", uname: "あたたかいなにかの切れ端" },
    { rarity: 5, name: "ドラゴンの羽の切れ端（半透明で柔らかい）", uname: "半透明のなにかの切れ端" },
    { rarity: 5, name: "指輪の破片（ネクロマンサー好きそうな感じ）", uname: "金属片" },
    { rarity: 5, name: "コカトリスのトサカの破片（干からびている）", uname: "干からびた物体" },
    { rarity: 5, name: "ハーピーがつけていた髪飾り（真っ赤）", uname: "赤い物体" },
    { rarity: 5, name: "昆虫系の魔獣が脱皮したときの皮", uname: "半透明のなにかの切れ端" },
    { rarity: 5, name: "脱皮したバシリスクの皮の頭の部分", uname: "半透明のなにかの切れ端" },
    { rarity: 5, name: "ガーゴイルの角の破片（ツルツルしている）", uname: "ツルツルした物体" },
]

export class ItemSelector {
    seed: number
    constructor(seed: number) {
        this.seed = seed
    }
    saltSeed(salt: number): seedType {
        return Rng.genSeed((this.seed ^ salt) + (salt ^ 18496491) * 7)
    }
    newRng(salt: number): Rng {
        return new Rng(this.saltSeed(salt))
    }
    static rarity(s0: number): RarityType {
        const raRatio = 1.7
        const raCount = 5
        const s = clamp(1 - s0, 0, 1) * (raRatio ** raCount - 1) + 1
        const r = clamp(raCount - Math.floor(Math.log(s) / Math.log(raRatio)), 1, raCount)
        return r as RarityType
    }
    getIDs(n: number): number[] {
        const rngR = this.newRng(0)
        const raList: number[] = [...range(0, n)].map(() => ItemSelector.rarity(rngR.f(1)))
        const ids: number[] = []
        for (const ra of raList) {
            const rng = this.newRng(ra)
            for (; ;) {
                const cand = rng.i(10) + ra * 10
                if (!ids.includes(cand)) {
                    ids.push(cand)
                    break
                }
            }
        }
        return ids
    }
}
