import * as XLSX from 'xlsx'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bnwiuqjfxppatbuhysya.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJud2l1cWpmeHBwYXRidWh5c3lhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5MzcxNSwiZXhwIjoyMDk2ODY5NzE1fQ.WNueKYhvnoPCTKv4ICsBKEylA0L7esc-cSjvXLBcaN8'

const supabase = createClient(supabaseUrl, supabaseKey)

// Generate 1-year signed download URL (31,536,000 seconds)
async function getSignedUrl(filePath) {
  if (!filePath) return null
  const { data, error } = await supabase.storage.from('submissions').createSignedUrl(filePath, 31536000)
  if (error || !data?.signedUrl) {
    console.warn('Failed to sign URL for', filePath, error)
    return null
  }
  return data.signedUrl
}

// Helper to format YYYY-MM-DD to DD/MM/YYYY
function formatDate(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

// Helper to add hyperlink to a sheet cell
function addHyperlink(ws, cellRef, url, text) {
  if (!url) return
  if (!ws[cellRef]) {
    ws[cellRef] = { t: 's', v: text || url }
  }
  ws[cellRef].l = { Target: url, Tooltip: 'Nhấn để mở tài liệu dự án' }
}

async function main() {
  console.log('Generating 1-year signed URLs for storage files...')

  const aquaDeckUrl = await getSignedUrl('c2a69966-3e9a-4aba-ac09-c1e0042eeec2/53b027f4-7109-4bd6-b185-dc69470df806/1789723503853-pitchdeck-aqua_radar_-_thuy_t_minh_d_n.pdf')
  const aquaReportUrl = await getSignedUrl('c2a69966-3e9a-4aba-ac09-c1e0042eeec2/53b027f4-7109-4bd6-b185-dc69470df806/1789723536096-report-aqua_radar_gend_arena_dream.pdf')

  const axiomDeckUrl = await getSignedUrl('3838dab9-adb8-4ccf-a431-f7446e644c92/53b027f4-7109-4bd6-b185-dc69470df806/1789918691440-pitchdeck-solaropt_-_axiom_team_-_slide.pdf')
  const axiomReportUrl = await getSignedUrl('3838dab9-adb8-4ccf-a431-f7446e644c92/53b027f4-7109-4bd6-b185-dc69470df806/1789918701279-report-solaropt_-_axiom_team_-_proposal.pdf')

  const cyDeckUrl = 'https://canva.link/2a09kharaqpe9ya'
  const cyReportUrl = await getSignedUrl('70126b85-00c8-469f-bc77-ebac11c6770b/53b027f4-7109-4bd6-b185-dc69470df806/1790094665138-report-m_t_d_n_v_ng_s_lo_i_dream_.pdf')

  const vnsDeckUrl = 'https://canva.link/5r311fbv4hxcvrv'
  const vnsReportUrl = 'https://docs.google.com/document/d/1-6qtdAx2WCBW10TpVaV0IZKw74AFwYBtkS4mNOw6ZaM/edit?usp=sharing'

  const nlccDeckUrl = 'https://drive.google.com/file/d/13tRgNa0g9GUBkRr80MfkFrZPn_EHpnAt/view?usp=sharing'
  const nlccReportUrl = 'https://drive.google.com/file/d/11lZNwzo5B89vrqsBIqVFxdxIeqvKuabq/view?usp=sharing'

  // Full accurate Top 5 Finalist Teams data
  const teamsData = [
    {
      msbc: '01',
      teamId: '9e9103e9-a725-48cf-b4da-519f0b68e24a',
      teamName: 'Aqua Radar',
      projectName: 'Aqua Radar (Hệ thống IoT & AI cảnh báo stress nhiệt và vi khí hậu cho ao tôm)',
      category: 'Xã hội và Môi trường',
      slogan: 'Thích ứng biến đổi khí hậu & Bảo vệ môi trường nuôi trồng thủy sản',
      summary: 'Hệ thống IoT & AI cảnh báo stress nhiệt và vi khí hậu theo thời gian thực cho ao nuôi tôm, phục vụ thích ứng biến đổi khí hậu và bảo vệ môi trường nuôi trồng thủy sản bền vững.',
      problem: 'Biến đổi khí hậu làm nhiệt độ biến động thất thường, gây ra stress nhiệt đột ngột trong ao tôm dẫn đến tôm chết hàng loạt, giảm năng suất và gây ô nhiễm môi trường nước.',
      solution: 'Mạng lưới cảm biến IoT đo đạc tự động các chỉ số vi khí hậu và môi trường nước, kết hợp mô hình AI dự báo sớm rủi ro stress nhiệt để gửi cảnh báo tức thì, giúp người nuôi chủ động xử lý và giảm thiểu tối đa rủi ro thiệt hại.',
      techStack: 'IoT Sensors, AI Prediction, Edge Computing, Mobile App Alert',
      institution: 'ĐH Ngoại Thương Cơ sở II & ĐH Công nghệ TP.HCM (HUTECH) & ĐH Văn Lang',
      pitchDeckUrl: aquaDeckUrl,
      reportUrl: aquaReportUrl,
      members: [
        {
          fullName: 'Trần Tín Dũng',
          role: 'Trưởng nhóm',
          dob: '2006-05-03',
          email: 'tindung321@gmail.com',
          phone: '0901389970',
          university: 'Trường Đại học Ngoại Thương Cơ sở II - TP.HCM',
          faculty: 'Liên kết quốc tế',
          major: 'Marketing'
        },
        {
          fullName: 'Võ Thiện Nhân',
          role: 'Thành viên (Tech Leader)',
          dob: '2005-09-20',
          email: 'thiennhan.math@gmail.com',
          phone: '0982035143',
          university: 'Trường Đại học Công nghệ TP.HCM (HUTECH)',
          faculty: 'Viện Kỹ Thuật',
          major: 'Robot và Trí Tuệ Nhân Tạo'
        },
        {
          fullName: 'Huỳnh Ngọc Ngân',
          role: 'Thành viên (Business Leader)',
          dob: '2006-04-03',
          email: 'ngocnganhuynh.work@gmail.com',
          phone: '0793970413',
          university: 'Trường Đại học Ngoại Thương Cơ sở II - TP.HCM',
          faculty: 'Kinh doanh và Thương mại Quốc tế',
          major: 'Kinh tế đối ngoại'
        },
        {
          fullName: 'Trần Tín Hiền',
          role: 'Thành viên (Đại diện đăng ký)',
          dob: '2005-01-02',
          email: 'pinnodemon@gmail.com',
          phone: '0938813057',
          university: 'Trường Đại học Văn Lang',
          faculty: 'Khoa Kỹ thuật và Quản lý Công nghiệp',
          major: 'Logistics và Quản lý chuỗi cung ứng'
        }
      ]
    },
    {
      msbc: '02',
      teamId: 'e5e79a05-cc45-4015-811b-17d3965e32f2',
      teamName: 'Axiom',
      projectName: 'SolarOpt (Tối ưu hóa và giám sát năng lượng mặt trời)',
      category: 'Xã hội và Môi trường',
      slogan: 'SolarOpt — Tối ưu hóa năng lượng mặt trời thông minh vì tương lai xanh',
      summary: 'Hệ thống tối ưu hóa và giám sát hiệu suất pin năng lượng mặt trời áp mái bằng trí tuệ nhân tạo (AI) và cảm biến IoT.',
      problem: 'Hệ thống điện mặt trời áp mái thường bị suy giảm hiệu suất do bụi bẩn, bóng râm và lỗi thiết bị mà không có cảnh báo kịp thời, gây lãng phí năng lượng và tăng chi phí bảo trì.',
      solution: 'Thuật toán dự báo công suất và phát hiện lỗi theo thời gian thực qua cảm biến thông minh kết hợp thị giác máy tính và IoT Edge, giúp nâng cao sản lượng điện tới 20%.',
      techStack: 'Computer Vision, IoT Edge, Python, React Native',
      institution: 'Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM',
      pitchDeckUrl: axiomDeckUrl,
      reportUrl: axiomReportUrl,
      members: [
        {
          fullName: 'Nguyễn Võ An Vi',
          role: 'Trưởng nhóm',
          dob: '2006-05-23',
          email: 'anvi23052006@gmail.com',
          phone: '0362699765',
          university: 'Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM',
          faculty: 'Khoa Khoa học Máy tính',
          major: 'Khoa học máy tính'
        },
        {
          fullName: 'Trần Khôi Nguyên',
          role: 'Thành viên',
          dob: '2006-10-10',
          email: 'trankhoinguyenkaitokid@gmail.com',
          phone: '0889259951',
          university: 'Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM',
          faculty: 'Khoa Khoa học Máy tính',
          major: 'Khoa học máy tính'
        },
        {
          fullName: 'Nguyễn Hoàng Minh',
          role: 'Thành viên',
          dob: '2006-02-21',
          email: '24521065@gm.uit.edu.vn',
          phone: '0912271765',
          university: 'Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM',
          faculty: 'Khoa Khoa học Máy tính',
          major: 'Khoa học máy tính'
        },
        {
          fullName: 'Lê Văn Thanh Mạnh',
          role: 'Thành viên',
          dob: '2006-01-12',
          email: '24521041@gm.uit.edu.vn',
          phone: '0944348477',
          university: 'Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM',
          faculty: 'Khoa Khoa học Máy tính',
          major: 'Khoa học máy tính'
        },
        {
          fullName: 'Lê Thiện',
          role: 'Thành viên',
          dob: '2006-09-12',
          email: 'thienlecs@gmail.com',
          phone: '0931018099',
          university: 'Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM',
          faculty: 'Khoa Khoa học Máy tính',
          major: 'Khoa học máy tính'
        }
      ]
    },
    {
      msbc: '03',
      teamId: '61157dca-cf00-48a6-9868-6599b0b4d0da',
      teamName: 'Viet Nam Safe (VNS)',
      projectName: 'Hệ sinh thái giải pháp AI và Chuyển đổi số bảo mật MailGuard (VnS)',
      category: 'Xã hội và Môi trường',
      slogan: 'Công nghệ phát triển phải đi cùng an toàn',
      summary: 'Hệ sinh thái giải pháp AI và chuyển đổi số cho doanh nghiệp trên nền tảng bảo mật MailGuard: Chatbot AI, ERP tích hợp AI, tự động hóa quy trình và website an toàn.',
      problem: 'Doanh nghiệp đẩy mạnh chuyển đổi số nhưng đối mặt rủi ro an ninh mạng, rò rỉ dữ liệu và tấn công giả mạo ngày càng tinh vi, thiếu giải pháp vừa tăng hiệu suất vừa bảo vệ an toàn.',
      solution: 'Nền tảng bảo mật đa lớp tích hợp sâu vào quy trình nghiệp vụ và hệ thống AI hỗ trợ nhân sự vận hành an toàn tuyệt đối, giảm thiểu tối đa rủi ro trên không gian số.',
      techStack: 'AI Security, MailGuard Engine, Docker, Next.js',
      institution: 'ĐH Văn Lang & ĐH Kinh tế TP.HCM & ĐH Sư phạm Kỹ thuật TP.HCM',
      pitchDeckUrl: vnsDeckUrl,
      reportUrl: vnsReportUrl,
      members: [
        {
          fullName: 'Hùng Nguyễn',
          role: 'Trưởng nhóm',
          dob: '2004-04-22',
          email: 'nth22042005@gmail.com',
          phone: '0798034236',
          university: 'Trường Đại học Văn Lang',
          faculty: 'Khoa Quản trị Kinh doanh',
          major: 'Quản trị Doanh nghiệp và Nhân sự'
        },
        {
          fullName: 'Nguyễn Ngọc Hà',
          role: 'Thành viên',
          dob: '2005-08-22',
          email: 'hanguyen.31231021518@st.ueh.edu.vn',
          phone: '0901429822',
          university: 'Đại học Kinh tế TP.HCM (UEH)',
          faculty: 'Khoa Tài chính',
          major: 'Tài chính'
        },
        {
          fullName: 'Lý Trí Vĩnh',
          role: 'Thành viên',
          dob: '2007-07-17',
          email: 'lytrivinh170707@gmail.com',
          phone: '0325703458',
          university: 'Trường ĐH Sư phạm Kỹ thuật TP.HCM',
          faculty: 'Khoa Công nghệ Thông tin',
          major: 'Công nghệ Thông tin'
        },
        {
          fullName: 'Trang Nguyễn Thị Thùy',
          role: 'Thành viên',
          dob: '2006-10-24',
          email: 'trangnguyen.31241028217@st.ueh.edu.vn',
          phone: '0948033556',
          university: 'Đại học Kinh tế TP.HCM (UEH)',
          faculty: 'Khoa Du lịch',
          major: 'Quản trị sự kiện và dịch vụ giải trí'
        },
        {
          fullName: 'Quân Huỳnh Hoàng',
          role: 'Thành viên',
          dob: '2006-03-31',
          email: 'quanhuynh.31241020589@st.ueh.edu.vn',
          phone: '0767223006',
          university: 'Đại học Kinh tế TP.HCM (UEH)',
          faculty: 'Khoa Kinh doanh quốc tế - Marketing',
          major: 'Kinh doanh quốc tế'
        }
      ]
    },
    {
      msbc: '04',
      teamId: 'f103ffe4-bf05-49a3-a373-6a30ddaa3fdb',
      teamName: 'Ngũ Long Công Chúa',
      projectName: 'Mô hình Dịch vụ Thương mại Sáng tạo & Công cụ Tiêu dùng Thông minh',
      category: 'Kinh doanh, Thương mại và Tài chính',
      slogan: 'Bản lĩnh tiên phong, không ngại thử thách bứt phá mọi ranh giới',
      summary: 'Mô hình dịch vụ thương mại sáng tạo kết hợp công nghệ hỗ trợ người tiêu dùng thông thái và kết nối chuỗi cung ứng bán lẻ hiện đại.',
      problem: 'Người tiêu dùng hiện đại chịu nhiều rủi ro về độ tin cậy thông tin sản phẩm và biến động giá cả trong môi trường thương mại điện tử và mua sắm trực tuyến.',
      solution: 'Công cụ hỗ trợ phân tích thông tin mua sắm thông minh, đề xuất chi tiêu và tối ưu hóa lựa chọn sản phẩm cho người tiêu dùng bằng AI gợi ý (RecSys).',
      techStack: 'React Native, Node.js, AI RecSys, TailwindCSS',
      institution: 'ĐH Ngoại Thương Cơ sở II & ĐH KHTN - ĐHQG TP.HCM & UEH & ĐH Văn Lang',
      pitchDeckUrl: nlccDeckUrl,
      reportUrl: nlccReportUrl,
      members: [
        {
          fullName: 'Trần Thị Ngọc Tuyết',
          role: 'Trưởng nhóm',
          dob: '2006-11-19',
          email: 'trantuyet6852@gmail.com',
          phone: '0347433718',
          university: 'Trường ĐH Ngoại Thương Cơ sở II - TP.HCM',
          faculty: 'Khối ngành Kinh tế',
          major: 'Kinh Tế Đối Ngoại'
        },
        {
          fullName: 'Trần Phan Gia Hiển',
          role: 'Thành viên',
          dob: '2006-12-04',
          email: 'tranphangiahien@gmail.com',
          phone: '0932891957',
          university: 'Trường ĐH Khoa học Tự nhiên - ĐHQG TP.HCM',
          faculty: 'Khoa Công nghệ Thông tin',
          major: 'Công nghệ thông tin'
        },
        {
          fullName: 'Nguyễn Hà Bảo Trân',
          role: 'Thành viên',
          dob: '2007-10-16',
          email: 'nguyenbaotrannn2007@gmail.com',
          phone: '0793782448',
          university: 'Đại học Kinh tế TP.HCM (UEH)',
          faculty: 'Khoa Kinh doanh quốc tế',
          major: 'International Business'
        },
        {
          fullName: 'Nguyễn Việt Hải',
          role: 'Thành viên',
          dob: '2006-09-28',
          email: 'gsahai1234@gmail.com',
          phone: '0332143149',
          university: 'Trường Đại học Văn Lang',
          faculty: 'Khoa Công nghệ Thông tin',
          major: 'Công Nghệ Thông Tin'
        },
        {
          fullName: 'Đỗ Cao Kỳ Duyên',
          role: 'Thành viên',
          dob: '2006-02-03',
          email: 'dckduyen@gmail.com',
          phone: '0783436110',
          university: 'Trường ĐH Ngoại Thương Cơ sở II - TP.HCM',
          faculty: 'Khoa Quản trị Kinh doanh',
          major: 'Quản trị kinh doanh'
        }
      ]
    },
    {
      msbc: '05',
      teamId: 'a2d974ad-a2ae-4854-a3e6-735d76c2dc5f',
      teamName: 'Change yourself',
      projectName: 'Change yourself (Nền tảng kết nối Mentor - Mentee & Chia sẻ tri thức thực chiến)',
      category: 'Kinh doanh, Thương mại và Tài chính',
      slogan: 'Chủ động xây dựng mạng lưới kết nối và học hỏi cộng tác cùng chuyên gia',
      summary: 'Nền tảng kết nối cố vấn chuyên gia và chia sẻ tri thức thực chiến, giúp người trẻ tiếp cận cơ hội phát triển năng lực và khởi nghiệp.',
      problem: 'Sinh viên và người trẻ thường thiếu người định hướng, thiếu mạng lưới chuyên gia cố vấn trong quá trình thử nghiệm ý tưởng kinh doanh.',
      solution: 'Mô hình kết nối matching thông minh giữa mentor và mentee dựa trên mục tiêu phát triển và năng lực cá nhân.',
      techStack: 'AI Matching, React, Node.js, PostgreSQL',
      institution: 'ĐH Giao thông Vận tải TP.HCM & ĐH FPT TP.HCM',
      pitchDeckUrl: cyDeckUrl,
      reportUrl: cyReportUrl,
      members: [
        {
          fullName: 'Trần Thị Thuỳ Trân',
          role: 'Trưởng nhóm',
          dob: '2007-01-27',
          email: 'tr.th.thuytran@gmail.com',
          phone: '0352701271',
          university: 'Trường ĐH Giao thông Vận tải TP.HCM',
          faculty: 'Viện Đào tạo Chất lượng cao',
          major: 'Logistics và Quản lý chuỗi cung ứng'
        },
        {
          fullName: 'Trần Cao Minh Đạt',
          role: 'Thành viên',
          dob: '2007-04-01',
          email: 'tcminhdat@gmail.com',
          phone: '0886332922',
          university: 'Trường Đại học FPT TP.HCM',
          faculty: 'Khoa Công nghệ Thông tin',
          major: 'Trí tuệ nhân tạo'
        }
      ]
    }
  ]

  const wb = XLSX.utils.book_new()

  // ════════════════════════════════════════════════════════════════════════════
  // 1. SHEET: "Bảo trợ chuyên môn" (MERGED & GOM NHÓM THEO ĐỘI - 1 LINK DUY NHẤT)
  // ════════════════════════════════════════════════════════════════════════════
  const headersSheet1 = [
    'STT',
    'Mã số (MSBC)',
    'Đội thi',
    'Ý tưởng / Dự án tham gia',
    'Mô tả tóm tắt ý tưởng/dự án',
    'Link Slide Pitch Deck',
    'Link Báo cáo / Thuyết minh',
    'Vai trò',
    'Họ và tên',
    'Ngày tháng năm sinh',
    'Email',
    'Số điện thoại',
    'Trường Đại học',
    'Khoa / Viện',
    'Chuyên ngành'
  ]

  const rowsSheet1 = [headersSheet1]
  const mergesSheet1 = []
  const linksSheet1 = []

  let currentSTT = 1
  let rowIndexSheet1 = 1 // 0 is header

  for (const team of teamsData) {
    const startRow = rowIndexSheet1
    const endRow = startRow + team.members.length - 1

    team.members.forEach((m, idx) => {
      // First member of the team holds the team project values; others leave empty for clean look & merge
      const isFirst = idx === 0
      rowsSheet1.push([
        currentSTT++,
        isFirst ? team.msbc : '',
        isFirst ? team.teamName : '',
        isFirst ? team.projectName : '',
        isFirst ? team.summary : '',
        isFirst ? team.pitchDeckUrl : '',
        isFirst ? team.reportUrl : '',
        m.role,
        m.fullName,
        formatDate(m.dob),
        m.email,
        m.phone,
        m.university,
        m.faculty || '',
        m.major || ''
      ])
      rowIndexSheet1++
    })

    // Merge team-level columns across this team's members (if > 1 member)
    if (team.members.length > 1) {
      mergesSheet1.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } }) // MSBC
      mergesSheet1.push({ s: { r: startRow, c: 2 }, e: { r: endRow, c: 2 } }) // Đội thi
      mergesSheet1.push({ s: { r: startRow, c: 3 }, e: { r: endRow, c: 3 } }) // Dự án
      mergesSheet1.push({ s: { r: startRow, c: 4 }, e: { r: endRow, c: 4 } }) // Mô tả
      mergesSheet1.push({ s: { r: startRow, c: 5 }, e: { r: endRow, c: 5 } }) // Link Slide
      mergesSheet1.push({ s: { r: startRow, c: 6 }, e: { r: endRow, c: 6 } }) // Link Báo cáo
    }

    // Record hyperlinks for cell at startRow
    linksSheet1.push({
      deckCell: XLSX.utils.encode_cell({ r: startRow, c: 5 }),
      deckUrl: team.pitchDeckUrl,
      reportCell: XLSX.utils.encode_cell({ r: startRow, c: 6 }),
      reportUrl: team.reportUrl
    })

    // Optional: Add an empty separator row between teams
    // rowsSheet1.push(new Array(headersSheet1.length).fill(''))
    // rowIndexSheet1++
  }

  const ws1 = XLSX.utils.aoa_to_sheet(rowsSheet1)
  ws1['!merges'] = mergesSheet1
  ws1['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // MSBC
    { wch: 22 }, // Đội thi
    { wch: 45 }, // Dự án
    { wch: 65 }, // Mô tả
    { wch: 45 }, // Link Slide
    { wch: 45 }, // Link Báo cáo
    { wch: 20 }, // Vai trò
    { wch: 24 }, // Họ và tên
    { wch: 18 }, // Ngày sinh
    { wch: 32 }, // Email
    { wch: 15 }, // SĐT
    { wch: 35 }, // Trường ĐH
    { wch: 28 }, // Khoa/Viện
    { wch: 32 }  // Chuyên ngành
  ]
  linksSheet1.forEach(l => {
    addHyperlink(ws1, l.deckCell, l.deckUrl, l.deckUrl)
    addHyperlink(ws1, l.reportCell, l.reportUrl, l.reportUrl)
  })
  XLSX.utils.book_append_sheet(wb, ws1, 'Bảo trợ chuyên môn')

  // ════════════════════════════════════════════════════════════════════════════
  // 2. SHEET: "TOP 5 - Thông tin đề án" (TỔNG QUAN THEO TỪNG ĐỘI)
  // ════════════════════════════════════════════════════════════════════════════
  const headersSheet2 = [
    'STT',
    'Mã số (MSBC)',
    'Tên đội thi',
    'Ý tưởng / Dự án tham gia',
    'Lĩnh vực dự thi',
    'Khẩu hiệu (Slogan)',
    'Trưởng nhóm',
    'SĐT Trưởng nhóm',
    'Email Trưởng nhóm',
    'Đơn vị đào tạo (Trường)',
    'Số lượng thành viên',
    'Mô tả tóm tắt ý tưởng/dự án',
    'Vấn đề thực tiễn giải quyết',
    'Mô tả giải pháp / Ý tưởng chi tiết',
    'Công nghệ ứng dụng',
    'Link Slide Pitch Deck',
    'Link Báo cáo / Thuyết minh'
  ]

  const rowsSheet2 = [headersSheet2]
  teamsData.forEach((team, idx) => {
    const leader = team.members.find(m => m.role.includes('Trưởng nhóm')) || team.members[0]
    rowsSheet2.push([
      idx + 1,
      team.msbc,
      team.teamName,
      team.projectName,
      team.category,
      team.slogan,
      leader.fullName,
      leader.phone,
      leader.email,
      team.institution,
      team.members.length,
      team.summary,
      team.problem,
      team.solution,
      team.techStack,
      team.pitchDeckUrl,
      team.reportUrl
    ])
  })

  const ws2 = XLSX.utils.aoa_to_sheet(rowsSheet2)
  ws2['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // MSBC
    { wch: 24 }, // Tên đội thi
    { wch: 45 }, // Ý tưởng / Dự án
    { wch: 30 }, // Lĩnh vực
    { wch: 45 }, // Khẩu hiệu
    { wch: 25 }, // Trưởng nhóm
    { wch: 16 }, // SĐT
    { wch: 32 }, // Email
    { wch: 40 }, // Đơn vị đào tạo
    { wch: 18 }, // Số lượng TV
    { wch: 60 }, // Mô tả tóm tắt
    { wch: 60 }, // Vấn đề
    { wch: 65 }, // Giải pháp
    { wch: 40 }, // Công nghệ
    { wch: 45 }, // Link Slide
    { wch: 45 }  // Link Báo cáo
  ]
  teamsData.forEach((team, idx) => {
    const rowNum = idx + 2
    addHyperlink(ws2, `P${rowNum}`, team.pitchDeckUrl, team.pitchDeckUrl)
    addHyperlink(ws2, `Q${rowNum}`, team.reportUrl, team.reportUrl)
  })
  XLSX.utils.book_append_sheet(wb, ws2, 'TOP 5 - Thông tin đề án')

  // ════════════════════════════════════════════════════════════════════════════
  // 3. SHEET: "TOP 5 - Từng đội thi" (PHÂN TÁCH KHỐI RÕ RÀNG BẰNG HEADER ĐỘI)
  // ════════════════════════════════════════════════════════════════════════════
  const rowsSheet3 = []
  const mergesSheet3 = []
  const linksSheet3 = []
  let currentRowIdxSheet3 = 0

  for (const team of teamsData) {
    // Team banner row
    const leader = team.members.find(m => m.role.includes('Trưởng nhóm')) || team.members[0]
    const headerTitle = `ĐỘI THI #${team.msbc}: ${team.teamName.toUpperCase()}  |  DỰ ÁN: ${team.projectName}`
    rowsSheet3.push([headerTitle, '', '', '', '', '', '', '', ''])
    
    // Merge banner row across 9 columns
    mergesSheet3.push({
      s: { r: currentRowIdxSheet3, c: 0 },
      e: { r: currentRowIdxSheet3, c: 8 }
    })
    currentRowIdxSheet3++

    // Project metadata row
    rowsSheet3.push([
      `Lĩnh vực: ${team.category}`,
      `Khẩu hiệu: ${team.slogan}`,
      '',
      `Slide Deck: Nhấn để xem`,
      `Báo cáo dự án: Nhấn để xem`,
      '',
      '',
      '',
      ''
    ])
    mergesSheet3.push({ s: { r: currentRowIdxSheet3, c: 0 }, e: { r: currentRowIdxSheet3, c: 1 } })
    mergesSheet3.push({ s: { r: currentRowIdxSheet3, c: 3 }, e: { r: currentRowIdxSheet3, c: 3 } })
    mergesSheet3.push({ s: { r: currentRowIdxSheet3, c: 4 }, e: { r: currentRowIdxSheet3, c: 4 } })
    
    linksSheet3.push({
      cellRef: XLSX.utils.encode_cell({ r: currentRowIdxSheet3, c: 3 }),
      url: team.pitchDeckUrl,
      text: team.pitchDeckUrl
    })
    linksSheet3.push({
      cellRef: XLSX.utils.encode_cell({ r: currentRowIdxSheet3, c: 4 }),
      url: team.reportUrl,
      text: team.reportUrl
    })
    currentRowIdxSheet3++

    // Table headers for members
    rowsSheet3.push([
      'STT',
      'Vai trò',
      'Họ và tên',
      'Ngày tháng năm sinh',
      'Email',
      'Số điện thoại',
      'Trường Đại học',
      'Khoa / Viện',
      'Chuyên ngành'
    ])
    currentRowIdxSheet3++

    // Member rows
    team.members.forEach((m, mIdx) => {
      rowsSheet3.push([
        mIdx + 1,
        m.role,
        m.fullName,
        formatDate(m.dob),
        m.email,
        m.phone,
        m.university,
        m.faculty || '',
        m.major || ''
      ])
      currentRowIdxSheet3++
    })

    // Separator blank row
    rowsSheet3.push(['', '', '', '', '', '', '', '', ''])
    currentRowIdxSheet3++
  }

  const ws3 = XLSX.utils.aoa_to_sheet(rowsSheet3)
  ws3['!merges'] = mergesSheet3
  ws3['!cols'] = [
    { wch: 8 },  // STT
    { wch: 22 }, // Vai trò
    { wch: 26 }, // Họ tên
    { wch: 18 }, // Ngày sinh
    { wch: 32 }, // Email
    { wch: 16 }, // SĐT
    { wch: 36 }, // Trường
    { wch: 28 }, // Khoa/Viện
    { wch: 32 }  // Chuyên ngành
  ]
  linksSheet3.forEach(l => {
    addHyperlink(ws3, l.cellRef, l.url, l.text)
  })
  XLSX.utils.book_append_sheet(wb, ws3, 'TOP 5 - Tách riêng từng đội')

  // Save files
  const exportPath = path.resolve(process.cwd(), 'TOP_5_CHUNG_KET_GENDARENA_BAO_TRO_CHUYEN_MON.xlsx')
  const publicPath = path.resolve(process.cwd(), 'public', 'TOP_5_CHUNG_KET_GENDARENA_BAO_TRO_CHUYEN_MON.xlsx')

  XLSX.writeFile(wb, exportPath)
  XLSX.writeFile(wb, publicPath)

  console.log('Successfully regenerated Excel with merged teams & 1 link per team:')
  console.log('1.', exportPath)
  console.log('2.', publicPath)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
