# 편집 품질 8.5 기사 템플릿

이 파일은 복사용이며 `content/articles/`에 넣지 않는다. 고정 예시값을 두지 않은 이유는
다른 기사에 날짜·지면·취재 방식·연재가 그대로 복제되는 사고를 막기 위해서다. 빈 필수값과
대괄호 본문은 기사별 사실로 바꾼다. 초안 작성자는 `reviewedBy`·`reviewedAt`·
`reporterInsight`를 비워 두고, 독립 리뷰에서 실제 책임 기자가 원문 대조를 마친 뒤 입력한다.

```markdown
---
title:
category:
author:
publishedAt:
reporting:
reportingType:
contactStatus:
verificationNote:
addedValue:
sourceBasis:
visualType:
aiRole:
reviewedBy:
reviewedAt:
reporterInsight:
series:
methodologyNote:
readerChecklist:
summary:
image:
imageCaption:
tags:
---

[무슨 일이 있었는지. 핵심 수치와 기준일을 포함한다.]

## [사안에 맞춘 구체 소제목]

[조건·대상·예외·비교를 설명한다.]

## [독자에게 실제로 필요한 판단]

[원자료보다 더한 계산·함정·행동 정보를 설명한다.]

## 출처 메모
- [1차 기관]: SOURCE_URL_REQUIRED
- [비교한 다른 원문]: SECOND_SOURCE_URL_REQUIRED
```

허용값과 길이는 [README.md](README.md)의 머리표 필드표를 따른다. 조건부 필드가 적용되지
않으면 줄을 비워 두거나 삭제한다. `direct`의 `data-analysis`·`document-verification`은
`methodologyNote` 40자 이상, `grants`·`bids`·`labor`는 `readerChecklist` 3개 이상이 필수다.
`inquiry`·`interview`·`follow-up`은 실제 답변을 받은 경우에만 `contactStatus: replied`를 쓰며,
답변을 받지 못했다면 해당 유형을 direct로 올리지 않는다.

선택적인 기획 연재 slug는 `notice-check`(공고 원문검증), `data-crosscheck`(데이터 교차검증),
`on-the-record`(답변을 받았습니다) 중 기사 성격에 맞을 때만 쓴다. 억지로 붙이지 않는다.
