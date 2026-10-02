import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Thông báo về quyền riêng tư · Student Day Tracker',
};

// Contact channel for data requests (plan §2.2 Q1, reviewed by the owner 2026-10-04).
const CONTACT_EMAIL = 'hotrohs12thpt@gmail.com';

/**
 * Privacy notice (plan §1.3 phase 3, Nghị định 13/2023/NĐ-CP). Static; readable
 * signed out (the auth gate lets /privacy/ through) and linked from ① ⑥ ⑧.
 * Vietnamese, because the users and the requirement are Vietnamese.
 */
export default function PrivacyPage() {
  return (
    <main
      lang="vi"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8"
    >
      <Link
        href="/"
        className="w-fit rounded-full text-sm text-zinc-600 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-400 dark:focus-visible:outline-zinc-100"
      >
        ← Quay lại ứng dụng
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Thông báo về quyền riêng tư
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Student Day Tracker · cập nhật ngày 03/10/2026
        </p>
      </header>

      <article className="space-y-6 rounded-2xl border border-border bg-surface p-6 leading-relaxed sm:p-8">
        <section>
          <h2 className="font-semibold">1. Ứng dụng này là gì</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            Student Day Tracker giúp học sinh ghi lại các hoạt động trong ngày (học, làm việc, thể
            thao, giải trí…) và xem lại thời gian của mình đã dành cho việc gì. Ứng dụng được vận
            hành bởi chủ sở hữu dự án Student Day Tracker (gọi là “chúng tôi”).
          </p>
        </section>

        <section>
          <h2 className="font-semibold">2. Chúng tôi lưu những dữ liệu nào</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
            <li>
              Thông tin từ tài khoản Google của bạn khi đăng nhập: tên hiển thị, địa chỉ email và
              đường dẫn ảnh đại diện.
            </li>
            <li>
              Các hoạt động bạn nhập: tên hoạt động, danh mục, ngày, giờ bắt đầu và giờ kết thúc.
            </li>
            <li>Các danh mục do bạn tự tạo.</li>
            <li>
              Thời điểm tạo tài khoản, thời điểm bạn đồng ý với thông báo này, và thời điểm dữ liệu
              cũ trên thiết bị được chuyển vào tài khoản (nếu có).
            </li>
          </ul>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            Chúng tôi không thu thập vị trí, danh bạ, mật khẩu Google hay dữ liệu nào khác ngoài
            danh sách trên.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">3. Mục đích sử dụng</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            Dữ liệu chỉ dùng để hiển thị dòng thời gian, lịch sử và phần nhận xét cho chính bạn, và
            để đồng bộ giữa các thiết bị bạn đăng nhập. Chúng tôi không bán dữ liệu, không dùng cho
            quảng cáo và không chia sẻ cho bên thứ ba ngoài nhà cung cấp hạ tầng nêu ở mục 4.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">4. Dữ liệu được lưu ở đâu</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            Dữ liệu được lưu trên Google Cloud Firestore (dịch vụ Firebase của Google), tại khu vực
            asia-southeast1 (Singapore). Để ứng dụng dùng được khi không có mạng, một bản sao được
            lưu trên trình duyệt của thiết bị bạn đang dùng; bản sao này bị xoá khi bạn bấm “Sign
            out” (đăng xuất).
          </p>
        </section>

        <section>
          <h2 className="font-semibold">5. Ai xem được dữ liệu của bạn</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            Chỉ bạn, khi đã đăng nhập bằng tài khoản Google của mình. Quy tắc bảo mật của cơ sở dữ
            liệu chặn mọi tài khoản khác đọc hoặc ghi dữ liệu của bạn.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">6. Dữ liệu cũ trên thiết bị</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            Nếu trước đây bạn đã dùng ứng dụng mà chưa đăng nhập, các hoạt động và danh mục lưu trên
            thiết bị sẽ được chuyển một lần vào tài khoản đầu tiên đăng nhập trên thiết bị đó. Dữ
            liệu mẫu (demo) không được chuyển.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">7. Nếu bạn dưới 16 tuổi</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            Theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, việc xử lý dữ liệu của trẻ em
            cần có sự đồng ý của cha mẹ hoặc người giám hộ. Nếu bạn dưới 16 tuổi, hãy cùng cha mẹ
            hoặc người giám hộ đọc thông báo này trước khi đăng nhập.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">8. Quyền của bạn</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            Bạn có thể xem, sửa và xoá từng hoạt động ngay trong ứng dụng. Để yêu cầu xoá toàn bộ
            tài khoản và dữ liệu, hoặc rút lại sự đồng ý, hãy gửi email cho chúng tôi tại{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-indigo-700 underline underline-offset-2 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              {CONTACT_EMAIL}
            </a>
            ; chúng tôi sẽ xử lý trong vòng 7 ngày.
          </p>
        </section>
      </article>
    </main>
  );
}
