import type { Article } from "./types";
import { ARTICLES as BATCH_1 } from "./articles";
import { ARTICLES_2 as BATCH_2 } from "./articles2";

/** 전체 기사 데이터 (배치 1 + 배치 2) */
export const ALL_ARTICLES: Article[] = [...BATCH_1, ...BATCH_2];
