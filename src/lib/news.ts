import type { Article } from "./types";
import { ARTICLES as BATCH_1 } from "./articles";
import { ARTICLES_2 as BATCH_2 } from "./articles2";
import { CONTENT_ARTICLES } from "./content.generated";

/** 전체 기사 데이터 (하드코딩 배치 + content/articles 에이전트 발행분) */
export const ALL_ARTICLES: Article[] = [...CONTENT_ARTICLES, ...BATCH_1, ...BATCH_2];
