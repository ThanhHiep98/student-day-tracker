# Requirements — Student Day Tracker

> Cleaned-up, structured export of [`requirement/Requirement.docx`](../requirement/Requirement.docx)
> (the original source of truth — re-export with `pandoc requirement/Requirement.docx -t markdown`
> if it changes). Kept in Vietnamese to match the original; section numbers match the docx.

Three top-level sections, matching `src/app/page.tsx` (Home), `src/app/history/page.tsx`
(History), and `src/app/insights/page.tsx` (Insights).

## 1. HOME

Màn hình đầu tiên người dùng nhìn thấy. **Mục tiêu:** không cần nhiều biểu đồ — mở app và hiểu
ngay "Hôm nay mình đã dành thời gian cho những gì?".

**Header:** lời chào theo thời gian trong ngày (`Good evening, {name}`), ngày hôm nay, nút
**+ Add Activity**.

### 1.1 Daily summary
Một card lớn: tổng thời gian đã track hôm nay + breakdown theo category, ví dụ:

| | |
|---|---|
| **TODAY** | 6h 35m tracked |
| Work | 3h 10m |
| Study | 1h 30m |
| Exercise | 45m |
| Entertainment | 1h 10m |

Có thể dùng thanh ngang (progress bar) biểu thị tỉ lệ mỗi category trên tổng thời gian.

### 1.2 Today's Timeline
**Phần quan trọng nhất của Home.** Mỗi activity hiển thị:

- Icon
- Tên activity
- Category
- Start time / End time
- Duration
- Edit
- Delete

### 1.3 Add activity
Category có các mục cố định (Work, Study, Exercise, Entertainment) + user có thể thêm category
riêng.

## 2. HISTORY

Xem dưới dạng lịch tháng (Mon–Sun). Click vào một ngày → phía dưới hiện tóm tắt của ngày đó
(dùng lại Daily summary + Timeline của Home, chỉ khác ngày).

## 3. INSIGHTS

Không chỉ nói "Work = 20h" — phải chuyển dữ liệu thành câu chuyện: "Bạn đang dành thời gian cho
điều gì?"

### 3.1 Weekly Overview
Biểu đồ tổng hợp theo tuần (hours per category).

### 3.2 Compare — So sánh
Tránh khung "tốt/xấu". Diễn đạt theo delta có ngữ cảnh, ví dụ: *"Bạn đã dành nhiều hơn 2h 35m
cho 'Công việc' vào tuần này."*

### 3.3 Insight cards
Các nhận xét ngắn, cụ thể, tự động rút ra từ dữ liệu.

### 3.3 Monthly Overview
*(đánh số trùng 3.3 trong bản gốc)* Tổng kết theo tháng.

### 3.4 Activity Analytics
Click vào một activity cụ thể để xem phân tích chi tiết (lịch sử, xu hướng) của riêng nó.

## Data model implications

- **Category**: `id, name, color, icon, isDefault, createdAt` — 4 default categories seeded on
  first run (`src/lib/default-categories.ts`). Users can add custom categories (`buildCategory`:
  name deduped case-insensitively against all categories, color cycles through
  `CUSTOM_CATEGORY_PALETTE`, icon 🏷️); renaming/deleting custom categories is not built yet.
- **Activity**: `id, categoryId, name, date (YYYY-MM-DD), startMinutes, endMinutes, createdAt` —
  one tracked block of time within a single day (`buildActivity` / `buildUpdatedActivity`). Demo
  rows are identified by an `id` prefix of `demo-`. See `src/lib/types.ts` and `src/lib/db.ts`
  (still `version(1)`).
- Aggregation is pure logic over `Activity[]` + `Category[]`, tested independently of Dexie:
  `get-daily-summary.ts` (Home/History), `get-weekly-summary.ts`, `compare-periods.ts`,
  `build-insight-cards.ts`, `get-monthly-summary.ts`, `get-activity-analytics.ts` (Insights).

## Shipped behaviour (defaults chosen while building sections 1–3)

Interim defaults from `plans/2026-09-26-add-activity.html` §2.2 — revisit there if they change.

| # | Topic | Current behaviour |
|---|---|---|
| D1 | Insight cards (§3.3) | 4 cards for the current week, each hidden below its threshold: *Your week* (total > 0), *Your routine* (≥3 sessions in the same 3-hour slot), *Your pattern* (≥2 tracked days), *Consistency* (≥3 days) |
| D2 | Not enough data | Compare shows a note instead of numbers when last week's matching days are empty; a category new this week is labelled "new this week"; no qualifying card → "track a few more days" |
| D3 | Week / month | Mon–Sun calendar week (matches History); Compare = this week so far vs. the same weekdays last week; Monthly and Analytics = this month up to today |
| D4 | Custom categories | Create only (no rename/delete) |
| D5 | Overlap / midnight | Overlapping activities allowed; an activity can't cross midnight — **superseded by §4**: cross-midnight activities are supported since v2 slice 1 (2026-10-03), stored as two per-day rows linked by `spanId` |
| D6 | Default categories | Work, Study, Exercise, Entertainment (no "Other") |
| D7 | Demo data | Seeded with `demo-` ids and counted in Insights while present (banner shown); "Clear & start fresh" deletes only demo rows |

## 4. Yêu cầu bổ sung (v2)

> Source: [`requirement/Requirement.txt`](../requirement/Requirement.txt) (added 2026-10-01; quoted
> verbatim, not translated). Roadmap, ordering, and open decisions:
> [`plans/2026-10-01-v2-roadmap-cross-midnight.html`](../plans/2026-10-01-v2-roadmap-cross-midnight.html).

```
Người dùng ở đây là học sinh và đang tham gia quá trình thi Đại học. Hãy hỗ trợ để phát triển 1 app có thể hỗ trợ gợi ý cho học sinh và phụ huynh

- Cho quyền add thêm các sticker nhãn dán, hãy tham khảo facebook để phát triển tính năng này.
- Fix bug: Khi nhập activity từ 21:00 của ngày hôm trước đến 1:00 hôm sau không được
- Tạo User và đăng nhập.
- Ở lần đầu tiên, đưa ra các gợi ý đề habit của người sử dụng app (ví dụ: mong muốn ngủ bao nhiêu tiếng ban đêm, thời gian bắt đầu ngủ, đi học, giải trí, các vấn đề khác), đặt khoảng 5 câu hỏi.
- Với những thông tin được User cung cấp thì sẽ đưa ra cảnh báo nếu activity cảu User đang vi phạm. Đưa ra nhận xét cho người dùng.
vd: 1 ngày nhu cầu cần học bao nhiêu (bao nhiêu thời gian trên trường, bao nhiêu thời gian học thêm, bao nhiêu tgian tự học; ăn trong bao lâu, giải trí, ngủ, các vấn đề khác...)
Khi học sinh đăng nhập sẽ dựa vào chuẩn đầu vào tính % hiệu quả đưa ra nhận xét
- Đánh giá mức độ hài lòng trong ngày
```

Notes:
- The cross-midnight bug fix **overrides** decision D5 ("activities can't cross midnight") from
  `plans/2026-09-26-add-activity.html`.
- "Tạo User và đăng nhập" conflicted with ADR-001 (no backend, no auth). D-A was resolved on
  2026-10-01: Firebase ([`architecture/ADR-007-firebase.md`](../architecture/ADR-007-firebase.md)),
  delivered as sub-slices F1–F3 in
  [`plans/2026-10-01-firebase-setup.html`](../plans/2026-10-01-firebase-setup.html).

## Status

Sections 1–3 (Home, History, Insights, including the add/edit/delete write flows and custom
categories) shipped on 2026-10-01 via `plans/2026-09-26-add-activity.html`. Known gap: §3.4's
"xu hướng" (trend) is not shown yet — Analytics lists sessions, average, longest and most common
time slot only.

Section 4 is being delivered one slice at a time through the Plan → Implement → Test workflow
(see `CLAUDE.md`). Slice 1 (cross-midnight bug fix) shipped 2026-10-03; F1 (Firebase Hosting) is live at
https://student-day-tracker.web.app; D-A (login) is resolved by ADR-007 (Firebase, F1–F3); D-B (goal ↔ category mapping) decided 2026-10-03 = option (iii).
