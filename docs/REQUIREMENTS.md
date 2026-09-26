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

- **Category**: `id, name, color, icon, isDefault` — 4 default categories seeded on first run
  (`src/lib/default-categories.ts`); users can add more, can't delete the defaults.
- **Activity**: `id, categoryId, name, date (YYYY-MM-DD), startMinutes, endMinutes` — one tracked
  block of time. See `src/lib/types.ts` and `src/lib/db.ts`.
- Aggregation (daily/weekly/monthly totals, category breakdowns) is pure logic over
  `Activity[]` + `Category[]`, tested independently of Dexie — see `src/lib/get-daily-summary.ts`
  for the pattern to extend for weekly/monthly (Insights).

## Out of scope for the environment scaffold

The current `src/` tree is a **skeleton**: routing, data schema, and the read path (today's
activities, month calendar, empty states) work; write flows (add/edit/delete activity, custom
categories) and all of Insights' charts/comparisons/cards are intentionally left as placeholders.
Building those out is the Plan → Implement → Test agent workflow's job — see `CLAUDE.md`.
