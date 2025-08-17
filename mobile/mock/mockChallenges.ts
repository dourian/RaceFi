import { mockParticipants } from "./mockParticipants";
import { mockCreators } from "./mockCreators";
import { Challenge } from "../constants/types";

export const baseChallenges = [
  {
    id: "waterfront-5k",
    name: "Waterfront 5K Challenge",
    description:
      "A scenic 5km run along the waterfront with beautiful views. Perfect for morning runs with moderate elevation changes.",
    distanceKm: 5,
    windowDays: 7,
    stake: 5,
    elevation: 85,
    difficulty: "Moderate" as const,
    prizePool: 20,
    participants: 4,
    maxParticipants: 12,
    location: "San Francisco, CA",
    startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    polyline:
      "ki{eFvqfiVqAWQIGEEKAYJgBVqDJ{BHa@jAkNJw@Pw@V{APs@^aABQAOEQGKoJ_FuJkFqAo@{A}@sH{DiAs@Q]?WVy@`@oBt@_CB]KYMMkB{AQEI@WT{BlE{@zAQPI@ICsCqA_BcAeCmAaFmCqIoEcLeG}KcG}A}@cDaBiDsByAkAuBqBi@y@_@o@o@kB}BgI",
    routeColor: "#3b82f6", // Blue for waterfront
  },
  {
    id: "uptown-10k",
    name: "Uptown 10K Challenge",
    description:
      "A challenging 10km route through uptown with significant elevation changes. Great for experienced runners looking for a workout.",
    distanceKm: 10,
    windowDays: 7,
    stake: 10,
    elevation: 156,
    difficulty: "Hard" as const,
    prizePool: 40,
    participants: 4,
    maxParticipants: 15,
    location: "New York, NY",
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    polyline:
      "kb~bFdxp|U}BaBkCcBaB_AiA{@qAmAuAcCa@aAYy@Ws@Qw@M{@G_BAgBB_AF{@L}@Py@Tw@Vw@\\\\y@b@w@f@{@j@{@n@w@r@s@t@q@x@m@z@i@|@e@~@a@`Ac@bAa@dAc@fAe@hAg@jAi@lAk@nAm@pAo@rAq@tAs@vAu@xAw@zA{@|A}@~A_@`B_A`BaAbBcAbBeAbBgAbBi@bBk@bBo@bBq@bBs@bBu@bBw@bBy@bB}@bB_AzA",
    routeColor: "#ef4444", // Red for uptown
  },
  {
    id: "morning-3k",
    name: "Morning 3K Sprint",
    description:
      "Early bird special! A quick 3km sprint through the city center. Perfect for starting your day with energy.",
    distanceKm: 3,
    windowDays: 5,
    stake: 3,
    elevation: 45,
    difficulty: "Easy" as const,
    prizePool: 12,
    participants: 6,
    maxParticipants: 20,
    location: "Chicago, IL",
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    polyline:
      "u`~gGfkwuOwBcC_AyA{@wAaAqBs@_BYo@k@uA[s@m@wAo@yAg@iA]y@Wm@Oe@Qg@Oe@Mk@Gq@Eq@Cu@Aw@?w@Bw@Du@Fs@Hq@Jm@Nk@Ri@Vi@Zg@^e@`@c@b@a@d@_@f@]h@[j@Yl@Wn@Up@Sr@Qt@Ov@Mt@Kv@Ix@Gz@Ez@C|@A|@",
    routeColor: "#f59e0b", // Orange for morning
  },
  {
    id: "sunset-7k",
    name: "Sunset 7K Loop",
    description:
      "Run as the sun sets over the hills. A beautiful 7km loop with rolling terrain and stunning views.",
    distanceKm: 7,
    windowDays: 10,
    stake: 8,
    elevation: 120,
    difficulty: "Moderate" as const,
    prizePool: 32,
    participants: 3,
    maxParticipants: 16,
    location: "Austin, TX",
    startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
    polyline:
      "ew~vDhm}pQoAmBoA{AcAcByA}BwA{B}@cBw@eBu@kBq@mBm@oBi@qBe@sBa@uB]wBYyBU{BQ}BM_CIaCEbCCdCAdC?fCBhCDjCFhCJfCNdCRbCVbCZ`C^`Cb@~Bf@|Bj@zBn@xBr@vBv@tBz@rB~@pBbApBfAnBjAmBlAnBlAnBhAjBjAhBlAfBnAdBpAbBr@~At@~Av@|Ax@|Az@zAz@zAx@xAv@xAt@vAr@tAp@tAn@rAl@pAj@pAh@nAf@lAd@jAb@jA`@hA^hA\\fAZ~@X~@V|@T|@R|@Pz@Nz@Lx@Jv@Hv@Ft@Dt@Br@?r@Ar@Cp@Ep@Gn@In@Kl@Ml@Ok@Qk@Si@Ui@Wi@Yg@[g@]e@_@e@a@c@c@c@e@a@g@_@i@]i@[k@Yk@Wm@Um@So@Qo@Os@Ms@Ku@Iu@Gw@Ew@Cy@A{@?{@B{@D{@Fy@Hy@Jw@Lw@Nu@Pu@Rs@Ts@Vq@Xq@Zo@\\o@^m@`@m@b@k@d@k@f@i@h@g@j@g@",
    routeColor: "#f97316", // Sunset orange
  },
  {
    id: "mountain-15k",
    name: "Mountain Trail 15K",
    description:
      "The ultimate endurance test! A grueling 15km mountain trail with serious elevation gain. For experienced runners only.",
    distanceKm: 15,
    windowDays: 14,
    stake: 20,
    elevation: 340,
    difficulty: "Hard" as const,
    prizePool: 100,
    participants: 2,
    maxParticipants: 8,
    location: "Denver, CO",
    startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
    polyline:
      "_c}aGzp~rTsAe@wAg@uAi@sAk@qAm@oAo@mAq@kAs@iAu@gAw@eAy@cA{@aA}@_A_@]a@[c@Ye@Wg@Ui@Si@Qk@Ok@Mm@Km@Io@Go@Eq@Cq@Aq@?s@?s@Bs@Ds@Fq@Hq@Jq@Lp@Nn@Pn@Rn@Tl@Vl@Xj@Zj@\\j@^h@`@h@b@f@d@f@f@d@h@d@j@b@j@`@l@^l@\\n@Zn@Xp@Vp@Tr@Rs@Ps@Nu@Lu@Jw@Hw@Fy@Dy@B{@?{@A{@C{@E{@G{@I{@K{@M{@O{@Q{@S{@U{@W{@Y{@[{@]{@_{@a{@c{@e{@g{@i{@k{@m{@o{@q{@s{@u{@w{@y{@{{@}{@_{A_{Ac{Ae{Ag{Ai{Ak{Am{Ao{Aq{As{Au{Aw{Ay{A{{A}{A_{C_{Ce{Cg{Ci{Ck{Cm{Co{Cq{Cs{Cu{Cw{Cy{C{{C}{C",
    routeColor: "#059669", // Mountain green
  },
  {
    id: "beach-4k",
    name: "Beach Run 4K",
    description:
      "Feel the sand between your toes! A refreshing 4km beach run with ocean breeze and minimal elevation.",
    distanceKm: 4,
    windowDays: 6,
    stake: 4,
    elevation: 15,
    difficulty: "Easy" as const,
    prizePool: 16,
    participants: 8,
    maxParticipants: 25,
    location: "Miami, FL",
    startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    polyline:
      "o`}pD~b{qOoAaBoAmB{@wAy@uAw@sAu@qAs@oAq@mAo@kAm@iAk@gAi@eAg@cAe@aAc@_Aa@]A_@_A]A_A[A_AYA_AWYA_AUWA_ASYA_AQYA_AOYA_AMYA_AKYA_AIYA_AGYA_AEYA_ACYA_AAYA_A?YA_AB{@D{@F{@H{@J{@L{@N{@P{@R{@T{@V{@X{@Z{@\\{@^{@`@{@b@{@d@{@f@{@h@{@j@{@l@{@n@{@p@{@r@{@t@{@v@{@x@{@z@{@|@{@~@{@`A{@bA{@dA{@fA{@hA{@jA{@lA{@nA{@pA{@rA{@tA{@vA{@xA{@zA{@|A{@~A{@`B{@bB{@dB{@fB{@hB{@jB{@lB{@nB{@pB{@rB{@tB{@vB{@xB{@zB{@|B{@~B{@`C{@bC{@",
    routeColor: "#06b6d4", // Beach cyan
  },
  {
    id: "downtown-8k",
    name: "Downtown 8K Circuit",
    description:
      "Urban running at its finest! Navigate through the bustling downtown core on this 8km circuit with moderate hills.",
    distanceKm: 8,
    windowDays: 8,
    stake: 12,
    elevation: 95,
    difficulty: "Moderate" as const,
    prizePool: 48,
    participants: 5,
    maxParticipants: 18,
    location: "Seattle, WA",
    startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    polyline:
      "c{ltGfy{zVqCkAoC_BmCcBkCeBgCgBeCiBaCmB_CoB{BqBwBsBsB{BoBcCkBkCgBsCcB{C_BcD[BcD_BeDcBeDgBgDiBoD]mDqBoDuBoDyBqD{BqD}BsD_CsDaCuDcCwDeCwDgCyDiC{DkC{DmC}DoC}DqC_EsCaEuCaEwCcEyCcE{CeE}CeE_DgEaDgEcDiEcDiEeDkEgDkEiDmEkDmEmDoEoDqEqDqEsDsEuDsEwDuEyDuE{DwE}DwE_ExEaExEcEzEcEzEeE|EeE|EgE~EgE~EiE`FiFaFkFcFkFeF]mF_FmFaFoFcFoFeF]qFgFqFiFsFiFsFkFuFkFuFmFwFmFwFoFyFoFyFqF{FqF{FsF}FsF}FuF_GuF_GwFaGwFaGyFcGyFcG{FeG{FeG}FgG}FgG_GiG_GiGaGkGaGkGcGmGcGmGeGoGeGoGgGqGgGqGiGsGiGsGkGuGkGuGmGwGmGwGoGyGoGyGqG{GqG{GsG}GsG}GuG_HuG_HwGaHwGaHyGcHyGcH{GeH{GeH}GgH}GgH_HiH_HiHaHkHaHkHcHmHcHmHeHoHeHoHgHqHgHqHiHsHiHsHkHuHkHuHmHwHmHwHoHyHoHyHqH{HqH{HsH}HsH}H",
    routeColor: "#8b5cf6", // Purple for urban
  },
  {
    id: "river-12k",
    name: "River Path 12K",
    description:
      "Follow the winding river path for 12km of peaceful running. Flat terrain with beautiful water views throughout.",
    distanceKm: 12,
    windowDays: 12,
    stake: 15,
    elevation: 60,
    difficulty: "Moderate" as const,
    prizePool: 75,
    participants: 3,
    maxParticipants: 12,
    location: "Portland, OR",
    startDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    polyline:
      "kqp}G`uykV_CqA_CsAaCsAaCuA_CuA_CwA}BwA}ByA{ByAyB{AwB{AwB}AuB}AuB_BsB_BsBaBqBaBqBcBoB",
    routeColor: "#0ea5e9", // River blue
  },
  // Expired Challenges
  {
    id: "winter-marathon",
    name: "Winter Marathon 42K",
    description:
      "The ultimate winter challenge! A full marathon through snowy trails with breathtaking winter scenery.",
    distanceKm: 42.2,
    windowDays: 21,
    stake: 50,
    elevation: 500,
    difficulty: "Hard" as const,
    prizePool: 500,
    participants: 12,
    maxParticipants: 20,
    location: "Aspen, CO",
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
    polyline:
      "_c}aGzp~rTsAe@wAg@uAi@sAk@qAm@oAo@mAq@kAs@iAu@gAw@eAy@cA{@aA}@_A",
    routeColor: "#6366f1", // Indigo for winter
  },
  {
    id: "spring-5k",
    name: "Spring Blossom 5K",
    description:
      "Celebrate spring with a beautiful 5km run through blooming cherry blossom trees and parks.",
    distanceKm: 5,
    windowDays: 7,
    stake: 8,
    elevation: 50,
    difficulty: "Easy" as const,
    prizePool: 32,
    participants: 15,
    maxParticipants: 25,
    location: "Washington, DC",
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    polyline: "ki{eFvqfiVqAWQIGEEKAYJgBVqDJ{BHa@jAkNJw@Pw@V{APs@^aABQAOEQ",
    routeColor: "#ec4899", // Pink for spring blossoms
  },
  {
    id: "night-owl-10k",
    name: "Night Owl 10K",
    description:
      "Run under the stars! A nighttime 10km challenge through illuminated city streets and parks.",
    distanceKm: 10,
    windowDays: 10,
    stake: 15,
    elevation: 80,
    difficulty: "Moderate" as const,
    prizePool: 90,
    participants: 8,
    maxParticipants: 15,
    location: "Las Vegas, NV",
    startDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
    endDate: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), // 11 days ago
    polyline: "kb~bFdxp|U}BaBkCcBaB_AiA{@qAmAuAcCa@aAYy@Ws@Qw@M{@G_B",
    routeColor: "#a855f7", // Purple for night
  },
];

// Combine base challenges with participants and creators
// IMPORTANT: Calculate prize pool dynamically based on stake × participants
export const challenges: Challenge[] = baseChallenges.map((baseChallenge) => ({
  ...baseChallenge,
  // Dynamic prize pool calculation: stake × participants
  prizePool: baseChallenge.stake * baseChallenge.participants,
  creator: mockCreators[baseChallenge.id],
  participantsList: mockParticipants[baseChallenge.id] || [],
}));

export default challenges;
