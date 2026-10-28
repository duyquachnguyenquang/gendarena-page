import { VotingConfig } from '@/types/voting'

/**
 * Pinned official finalist team IDs for Round 3 (Top 10):
 * 1. APEX
 * 2. Change yourself
 * 3. F4ST
 * 4. From L to E
 * 5. Ngũ Long Công Chúa
 * 6. SISO
 * 7. Axiom
 * 8. Viet Nam Safe
 * 9. VNSN
 * 10. Aqua Radar
 */
export const PINNED_FINALIST_TEAM_IDS: string[] = [
  '77ccb7ee-7a16-4582-bb07-81d5f2ec892b', // APEX
  'a2d974ad-a2ae-4854-a3e6-735d76c2dc5f', // Change yourself
  'a2236802-2fb9-4a6d-8bb1-bea3874d19ea', // F4ST
  'ba52dec7-75d0-4f06-8153-23d102e3971b', // From L to E
  'f103ffe4-bf05-49a3-a373-6a30ddaa3fdb', // Ngũ Long Công Chúa
  'd9f575a6-e2d6-42e6-bd4a-4f076dfa7f0e', // SISO
  'e5e79a05-cc45-4015-811b-17d3965e32f2', // Axiom
  '61157dca-cf00-48a6-9868-6599b0b4d0da', // Viet Nam Safe (VNS - VIET NAM SAFE)
  '45289e54-5a98-49d8-9f36-24660b1d6bfe', // VNSN
  '9e9103e9-a725-48cf-b4da-519f0b68e24a', // Aqua Radar
]

export const DISPLAY_NAMES_BY_ID: Record<string, string> = {
  '77ccb7ee-7a16-4582-bb07-81d5f2ec892b': 'APEX',
  'a2d974ad-a2ae-4854-a3e6-735d76c2dc5f': 'Change yourself',
  'a2236802-2fb9-4a6d-8bb1-bea3874d19ea': 'F4ST',
  'ba52dec7-75d0-4f06-8153-23d102e3971b': 'From L to E',
  'f103ffe4-bf05-49a3-a373-6a30ddaa3fdb': 'Ngũ Long Công Chúa',
  'd9f575a6-e2d6-42e6-bd4a-4f076dfa7f0e': 'SISO',
  'e5e79a05-cc45-4015-811b-17d3965e32f2': 'Axiom',
  '61157dca-cf00-48a6-9868-6599b0b4d0da': 'Viet Nam Safe',
  '45289e54-5a98-49d8-9f36-24660b1d6bfe': 'VNSN',
  '9e9103e9-a725-48cf-b4da-519f0b68e24a': 'Aqua Radar',
}

export const EVENTISTA_VOTING_URL = 'https://gendarena.1vote.vn/'

// Các đội không có phần bình chọn do không có video thực hiện đúng yêu cầu
export const NON_VOTING_TEAM_IDS: string[] = [
  'd9f575a6-e2d6-42e6-bd4a-4f076dfa7f0e', // SISO
  '9e9103e9-a725-48cf-b4da-519f0b68e24a', // Aqua Radar
]

export const VOTING_CONFIG: VotingConfig = {
  title: 'Bình Chọn Vòng 3',
  roundTitle: 'Vòng 3: Chung Kết',
  competitionName: 'GenD Arena 2026',
  // Bắt đầu: 20:00 ngày 25/10/2026 (GMT+7)
  startDate: '2026-10-25T20:00:00+07:00',
  // Kết thúc: 20:00 ngày 07/11/2026 (GMT+7)
  endDate: '2026-11-07T20:00:00+07:00',

  sponsor: {
    name: 'Eventista',
    brandName: 'Eventista',
    role: 'Nền tảng bảo trợ & vận hành cổng bình chọn trực tuyến',
    description:
      'Hệ thống bình chọn xác thực trực tuyến: 1 tài khoản = 1 lượt vote công tâm, không spam bot, bảo đảm công bằng tuyệt đối.',
    websiteUrl: 'https://eventistax.com/vi/',
    facebookUrl: 'https://www.facebook.com/eventista.vn/',
    email: 'Contact@eventista.vn',
    hotline: '(+84) 832 338 688',
    logoUrl: '/logo/eventista-full.png',
    badgeUrl: '/logo/eventista-badge.png',
  },

  rules: [
    {
      title: 'Khung giờ bình chọn chính thức',
      content: [
        'Mở cổng: 20:00 ngày 25.10.2026.',
        'Đóng cổng: 20:00 ngày 07.11.2026.',
        'Hệ thống Eventista tự động khóa cổng và chốt số liệu khi hết giờ.',
      ],
    },
    {
      title: 'Quy cách & Tính minh bạch',
      content: [
        'Bình chọn hoàn toàn miễn phí trên nền tảng Eventista.',
        'Mỗi tài khoản hợp lệ được gửi 1 lượt vote cho đội thi bạn tin tưởng nhất.',
        'Công nghệ chống gian lận tự động lọc bỏ tài khoản ảo và spam bot.',
      ],
    },
    {
      title: 'Giải thưởng Đội thi Được Yêu Thích Nhất',
      content: [
        'Đội dẫn đầu bình chọn nhận giải thưởng 1.000.000 VNĐ cùng kỷ niệm chương tại Đêm Chung kết.',
        'Kết quả độc lập với điểm số chuyên môn từ Ban Giám khảo.',
      ],
    },
  ],

  teams: [
    {
      id: '77ccb7ee-7a16-4582-bb07-81d5f2ec892b',
      msbc: '01',
      order: 1,
      name: 'APEX',
      slogan: 'Tối ưu hóa logistics thông minh cho chuỗi cung ứng thế hệ mới',
      quote: 'Đột phá trong quản lý chuỗi cung ứng là chìa khóa nâng tầm vị thế thương mại của doanh nghiệp trẻ.',
      summary:
        'Hệ thống tối ưu hóa và tự động hóa quy trình logistics thông minh, giải quyết bài toán luân chuyển và giảm chi phí vận hành chuỗi cung ứng.',
      institution: 'ĐH Giao thông Vận tải TP.HCM',
      category: 'Logistics và Chuỗi cung ứng',
      tags: ['Smart Logistics', 'Supply Chain', 'AI Optimization'],
      description:
        'APEX là đội thi đại diện khối ngành Smart Logistics & CNTT ĐH Giao thông Vận tải TP.HCM, mang đến giải pháp điều phối vận tải ứng dụng thuật toán thông minh.',
      problem:
        'Các doanh nghiệp logistics vừa và nhỏ đối mặt chi phí vận hành biến động lớn, thiếu công cụ dự báo và giám sát chuỗi luân chuyển theo thời gian thực.',
      solution:
        'Nền tảng số hóa kết nối chuỗi cung ứng, tự động đề xuất lộ trình vận tải và phân bổ kho bãi tối ưu bằng AI.',
      techStack: ['Smart Logistics', 'Python', 'Cloud Services', 'Data Analytics'],
      members: [
        { name: 'Nguyễn Thị Hoàng Giang', role: 'Trưởng nhóm', university: 'ĐH Giao thông Vận tải TP.HCM' },
        { name: 'Viết Hoàng', role: 'Thành viên', university: 'ĐH Giao thông Vận tải TP.HCM' },
        { name: 'Huỳnh Nam Trường', role: 'Thành viên', university: 'ĐH Giao thông Vận tải TP.HCM' },
        { name: 'Lê Hữu Minh Phú', role: 'Thành viên', university: 'ĐH Giao thông Vận tải TP.HCM' },
        { name: 'Nguyễn Trần Tiến Phúc', role: 'Thành viên', university: 'ĐH Giao thông Vận tải TP.HCM' },
      ],
      avatarUrl: '/images/teams/apex.webp',
      posterUrl: '/images/teams/apex.webp',
      videoPitchUrl: 'https://drive.google.com/file/d/1i6rEcgvpSRkfo0Sc9-dy90umAvtucJCS/preview',
      videoDuration: '01:30',
      eventistaUrl: 'https://gendarena.1vote.vn/candidate/EVENT_qwCuZ/apex-m5fo',
      directVoteUrl: 'https://gendarena.1vote.vn/?voteEventId=EVENT_qwCuZ&voteCandidateId=m5fo',
      initialVotes: 1420,
      likesCount: 384,
      viewsCount: 3840,
    },
    {
      id: 'a2d974ad-a2ae-4854-a3e6-735d76c2dc5f',
      msbc: '02',
      order: 2,
      name: 'Change yourself',
      slogan: 'Chủ động xây dựng mạng lưới kết nối và học hỏi cộng tác cùng chuyên gia',
      quote: 'Thay đổi chính mình là bước đi đầu tiên để mở ra cánh cửa kiến tạo tương lai.',
      summary:
        'Nền tảng kết nối cố vấn chuyên gia và chia sẻ tri thức thực chiến, giúp người trẻ tiếp cận cơ hội phát triển năng lực và khởi nghiệp.',
      institution: 'ĐH Giao thông Vận tải TP.HCM & ĐH FPT TP.HCM',
      category: 'Kinh doanh, Thương mại và Tài chính',
      tags: ['EdTech', 'Networking', 'AI Mentor'],
      description:
        'Change yourself là sự kết hợp giữa tư duy chuỗi cung ứng và trí tuệ nhân tạo, hướng tới hỗ trợ bạn trẻ tự nâng cấp kỹ năng nghề nghiệp và kết nối cố vấn.',
      problem:
        'Sinh viên và người trẻ thường thiếu người định hướng, thiếu mạng lưới chuyên gia cố vấn trong quá trình thử nghiệm ý tưởng kinh doanh.',
      solution:
        'Mô hình kết nối matching thông minh giữa mentor và mentee dựa trên mục tiêu phát triển và năng lực cá nhân.',
      techStack: ['AI Matching', 'React', 'Node.js', 'PostgreSQL'],
      members: [
        { name: 'Trần Thị Thuỳ Trân', role: 'Trưởng nhóm', university: 'ĐH Giao thông Vận tải TP.HCM' },
        { name: 'Trần Cao Minh Đạt', role: 'Thành viên', university: 'ĐH FPT TP.HCM' },
      ],
      avatarUrl: '/images/teams/change-yourself.webp',
      posterUrl: '/images/teams/change-yourself.webp',
      videoPitchUrl: 'https://drive.google.com/file/d/18udO8myLKy-sUBcbjzrmlc2gUrdHD9k6/preview',
      videoDuration: '01:45',
      eventistaUrl: 'https://gendarena.1vote.vn/candidate/EVENT_qwCuZ/change-yourself-Ei7g',
      directVoteUrl: 'https://gendarena.1vote.vn/?voteEventId=EVENT_qwCuZ&voteCandidateId=Ei7g',
      initialVotes: 1680,
      likesCount: 512,
      viewsCount: 4210,
    },
    {
      id: 'a2236802-2fb9-4a6d-8bb1-bea3874d19ea',
      msbc: '03',
      order: 3,
      name: 'F4ST',
      slogan: 'F4ST – Four First, One Start. Nhanh từng giây, cứu từng nhịp thở.',
      quote: 'Trong cấp cứu y tế, một giây rút ngắn trong điều phối máu là thêm một cơ hội sống còn cho người bệnh.',
      summary:
        'Dự án BLOODBLINK: Hệ thống điều phối và vận chuyển máu khẩn cấp ứng dụng thuật toán tối ưu lộ trình và kết nối cơ sở y tế.',
      institution: 'ĐH Giao thông Vận tải TP.HCM & ĐH Quốc Tế - ĐHQG TP.HCM',
      category: 'Logistics và Chuỗi cung ứng',
      tags: ['Health Logistics', 'BLOODBLINK', 'Rapid Transit'],
      description:
        'F4ST phát triển dự án BLOODBLINK với sứ mệnh giải quyết nút thắt về thời gian vận chuyển mẫu máu cấp cứu giữa các bệnh viện và trạm y tế.',
      problem:
        'Thời gian tìm kiếm và điều phối các nhóm máu hiếm giữa các ngân hàng máu và bệnh viện tuyến cơ sở còn nhiều bất cập và dễ chậm trễ.',
      solution:
        'Bản đồ số hóa và thuật toán điều phối thông minh kết nối mạng lưới vận chuyển chuyên biệt và giám sát túi máu theo chuẩn y tế.',
      techStack: ['FastAPI', 'Mapbox', 'Flutter', 'IoT Temperature'],
      members: [
        { name: 'Nguyễn Lê Ngọc Tiền', role: 'Trưởng nhóm', university: 'ĐH Giao thông Vận tải TP.HCM' },
        { name: 'Ngô Hoàng Huy', role: 'Thành viên', university: 'ĐH Quốc Tế - ĐHQG TP.HCM' },
        { name: 'Trịnh Thị Bảo Trâm', role: 'Thành viên', university: 'ĐH Giao thông Vận tải TP.HCM' },
        { name: 'Nguyễn Quế Trân', role: 'Thành viên', university: 'ĐH Giao thông Vận tải TP.HCM' },
      ],
      avatarUrl: '/images/teams/f4st.webp',
      posterUrl: '/images/teams/f4st.webp',
      videoPitchUrl: 'https://drive.google.com/file/d/1QHXcK0D_W095aoWfmynmE-wf2RA6VBtg/preview',
      videoDuration: '01:25',
      eventistaUrl: 'https://gendarena.1vote.vn/candidate/EVENT_qwCuZ/f4st-aCF8',
      directVoteUrl: 'https://gendarena.1vote.vn/?voteEventId=EVENT_qwCuZ&voteCandidateId=aCF8',
      initialVotes: 1350,
      likesCount: 429,
      viewsCount: 3120,
    },
    {
      id: 'ba52dec7-75d0-4f06-8153-23d102e3971b',
      msbc: '04',
      order: 4,
      name: 'From L to E',
      slogan: 'Hành trình chuyển hóa từ tri thức lý thuyết sang trải nghiệm thực chiến',
      quote: 'Chuyển mình từ nền tảng học thuật sang hành động thực tiễn để kiến tạo giá trị kinh tế bền vững.',
      summary:
        'Giải pháp công nghệ tài chính và thương mại số giúp thu hẹp khoảng cách tiếp cận thị trường cho người kinh doanh trẻ.',
      institution: 'ĐH Kinh tế - Luật & ĐH Khoa học Tự nhiên - ĐHQG TP.HCM',
      category: 'Kinh doanh, Thương mại và Tài chính',
      tags: ['FinTech', 'E-Commerce', 'Data Driven'],
      description:
        'Sự hợp lực giữa khối kinh tế UEL và công nghệ KHTN tạo nên giải pháp thương mại số tinh gọn cho người trẻ bắt đầu kinh doanh.',
      problem:
        'Các mô hình kinh doanh khởi sự gặp rào cản lớn về quản lý dòng tiền và tiếp cận kênh bán hàng đa nền tảng.',
      solution:
        'Hệ thống quản trị tài chính thu gọn kết hợp phân tích hành vi tiêu dùng bằng dữ liệu lớn và trực quan hóa báo cáo.',
      techStack: ['Next.js', 'Python', 'Supabase', 'PowerBI'],
      members: [
        { name: 'Huỳnh Nguyễn Đăng Khoa', role: 'Trưởng nhóm', university: 'ĐH Kinh tế - Luật - ĐHQG TP.HCM' },
        { name: 'Trần Thị Xuân Hương', role: 'Thành viên', university: 'ĐH Kinh tế - Luật - ĐHQG TP.HCM' },
        { name: 'Nguyễn Thanh Gia Bảo', role: 'Thành viên', university: 'ĐH Khoa học Tự nhiên - ĐHQG TP.HCM' },
        { name: 'Lộc Lê Tuấn', role: 'Thành viên', university: 'ĐH Khoa học Tự nhiên - ĐHQG TP.HCM' },
        { name: 'Đặng Đăng Khoa', role: 'Thành viên', university: 'ĐH Khoa học Tự nhiên - ĐHQG TP.HCM' },
      ],
      avatarUrl: '/images/teams/from-l-to-e.webp',
      posterUrl: '/images/teams/from-l-to-e.webp',
      videoPitchUrl: 'https://drive.google.com/file/d/1RUF1QB8htcKB0QTkk_ZwU8djq2bB8s3Q/preview',
      videoDuration: '01:40',
      eventistaUrl: 'https://gendarena.1vote.vn/candidate/EVENT_qwCuZ/from-l-to-e-eryC',
      directVoteUrl: 'https://gendarena.1vote.vn/?voteEventId=EVENT_qwCuZ&voteCandidateId=eryC',
      initialVotes: 1890,
      likesCount: 680,
      viewsCount: 5100,
    },
    {
      id: 'f103ffe4-bf05-49a3-a373-6a30ddaa3fdb',
      msbc: '05',
      order: 5,
      name: 'Ngũ Long Công Chúa',
      slogan: 'Bản lĩnh tiên phong, không ngại thử thách bứt phá mọi ranh giới',
      quote: 'Đoàn kết và dám nghĩ dám làm là sức mạnh lớn nhất của tuổi trẻ khi bước vào đấu trường khởi nghiệp.',
      summary:
        'Mô hình dịch vụ thương mại sáng tạo kết hợp công nghệ hỗ trợ người tiêu dùng thông thái và kết nối chuỗi cung ứng bán lẻ.',
      institution: 'ĐH Ngoại Thương TP.HCM & ĐH Khoa học Tự nhiên - ĐHQG TP.HCM',
      category: 'Kinh doanh, Thương mại và Tài chính',
      tags: ['ConsumerTech', 'Retail', 'Innovation'],
      description:
        'Đội hình quy tụ sinh viên đa trường FTU, KHTN, UEH và Văn Lang mang đến làn gió mới với tư duy đổi mới mô hình dịch vụ số.',
      problem:
        'Người tiêu dùng hiện đại chịu nhiều rủi ro về thông tin sản phẩm và biến động giá cả trong môi trường số.',
      solution:
        'Công cụ hỗ trợ phân tích thông tin mua sắm thông minh và gợi ý chi tiêu tối ưu cho người tiêu dùng.',
      techStack: ['React Native', 'Node.js', 'AI RecSys', 'TailwindCSS'],
      members: [
        { name: 'Trần Thị Ngọc Tuyết', role: 'Trưởng nhóm', university: 'ĐH Ngoại Thương TP.HCM' },
        { name: 'Trần Phan Gia Hiển', role: 'Thành viên', university: 'ĐH Khoa học Tự nhiên - ĐHQG TP.HCM' },
        { name: 'Nguyễn Hà Bảo Trân', role: 'Thành viên', university: 'ĐH Kinh tế TP.HCM' },
        { name: 'Nguyễn Việt Hải', role: 'Thành viên', university: 'ĐH Văn Lang' },
        { name: 'Đỗ Cao Kỳ Duyên', role: 'Thành viên', university: 'ĐH Ngoại Thương TP.HCM' },
      ],
      avatarUrl: '/images/teams/ngu-long-cong-chua.webp',
      posterUrl: '/images/teams/ngu-long-cong-chua.webp',
      videoPitchUrl: 'https://drive.google.com/file/d/1zFBsS12HGv1X4L3zTLcDs4_NlL7MaBa2/preview',
      videoDuration: '01:35',
      eventistaUrl: 'https://gendarena.1vote.vn/candidate/EVENT_qwCuZ/ngu-long-cong-chua-JJhB',
      directVoteUrl: 'https://gendarena.1vote.vn/?voteEventId=EVENT_qwCuZ&voteCandidateId=JJhB',
      initialVotes: 1220,
      likesCount: 310,
      viewsCount: 2950,
    },
    {
      id: 'd9f575a6-e2d6-42e6-bd4a-4f076dfa7f0e',
      msbc: '06',
      order: 6,
      name: 'SISO',
      slogan: 'Single Input, Smart Output — Nền tảng học tập thông minh thời đại số',
      quote: 'Đơn giản hóa việc học bằng công nghệ để mỗi học sinh tự tin khai phá tiềm năng cá nhân.',
      summary:
        'Đề án giáo dục thông minh SISO: Ứng dụng trợ lý học tập cá nhân hóa giúp học sinh tiếp thu kiến thức trực quan và hứng khởi.',
      institution: 'ĐH Ngoại Thương TP.HCM & ĐH Bách Khoa TP.HCM',
      category: 'Giáo dục',
      tags: ['EdTech', 'AI Learning', 'Personalized'],
      description:
        'SISO kết hợp tri thức kinh tế đối ngoại và khoa học máy tính để phát triển trợ lý học tập thông minh cho học sinh sinh viên.',
      problem:
        'Phương pháp học truyền thống thiếu tính cá nhân hóa, khiến học sinh mất cân bằng và giảm động lực tiếp thu kiến thức mới.',
      solution:
        'Thuật toán thích ứng nội dung học tập theo nhịp độ của từng cá nhân kết hợp bài giảng trực quan hóa.',
      techStack: ['Python AI', 'Next.js', 'FastAPI', 'Vector DB'],
      members: [
        { name: 'Nguyễn Khánh Phương', role: 'Trưởng nhóm', university: 'ĐH Ngoại Thương TP.HCM' },
        { name: 'Đặng Quang Vinh', role: 'Thành viên', university: 'ĐH Bách Khoa TP.HCM' },
        { name: 'Trần Quang Trung', role: 'Thành viên', university: 'ĐH Giao thông Vận tải TP.HCM' },
        { name: 'Huỳnh Ngọc Ngân', role: 'Thành viên', university: 'ĐH Ngoại Thương TP.HCM' },
      ],
      avatarUrl: '/images/teams/siso.webp',
      posterUrl: '/images/teams/siso.webp',
      eventistaUrl: '',
      votingDisabled: true,
    },
    {
      id: 'e5e79a05-cc45-4015-811b-17d3965e32f2',
      msbc: '07',
      order: 7,
      name: 'Axiom',
      slogan: 'SolarOpt — Tối ưu hóa năng lượng mặt trời thông minh vì tương lai xanh',
      quote: 'Công nghệ xanh không chỉ bảo vệ hành tinh, mà phải tạo ra hiệu quả kinh tế rõ ràng cho từng mái nhà.',
      summary:
        'Dự án SolarOpt: Hệ thống tối ưu hóa và giám sát hiệu suất pin năng lượng mặt trời áp mái bằng trí tuệ nhân tạo và cảm biến IoT.',
      institution: 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM',
      category: 'Xã hội và Môi trường',
      tags: ['SolarOpt', 'CleanTech', 'IoT', 'AI'],
      description:
        'Đội ngũ 5 sinh viên Khoa học Máy tính UIT mang đến giải pháp giám sát và tối ưu hóa hệ thống pin quang điện mái nhà bằng trí tuệ nhân tạo.',
      problem:
        'Hệ thống điện mặt trời áp mái thường bị suy giảm hiệu suất do bụi bẩn, bóng râm và lỗi thiết bị mà không có cảnh báo kịp thời.',
      solution:
        'Thuật toán dự báo công suất và phát hiện lỗi thời gian thực qua cảm biến thông minh, giúp nâng cao sản lượng điện tới 20%.',
      techStack: ['Computer Vision', 'IoT Edge', 'Python', 'React Native'],
      members: [
        { name: 'Nguyễn Võ An Vi', role: 'Trưởng nhóm', university: 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM' },
        { name: 'Trần Khôi Nguyên', role: 'Thành viên', university: 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM' },
        { name: 'Nguyễn Hoàng Minh', role: 'Thành viên', university: 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM' },
        { name: 'Lê Văn Thanh Mạnh', role: 'Thành viên', university: 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM' },
        { name: 'Lê Thiện', role: 'Thành viên', university: 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM' },
      ],
      avatarUrl: '/images/teams/axiom.webp',
      posterUrl: '/images/teams/axiom.webp',
      videoPitchUrl: 'https://drive.google.com/file/d/1WpVMbTOS579rLIXp8APa_SMBoeOCvwy3/preview',
      videoDuration: '01:50',
      eventistaUrl: 'https://gendarena.1vote.vn/candidate/EVENT_qwCuZ/axiom-g71x',
      directVoteUrl: 'https://gendarena.1vote.vn/?voteEventId=EVENT_qwCuZ&voteCandidateId=g71x',
      initialVotes: 2140,
      likesCount: 890,
      viewsCount: 5600,
    },
    {
      id: '61157dca-cf00-48a6-9868-6599b0b4d0da',
      msbc: '08',
      order: 8,
      name: 'Viet Nam Safe',
      slogan: 'Công nghệ phát triển phải đi cùng an toàn',
      quote: 'VnS không chỉ giúp doanh nghiệp chuyển đổi số nhanh hơn, mà còn giúp họ phát triển trên một nền tảng an toàn hơn.',
      summary:
        'Hệ sinh thái giải pháp AI và chuyển đổi số cho doanh nghiệp trên nền tảng bảo mật MailGuard: Chatbot AI, ERP tích hợp AI và tự động hóa an toàn.',
      institution: 'ĐH Văn Lang & ĐH Kinh tế TP.HCM',
      category: 'Xã hội và Môi trường',
      tags: ['CyberSecurity', 'AI Enterprise', 'Digital Transformation'],
      description:
        'VnS phát triển hệ sinh thái giải pháp AI và chuyển đổi số cho doanh nghiệp trên nền tảng bảo mật kế thừa từ MailGuard, hướng đến chuyển đổi số bền vững.',
      problem:
        'Doanh nghiệp đẩy mạnh chuyển đổi số nhưng đối mặt rủi ro an ninh mạng, rò rỉ dữ liệu và tấn công giả mạo ngày càng tinh vi.',
      solution:
        'Nền tảng bảo mật đa lớp tích hợp sâu vào quy trình nghiệp vụ và hệ thống AI hỗ trợ nhân sự vận hành an toàn tuyệt đối.',
      techStack: ['AI Security', 'MailGuard Engine', 'Docker', 'Next.js'],
      members: [
        { name: 'Hùng Nguyễn', role: 'Trưởng nhóm', university: 'ĐH Văn Lang' },
        { name: 'Nguyễn Ngọc Hà', role: 'Thành viên', university: 'ĐH Kinh tế TP.HCM' },
        { name: 'Lý Trí Vĩnh', role: 'Thành viên', university: 'ĐH Sư Phạm Kỹ Thuật TP.HCM' },
        { name: 'TRANG NGUYỄN THỊ THÙY', role: 'Thành viên', university: 'ĐH Kinh tế TP.HCM' },
        { name: 'QUÂN HUỲNH HOÀNG', role: 'Thành viên', university: 'ĐH Kinh tế TP.HCM' },
      ],
      avatarUrl: '/images/teams/viet-nam-safe.webp',
      posterUrl: '/images/teams/viet-nam-safe.webp',
      videoPitchUrl: 'https://drive.google.com/file/d/1xZ_gJuCq8lnjsOwP9lBSDBcnngYrXzzr/preview',
      videoDuration: '01:30',
      eventistaUrl: 'https://gendarena.1vote.vn/candidate/EVENT_qwCuZ/vns-viet-nam-safe-ZQyQ',
      directVoteUrl: 'https://gendarena.1vote.vn/?voteEventId=EVENT_qwCuZ&voteCandidateId=ZQyQ',
      initialVotes: 980,
      likesCount: 260,
      viewsCount: 2430,
    },
    {
      id: '45289e54-5a98-49d8-9f36-24660b1d6bfe',
      msbc: '09',
      order: 9,
      name: 'VNSN',
      slogan: 'Giải pháp tài chính thông minh đồng hành cùng sự phát triển bền vững',
      quote: 'Minh bạch số liệu và quản trị tài chính chuyên nghiệp là điểm tựa vững chắc cho mọi startup trẻ.',
      summary:
        'Dự án SSExFIC: Ứng dụng công nghệ hỗ trợ hạch toán, dự báo dòng tiền và quản trị rủi ro tài chính cho doanh nghiệp khởi nghiệp.',
      institution: 'ĐH Ngân hàng TP.HCM',
      category: 'Kinh doanh, Thương mại và Tài chính',
      tags: ['FinTech', 'Accounting AI', 'Financial Model'],
      description:
        'Đội thi đến từ ĐH Ngân Hàng TP.HCM ứng dụng giải pháp công nghệ tài chính giúp các doanh nghiệp trẻ kiểm soát dòng tiền và lập kế hoạch ngân sách.',
      problem:
        'Các nhà sáng lập trẻ thường thiếu kiến thức chuyên sâu về quản lý sổ sách, kiểm toán và báo cáo thuế, dễ dẫn đến mất cân đối dòng tiền.',
      solution:
        'Trợ lý tài chính kế toán tự động phân tích chứng từ, cảnh báo mất cân đối dòng tiền và lập kế hoạch ngân sách thông minh.',
      techStack: ['Python', 'Financial ML', 'React', 'Supabase'],
      members: [
        { name: 'Mai Xuân Nghi', role: 'Trưởng nhóm', university: 'ĐH Ngân hàng TP.HCM' },
        { name: 'Nguyễn Vũ Kiều Phương', role: 'Thành viên', university: 'ĐH Ngân hàng TP.HCM' },
        { name: 'Đặng Thị Tường Vy', role: 'Thành viên', university: 'ĐH Ngân hàng TP.HCM' },
        { name: 'Nguyễn Thị Cẩm Nhi', role: 'Thành viên', university: 'ĐH Ngân hàng TP.HCM' },
      ],
      avatarUrl: '/images/teams/vnsn.webp',
      posterUrl: '/images/teams/vnsn.webp',
      videoPitchUrl: 'https://drive.google.com/file/d/1DD4k9TaE9lQh5-wNrf0Rh4wGCjUankWX/preview',
      videoDuration: '01:20',
      eventistaUrl: 'https://gendarena.1vote.vn/candidate/EVENT_qwCuZ/vnsn-zzrI',
      directVoteUrl: 'https://gendarena.1vote.vn/?voteEventId=EVENT_qwCuZ&voteCandidateId=zzrI',
      initialVotes: 1730,
      likesCount: 540,
      viewsCount: 4190,
    },
    {
      id: '9e9103e9-a725-48cf-b4da-519f0b68e24a',
      msbc: '10',
      order: 10,
      name: 'Aqua Radar',
      slogan: 'Từ nông sản Việt – Vì một sức khỏe tốt hơn',
      quote: 'Tạo ra giải pháp đồ uống lên men từ nguyên liệu nông nghiệp Việt Nam, hướng đến một lối sống khỏe mạnh và bền vững hơn.',
      summary:
        'Đề án Aqua Radar: Giải pháp đồ uống lên men tự nhiên từ nguồn nông sản bản địa Việt Nam, kết hợp công nghệ chế biến sinh học tiên tiến.',
      institution: 'ĐH Văn Lang',
      category: 'Xã hội và Môi trường',
      tags: ['AgriTech', 'BioFermentation', 'GreenHealth', 'Sustainability'],
      description:
        'Aqua Radar là đội thi đến từ ĐH Văn Lang với định hướng phát triển đồ uống lên men từ nông sản Việt, kiến tạo giá trị gia tăng cho nông nghiệp bền vững.',
      problem:
        'Nông sản sau thu hoạch dễ mất giá trị và hao hụt lớn, trong khi thị trường thiếu các sản phẩm đồ uống vì sức khỏe có nguồn gốc sinh học rõ ràng.',
      solution:
        'Quy trình lên men sinh học khép kín từ nguyên liệu tự nhiên, tạo dòng sản phẩm đồ uống dinh dưỡng cao và thân thiện môi trường.',
      techStack: ['BioTechnology', 'AgriTech', 'Product Design', 'Supply Chain'],
      members: [
        { name: 'Trần Tín Hiền', role: 'Trưởng nhóm', university: 'ĐH Văn Lang' },
      ],
      avatarUrl: '/images/teams/aqua-radar.webp',
      posterUrl: '/images/teams/aqua-radar.webp',
      eventistaUrl: '',
      votingDisabled: true,
    },
  ],
}
