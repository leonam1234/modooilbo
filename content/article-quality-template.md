# 편집 품질 8.5 기사 템플릿

이 파일은 복사용이며 `content/articles/`에 넣지 않는다. 대괄호 안내문을 실제 사실로 바꾼다.

```markdown
---
title: [확인된 사실을 과장 없이 담은 제목]
category: economy
author: 김영환 / 경제부 기자
publishedAt: 2026-09-01 09:10
reporting: desk
verificationNote: [원문·공고·통계 중 무엇과 무엇을 어떤 기준으로 대조했는지 20자 이상]
addedValue: [독자가 원자료만 읽으면 놓칠 자격·기한·계산·충돌·영향 중 무엇을 더했는지 20자 이상]
sourceBasis: primary
visualType: ai-illustration
aiRole: research-assist, draft-assist, copyedit, image
summary: [핵심 사실과 독자 영향을 함께 담은 40자 이상 요약]
image: /stock/[파일명].jpg
imageCaption: AI 생성 이미지. 실제 현장 사진이 아닙니다.
tags: [5개 이상의 구체 태그를 콤마로 구분]
---

[무슨 일이 있었는지. 핵심 수치와 기준일을 포함한다.]

## [사안에 맞춘 구체 소제목]

[조건·대상·예외·비교를 설명한다.]

## [독자에게 실제로 필요한 판단]

[원자료보다 더한 계산·함정·행동 정보를 설명한다.]

## 출처 메모
- [1차 기관]: https://example.go.kr/original
- [비교한 다른 원문]: https://example.go.kr/second
```

direct 기사라면 reportingType을 추가한다. inquiry·interview·follow-up은 실제 답변을 받았을 때만
contactStatus: replied를 쓴다. 답변을 받지 못했다면 direct로 올리지 않는다.
